import { Stack } from '@aws-cdk/core';
import { CdkFilesBucket } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkFilesBucket(stack, "CdkFilesBucket", {
    appName: 'cdk',
    dynamicEnvName: 'taylor',
    projectName: 'construct',
    stage: 'test'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
        BucketName: 'taylor-cdk.test.construct'
    })
})

// Complete