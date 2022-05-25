import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { HostedZoneCertificate } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new HostedZoneCertificate(stack, 'AppCloudfront', {
        domainName: 'example.com',
    });

    const template = Template.fromStack(stack);
    expect(Template.fromStack(stack)).toMatchSnapshot();
})