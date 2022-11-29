import * as cdk from 'aws-cdk-lib';
import s3 = require('aws-cdk-lib/aws-s3');
import cloudfront = require('aws-cdk-lib/aws-cloudfront');
import iam = require('aws-cdk-lib/aws-iam');
import { BucketPolicy } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CdkFilesBucketProps {
  stage: string;
  projectName: string;
  dynamicEnvName: string;
  appName: string;
  publicFilePath?: string;
  restrictFileTypes?: boolean;
}

export class CdkFilesBucket extends Construct {

  ALLOWED_FILE_TYPES_IMAGES = [
    'png',
    'jpg',
    'jpeg',
    'bmp',
    'img',
    'ico'
  ]

  ALLOWED_FILE_TYPES_FILE_UPLOADS = [
    'png',
    'jpg',
    'jpeg',
    'bmp',
    'img',
    'doc',
    'docx',
    'pdf',
    'txt',
    'rtf',
    'xls',
    'xlsx',
    'csv'
  ]

  constructor(scope: Construct, id: string, props: CdkFilesBucketProps) {
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
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
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
        ...this.ALLOWED_FILE_TYPES_IMAGES.map(fileType => `${bucket.bucketArn}/${publicFilePath}/*.${fileType}`),
        ...this.ALLOWED_FILE_TYPES_IMAGES.map(fileType => `${bucket.bucketArn}/*/signatures/*.${fileType}`),
        ...this.ALLOWED_FILE_TYPES_FILE_UPLOADS.map(fileType => `${bucket.bucketArn}/*/fileUploads/*.${fileType}`)
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
