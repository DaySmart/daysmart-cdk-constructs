import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEnvironmentResources } from '../lib/index'

const keyArn = 'arn:aws:env:us-west-2:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEnvironmentResources(stack, 'AppCloudfront', {
        amiName: 'name',
        instanceProfileArn: keyArn,
        project: 'cdk',
        securityGroupId: '98765',
        stage: 'test',
        vpcId: '12345'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'deploy-cdk.test.ecs'
    });

    template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: [
            'blah'
        ]
    });

    template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        SecurityGroups: [
            '98765'
        ]
    });

    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
        AutoScalingGroupName: 'test-cdk-ecs-asg'
    });

    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
        VPCZoneIdentifier: [
            'p-12345',
            'p-67890'
        ]
    });
})