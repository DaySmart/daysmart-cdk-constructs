import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEcsCodedeployResources } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEcsCodedeployResources(stack, 'AppCloudfront', {
        appName: 'cdk',
        clusterName: 'cluster',
        commitHash: '98765',
        deployBucket: 'bucket',
        listenerArn: '12345',
        serviceName: 'service',
        stage: 'test',
        targetGroup1Name: 'group1'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('', {
    });
})