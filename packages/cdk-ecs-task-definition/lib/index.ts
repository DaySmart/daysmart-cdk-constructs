import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";

export interface CdkEcsTaskDefinitionProps {
  clusterName: string;
  appName: string;
  vpcId: string;
  securityGroupId: string;
  repositoryName: string;
  lbType: string;
}

export class CdkEcsTaskDefinition extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CdkEcsTaskDefinitionProps) {
    super(scope, id);

    const repository = ecr.Repository.fromRepositoryName(
      this,
      "Repo",
      props.repositoryName
    );

    const taskDefinition = new ecs.Ec2TaskDefinition(
      this,
      "TaskDefinition",
      {
        networkMode: ecs.NetworkMode.NAT,
      }
    );

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      memoryLimitMiB: 4096,
      cpu: 2048,
      portMappings: [
        {
          containerPort: 80,
          hostPort: 0,
          protocol: ecs.Protocol.TCP,
        },
      ],
      entryPoint: ["powershell", "-Command"],
      command: ["C:\\ServiceMonitor.exe w3svc"],
      // logging: ecs.LogDriver.awsLogs({
      //     logGroup: new logs.LogGroup(this, "LogGroup", {
      //         logGroupName: `${props.appName}-ecs`,
      //     }),
      //     streamPrefix: "ecs",
      // }),
    });
  }
}
