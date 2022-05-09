import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_kms as kms } from 'aws-cdk-lib';
import * as assert from 'aws-cdk-lib/assertions'


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
export class PipelineArtifactsBucket extends Construct {
    readonly artifactBucket: s3.IBucket;

    constructor(scope: Construct, id: string, props: PipelineArtifactsBucketProps) {
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