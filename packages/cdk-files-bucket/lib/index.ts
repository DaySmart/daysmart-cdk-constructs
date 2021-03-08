import * as cdk from '@aws-cdk/core';
import s3 = require('@aws-cdk/aws-s3');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');
import { BucketPolicy } from '@aws-cdk/aws-s3';

export interface CdkFilesBucketProps {
  stage: string;
  projectName: string;
  dynamicEnvName: string;
  appName: string;
  publicFilePath?: string;
  restrictFileTypes?: boolean;
}

export class CdkFilesBucket extends cdk.Construct {

  ALLOWED_FILE_TYPES = [
    'png',
    'jpg',
    'jpeg',
    'bmp',
    'img',
    'ico'
  ]

  constructor(scope: cdk.Construct, id: string, props: CdkFilesBucketProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${props.dynamicEnvName}-${props.appName}.${props.stage}.${props.projectName}`,
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET, 
          s3.HttpMethods.POST, 
          s3.HttpMethods.PUT, 
          s3.HttpMethods.DELETE
        ],
        allowedOrigins: ['*']
      }]
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAIdentity', {
      comment: `OriginAccessIdentity for ${bucket.bucketName}`
    });

    const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
      bucket: bucket
    });

    const bucketWritePolicy = new iam.ManagedPolicy(this, 'BucketWriteIAMPolicy', {
      managedPolicyName: `${props.dynamicEnvName}-${props.stage}-${props.projectName}-${props.appName}-bucket-write`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [`${bucket.bucketArn}/*`]
        })
      ]
    });

    bucketPolicy.document.addStatements(
      new iam.PolicyStatement(
        {
          effect: iam.Effect.ALLOW,
          principals: [originAccessIdentity.grantPrincipal],
          actions: ['s3:GetObject'],
          resources: [bucket.bucketArn + `/${props.publicFilePath || 'public'}/*`]
        }
      ),
      ...this.getBucketPolicyDocuments(
          bucket, 
          new iam.AccountPrincipal(cdk.Stack.of(this).account), 
          props.restrictFileTypes, 
          props.publicFilePath
        ),
    );

    let bucketOutput = new cdk.CfnOutput(this, 'FilesBucket', {
      value: bucket.bucketName
    });

    bucketOutput.overrideLogicalId("FilesBucket");

    let originAccessIdentityOutput = new cdk.CfnOutput(this, "OriginAccessIdentity", {
      value: originAccessIdentity.originAccessIdentityName
    });

    originAccessIdentityOutput.overrideLogicalId("OriginAccessIdentity");

    let bucketWritePolicyOutput = new cdk.CfnOutput(this, 'BucketWritePolicy', {
      value: bucketWritePolicy.managedPolicyArn
    });

    bucketWritePolicyOutput.overrideLogicalId('BucketWritePolicy');
  }

  getBucketPolicyDocuments(bucket: s3.Bucket, iamPrincipal?: iam.IPrincipal, restrictFileTypes = true, publicFilePath = 'public'): Array<iam.PolicyStatement> {
    let policyDocuments: Array<iam.PolicyStatement> = [];

    if(restrictFileTypes) {
      const resources = [
        ...this.ALLOWED_FILE_TYPES.map(fileType => `${bucket.bucketArn}/${publicFilePath}/*.${fileType}`),
        ...this.ALLOWED_FILE_TYPES.map(fileType => `${bucket.bucketArn}/*/signatures/*.${fileType}`)
      ]

      policyDocuments.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: iamPrincipal ? [iamPrincipal] : undefined,
          actions: ['s3:PutObject'],
          resources: resources
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          principals: iamPrincipal ? [new iam.AnyPrincipal()] : undefined,
          actions: ['s3:PutObject'],
          notResources: resources
        })
      );
    }
    
    return policyDocuments;
  }
}
