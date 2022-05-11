import { Stack } from '@aws-cdk/core';
import { CdkEcsNlb } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkEcsNlb(stack, "CdkEcsNlb", {
    appName: 'test',
    clusterName: 'name',
    certificateArn: '123456',
    healthCheckProtocol: 'https',
    repositoryName: 'testing',
    securityGroupId: 'asdf',
    stage: 'taylor',
    taskDefinitionArn: '987654',
    vpcId: 'zxcv',
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("App Name", () => {
    expect(stack).toHaveResource("", {
    })
})