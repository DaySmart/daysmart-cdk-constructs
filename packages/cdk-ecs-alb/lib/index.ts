import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as iam from "@aws-cdk/aws-iam";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
// import * as logs from "@aws-cdk/aws-logs";

export interface CdkEcsAlbProps {
    clusterName: string;
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    stage: string;
    tag?: string;
}

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;
        let listener: elbv2.ApplicationListener | elbv2.NetworkListener | void;

        var taskRole = new iam.Role(this, "EcsTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        });

        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "ssm:GetParameters",
                "ssm:PutParameter",
                "ssm:GetParameter",
                "secretsmanager:GetSecretValue",
                "kms:Decrypt"
            ],
            resources: [
                "*"
            ],
            effect: iam.Effect.ALLOW
        }))

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
            // logging: ecs.LogDriver.awsLogs({
            //     logGroup: new logs.LogGroup(this, "LogGroup", {
            //         logGroupName: `${props.appName}-ecs`,
            //     }),
            //     streamPrefix: "ecs",
            // }),
        });

        const albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
            targetGroupName: `${props.stage}-${props.appName}-TargetGroup2`,
            targetType: elbv2.TargetType.INSTANCE,
            protocol: elbv2.ApplicationProtocol.HTTP,
            healthCheck: {
                path: "/api/v2/Health/Check",
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 5,
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(10)
            },
            vpc: vpc
        });

        const applicationLoadBalancedEC2Service = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
            cluster,
            serviceName: `${props.appName}-patterntest`,
            desiredCount: 1,
            taskDefinition: taskDefinition,
            deploymentController: {
                type: ecs.DeploymentControllerType.CODE_DEPLOY
            }
        });

        applicationLoadBalancedEC2Service.targetGroup.configureHealthCheck({
            path: "/api/v2/Health/Check",
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

        const loadBalancerOutput = new cdk.CfnOutput(this, "LoadBalancerARN", {
            value: applicationLoadBalancedEC2Service.loadBalancer.loadBalancerArn
        });

        loadBalancerOutput.overrideLogicalId("LoadBalancerARN");

        const targetGroup = new cdk.CfnOutput(this, "TargetGroupName", {
            value: applicationLoadBalancedEC2Service.targetGroup.targetGroupName
        });

        targetGroup.overrideLogicalId("TargetGroupName");
    }
}
