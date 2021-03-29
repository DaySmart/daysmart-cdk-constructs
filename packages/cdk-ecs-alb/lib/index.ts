import * as cdk from "@aws-cdk/core";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";

export interface CdkEcsAlbProps {
    stage: string;
    project: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
}

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

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

        new ecspattern.ApplicationLoadBalancedEc2Service(this, "ALB", {
            cluster,
            memoryLimitMiB: 512,
            cpu: 1,
            desiredCount: 1,
            taskImageOptions: {
                image: ecs.ContainerImage.fromEcrRepository(repository),
                containerPort: 8080,
            },
        });
    }
}
