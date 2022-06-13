import { Stack } from '@aws-cdk/core';
import { CdkCertificate } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkCertificate(stack, "CdkBaseCfAcmR53", {
    companyDomainName: 'example.com',
    companyHostedZoneId: '123456',
    project: 'CDK',
    stage: 'test'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Valid Domain",  () => {
    expect(stack).toHaveResourceLike("AWS::CertificateManager::Certificate", {
        DomainValidationOptions: [
            {
                DomainName: 'example.com',
                HostedZoneId: '123456'
            },
        ]
    })
})

test("Validation Method", () => {
    expect(stack).toHaveResource("AWS::CertificateManager::Certificate", {
        ValidationMethod: 'DNS'
    })
})
// Completed
