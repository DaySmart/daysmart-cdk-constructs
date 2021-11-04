import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';
import { HostedZoneCertificate } from '../lib';

test('Hosted Zone certificate template', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new HostedZoneCertificate(stack, 'HostedZoneCert', {
        domainName: 'example.domain.com'
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});