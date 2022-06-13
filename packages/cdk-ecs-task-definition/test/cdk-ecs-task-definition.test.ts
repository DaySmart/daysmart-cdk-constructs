import { Stack } from '@aws-cdk/core';
import { CdkEcsTaskDefinition } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkEcsTaskDefinition(stack, "CdkEcsTaskDefinition", {
    appName: 'test',
    cpuUnits: '12',
    memoryUnits: '21',
    repositoryName: 'cdk',
    stage: 'testing',
    taskRoleArn: 'asdfgh'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Bucket Name", () => {
    expect(stack).toHaveResource("Custom::CDKBucketDeployment", {
        DestinationBucketName: 'bucket'
    })
})