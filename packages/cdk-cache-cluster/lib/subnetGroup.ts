import { Construct } from 'constructs';
import { aws_elasticache, aws_elasticache as elasticache } from 'aws-cdk-lib';

export interface SubnetGroupProps {
    description: string,
    subnetIds: string[],  
    cacheSubnetGroupName: string
}

export class SubnetGroup extends Construct {
    constructor(scope: Construct, id: string, props: SubnetGroupProps){
        super(scope, id);

        let subnetGroup: aws_elasticache.CfnSubnetGroup;

        subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
            cacheSubnetGroupName: props.cacheSubnetGroupName,
            description: props.description,
            subnetIds: props.subnetIds
        })

    }
}