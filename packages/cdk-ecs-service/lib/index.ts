import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import { CdkEcsTaskDefinition } from "../../cdk-ecs-task-definition/lib/index";

export interface CdkEcsServiceProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
  taskDefinition: CdkEcsTaskDefinition;
}

export class CdkEcsService extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsServiceProps) {
    super(scope, id);

    // const serviceDefinition = new ecs.Ec2Service(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ServiceDefinition`, {
    //   taskDefinition: props.taskDefinition,
    // });
  }
}
