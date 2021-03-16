import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
// import { CdkEcsTaskDefinition } from "../../cdk-ecs-task-definition/lib/index";

export interface CdkEcsContainerProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
  isALB: boolean
}
// taskDefinition: CdkEcsTaskDefinition;

export class CdkEcsContainer extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsContainerProps) {
    super(scope, id);

    // const containerDefinitions = new ecs.ContainerDefinition(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ContainerDefinition`, {
      // taskDefinition: props.taskDefinition,
      // image: 
      // 022393549274.dkr.ecr.us-east-1.amazonaws.com/messagingservice
    // });  
  }
}
