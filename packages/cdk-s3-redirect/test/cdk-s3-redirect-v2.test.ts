import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { truncateSync } from 'fs';
import { CdkS3Redirect } from '../lib/index'

const keyArn = 'arn:aws:route53:us-east-1:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkS3Redirect(stack, 'AppCloudfront', {
        baseEnv: 'test',
        certificateArn: keyArn,
        cname: 'name',
        componentName: 'component',
        httpOriginCachePolicyId: '12345',
        httpOriginRequestPolicyId: '98765',
        newEndpoint: 'newendpoint',
        oldEndpoint: 'oldendpoint',
        project: 'cdk'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'oldendpoint'
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                'name'
            ],
            Comment: 'redirect oldendpoint to newendpoint'
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            ViewerCertificate: {
                AcmCertificateArn: 'arn:aws:route53:us-east-1:123456:key/blah'
            }
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            DefaultCacheBehavior: {
                CachePolicyId: '12345',
                Compress: true,
                OriginRequestPolicyId: '98765'
            }
        }
    });
})