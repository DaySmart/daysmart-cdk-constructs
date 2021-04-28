import * as cdk from '@aws-cdk/core';

export interface CdkEcsCodedeployResourcesProps {
  // Define construct properties here
}

export class CdkEcsCodedeployResources extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsCodedeployResourcesProps = {}) {
    super(scope, id);

    // Define construct contents here
  }
}
