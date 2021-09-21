import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";

export interface CdkEcsTaskDefinitionProps {
  appName: string;
  repositoryName: string;
  stage: string;
  tag?: string;
  taskRoleArn: string;
  memoryUnits: string;
  cpuUnits: string;
}

export class CdkEcsTaskDefinition extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsTaskDefinitionProps) {
    super(scope, id);

    const repository = ecr.Repository.fromRepositoryName(this, "Repo", props.repositoryName);

    var taskRole = iam.Role.fromRoleArn(this, "TaskRole", props.taskRoleArn)

    const taskDefinition = new ecs.Ec2TaskDefinition(this, "TaskDefinition",
      {
        networkMode: ecs.NetworkMode.NAT,
        taskRole: taskRole,
        executionRole: taskRole,
        family: `${props.stage}-${props.appName}`
      }
    );

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.tag),
      memoryLimitMiB: parseInt(props.memoryUnits),
      cpu: parseInt(props.cpuUnits),
      portMappings: [
        {
          containerPort: 80,
          hostPort: 0,
          protocol: ecs.Protocol.TCP,
        },
      ],
      entryPoint: ["powershell", "-Command"],
      command: ["C:\\ServiceMonitor.exe w3svc"],
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, "LogGroup", {
          logGroupName: `${props.stage}-${props.appName}-ecs`,
          retention: logs.RetentionDays.INFINITE
        }),
        streamPrefix: "ecs",
      }),
    });

    const taskDefinitionOutput = new cdk.CfnOutput(this, "TaskDefinitionOutput", {
      value: taskDefinition.taskDefinitionArn
    });

    taskDefinitionOutput.overrideLogicalId("TaskDefinitionArn");
  }
}
