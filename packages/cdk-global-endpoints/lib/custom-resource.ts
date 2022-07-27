import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface AwsCustomResourceProps {
    policy: string;
}

export class AwsCustomResource extends Construct {

    constructor(scope: Construct, id: string, props: AwsCustomResourceProps) {
      super(scope, id);

      const getParameter = new cr.AwsCustomResource(this, 'GetParameter', {
        onUpdate: {
            service: 'SSM',
            action: 'getparameter',
            parameters: {
                Name: 'parameter Name Here',
                WithDecryption: true,
            },
            physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
            // Update physical ID to always fetch latest version
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
            resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });
      // Value from other construct here
      getParameter.getResponseField('Parameter Value Here');
    }
}