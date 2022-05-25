import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkRoute53Record } from '../lib/index'

const keyArn = 'arn:aws:route53:us-west-2:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkRoute53Record(stack, 'AppCloudfront', {
        dnsRecords: [],
        hostedZoneDomainNames: [],
        loadBalancerArn: keyArn,
        targetType: 'target'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::', {
        
    });
})