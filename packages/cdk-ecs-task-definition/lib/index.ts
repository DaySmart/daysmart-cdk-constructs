import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkEcsTaskDefinitionProps {
  appName: string;
  repositoryName: string;
  stage: string;
  tag?: string;
  taskRoleArn: string;
  memoryUnits: string;
  cpuUnits: string;
  isFargate?: string;
  deployBucket: string;
}

export class CdkEcsTaskDefinition extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsTaskDefinitionProps) {
    super(scope, id);

    let taskDefinition: ecs.TaskDefinition;
    let portMappings: ecs.PortMapping[];
    const repository = ecr.Repository.fromRepositoryName(this, "Repo", props.repositoryName);
    var taskRole = iam.Role.fromRoleArn(this, "TaskRole", props.taskRoleArn)
    const bucket = s3.Bucket.fromBucketName(this, "Bucket", props.deployBucket)

    if (props.isFargate) {
      portMappings = [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP
        }
      ];
      taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition", {
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.WINDOWS_SERVER_2019_FULL
        },
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskRole: taskRole,
        executionRole: taskRole,
        family: `${props.stage}-${props.appName}`
      });
    } else {
      portMappings = [
        {
          containerPort: 80,
          hostPort: 0,
          protocol: ecs.Protocol.TCP
        }
      ];
      taskDefinition = new ecs.Ec2TaskDefinition(this, "TaskDefinition",
        {
          networkMode: ecs.NetworkMode.NAT,
          taskRole: taskRole,
          executionRole: taskRole,
          family: `${props.stage}-${props.appName}`
        }
      );
    }

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.tag),
      memoryLimitMiB: parseInt(props.memoryUnits),
      cpu: parseInt(props.cpuUnits),
      portMappings: portMappings,
      entryPoint: ["powershell", "-Command"],
      command: ["C:\\ServiceMonitor.exe w3svc"],
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, "LogGroup", {
          logGroupName: `${props.stage}-${props.appName}-ecs`,
          retention: logs.RetentionDays.INFINITE
        }),
        streamPrefix: "ecs",
      }),
      environmentFiles: [
        ecs.EnvironmentFile.fromBucket(bucket, `${props.stage}/${props.stage}-ecs-envars.env`)
      ]
    });

    const taskDefinitionOutput = new cdk.CfnOutput(this, "TaskDefinitionOutput", {
      value: taskDefinition.taskDefinitionArn
    });

    taskDefinitionOutput.overrideLogicalId("TaskDefinitionArn");
  }
}
