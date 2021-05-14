import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

export interface CdkEnvironmentResourcesProps {
    vpcId: string;
    stage: string;
    project: string;
    instanceKeyName?: string;
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
            bucketName: `deploy-dsicollection.${props.stage}.ecs`,
            publicReadAccess: true,
            versioned: true,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAcessIdentity', {
            comment: `OriginAccessIdentity for ${bucket.bucketName}.`
        });

        const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
            bucket: bucket
        });

        bucketPolicy.document.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [originAccessIdentity.grantPrincipal],
                actions: ['s3:GetObject'],
                resources: [bucket.bucketArn + "/*"],
            })
        );

        let output = new cdk.CfnOutput(this, "AppspecBucket", {
            value: bucket.bucketName
        });

        let output2 = new cdk.CfnOutput(this, "OriginAccessIdentity", {
            value: originAccessIdentity.originAccessIdentityName
        });

        output.overrideLogicalId("AppspecBucket");
        output2.overrideLogicalId("OriginAccessIdentity");

        const cluster = new ecs.Cluster(this, "Cluster", {
            clusterName: `${props.stage}-${props.project}`,
            vpc: vpc,
            containerInsights: true,
        });

        const autoScalingGroup = cluster.addCapacity(
            "DefaultAutoScalingGroupCapacity",
            {
                autoScalingGroupName: `${props.stage}-${props.project}-ecs-asg`,
                instanceType: new ec2.InstanceType("m5.xlarge"),
                minCapacity: 1,
                desiredCapacity: 2,
                maxCapacity: 3,
                machineImage: ecs.EcsOptimizedImage.windows(
                    ecs.WindowsOptimizedVersion.SERVER_2019
                ),
                groupMetrics: [autoscaling.GroupMetrics.all()],
                instanceMonitoring: autoscaling.Monitoring.DETAILED,
                keyName: props.instanceKeyName,
            }
        );

        const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
            vpc: vpc,
            securityGroupName: `${props.stage}-${props.project}-sg`,
            description: `Security group for ${props.stage}-${props.project} ecs container instances for dynamic port mapping.`,
        });

        securityGroup.addIngressRule(
            ec2.Peer.ipv4("10.0.0.0/8"),
            ec2.Port.allTcp()
        );

        autoScalingGroup.addSecurityGroup(securityGroup);

        autoScalingGroup.scaleOnCpuUtilization("ScalingPolicy", {
            targetUtilizationPercent: 50,
        });

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
