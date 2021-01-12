import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');

export class AppBucket extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: any) {
        super(scope, id);

        new s3.Bucket(this, 'Bucket', {
            bucketName: `${props.stage}-${props.appName.toLowerCase()}-website-bucket`,
            publicReadAccess: true,
            versioned: true,
        });
    }
}