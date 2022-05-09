import { Stack } from '@aws-cdk/core';
import { CdkAppCloudfront } from '../lib/index';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

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

    const template = SynthUtils.toCloudFormation(stack)
    console.log(JSON.stringify(template, null, 2))

test("Distribution Config", () => {
    expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                'test.app-cloudfront.example.com'
            ]
        }
    })
})

// test("Cert Set", () => {
//     expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
//         ViewerCertficate: {
//             AcmCertificateArn: '123456'
//         }
//     })
// })

test("Route53 Hosted Zone ID", () => {
    expect(stack).toHaveResource('AWS::Route53::RecordSet', {
        HostedZoneId: 'abcde'
    })
})

test("Route53 Name", () => {
    expect(stack).toHaveResource('AWS::Route53::RecordSet', {
        Name: 'test.app-cloudfront.example.com.'
    })
})