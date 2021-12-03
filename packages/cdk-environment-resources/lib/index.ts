import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export interface CdkEnvironmentResourcesProps {
    vpcId: string;
    stage: string;
    project: string;
    instanceKeyName?: string;
    amiName: string;
    securityGroupId: string;
    instanceProfileArn: string;
    userData?: string;
}

export class CdkEnvironmentResources extends cdk.Construct {
    constructor(
        scope: cdk.Construct,
        id: string,
        props: CdkEnvironmentResourcesProps
    ) {
        super(scope, id);

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: `deploy-${props.project}.${props.stage}.ecs`,
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
            instanceType: new ec2.InstanceType("m5.large"),
            newInstancesProtectedFromScaleIn: false,
            role: iam.Role.fromRoleArn(this, "InstanceProfileRole", props.instanceProfileArn),
            maxInstanceLifetime: cdk.Duration.days(120),
            vpc: vpc,
            machineImage: ec2.MachineImage.lookup({
                name: `${props.amiName}*`,
                windows: true
            }),
            minCapacity: 2,
            desiredCapacity: 2,
            maxCapacity: 3,
            securityGroup: ec2.SecurityGroup.fromSecurityGroupId(this, "SecurityGroup", props.securityGroupId),
            keyName: props.instanceKeyName,
            instanceMonitoring: autoscaling.Monitoring.DETAILED,
            groupMetrics: [autoscaling.GroupMetrics.all()]
        });

        if (props.userData) {
            autoScalingGroup.addUserData(props.userData);
        }

        cdk.Tags.of(autoScalingGroup).add("EC2Group", "ecs-container-instance", {
            applyToLaunchedInstances: true
        });

        const memoryReservationMetric = new cloudwatch.Metric({
            namespace: "AWS/ECS/ClusterName",
            metricName: "MemoryReservation",
            dimensionsMap: {
                "ClusterName": `${props.stage}-${props.project}`
            }
        });

        const scalingPolicy = autoScalingGroup.scaleOnMetric("ScalingPolicy", {
            metric: memoryReservationMetric,
            scalingSteps: [
                {
                    lower: 75,
                    change: -10
                },
                {
                    upper: 25,
                    change: 10
                }
            ],
            adjustmentType: autoscaling.AdjustmentType.PERCENT_CHANGE_IN_CAPACITY,
            minAdjustmentMagnitude: 1,
            evaluationPeriods: 3
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

        // Need execution stuff, waiting for new release
        // const cfnCluster = cluster.node.defaultChild as ecs.CfnCluster;
    }
}
