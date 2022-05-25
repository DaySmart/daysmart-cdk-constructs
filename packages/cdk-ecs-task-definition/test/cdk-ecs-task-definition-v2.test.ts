import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEcsTaskDefinition } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEcsTaskDefinition(stack, 'AppCloudfront', {
        appName: 'cdk',
        cpuUnits: 'unit',
        memoryUnits: 'mem',
        repositoryName: 'cdk',
        stage: 'test',
        taskRoleArn: 'arn:123456789'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('', {
        
    });
})