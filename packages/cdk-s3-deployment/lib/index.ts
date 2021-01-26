import * as cdk from '@aws-cdk/core';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';

export interface CdkS3DeploymentProps {
  bucketName: string;
  distributionId: string;
  distributionDomain: string;
  sourceDir?: string;
  distributionPath?: string;
}

export class CdkS3Deployment extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkS3DeploymentProps) {
    super(scope, id);

    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);

    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'Distribution', {
      distributionId: props.distributionId,
      domainName: props.distributionDomain
    });

    new BucketDeployment(this, 'BucketDeployment', {
      destinationBucket: bucket,
      sources: [Source.asset(props.sourceDir ? props.sourceDir : '../dist')],
      distribution: distribution,
      distributionPaths: [props.distributionPath ? props.distributionPath : '/*']
    });
  }
}
