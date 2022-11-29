import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkCloudfrontBehavior } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCloudfrontBehavior(stack, 'AppCloudfront', {
        baseEnv: 'test',
        componentName: 'name',
        defaultBehaviorOrigin: 'http',
        defaultHttpOriginName: 'default',
        domains: ['example.com, example.domain.com'],
        httpOriginCachePolicyId: 'zxcvb',
        httpOriginRequestPolicyId: 'asdfg',
        project: 'cdk',
        s3OriginCachePolicyId: '98765',
        s3OriginRequestPolicyId: '12345'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'test.cdk.example.com, example.domain.com'
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                'name.test.cdk.example.com, example.domain.com',
                'test-cdk.example.com, example.domain.com'
            ],
            Comment: 'test cdk'
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            DefaultCacheBehavior: {
                CachePolicyId: 'zxcvb',
                Compress: true,
                OriginRequestPolicyId: 'asdfg'
            }
        }
    });

    template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: 'name.test.cdk.example.com, example.domain.com.'
    });
})