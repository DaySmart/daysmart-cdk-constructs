import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkBaseCfAcmR53 } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkBaseCfAcmR53(stack, 'AppCloudfront', {
        baseEnv: 'test',
        componentName: '',
        defaultBehaviorOptions: '',
        domains: ['example.com, example.domain.com'],
        project: '',
        certificateArn: '',
    });

    const template = Template.fromStack(stack);
})