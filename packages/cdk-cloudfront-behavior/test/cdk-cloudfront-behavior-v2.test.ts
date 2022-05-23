import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkCloudfrontBehavior } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCloudfrontBehavior(stack, 'AppCloudfront', {
        baseEnv: 'test',
        componentName: 'name',
        defaultBehaviorOrigin: 'http',
        domains: '',
        httpOriginCachePolicyId: '',
        httpOriginRequestPolicyId: '',
        project: 'cdk'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));
})