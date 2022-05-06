import * as cdk from 'aws-cdk-lib';
import { CustomDomain } from "../lib/api-domain-name"
import { Template } from "aws-cdk-lib/assertions"
import { BasePathMapping } from 'aws-cdk-lib/aws-apigateway';

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
    console.log(JSON.stringify(template, null, 2))
    template.hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: 'example',
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