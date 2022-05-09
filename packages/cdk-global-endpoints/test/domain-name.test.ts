import * as cdk from 'aws-cdk-lib';
import { CustomDomain } from "../lib/api-domain-name"
import { Template } from "aws-cdk-lib/assertions"
import { BasePathMapping } from 'aws-cdk-lib/aws-apigateway';
import { Stack } from 'aws-cdk-lib';
import { CdkApiGatewayDomain } from '../lib/api-gateway-domain';
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

// test('Base Path Mapping', () => {
//     const stack = new cdk.Stack(undefined, 'stack', {
//         env: {
//             account: '987654',
//             region: 'us-east-1'
//         }
//     });
//     new BasePathMapping(stack, 'BasePath', {
//         basePath: 'example',
//         domainName: 'example.com',
        
//     })
// })

// const stack = new Stack();
// new CustomDomain(stack, "CustomDomain", {
//     certificateArn: '123456',
//     companyDomainName: 'example.com',
//     domainName: 'testing',
//     restApiId: '987654',
//     restApiRootResourceId: 'asdfg'
// })

// const template = Template.fromStack(stack);
// console.log(JSON.stringify(template, null, 2))

// test("Cert set", () => {
//     expect(stack).toHaveProperty("AWS::ApiGateway::DomainName", {
//         RegionalCertificateArn: '123456'
//     })
// })
// test("Domain Name", () => {
//     expect(stack).toHaveProperty("AWS::ApiGateway::DomainName", {
//         DomainName: 'testing'
//     })
// })
// test("Rest Api ID", () => {
//     expect(stack).toHaveProperty("AWS::ApiGateway::BasePathMapping", {
//         RestApiId: '987654'
//     })
// })