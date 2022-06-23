import { CdkUsagePlan } from "../lib/usage-plan"
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

    new CdkUsagePlan(stack, 'ApiGatewayDomain', {
        apiStages: [''],
        
    });
    const template = Template.fromStack(stack);