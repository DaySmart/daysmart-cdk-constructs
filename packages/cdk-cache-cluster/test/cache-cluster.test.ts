import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { CacheCluster } from '../lib/index';

test('Cache', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CacheCluster(stack, 'CacheCluster', {
        cacheNodeType: 'cache.m6g.large',
        engine: 'memcached',
        numCacheNodes: '1',
        clusterName: 'rate-limit',
        port: 11211,
        vpcId: 'vpc-12345abcde',
        cacheSubnetGroupName: ['subnetgroup'],
        vpcSecurityGroupIds: ['securitygroup']

    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
        CacheNodeType: 'cache.m6g.large',
        Engine: 'memcached',
        NumCacheNodes: 1,
        ClusterName: 'rate-limit',
        Port: 11211,
    });
})