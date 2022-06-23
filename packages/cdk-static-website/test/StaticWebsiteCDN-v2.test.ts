import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { StaticWebsiteCDN } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new StaticWebsiteCDN(stack, 'AppCloudfront', {
        bucketName: 'bucket',
        certificateArn: 'arn:aws:acm:us-east-1:123456:certificate/blah',
        domainNames: ['example.domain.com'],
        hostedZoneDomain: 'example.com',
        originAccessIdentity: '98765',
        removeBucket: true
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2))

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                'example.domain.com'
            ]
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            ViewerCertificate: {
                AcmCertificateArn: "arn:aws:acm:us-east-1:123456:certificate/blah"
            }
        }
    });

    template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: "example.domain.com.example.com."
    });
})