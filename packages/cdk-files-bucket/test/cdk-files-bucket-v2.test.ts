import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkFilesBucket } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkFilesBucket(stack, 'AppCloudfront', {
        appName: 'cdk',
        dynamicEnvName: 'taylor',
        projectName: 'project',
        stage: 'test'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'taylor-cdk.test.project'
    });

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'taylor-test-project-cdk-bucket-write'
    });
})