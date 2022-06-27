import * as path from 'path'; 
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Source, SourceConfig, ISource } from 'aws-cdk-lib/aws-s3-deployment';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AwsCliLayer } from 'aws-cdk-lib/lambda-layer-awscli';
import { Construct } from 'constructs';

export interface CdkS3DeploymentProps {
  bucketName: string;
  distributionId: string;
  distributionDomain: string;
  sourceDir?: string;
  distributionPath?: string;
  invalidationPath?: string;
  environment: string;
  snsTopicArn: string;
}

export class CdkS3Deployment extends Construct {

  constructor(scope: Construct, id: string, props: CdkS3DeploymentProps) {
    super(scope, id);

    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);

    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'Distribution', {
      distributionId: props.distributionId,
      domainName: props.distributionDomain
    });

    let destinationPrefix = props.distributionPath;
    if(destinationPrefix && destinationPrefix.startsWith('/')) {
      destinationPrefix = destinationPrefix.substring(1);
    }

    const handler = new lambda.SingletonFunction(this, 'BucketDeploymentHandler', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      layers: [new AwsCliLayer(this, 'AWSCliLayer')],
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'handler.handler',
      lambdaPurpose: 'Custom::BucketDeployment',
      timeout: cdk.Duration.minutes(15),
      uuid: '8693BB64-9689-44B6-9AAF-B0CC9EB8756C'
    });

    bucket.grantReadWrite(handler);

    const handlerRole = handler.role;
    if(!handlerRole) { throw new Error('lambda.SingletonFunction should have created a Role'); }
    const sources: SourceConfig[] = [Source.asset(props.sourceDir ? props.sourceDir : '../dist')].map((source: ISource) => source.bind(this, {  handlerRole }));

    handler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudfront:GetInvalidation',
        'cloudfront:CreateInvalidation',
        'cloudfront:ListDistributions'
      ],
      resources: ['*']
    }));

    handler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sns:Publish'
      ],
      resources: [`${props.snsTopicArn}`]
    }));

    new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: handler.functionArn,
      resourceType: 'Custom::BucketDeployment',
      properties: {
        SourceBucketNames: sources.map(source => source.bucket.bucketName),
        SourceObjectKeys: sources.map(source => source.zipObjectKey),
        DestinationBucketName: bucket.bucketName,
        DestinationBucketKeyPrefix: destinationPrefix,
        DistributionId: distribution.distributionId,
        DistributionPaths: [props.invalidationPath ? props.invalidationPath : '/*'],
        Environment: props.environment,
        SnsTopicArn: props.snsTopicArn
      }
    });
  }
}
