import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { CdkCacheCluster } from '../lib/cacheCluster';

test('Cache', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCacheCluster(stack, 'CacheCluster', {
        cacheNodeType: 'cache.m6g.large',
        engine: 'memcached',
        numCacheNodes: 1,
        clusterName: 'rate-limit',
        cacheSubnetGroupName: 'accept-testing',
        port: 11211,

    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
        CacheNodeType: 'cache.m6g.large',
        Engine: 'memcached',
        NumCacheNodes: 1,
        CacheSubnetGroupName: 'accept-testing',
        ClusterName: 'rate-limit',
        Port: 11211,
    });
})