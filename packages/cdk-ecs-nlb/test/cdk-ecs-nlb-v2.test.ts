import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { CdkEcsNlb } from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkEcsNlb(stack, 'AppCloudfront', {
        appName: 'cdk',
        certificateArn: '12345',
        clusterName: 'cluster',
        healthCheckProtocol: 'https',
        repositoryName: 'cdk',
        securityGroupId: '98765',
        stage: 'test',
        taskDefinitionArn: 'asdf',
        vpcId: 'zxcv'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Family: 'temp-test-cdk-ecs-task-definition'
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-12345'
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        VpcId: 'vpc-12345'
    });

    template.hasResourceProperties('AWS::ECS::Service', {
        Cluster: 'cluster'
    });

    template.hasResourceProperties('AWS::ECS::Service', {
        ServiceName: 'test-cdk',
        TaskDefinition: 'asdf'
    });
})