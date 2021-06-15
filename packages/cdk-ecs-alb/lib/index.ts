import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as iam from "@aws-cdk/aws-iam";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as logs from "@aws-cdk/aws-logs";

export interface CdkEcsAlbProps {
    clusterName: string;
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    stage: string;
    healthCheckPath: string;
    tag?: string;
    kmsKeyId?: string;
}

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;
        let listener: elbv2.ApplicationListener | elbv2.NetworkListener | void;

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const repository = ecr.Repository.fromRepositoryName(
            this,
            "Repo",
            props.repositoryName
        );

        const securityGroup = ec2.SecurityGroup.fromLookup(
            this,
            "SecurityGroup",
            props.securityGroupId
        );

        const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
            clusterName: props.clusterName,
            vpc: vpc,
            securityGroups: [securityGroup],
        });

        var taskRole = new iam.Role(this, "EcsTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonInspectorReadOnlyAccess'),
                iam.ManagedPolicy.fromManagedPolicyName(this, 'AWSClient', 'AWSClient'),
            ],
            path: '/',
            inlinePolicies: {
                "BasicPolicy": new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "s3:ListAllMyBuckets"
                            ],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ["s3:*"],
                            resources: [
                                `arn:aws:s3:::daysmart-assets-${cdk.Stack.of(this).region}`,
                                `arn:aws:s3:::daysmart-assets-${cdk.Stack.of(this).region}/*`
                            ]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ["s3:*"],
                            resources: [
                                `arn:aws:s3:::daysmart-code-${cdk.Stack.of(this).region}`,
                                `arn:aws:s3:::daysmart-code-${cdk.Stack.of(this).region}/*`
                            ]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ["cloudwatch:*"],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ssm:PutParameter",
                                "ssm:GetParameter"
                            ],
                            resources: [
                                `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/${props.stage}-${props.appName}`
                            ]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "sns:Publish"
                            ],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ["swf:*"],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ec2:DescribeTags",
                                "ec2:CreateTags"
                            ],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "kms:Encrypt",
                                "kms:Decrypt",
                                "kms:ReEncrypt*",
                                "kms:GenerateDataKey*",
                                "kms:DescribeKey"
                            ],
                            resources: [
                                (props.kmsKeyId) ? `arn:aws:kms:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:key/${props.kmsKeyId}` : `arn:aws:kms:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:key/*`
                            ]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ecs:DeregisterContainerInstance",
                                "ecs:RegisterContainerInstance",
                                "ecs:Submit*"
                            ],
                            resources: [`arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster/${cluster.clusterName}`]
                        }),
                        new iam.PolicyStatement({
                            conditions: {
                                "ArnEquals": {
                                    "ecs:cluster": `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster/${cluster.clusterName}`
                                }
                            },
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ecs:Poll",
                                "ecs:StartTelemetrySession"
                            ],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ecs:DiscoverPollEndpoint",
                                "ecr:GetAuthorizationToken",
                                "logs:CreateLogStream",
                                "logs:PutLogEvents"
                            ],
                            resources: ["*"]
                        }),
                        new iam.PolicyStatement({
                            actions: [
                                "ssm:GetParameters",
                                "ssm:PutParameter",
                                "ssm:GetParameter",
                                "secretsmanager:GetSecretValue",
                                "kms:Decrypt"
                            ],
                            resources: [
                                `arn:aws:ssm:us-east-1:${cdk.Stack.of(this).account}:parameter/${props.stage}-${props.appName}`
                            ],
                            effect: iam.Effect.ALLOW
                        })
                    ]
                })
            }
        });

        const taskDefinition = new ecs.Ec2TaskDefinition(
            this,
            "TaskDefinition",
            {
                networkMode: ecs.NetworkMode.NAT,
                taskRole: taskRole,
                executionRole: taskRole,
                family: `${props.stage}-${props.appName}`
            }
        );

        taskDefinition.addContainer("Container", {
            image: ecs.ContainerImage.fromEcrRepository(repository, props.tag),
            memoryLimitMiB: 4096,
            cpu: 2048,
            portMappings: [
                {
                    containerPort: 80,
                    hostPort: 0,
                    protocol: ecs.Protocol.TCP,
                },
            ],
            entryPoint: ["powershell", "-Command"],
            command: ["C:\\ServiceMonitor.exe w3svc"],
            logging: ecs.LogDriver.awsLogs({
                logGroup: new logs.LogGroup(this, "LogGroup", {
                    logGroupName: `${props.stage}-${props.appName}-ecs`,
                    retention: logs.RetentionDays.INFINITE
                }),
                streamPrefix: "ecs",
            }),
        });

        const albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
            targetGroupName: `${props.stage}-${props.appName}-TargetGroup2`,
            targetType: elbv2.TargetType.INSTANCE,
            protocol: elbv2.ApplicationProtocol.HTTP,
            healthCheck: {
                path: props.healthCheckPath,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 5,
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(10)
            },
            vpc: vpc
        });

        const applicationLoadBalancedEC2Service = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
            cluster,
            serviceName: `${props.stage}-${props.appName}`,
            desiredCount: 1,
            taskDefinition: taskDefinition,
            deploymentController: {
                type: ecs.DeploymentControllerType.CODE_DEPLOY
            }
        });

        applicationLoadBalancedEC2Service.targetGroup.configureHealthCheck({
            path: props.healthCheckPath,
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(10)
        });

        const scalableTarget = applicationLoadBalancedEC2Service.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 4,
        });

        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
        });

        const ecsServiceOutput = new cdk.CfnOutput(this, "ServiceName", {
            value: applicationLoadBalancedEC2Service.service.serviceName
        });

        ecsServiceOutput.overrideLogicalId("ServiceName");

        const listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
            value: applicationLoadBalancedEC2Service.listener.listenerArn
        });

        listenerOutput.overrideLogicalId("ListenerARN");

        const targetGroup = new cdk.CfnOutput(this, "TargetGroupName", {
            value: applicationLoadBalancedEC2Service.targetGroup.targetGroupName
        });

        targetGroup.overrideLogicalId("TargetGroupName");
    }
}
