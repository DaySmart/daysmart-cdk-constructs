import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkEnvironmentResourcesProps {
    vpcId: string;
    stage: string;
    project: string;
    instanceKeyName?: string;
    amiName: string;
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
