import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkS3Deployment } from '../lib/index'

const keyArn = 'arn:aws:s3:us-east-1:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkS3Deployment(stack, 'AppCloudfront', {
        bucketName: 'bucket',
        distributionDomain: 'example.com',
        distributionId: '12345',
        environment: 'test',
        snsTopicArn: keyArn,
        sourceDir: 'test/artifact'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('Custom::BucketDeployment', {
        DestinationBucketName: 'bucket',
        DistributionId: '12345',
        DistributionPaths: [
            '/*'
        ],
        Environment: 'test',
        SnsTopicArn: 'arn:aws:s3:us-east-1:123456:key/blah'
    });
})