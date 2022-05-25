import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkCloudfrontCachePolicy } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCloudfrontCachePolicy(stack, 'AppCloudfront', {
        cookieBehavior: 'all',
        headerBehavior: 'none',
        policyName: 'test',
        queryStringBehavior: 'all'
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
            Name: 'test'
        }
    });

    template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
            ParametersInCacheKeyAndForwardedToOrigin: {
                CookiesConfig: {
                    CookieBehavior: 'all'
                }
            }
        }
    });
})