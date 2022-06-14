import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkSnsTopic } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkSnsTopic(stack, 'AppCloudfront', {
        project: 'cdk',
        stage: 'test'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'test-cdk',
        TopicName: 'test-cdk'
    });
})