import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { SharedKMSKey } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new SharedKMSKey(stack, 'AppCloudfront', {
        applicationGroup: 'group',
        organizationId: '12345',
        productGroup: 'test'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::KMS::Key', {
        Enabled: true
    });
})