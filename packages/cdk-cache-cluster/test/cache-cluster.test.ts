import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions";
import { CdkCacheCluster } from '../lib/index';

test('Cache', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new CdkCacheCluster(stack, 'AppCloudfront', {
        cacheNodeType: 'cache.m6g.large',
        engine: 'memcached',
        numCacheNodes: 20
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2))

    template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
        CacheNodeType: 'cache.m6g.large',
        Engine: 'memcached',
        NumCacheNodes: 20
    });
})