import * as cdk from 'aws-cdk-lib/core';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for the shared KMS key
 */
export interface SharedKMSKeyProps {

    /**
     * The AWS organization id to share the key with
     */
    organizationId: string;

    /**
     * The application or application group the key is for
     */
    applicationGroup: string;

    /**
     * The two letter product group code
     */
    productGroup: string;
}

/**
 * KMS key designed to be shared accross an organization
 */
export class SharedKMSKey extends Construct {
    readonly key: kms.IKey;

    constructor(scope: Construct, id: string, props: SharedKMSKeyProps) {
        super(scope, id);

        this.key = new kms.Key(this, 'Key', {
            description: "KMS Key for Encryption of Resources",
            enabled: true
        });

        this.key.grantDecrypt(new iam.OrganizationPrincipal(props.organizationId));

        const alias = this.key.addAlias(`alias/${props.productGroup}-${props.applicationGroup}-shared-services-${cdk.Stack.of(this).region}`);

        const keyArn = new cdk.CfnOutput(this, 'KeyArn', {
            value: this.key.keyArn
        });
        keyArn.overrideLogicalId('KeyArn');

        const keyAlias = new cdk.CfnOutput(this, 'KeyAlias', {
            value: alias.aliasName
        });
        keyAlias.overrideLogicalId('KeyAlias');
    }
}