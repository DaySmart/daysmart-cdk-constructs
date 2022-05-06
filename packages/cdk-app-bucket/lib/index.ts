import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';

export interface AppBucketProps {
    stage: string;
    appName: string;
    dynamicEnvName: string;
    projectName: string;
    sharedServicesAccountId?: string;
}
export class AppBucket extends Construct {
    constructor(scope: Construct, id: string, props: AppBucketProps) {
        super(scope, id);

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: `${props.dynamicEnvName}-${props.appName}.${props.stage}.${props.projectName}`,
            versioned: true,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAcessIdentity', {
            comment: `OriginAccessIdentity for ${bucket.bucketName}.`
        });

        bucket.grantRead(originAccessIdentity)

        if(props.sharedServicesAccountId) {
            bucket.grantReadWrite(new iam.AccountPrincipal(props.sharedServicesAccountId));
        }

        let output = new cdk.CfnOutput(this, "AppBucket", {
            value: bucket.bucketName
        });

        let output2 = new cdk.CfnOutput(this, "OriginAccessIdentity", {
            value: originAccessIdentity.originAccessIdentityName
        });

        output.overrideLogicalId("AppBucket");
        output2.overrideLogicalId("OriginAccessIdentity");
    }
}