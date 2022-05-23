import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEcsAlb } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEcsAlb(stack, 'AppCloudfront', {
        appName: 'cdk',
        certificateArn: '12345',
        clusterName: 'cluster',
        healthCheckPath: 'path',
        repositoryName: 'cdk',
        securityGroupId: 'zxcv',
        stage: 'test',
        taskDefinitionArn: 'asdf',
        vpcId: '9876'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Family: 'temp-test-cdk-ecs-task-definition'
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        VpcId: 'vpc-12345'
    })
    template.hasResourceProperties('AWS::ECS::Service', {
        ServiceName: 'test-cdk',
        TaskDefinition: 'asdf'
    })
})