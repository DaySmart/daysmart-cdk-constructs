import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';

/**
 * Properties for shared S3 bucket for pipeline artifacts
 */
export interface PipelineArtifactsBucketProps {

    /**
     * The name of the application or group of applications the bucket will be used for
     * 
     */
    applicationGroup: string;

    /**
     * The 2 letter product group code
     * 
     */
    productGroup: string;

    /**
     * The Arn for the shared KMS key used for bucket encryption. Use SharedKMSKey construct
     * 
     */
    kmsKeyId: string;

    /**
     * List of AWS account ids that require read permissions to the bucket
     * 
     */
    readAccountIds?: string[];
}

/**
 * A shared S3 bucket for storing artifacts from CodePipeline
 */
export class PipelineArtifactsBucket extends cdk.Construct {
    readonly artifactBucket: s3.IBucket;

    constructor(scope: cdk.Construct, id: string, props: PipelineArtifactsBucketProps) {
        super(scope, id);

        this.artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
            bucketName: `${props.productGroup}-${props.applicationGroup}-pipeline-artifacts-${cdk.Stack.of(this).region}`,
            versioned: true,
            encryption: s3.BucketEncryption.KMS,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kms.Key.fromKeyArn(this, 'SharedKey', props.kmsKeyId)
        });

        if(props.readAccountIds && props.readAccountIds.length > 0) {
            props.readAccountIds.forEach(accountId => {
                this.artifactBucket.grantRead(new iam.AccountPrincipal(accountId));
            });
        }

        const bucketArn = new cdk.CfnOutput(this, 'BucketArn', {
            value: this.artifactBucket.bucketArn
        });
        bucketArn.overrideLogicalId('BucketArn');
    }
}