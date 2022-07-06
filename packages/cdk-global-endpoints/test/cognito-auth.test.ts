import { CdkCognitoAuth } from "../lib/cognito-auth"
import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CfnBasePathMapping } from "aws-cdk-lib/aws-apigateway";
import { Stack } from "aws-cdk-lib";

test('Custom Domain Made', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });

    new CdkCognitoAuth(stack, 'ApiGatewayDomainMultiRegion', {
        UserPoolName: 'Name'
    });
    const template = Template.fromStack(stack);
    console.log(Stack, 2, null);
    template.hasResourceProperties("AWS::Route53::RecordSet", {
        Name: 'api.test.cdkv2.example.com.'
    });
})