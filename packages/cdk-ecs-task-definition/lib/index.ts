import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";

export interface CdkEcsTaskDefinitionProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
}

export class CdkEcsTaskDefinition extends cdk.Construct {
  private _taskDefiniton: ecs.Ec2TaskDefinition;

  constructor(scope: cdk.Construct, id: string, props: CdkEcsTaskDefinitionProps) {
    super(scope, id);

    const taskDefinition = new ecs.Ec2TaskDefinition(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-TaskDefinition`, {
      // compatibility: 0,
      family: (props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`
    });

    const containerRepository = ecr.Repository.fromRepositoryArn(this, 'messagingservice', 'arn:aws:ecr:us-east-1:022393549274:repository/messagingservice');

    const containerImage = new ecs.EcrImage(containerRepository, 'latest')

    taskDefinition.addContainer(props.appName, {
      image: containerImage,
      command: [`New-Item -Path C:\\inetpub\\wwwroot\\index.html -ItemType file -Value '<html> <head> <title>Amazon ECS Sample App</title> 
      <style>body {margin-top: 40px; background-color: #333;} </style> </head><body> <div style=color:white;text-align:center> <h1>Amazon ECS Sample App</h1> 
      <h2>Congratulations!</h2> <p>Your application is now running on a container in Amazon ECS.</p>' -Force ; C:\\ServiceMonitor.exe w3svc`],
      cpu: 512,
      entryPoint: ['powershell','-Command'],
      portMappings: [{
        containerPort: 80,
        hostPort: 8080,
        protocol: ecs.Protocol.TCP
      }],
      memoryLimitMiB: 768,
      essential: true 
    });

    this._taskDefiniton = taskDefinition;
  }

  public getEcsTaskDefinition(): ecs.Ec2TaskDefinition {
    return this._taskDefiniton;
  }
}
