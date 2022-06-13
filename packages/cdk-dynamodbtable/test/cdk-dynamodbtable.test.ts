import { Template } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import * as CdkDynamodbtable from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/index.ts
test('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  // WHEN
  new CdkDynamodbtable.CdkDynamodbtable(stack, 'MyTestConstruct', );
  // THEN
  const template = Template.fromStack(stack);


  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300
  });
});

const stack = new Stack();
new CdkDynamodbtable(stack, "CdkCloudfrontOriginRequestPolicy", {
    
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))
