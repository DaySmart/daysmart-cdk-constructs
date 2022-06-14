import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { DelegatedNSRecord } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new DelegatedNSRecord(stack, 'AppCloudfront', {
        delegatedDomainName: 'domain.example.com',
        hostedZoneDomain: 'example.com',
        nameServers: 'servers.aws.com, example.aws.com'
    });

    const template = Template.fromStack(stack);
    expect(Template.fromStack(stack)).toMatchSnapshot();
})