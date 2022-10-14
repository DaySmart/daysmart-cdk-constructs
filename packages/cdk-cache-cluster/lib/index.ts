import { Construct } from 'constructs';
import { aws_elasticache, aws_elasticache as elasticache, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { PrivateSubnet } from 'aws-cdk-lib/aws-ec2';

export interface CacheClusterProps {
    cacheNodeType: string,
    engine: string,
    numCacheNodes: string,
    clusterName: string,
    port?: number,
    vpcId: string,
    vpcSecurityGroupIds: string[],
    cacheSubnetGroupName: string[]
}

export class CacheCluster extends Construct {
    constructor(scope: Construct, id: string, props: CacheClusterProps) {
      super(scope, id);

      let cluster: aws_elasticache.CfnCacheCluster;

      const existingVpc = ec2.Vpc.fromLookup(this, 'VPC', {
        vpcId: props.vpcId
      });

      const vpcSecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: existingVpc,
        securityGroupName: `${props.clusterName}-SG`
      });

      vpcSecurityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.tcp(11211));
      
      let subnetGroup: aws_elasticache.CfnSubnetGroup;

      subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
          cacheSubnetGroupName: `${props.clusterName}-SubnetGroup`,  //generate this
          description: `Subnet Group for ${props.clusterName}`,
          subnetIds: existingVpc.privateSubnets.map(subnet => subnet.subnetId)
      })
       
      cluster = new aws_elasticache.CfnCacheCluster(this, 'Cluster', {
        clusterName: props.clusterName,
        cacheNodeType: props.cacheNodeType,
        engine: props.engine,
        numCacheNodes: parseInt(props.numCacheNodes),
        port: 11211, 
        vpcSecurityGroupIds: [vpcSecurityGroup.securityGroupId],
        cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName
      });
    }
}