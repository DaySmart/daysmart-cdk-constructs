import { Construct } from 'constructs';
import { aws_dynamodb, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

export interface CdkDynamotableProps {
  replicationRegions?: string[];
  tableName: string;
}

export class CdkDynamotable extends Construct {

  public globalTable: aws_dynamodb.Table;
  
  constructor(scope: Construct, id: string, props: CdkDynamotableProps) {
    super(scope, id);

    this.globalTable = new aws_dynamodb.Table(this, 'Table', {
        partitionKey: { name: 'PK', type: aws_dynamodb.AttributeType.STRING },
        replicationRegions: props.replicationRegions,
        billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: aws_dynamodb.TableEncryption.DEFAULT,
        sortKey: { name: 'SK', type: aws_dynamodb.AttributeType.STRING },
        tableName: props.tableName,
        removalPolicy: RemovalPolicy.RETAIN
    });
    
    const tableOutput = new CfnOutput(this, 'TableName', { value: this.globalTable.tableName });
    tableOutput.overrideLogicalId('TableName');
  }
}
