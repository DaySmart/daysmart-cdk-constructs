import { Stack } from '@aws-cdk/core';
import { CdkCloudfrontOriginRequestPolicy } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkCloudfrontOriginRequestPolicy(stack, "CdkCloudfrontOriginRequestPolicy", {
    cookieBehavior: 'all',
    headerBehavior: 'none',
    policyName: 'test',
    queryStringBehavior: 'all'
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Cookie Behavior", () => {
    expect(stack).toHaveResourceLike("AWS::CloudFront::OriginRequestPolicy", {
        OriginRequestPolicyConfig: {
            CookiesConfig: {
                CookieBehavior: 'all'
            },
            HeadersConfig: {
                HeaderBehavior: 'none'
            },
            QueryStringsConfig: {
                QueryStringBehavior: 'all'
            }
        }
    })
})
// Complete