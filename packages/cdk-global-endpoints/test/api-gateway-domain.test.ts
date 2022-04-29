import { CdkApiGatewayDomain } from "../lib/api-gateway-domain"
import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CfnBasePathMapping } from "aws-cdk-lib/aws-apigateway";

test('Usage plan created', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });

    new CdkApiGatewayDomain(stack, 'ApiGatewayDomain', {
        companyDomainName: 'example.com',
        companyHostedZoneId: 'example',
        project: 'cdkv2',
        baseEnv:  'test',
        certificateArn: '123456',
        restApiId: 'abcdefg',
        basePath: 'test'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: 'api.test.cdkv2.example.com'
    });
});

test('Cloudformation Route53 Change', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '987654',
            region: 'us-east-1'
        }
    });

    new CfnBasePathMapping(stack, 'BasePathMapping', {
        basePath: 'taylor',
        domainName: 'example.com',
        restApiId: '123456',
        stage: 'taylor'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::BasePathMapping", {
        DomainName: 'example.com'
    })
})