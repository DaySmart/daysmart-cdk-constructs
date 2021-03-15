import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";

export interface CdkEcsContainerProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
}

export class CdkEcsContainer extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsContainerProps) {
    super(scope, id);

    // Define construct contents here
  }
}
