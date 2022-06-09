import * as cdk from 'aws-cdk-lib';
import { CustomDomain } from "../lib/api-domain-name"
import { Template } from "aws-cdk-lib/assertions"
import exp = require('constants');

test('Custom Domain created', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CustomDomain(stack, 'ApiGateway', {
        companyDomainName: 'example.com',
        domainName: 'example',
        certificateArn: '123456',
        restApiId: 'abcde',
        restApiRootResourceId: 'asdfg'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: 'example',
    });
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        RegionalCertificateArn: '123456'
    });
    template.hasResourceProperties("AWS::ApiGateway::BasePathMapping", {
        RestApiId: 'abcde'
    });
});