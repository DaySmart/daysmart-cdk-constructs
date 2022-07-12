import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkDynamodbtable } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkDynamodbtable(stack, 'AppCloudfront', {
        tableName: 'test',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'test'
    });
})

test('Point In Time Recovery', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '12345',
            region: 'us-east-1'
        }
    });
    new CdkDynamodbtable(stack, 'AppCloudfront', {
        tableName: 'testing',
        pointInTimeRecovery: true
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'testing'
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true
        }
    })
})