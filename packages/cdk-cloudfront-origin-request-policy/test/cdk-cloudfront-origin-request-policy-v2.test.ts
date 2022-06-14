import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkCloudfrontOriginRequestPolicy } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCloudfrontOriginRequestPolicy(stack, 'AppCloudfront', {
        cookieBehavior: 'all',
        headerBehavior: 'all',
        policyName: 'policy',
        queryStringBehavior: 'all',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
        OriginRequestPolicyConfig: {
            CookiesConfig: {
                CookieBehavior: 'all'
            },
            HeadersConfig: {
                HeaderBehavior: 'allViewer'
            },
            Name: 'policy',
            QueryStringsConfig: {
                QueryStringBehavior: 'all'
            }
        }
    });
})