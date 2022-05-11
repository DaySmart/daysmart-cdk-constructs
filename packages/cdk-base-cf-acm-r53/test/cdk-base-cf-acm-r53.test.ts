import { Stack } from '@aws-cdk/core';
import { CdkBaseCfAcmR53 } from '../lib/index';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkBaseCfAcmR53(stack, "CdkBaseCfAcmR53", {
    project: 'CDK',
    baseEnv: 'test',
    componentName: 'testing',
    certificateArn: '123456',
    defaultBehaviorOptions: '',
    domains: ['example.com']
}) 

const template = SynthUtils.toCloudFormation(stack)
    console.log(JSON.stringify(template, null, 2))

test("CompanyName", () => {
    expect(stack).toHaveResource('AWS::Route53::RecordSet', {
        
    })
})

test("Cert Set", () => {
    expect(stack).toHaveResource('AWS::Route53::RecordSet', {

    })
})