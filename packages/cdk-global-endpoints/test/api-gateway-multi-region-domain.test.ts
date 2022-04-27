import { ApiGatewayDomainMultiRegion } from "../lib/api-gateway-multi-region-domain"
import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"

test('Custom Domain Made', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });

    new ApiGatewayDomainMultiRegion(stack, 'ApiGatewayDomainMultiRegion', {
        companyDomainName: 'example.com',
        project: 'CDK V2',
        baseEnv: 'test',
        certificateArn: '123456',
        restApiId: 'abcdefg',
        restApiRootResourceId: '987654' 
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::APIGatewayDomain::MultiRegion", {
        CompanyDomainName: 'example.com'
    });
});