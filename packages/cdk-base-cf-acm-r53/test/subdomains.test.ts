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
        projects: ['cloud', 'remote', 'online'],
        certificateArn: keyArn,
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2))
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
            Aliases: [
                "component.test.cloud.example.com",
                "test-cloud.example.com",
                "component.test.remote.example.com",
                "test-remote.example.com",
                "component.test.online.example.com",
                "test-online.example.com",
                "component.test.cloud.domain.com",
                "test-cloud.domain.com",
                "component.test.remote.domain.com",
                "test-remote.domain.com",
                "component.test.online.domain.com",
                "test-online.domain.com"
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