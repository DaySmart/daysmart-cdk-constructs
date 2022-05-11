import { Stack } from '@aws-cdk/core';
import { CdkEcsCodedeployResources } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkEcsCodedeployResources(stack, "CdkEcsCodedeployResources", {
    appName: 'test',
    clusterName: 'name',
    commitHash: '1234',
    deployBucket: 'bucket',
    listenerArn: 'asdfg',
    serviceName: 'taylor',
    stage: 'test',
    targetGroup1Name: 'testing'
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("Bucket Name", () => {
    expect(stack).toHaveResource("Custom::CDKBucketDeployment", {
        DestinationBucketName: 'bucket'
    })
})

test("Commit Hash", () => {
    expect(stack).toHaveResource("Custom::CDKBucketDeployment", {
        UserMetadata: {
            commithash: '1234'
        }
    })
})
// Complete