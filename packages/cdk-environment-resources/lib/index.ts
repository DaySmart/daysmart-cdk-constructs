import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from 'constructs';

export interface CdkEnvironmentResourcesProps {
    vpcId: string;
    stage: string;
    project: string;
    instanceKeyName?: string;
    amiName: string;
    securityGroupId: string;
    instanceProfileArn: string;
    userData?: string;
    instanceType?: string;
    minCapacity?: string;
    maxCapacity?: string;
}

export class CdkEnvironmentResources extends Construct {
    constructor(
        scope: Construct,
        id: string,
        props: CdkEnvironmentResourcesProps
    ) {
        super(scope, id);

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        let instanceType = "c5.2xlarge";
        if(props.instanceType != undefined) {
            instanceType = props.instanceType
        }
        let minCapacity = 1;
        let maxCapacity = 2;
        if (props.minCapacity != undefined) {
            minCapacity = parseInt(props.minCapacity)
        }
        if (props.maxCapacity != undefined) {
            maxCapacity = parseInt(props.maxCapacity)
        }

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
            instanceType: new ec2.InstanceType(instanceType),
            newInstancesProtectedFromScaleIn: false,
            role: iam.Role.fromRoleArn(this, "InstanceProfileRole", props.instanceProfileArn),
            maxInstanceLifetime: cdk.Duration.days(120),
            vpc: vpc,
            machineImage: ec2.MachineImage.lookup({
                name: `${props.amiName}*`,
                windows: true
            }),
            minCapacity: minCapacity,
            maxCapacity: maxCapacity,
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

        // const memoryReservationMetric = new cloudwatch.Metric({
        //     namespace: "AWS/ECS/ClusterName",
        //     metricName: "MemoryReservation",
        //     dimensionsMap: {
        //         "ClusterName": `${props.stage}-${props.project}`
        //     },
        //     period: cdk.Duration.minutes(3)
        // });

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

        const memoryReservationMetric = cluster.metricMemoryReservation({
            period: cdk.Duration.minutes(3)
        });

        const scalingPolicy = autoScalingGroup.scaleOnMetric("ScalingPolicy", {
            metric: memoryReservationMetric,
            scalingSteps: [
                {
                    lower: 75,
                    change: 10
                },
                {
                    upper: 50,
                    change: -10
                }
            ],
            adjustmentType: autoscaling.AdjustmentType.PERCENT_CHANGE_IN_CAPACITY,
            minAdjustmentMagnitude: 1,
            evaluationPeriods: 2
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
