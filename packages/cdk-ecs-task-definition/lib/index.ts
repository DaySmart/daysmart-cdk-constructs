import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";

export interface CdkEcsTaskDefinitionProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
}

export class CdkEcsTaskDefinition extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsTaskDefinitionProps) {
    super(scope, id);

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDefinition', {
      compatibility: 0
    });

  }
}
