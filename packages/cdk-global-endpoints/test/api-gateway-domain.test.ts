import { CdkApiGatewayDomain } from "../lib/api-gateway-domain"
import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"

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
        project: 'CDK v2',
        baseEnv:  'test',
        certificateArn: '123456',
        restApiId: 'abcdefg',
        basePath: 'test'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::APIGateway::Domain", {
        CompanyDomainName: 'example.com'
    });
});