import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda";
import * as customresource from "@aws-cdk/custom-resources";
// import path = require("path");

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
        });

        let output = new cdk.CfnOutput(this, "AppspecBucket", {
            value: bucket.bucketName
        });

        output.overrideLogicalId("AppspecBucket");

        const cluster = new ecs.Cluster(this, "Cluster", {
            clusterName: `${props.stage}-${props.project}`,
            vpc: vpc,
            containerInsights: true,
        });

        const goldenContainerInstanceAmiProvider = new customresource.Provider(
            this,
            "GoldenContainerInstanceAmiProvider",
            {
                onEventHandler: new lambda.Function(this, "GoldenContainerInstanceAmiLookupFunction", {
                    handler: "golden_container_instance_ami_lookup.handler",
                    runtime: lambda.Runtime.PYTHON_3_8,
                    code: lambda.Code.fromBucket(s3.Bucket.fromBucketName(this, "LambdaHandlerBucket", `daysmart-assets-${cdk.Stack.of(this).region}`), "common/golden_container_instance_ami_lookup.py"),
                    timeout: cdk.Duration.seconds(30),
                    initialPolicy: [
                        new iam.PolicyStatement({
                            actions: ["ec2:DescribeImages"],
                            resources: ["*"],
                        }),
                    ],
                }),
            }
        );

        // const goldenContainerInstanceAmiProvider = new customresource.Provider(
        //     this,
        //     "GoldenContainerInstanceAmiProvider",
        //     {
        //         onEventHandler: new lambda.Function(this, "GoldenContainerInstanceAmiLookupFunction", {
        //             handler: "golden_container_instance_ami_lookup.handler",
        //             runtime: lambda.Runtime.PYTHON_3_8,
        //             code: lambda.Code.fromAsset(
        //                 __dirname + '/../assets'
        //             ),
        //             timeout: cdk.Duration.seconds(30),
        //             initialPolicy: [
        //                 new iam.PolicyStatement({
        //                     actions: ["ec2:DescribeImages"],
        //                     resources: ["*"],
        //                 }),
        //             ],
        //         }),
        //     }
        // );

        const goldenContainerInstanceAmiResource = new cdk.CustomResource(
            this,
            "GoldenAmiResource",
            {
                serviceToken: goldenContainerInstanceAmiProvider.onEventHandler.functionArn,
                resourceType: "Custom::DsGoldenContainerInstanceAmi",
                properties: {
                    timestamp: new Date()
                }
            }
        );

        goldenContainerInstanceAmiResource.node.addDependency(goldenContainerInstanceAmiProvider);

        const goldenAmiImageId = goldenContainerInstanceAmiResource.getAttString("ImageId");
        const goldenAmiImageName = goldenContainerInstanceAmiResource.getAttString("name");

        const autoScalingGroup = new autoscaling.AutoScalingGroup(this, "AutoScalingGroup", {
            autoScalingGroupName: `${props.stage}-${props.project}-ecs-asg`,
            instanceType: new ec2.InstanceType("m5.xlarge"),
            vpc: vpc,
            machineImage: ec2.MachineImage.lookup({
                name: goldenAmiImageName,
                filters: {
                    "image-id": [`${goldenAmiImageId}`]
                },
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

        autoScalingGroup.node.addDependency(goldenContainerInstanceAmiResource);

        const defaultAsgCapacityProvider = new ecs.AsgCapacityProvider(this, "DefaultAutoScalingGroupCapacityProvider", {
            capacityProviderName: `${props.stage}-${props.project}-asg-capacity-provider`,
            autoScalingGroup: autoScalingGroup,
        })

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
