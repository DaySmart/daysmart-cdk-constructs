import { Stack } from '@aws-cdk/core';
import { CdkSnsTopic } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkSnsTopic(stack, "CdkSnSTopic", {
    project: 'cdk',
    stage: 'test'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
        DisplayName: 'test-cdk'
    })
})
//Complete