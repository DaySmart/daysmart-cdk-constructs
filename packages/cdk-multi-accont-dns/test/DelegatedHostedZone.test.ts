import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { DelegatedHostedZone } from '../lib/DelegatedHostedZone'
import { SynthUtils } from '@aws-cdk/assert';

test('Delegated HostedZone template', () => {
    const stack = new cdk.Stack();
    new DelegatedHostedZone(stack, 'DelegatedHostedZone', {
        zoneName: 'example.domain.com'
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});