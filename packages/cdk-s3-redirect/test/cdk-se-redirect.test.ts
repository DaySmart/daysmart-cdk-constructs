import { Stack } from '@aws-cdk/core';
import { CdkS3Redirect } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkS3Redirect(stack, "CdkS3Redirect", {
    baseEnv: 'test',
    certificateArn: '123456',
    cname: 'taylor',
    componentName: 'name',
    httpOriginCachePolicyId: 'zxcv',
    httpOriginRequestPolicyId: 'asdf',
    newEndpoint: 'new',
    oldEndpoint: 'here',
    project: 'cdk'
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("", {
        
    })
})