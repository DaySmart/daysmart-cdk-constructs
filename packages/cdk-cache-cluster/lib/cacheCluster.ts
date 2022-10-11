import { Construct } from 'constructs';
import { aws_elasticache, aws_elasticache as elasticache } from 'aws-cdk-lib';
import { SubnetGroup } from './subnetGroup'

export interface CdkCacheClusterProps {
    cacheNodeType: string,
    engine: string,
    numCacheNodes: number,
    clusterName: string,
    port?: number,
    cacheSubnetGroupName?: string
}

export class CdkCacheCluster extends Construct {
    constructor(scope: Construct, id: string, props: CdkCacheClusterProps) {
      super(scope, id);

      let cluster: aws_elasticache.CfnCacheCluster;
      const subnet = SubnetGroup;

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