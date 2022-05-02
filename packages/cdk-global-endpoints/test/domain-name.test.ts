import * as cdk from 'aws-cdk-lib';
import { ApiGateway } from "../lib/api-domain-name"
import { Template } from "aws-cdk-lib/assertions"

test('Custom Domain created', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new ApiGateway(stack, 'ApiGateway', {
        companyDomainName: 'example.com',
        domainName: 'example',
        project: 'cdkv2',
        baseEnv:  'test',
        certificateArn: '123456',
        restApiId: 'abcdefg',
        basePath: 'test'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: 'example'
    });
});