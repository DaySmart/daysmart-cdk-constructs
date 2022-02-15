import * as cdk from '@aws-cdk/core';
import * as aws_dynamodb from '@aws-cdk/aws-dynamodb';
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core';

export interface CdkDynamodbtableProps {
    replicationRegions?: string[];
    tableName: string;
}

export class CdkDynamodbtable extends cdk.Construct {

  public globalTable: aws_dynamodb.Table;
  
  constructor(scope: cdk.Construct, id: string, props: CdkDynamodbtableProps) {
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

    const tableOutput = new CfnOutput(this, 'TableOutput', { value: this.globalTable.tableName });
    tableOutput.overrideLogicalId("TableName");
  }
}
