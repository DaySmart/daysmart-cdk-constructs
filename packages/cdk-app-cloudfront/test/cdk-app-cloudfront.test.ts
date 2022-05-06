import { Stack } from '@aws-cdk/core';
import { CdkAppCloudfront } from '../lib/index';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'

test("CDdkAppCloudfront", () => {
    const stack = new Stack();
    new CdkAppCloudfront(stack, 'CdkAppCloudfront', {
        s3BucketName: 'Test',
        originAccessIdentity: '987654',
        loggingBucketName: 'testingbucket',
        stage: 'test',
        project: 'app-cloudfront',
        certArn: '123456',
        companyDomainName: 'example.com',
        companyHostedZoneId: 'abcde'
    });
    console.log(JSON.stringify(stack, null, 2))
    expect(stack).toHaveResource('AWS::S3::Bucket', {

    })
})