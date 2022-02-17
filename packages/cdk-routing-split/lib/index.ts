import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

export interface CdkRoutingSplitProps {
    originSourceDomain: string;
    tableName: string;
    appName: string;
    partitionKey: string;
    runtime: string;
    stage: string;
}

export class CdkRoutingSplit extends Construct {
    constructor(scope: Construct, id: string, props: CdkRoutingSplitProps) {
        super(scope, id);

        const codeBucket = new s3.Bucket(this, 'routing-split-code');
        const runtime = new lambda.Runtime(props.runtime);
        let originSourceDomain = new HttpOrigin(props.originSourceDomain);

        if (props.stage !== 'prod') {
            originSourceDomain = new HttpOrigin(`${props.stage} - ${props.originSourceDomain}`);
        }

        const edgeFunc = new cloudfront.experimental.EdgeFunction(this, 'Function', {
            runtime: runtime,
            handler: 'index.handler',
            code: lambda.Code.fromBucket(codeBucket, 'olb-routing-split'),
        });

        new cloudfront.Distribution(this, 'Dist', {
            defaultBehavior: {
                origin: originSourceDomain,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                edgeLambdas: [
                    {
                        functionVersion: edgeFunc.currentVersion,
                        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                    },
                ],
            },
            comment: `${props.stage} ${props.appName} route split Distribution`,
        });

        new lambda.Function(this, `${props.stage}-${props.appName}-split-add`, {
            runtime: runtime,
            handler: 'index.handler',
            code: lambda.Code.fromBucket(codeBucket, 'AddAccount'),
        });

        new lambda.Function(this, `${props.stage}-${props.appName}-split-update`, {
            runtime: runtime,
            handler: 'index.handler',
            code: lambda.Code.fromBucket(codeBucket, 'UpdateAccount'),
        });

        new lambda.Function(this, `${props.stage}-${props.appName}-split-delete`, {
            runtime: runtime,
            handler: 'index.handler',
            code: lambda.Code.fromBucket(codeBucket, 'DeleteAccount'),
        });

        new dynamodb.Table(this, `${props.stage}-${props.appName}-split-table`, {
            partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
            replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],
        });
    }
}
