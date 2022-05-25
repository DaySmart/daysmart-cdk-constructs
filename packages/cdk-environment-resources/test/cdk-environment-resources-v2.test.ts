import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEnvironmentResources } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEnvironmentResources(stack, 'AppCloudfront', {
        amiName: 'name',
        instanceProfileArn: 'arn:123456789',
        project: 'cdk',
        securityGroupId: '98765',
        stage: 'test',
        vpcId: '12345'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('', {
        
    });
})