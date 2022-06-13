import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { DelegatedHostedZone } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new DelegatedHostedZone(stack, 'AppCloudfront', {
        zoneName: 'example.domain.com'
    });

    const template = Template.fromStack(stack);
    expect(Template.fromStack(stack)).toMatchSnapshot();
})