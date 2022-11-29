import { Stack } from '@aws-cdk/core';
import { CdkPipeline } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkPipeline(stack, "CdkPipeline", {
    artifactBucket: '',
    branch: '',
    codeStartConnectionArn: '',
    repoName: '',
    repoOwner: '',
    testAccounts: []
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
        BucketName: 'taylor-cdk.test.construct'
    })
})