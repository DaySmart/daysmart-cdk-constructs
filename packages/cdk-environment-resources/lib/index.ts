import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export interface CdkEnvironmentResourcesProps {
    vpcId: string;
    stage: string;
    project: string;
    instanceKeyName?: string;
    amiName: string;
    kmsKeyId?: string;
}

export class CdkEnvironmentResources extends cdk.Construct {
    constructor(
        scope: cdk.Construct,
        id: string,
        props: CdkEnvironmentResourcesProps
    ) {
        super(scope, id);

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
            vpc: vpc,
            securityGroupName: `${props.stage}-${props.project}-sg`,
            description: `Security group for ${props.stage}-${props.project} ecs container instances for dynamic port mapping.`,
        });

        securityGroup.addIngressRule(
            ec2.Peer.ipv4("10.0.0.0/8"),
            ec2.Port.allTcp()
        );

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: `deploy-dsicollection.${props.stage}.ecs`,
            publicReadAccess: true,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });

        let output = new cdk.CfnOutput(this, "AppspecBucket", {
            value: bucket.bucketName
        });

        output.overrideLogicalId("AppspecBucket");

        const autoScalingGroup = new autoscaling.AutoScalingGroup(this, "AutoScalingGroup", {
            autoScalingGroupName: `${props.stage}-${props.project}-ecs-asg`,
            instanceType: new ec2.InstanceType("m5.xlarge"),
            role: new iam.Role(this, `${props.stage}-${props.project}-IAMRole`, {
                assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
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
                                    `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/*`
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
                                resources: [`arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster/${props.stage}-${props.project}`]
                            }),
                            new iam.PolicyStatement({
                                conditions: {
                                    "ArnEquals": {
                                        "ecs:cluster": `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster/${props.stage}-${props.project}`
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
                        ]
                    })
                }
            }),
            newInstancesProtectedFromScaleIn: false,
            maxInstanceLifetime: cdk.Duration.days(120),
            vpc: vpc,
            machineImage: ec2.MachineImage.lookup({
                name: `${props.amiName}*`,
                windows: true
            }),
            securityGroup: securityGroup,
            minCapacity: 1,
            desiredCapacity: 2,
            maxCapacity: 3,
            keyName: props.instanceKeyName,
            instanceMonitoring: autoscaling.Monitoring.DETAILED,
            groupMetrics: [autoscaling.GroupMetrics.all()]
        });

        const targetTrackingScalingPolicy = autoScalingGroup.scaleOnCpuUtilization("ScalingPolicy", {
            targetUtilizationPercent: 50,
        });

        const defaultAsgCapacityProvider = new ecs.AsgCapacityProvider(this, "DefaultAutoScalingGroupCapacityProvider", {
            capacityProviderName: `${props.stage}-${props.project}-asg-capacity-provider`,
            autoScalingGroup: autoScalingGroup,
            enableManagedTerminationProtection: false,
            targetCapacityPercent: 100,
            canContainersAccessInstanceRole: true,
            enableManagedScaling: false
        })

        const cluster = new ecs.Cluster(this, "Cluster", {
            clusterName: `${props.stage}-${props.project}`,
            vpc: vpc,
            containerInsights: true
        });

        cluster.addAsgCapacityProvider(defaultAsgCapacityProvider);

        const clusterOutput = new cdk.CfnOutput(this, "ClusterName", {
            value: cluster.clusterName,
        });

        clusterOutput.overrideLogicalId("ClusterName");

        const securityGroupOutput = new cdk.CfnOutput(this, "SecurityGroupId", {
            value: securityGroup.securityGroupId,
        });

        securityGroupOutput.overrideLogicalId("SecurityGroupId");

        // Need execution stuff, waiting for new release
        // const cfnCluster = cluster.node.defaultChild as ecs.CfnCluster;
    }
}
