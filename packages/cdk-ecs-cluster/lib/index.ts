import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import { CdkEcsVps } from "./packages/cdk-ecs-vpc/lib/index";

export interface CdkEcsClusterProps {
    // Define construct properties here
}

export class CdkEcsCluster extends cdk.Construct {
    constructor(
        scope: cdk.Construct,
        id: string,
        props: CdkEcsClusterProps = {}
    ) {
        super(scope, id);

        const vpc = new CdkEcsVps.vpc();
        // Define construct contents here
        const cluster = new ecs.Cluster(this, "Cluster", {
            vpc: vpc,
        });

        cluster.addCapacity("DefaultAutoScalingGroupCapacity", {
            instanceType: new ec2.InstanceType("t3.2xlarge"),
            desiredCapacity: 2,
        });
    }
}
