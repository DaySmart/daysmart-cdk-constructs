import { ApiGatewayDomainRoute53Alias } from "../lib/api-gateway-route53-alias"
import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"

test('Custom Domain Made', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });

    new ApiGatewayDomainRoute53Alias(stack, 'ApiGatewayDomainRoute53Alias', {
        companyDomainName: 'example.com',
        project: 'CDK V2',
        customDomainAlias: 'abcdef',
        customDomainHostedZoneId: '123456',
        baseEnv: 'test'
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::APIGatewayDomain::Route53Alias", {
        CompanyDomainName: 'example.com'
    });
});