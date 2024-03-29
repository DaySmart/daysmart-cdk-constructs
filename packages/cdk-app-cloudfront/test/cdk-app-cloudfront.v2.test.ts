import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkAppCloudfront } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkAppCloudfront(stack, 'AppCloudfront', {
        certArn: '12345',
        companyDomainName: 'example',
        companyHostedZoneId: 'asdf',
        originAccessIdentity: '9876',
        project: 'cdk',
        s3BucketName: 'bucket',
        stage: 'test'
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                'test.cdk.example'
            ]
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            ViewerCertificate: {
                AcmCertificateArn: '12345'
            }
        }
    });
})