import { Stack } from '@aws-cdk/core';
import { CdkS3Deployment } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkS3Deployment(stack, "CdkS3Deployment", {
    bucketName: 'taylor',
    distributionDomain: '98765',
    distributionId: '12345',
    environment: 'test',
    snsTopicArn: 'asdf'
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("", {
        
    })
})