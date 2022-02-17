import * as cdk from '@aws-cdk/core';
import * as aws_dynamodb from '@aws-cdk/aws-dynamodb';
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core';
import { ProjectionType } from '@aws-cdk/aws-dynamodb';

export interface CdkDynamodbtableProps {
    replicationRegions?: string[];
    tableName: string;
    globalSecondaryIndexes?: [globalSecondaryIndex];
}

export interface globalSecondaryIndex {
  partitionKey: string;
  sortKey: string;
  projection?: aws_dynamodb.ProjectionType;
  attributes?: string[];
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
