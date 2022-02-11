import * as cdk from '@aws-cdk/core';

export interface CdkEcsNlbProps {
  // Define construct properties here
}

export class CdkEcsNlb extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsNlbProps = {}) {
    super(scope, id);

    // Define construct contents here
  }
}
