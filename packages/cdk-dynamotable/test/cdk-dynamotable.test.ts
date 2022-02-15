import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkDynamotable } from '../lib/index';


test('Dynamo table created', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });

    new CdkDynamotable(stack, 'DynamoTable', {
        tableName: 'testTable',
        replicationRegions: ["us-east-2", "us-west-2"]
    });
    const template = Template.fromStack(stack);
    // console.log(JSON.stringify(template, null, 2));
    template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: 'testTable'
    });
});
