import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { AllowedMethods } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { request } from 'http';
import { CdkBaseCfAcmR53 } from '../lib/index'

const keyArn = 'arn:aws:route:us-east-1:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkBaseCfAcmR53(stack, 'AppCloudfront', {
        baseEnv: 'test',
        componentName: 'component',
        defaultBehaviorOptions: {origin: new HttpOrigin('example.com')},
        domains: ['example.com', 'domain.com'],
        projects: ['cdk'],
        certificateArn: keyArn,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                "component.test.cdk.example.com",
                "test-cdk.example.com",
                "component.test.cdk.domain.com",
                "test-cdk.domain.com"
            ]
        }
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            ViewerCertificate: {
                AcmCertificateArn: 'arn:aws:route:us-east-1:123456:key/blah'
            }
        }
    });
})