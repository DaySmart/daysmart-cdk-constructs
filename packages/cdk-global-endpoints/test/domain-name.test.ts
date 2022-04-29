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
        project: 'cdkv2',
        baseEnv:  'test',
        certificateArn: '123456',
        restApiId: 'abcdefg',
        basePath: 'test'
    });
    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2))
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: 'api.test.cdkv2.example.com'
    });
});