import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');

export interface AppBucketProps {
    stage: string;
    appName: string;
}
export class AppBucket extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: AppBucketProps) {
        super(scope, id);

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: `${props.stage}-${props.appName.toLowerCase()}-website-bucket`,
            publicReadAccess: true,
            versioned: true,
        });

        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAcessIdentity', {
            comment: `OriginAccessIdentity for ${bucket.bucketName}.`
        });

        const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
            bucket: bucket
        });

        bucketPolicy.document.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [originAccessIdentity.grantPrincipal],
                actions: ['s3:GetObject'],
                resources: [bucket.bucketArn + "/*"],
            })
        );

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