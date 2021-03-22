import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";

export interface CdkEcsVpcProps {
    // Define construct properties here
}

export class CdkEcsVpc extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsVpcProps = {}) {
        super(scope, id);

        // Define construct contents here
        const vpc = new ec2.Vpc(this, "VPC", {
            cidr: "10.0.0.0/16",
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "isolatedSubnet",
                    subnetType: ec2.SubnetType.PRIVATE,
                },
            ],
        });

        // If we want to use a VPC that already exists
        const vpc2 = ec2.Vpc.fromLookup(this, "VPC", { vpcId: "vpc-0ba5586d" });
    }
}
