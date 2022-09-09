import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_elasticache as elasticache } from 'aws-cdk-lib';

export interface CdkCacheClusterProps {
    cacheNodeType: string,
    engine: string,
    numCacheNodes: number,
    clusterName?: string
}

export class CdkCacheCluster extends Construct {
    constructor(scope: Construct, id: string, props: CdkCacheClusterProps) {
      super(scope, id);

      const cluster = new elasticache.CfnCacheCluster(this, 'MyCluster', {
        cacheNodeType: props.cacheNodeType,
        engine: props.engine,
        numCacheNodes: props.numCacheNodes
      })
    }
}