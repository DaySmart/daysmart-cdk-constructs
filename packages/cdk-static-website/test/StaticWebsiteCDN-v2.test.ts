import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { StaticWebsiteCDN } from '../lib/index'

const keyArn = 'arn:aws:kms:us-west-2:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new StaticWebsiteCDN(stack, 'AppCloudfront', {
        bucketName: 'bucket',
        certificateArn: 'arn:aws:acm:us-east-1:123456:certificate/blah',
        domainNames: ['example.domain.com'],
        hostedZoneDomain: 'example.com',
        originAccessIdentity: '98765'
    });

    const template = Template.fromStack(stack);

    expect(Template.fromStack(stack)).toMatchSnapshot();
})