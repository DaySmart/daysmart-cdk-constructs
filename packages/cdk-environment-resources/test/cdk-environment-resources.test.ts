import { Stack } from '@aws-cdk/core';
import { CdkEnvironmentResources } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkEnvironmentResources(stack, "CdkEnvironmentResources", {
    amiName: 'cdk',
    instanceProfileArn: '1234',
    project: 'construct',
    securityGroupId: '98765',
    stage: 'test',
    vpcId: 'asdf'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Valid Domain",  () => {
    expect(stack).toHaveResourceLike("", {
        
    })
})