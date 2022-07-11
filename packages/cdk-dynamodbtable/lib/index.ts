import * as aws_dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export interface CdkDynamodbtableProps {
    replicationRegions?: string[];
    tableName: string;
    globalSecondaryIndexes?: [globalSecondaryIndex];
    pointInTimeRecovery?: boolean;
}

export interface globalSecondaryIndex {
  partitionKey: string;
  sortKey: string;
  projection?: aws_dynamodb.ProjectionType;
  attributes?: string[];
} 

export class CdkDynamodbtable extends Construct {

  public globalTable: aws_dynamodb.Table;
  
  constructor(scope: Construct, id: string, props: CdkDynamodbtableProps) {
    super(scope, id);

    this.globalTable = new aws_dynamodb.Table(this, 'Table', {
        partitionKey: { name: 'PK', type: aws_dynamodb.AttributeType.STRING },
        replicationRegions: props.replicationRegions,
        billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: aws_dynamodb.TableEncryption.DEFAULT,
        sortKey: { name: 'SK', type: aws_dynamodb.AttributeType.STRING },
        tableName: props.tableName,
        pointInTimeRecovery: true,
        removalPolicy: RemovalPolicy.RETAIN
    });

    if (props.globalSecondaryIndexes) {
      props.globalSecondaryIndexes.forEach(globalSecondaryIndex => {
        this.globalTable.addGlobalSecondaryIndex({
          indexName: globalSecondaryIndex.partitionKey,
          partitionKey: {name: globalSecondaryIndex.partitionKey, type: aws_dynamodb.AttributeType.STRING},
          sortKey: {name: globalSecondaryIndex.sortKey, type: aws_dynamodb.AttributeType.STRING},
          projectionType: globalSecondaryIndex.projection,
          nonKeyAttributes: globalSecondaryIndex.attributes
        });
      })
    }

    const tableOutput = new CfnOutput(this, 'TableOutput', { value: this.globalTable.tableName });
    tableOutput.overrideLogicalId("TableName");

    const tableArn = new CfnOutput(this, 'TableArn', { value: this.globalTable.tableArn });
    tableArn.overrideLogicalId("TableArn");
  }
}
