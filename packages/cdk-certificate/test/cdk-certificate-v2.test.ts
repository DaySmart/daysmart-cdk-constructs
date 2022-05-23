import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkCertificate } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCertificate(stack, 'AppCloudfront', {
        companyDomainName: 'example',
        companyHostedZoneId: '98765',
        project: 'cdk',
        stage: 'test'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'example'
    });
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainValidationOptions: [
            {
                DomainName: 'example',
                HostedZoneId: '98765'
            },
            {
                DomainName: 'test.cdk.example',
                HostedZoneId: '98765'
            }
        ],
    })
})