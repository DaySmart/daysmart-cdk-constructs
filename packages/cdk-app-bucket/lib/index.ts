import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');

export interface AppBucketProps {
    stage: string;
    appName: string;
    dynamicEnvName: string;
    projectName: string;
    sharedServicesAccountId?: string;
}
export class AppBucket extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: AppBucketProps) {
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