import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { SubnetGroup } from '../lib/subnetGroup';

test('Subnet', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new SubnetGroup(stack, 'Subnet', {
        cacheSubnetGroupName: 'group',
        description: 'testing subnet',
        subnetIds: ['testing', 'test']
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ElastiCache::SubnetGroup', {
        Description: 'testing subnet',
        SubnetIds: [
            'testing',
            'test'
        ],
        CacheSubnetGroupName: 'group'
    })
})