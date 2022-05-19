import { Stack } from '@aws-cdk/core';
import { CdkCloudfrontBehavior } from '../lib/index';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkCloudfrontBehavior(stack, "CdkCloudFrontBehavior", {
    baseEnv: 'test',
    componentName: 'testing',
    defaultBehaviorOrigin: 'http',  // Can not have array of strings but need 's3'
    domains: ['example.com'],
    httpOriginCachePolicyId: 'abcd',
    httpOriginRequestPolicyId: '1234',
    project: 'CDK',
    s3OriginCachePolicyId: 'asdf',
    s3OriginRequestPolicyId: 'zxcv',
    defaultHttpOriginName: 'qwert'
}) 

const template = SynthUtils.toCloudFormation(stack)
    console.log(JSON.stringify(template, null, 2))

test("Validation Method", () => {
    expect(stack).toHaveResource("", {
// Error testingm need origin parameter
    })
})