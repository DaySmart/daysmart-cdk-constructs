import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export interface CdkMultiApplicationProps {
    partitionKey: string;
    originBucketName: string;
}

export class CdkMultiApplication extends Construct {

  constructor(scope: Construct, id: string, props: CdkMultiApplicationProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'application-split-code');

    const originBucket = s3.Bucket.fromBucketName(this, 'Bucket', props.originBucketName);

    const edgeFunc = new cloudfront.experimental.EdgeFunction(this, 'Function', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromBucket(bucket, 'edge')
    });

    const distrubution = new cloudfront.Distribution(this, 'Dist', {
        defaultBehavior: { 
            origin: new S3Origin(originBucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            edgeLambdas: [
                {
                    functionVersion: edgeFunc.currentVersion,
                    eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                },
            ],
        },
    });

    const addFn = new lambda.Function(this, 'AddFunction', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromBucket(bucket, 'AddAccount')
    });
    
    const updateFn = new lambda.Function(this, 'UpdateFunction', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromBucket(bucket, 'UpdateAccount')
    });

    const deleteFn = new lambda.Function(this, 'DeleteFunction', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromBucket(bucket, 'DeleteAccount')
    });

    new dynamodb.Table(this, 'Table', {
        partitionKey: {name: props.partitionKey, type: dynamodb.AttributeType.STRING},
        replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2']
    });
  }
}
