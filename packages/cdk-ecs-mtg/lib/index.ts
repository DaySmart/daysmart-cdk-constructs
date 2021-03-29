import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";

export interface CdkEcsMtgProps {
    // Define construct properties here
    stage: string;
    project: string;
    vpcId: string;
    clusterName: string;
    securityGroupId: string;
    repositoryName: string;
}

export class CdkEcsMtg extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsMtgProps) {
        super(scope, id);

        // Define construct contents here
        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const repository = ecr.Repository.fromRepositoryName(
            this,
            "Repo",
            props.repositoryName
        );

        //get id
        const securityGroup = ec2.SecurityGroup.fromLookup(
            this,
            "Security Group",
            props.securityGroupId
        );

        const cluster = ecs.Cluster.fromClusterAttributes(this, "VPC", {
            clusterName: `${props.stage}-${props.project}`,
            vpc: vpc,
            securityGroups: [securityGroup],
        });

        new ecspattern.ApplicationMultipleTargetGroupsEc2Service(this, "ALB", {
            cluster,
            memoryLimitMiB: 512,
            cpu: 1,
            desiredCount: 1,
            taskImageOptions: {
                image: ecs.ContainerImage.fromEcrRepository(repository),
            },
        });
    }
}
