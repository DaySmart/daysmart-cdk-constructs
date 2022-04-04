import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { HttpOrigin } from '@aws-cdk/aws-cloudfront-origins';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface CdkRouteSplittingProps {
  // Define construct properties here
  runtime: string;
  originSourceDomain: string;
  tableName: string;
  appName: string;
  partitionKey: string;
  stage: string;
}

export class CdkRouteSplitting extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkRouteSplittingProps) {
    super(scope, id);

    const runtime = new lambda.Runtime(props.runtime);
    let originSourceDomain = new HttpOrigin(props.originSourceDomain);

      if (props.stage !== 'prod') {
          originSourceDomain = new HttpOrigin(`${props.stage} - ${props.originSourceDomain}`);
      }

    new lambda.Function(this, `${props.stage}-${props.appName}-add-index`, {
      runtime: runtime,
      code: lambda.Code.fromAsset("../dist/add"),
      handler: 'handler'
    });

    new lambda.Function(this, `${props.stage}-${props.appName}-update-index`, {
      runtime: runtime,
      code: lambda.Code.fromAsset("../dist/update"),
      handler: 'handler'
    });

    new lambda.Function(this, `${props.stage}-${props.appName}-delete-index`, {
      runtime: runtime,
      code: lambda.Code.fromAsset("../dist/delete"),
      handler: 'handler'
    });

    const edgeFunc = new cloudfront.experimental.EdgeFunction(this, `${props.stage}-${props.appName}-get-origin`, {
      runtime: runtime,
      code: lambda.Code.fromAsset("../dist/get-origin"),
      handler: "handler"
    });

    new cloudfront.Distribution(this, `${props.stage}-${props.appName}-distribution`, {
      defaultBehavior: {
        origin: originSourceDomain,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [
          {
            functionVersion: edgeFunc.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          }
        ]
      },
      comment: `${props.stage} ${props.appName} route split Distribution`,
    })

    new dynamodb.Table(this, `${props.stage}-${props.appName}-route-splitting-table`, {
      partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
      replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
  });
  }
}
