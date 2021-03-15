import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";

export interface CdkEcsServiceProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
}

export class CdkEcsService extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsServiceProps) {
    super(scope, id);

    // Define construct contents here
  }
}
