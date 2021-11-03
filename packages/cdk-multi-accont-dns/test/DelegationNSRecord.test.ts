import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { DelegatedNSRecord } from '../lib/DelegationNSRecord'
import { SynthUtils } from '@aws-cdk/assert';

test('Delegated NS record template', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new DelegatedNSRecord(stack, 'DelegatedNsRecord', {
        delegatedDomainName: 'example.domain.com',
        hostedZoneDomain: 'domain.com',
        nameServers: 'blahh.aws.com,blahh-west.aws.com'
    })
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});