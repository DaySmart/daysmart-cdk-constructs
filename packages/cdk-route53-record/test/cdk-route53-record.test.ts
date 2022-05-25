import { Stack } from '@aws-cdk/core';
import { CdkRoute53Record } from '../lib/index';
import '@aws-cdk/assert/jest'
import { SynthUtils } from '@aws-cdk/assert';

const stack = new Stack();
new CdkRoute53Record(stack, "CdkRoute53Record", {
    dnsRecords: [''],
    hostedZoneDomainNames: [''],
    loadBalancerArn: '',
    targetType: ''
}) 

const template = SynthUtils.toCloudFormation(stack)

test("Bucket name",  () => {
    expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
        BucketName: 'taylor-cdk.test.construct'
    })
})