import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';
import { StaticWebsiteCDN } from '../lib';

test('Static Website CDN template', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    
    new StaticWebsiteCDN(stack, 'WebsiteCDN', {
        bucketName: 'my-bucket',
        certificateArn: 'arn:aws:acm:us-east-1:123456:certificate/blah',
        domainNames: ['example.domain.com'],
        hostedZoneDomain: 'example.domain.com',
        originAccessIdentity: 'oai-123'
    })
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});