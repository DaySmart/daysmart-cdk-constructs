import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { PipelineArtifactsBucket } from '../lib/index'

const keyArn = 'arn:aws:kms:us-west-2:123456:key/blah';

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new PipelineArtifactsBucket(stack, 'AppCloudfront', {
        applicationGroup: '',
        kmsKeyId: keyArn,
        productGroup: 'testing'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
            Status: 'Enabled'
        }
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
        AccessControl: 'Private'
    });

//     template.hasResourceProperties('AWS::S3::Bucket', {
//         BucketEncryption: {
//             ServerSideEncryptionConfiguration: [{
//                 ServerSideEncryptionByDefault: {
//                     KMSMasterKeyID: 'keyArn',
//                     SSEAlgorithm: 'aws:kms'
//                 }
//             }] 
//         }
//     });
// })

// test('bucket policy gives read to accounts', () => {
//     const readAccountId = [
//         '123456',
//         '654321'
//     ];
//     const stack = new cdk.Stack(undefined, 'stack', {
//         env: {
//             account: '123456',
//             region: 'us-east-1'
//         }
//     });
//     new PipelineArtifactsBucket(stack, 'Artifact Bucket', {
//         applicationGroup: 'asdfg',
//         kmsKeyId: '98765',
//         productGroup: 'product',
//     });
//     const template = Template.fromStack(stack);
//     console.log(JSON.stringify(template, null, 2));

//     template.hasResourceProperties('AWS::S3::BucketPolicy', {
//         PolicyDocument: {
//             Statement: Array(
//                 Object({
//                     Action: [
//                         "s3:GetObject*",
//                         "s3:GetBucket*",
//                         "s3:List*"
//                     ],
//                     Effect: 'Allow',
//                     Principal: {
//                         AWS: {
//                             "Fn::Join": [
//                                 "",
//                                 [
//                                     "arn:",
//                                     {
//                                         Ref: 'AWS::Partition'
//                                     },
//                                     `:iam::${readAccountId}:root`
//                                 ]
//                             ]
//                         }
//                     }
//                 })
//             )
//         }
//     })
})