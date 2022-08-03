import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkRoute53Record } from '../lib/index'

const keyArn = 'arn:aws:route53:us-west-2:123456:key/blah';

// test('App Cloudfront', () => {
//     const stack = new cdk.Stack(undefined, 'stack', {
//         env: {
//             account: '123456',
//             region: 'us-east-1'
//         }
//     });
//     new CdkRoute53Record(stack, 'AppCloudfront', {
//         dnsRecords: ['www.exampletester.com'],
//         hostedZoneDomainNames: ['exampletester.com'],
//         loadBalancerArn: keyArn,
//         targetType: 'alb',
//         distributionID: 'id',
//         distributionName: 'name'
//     });

//     const template = Template.fromStack(stack);
//     console.log(JSON.stringify(template, null, 2));

//     template.hasResourceProperties('AWS::Route53::RecordSet', {
//         Name: 'www.exampletester.com.'
//     });

//     template.hasResourceProperties('AWS::Route53::RecordSet', {
//         AliasTarget: {
//             DNSName: 'dualstack.my-load-balancer-1234567890.us-west-2.elb.amazonaws.com'
//         }
//     });
// })

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkRoute53Record(stack, 'AppCloudfront', {
        distributionId: '1234',
        dnsRecords: ['www.example.com'],
        hostedZoneDomainNames: ['example.com'],
        loadBalancerArn: keyArn,
        targetType: 'cloudfront',
        distributionDomainName: 'testing'
        });

        const template = Template.fromStack(stack);
        console.log(JSON.stringify(template, null, 2));
        template.hasResourceProperties('AWS::Route53::RecordSet', {
            Name: 'www.example.com.'
        });

        template.hasResourceProperties('AWS::Route53::RecordSet', {
            AliasTarget: {
                DNSName: 'testing'
            }
        })
    })