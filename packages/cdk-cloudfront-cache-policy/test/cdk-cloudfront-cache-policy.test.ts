import { Stack } from '@aws-cdk/core';
import { CdkCloudfrontCachePolicy } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkCloudfrontCachePolicy(stack, "CdkCloudfrontCachePolicy", {
    cookieBehavior: 'all',
    headerBehavior: 'none',
    policyName: 'test',
    queryStringBehavior: 'all'
}) 

const template = SynthUtils.toCloudFormation(stack)
console.log(JSON.stringify(template, null, 2))

test("Policy set", () => {
    expect(stack).toHaveResourceLike("AWS::CloudFront::CachePolicy", {
        MinTTL: '0'
    })
})

test("Header Behavior", () => {
    expect(stack).toHaveResourceLike("AWS::CloudFront::CachePolicy", {
        HeadersConfig: {
            HeaderBehavior: 'none'
        }
    })
})
// Complete