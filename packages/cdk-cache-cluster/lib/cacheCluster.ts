import { Construct } from 'constructs';
import { aws_elasticache, aws_elasticache as elasticache } from 'aws-cdk-lib';

export interface CacheClusterProps {
    cacheNodeType: string,
    engine: string,
    numCacheNodes: number,
    clusterName: string,
    port?: number,
    cacheSubnetGroupName?: string
}

export class CacheCluster extends Construct {
    constructor(scope: Construct, id: string, props: CacheClusterProps) {
      super(scope, id);

      let cluster: aws_elasticache.CfnCacheCluster;

      cluster = new aws_elasticache.CfnCacheCluster(this, 'Cluster', {
        clusterName: props.clusterName,
        cacheNodeType: props.cacheNodeType,
        engine: props.engine,
        numCacheNodes: props.numCacheNodes,
        port: 11211,
        cacheSubnetGroupName: `${props.cacheSubnetGroupName}`
      });
    }
}