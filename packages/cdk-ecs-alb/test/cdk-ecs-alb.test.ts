import { Stack } from '@aws-cdk/core';
import { CdkEcsAlb } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkEcsAlb(stack, "CdkEcsAlb", {
    appName: 'test',
    certificateArn: '123456',
    clusterName: 'cluster',
    healthCheckPath: '',
    repositoryName: 'CDK',
    securityGroupId: '987654',
    stage: 'test',
    taskDefinitionArn: 'asdfg',
    vpcId: 'abcde'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("cert set", () => {
    expect(stack).toHaveProperty("", {

    })
})


