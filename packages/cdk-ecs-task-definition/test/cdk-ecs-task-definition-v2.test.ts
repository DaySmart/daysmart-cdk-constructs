import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEcsTaskDefinition } from '../lib/index'

const keyArn = 'arn:aws:ecs:us-west-2:123456:key/blah';

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
        taskRoleArn: keyArn
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
        Roles: [
            'blah'
        ]
    });

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ExecutionRoleArn: 'arn:aws:ecs:us-west-2:123456:key/blah',
        Family: 'test-cdk'
    });
})