// import * as cdk from '@aws-cdk/core';
// import '@aws-cdk/assert/jest'
// import { PipelineArtifactsBucket } from '../lib/PipelineArtifactsBucket';
// import { arrayWith, objectLike } from '@aws-cdk/assert';
// import { SynthUtils } from '@aws-cdk/assert';

// const keyArn = 'arn:aws:kms:us-west-2:123456:key/blah';

// const stack = new cdk.Stack();
//     new PipelineArtifactsBucket(stack, 'ArtifactsBucket', {
//         applicationGroup: 'app',
//         kmsKeyId: keyArn,
//         productGroup: 'test'
//     });

//     const template = SynthUtils.toCloudFormation(stack)
//     console.log(JSON.stringify(template, null, 2))

// test('bucket is versioned', () => {
//     expect(stack).toHaveResource('AWS::S3::Bucket', {
//         VersioningConfiguration: {
//             Status: 'Enabled'
//         }
//     });
// });

// test('bucket is private', () => {
//     expect(stack).toHaveResource('AWS::S3::Bucket', {
//         AccessControl: 'Private'
//     });
// });

// test('bucket has kms encryption', () => {
//     expect(stack).toHaveResource('AWS::S3::Bucket', {
//         BucketEncryption: {
//             ServerSideEncryptionConfiguration: [{
//                 ServerSideEncryptionByDefault: {
//                     KMSMasterKeyID: keyArn,
//                     SSEAlgorithm: 'aws:kms'
//                 }
//             }] 
//         }
//     });
// });

// test('bucket policy gives read to accounts', () => {
//     const readAccountIds = [
//         '123456',
//         '654321'
//     ];
//     const stackWithAccounts = new cdk.Stack();
//     new PipelineArtifactsBucket(stackWithAccounts, 'ArtifactsBucket', {
//         applicationGroup: 'app',
//         kmsKeyId: keyArn,
//         productGroup: 'test',
//         readAccountIds: readAccountIds
//     });

//     readAccountIds.forEach(readAccountId => {
//         expect(stackWithAccounts).toHaveResourceLike('AWS::S3::BucketPolicy', {
//             PolicyDocument: {
//                 Statement: arrayWith(
//                     objectLike({
//                         Action: [
//                             "s3:GetObject*",
//                             "s3:GetBucket*",
//                             "s3:List*"
//                         ],
//                         Effect: 'Allow',
//                         Principal: {
//                             AWS: {
//                                 "Fn::Join": [
//                                     "",
//                                     [
//                                         "arn:",
//                                         {
//                                             Ref: 'AWS::Partition'
//                                         },
//                                         `:iam::${readAccountId}:root`
//                                     ]
//                                 ]
//                             }
//                         }
//                     })
//                 )
//             }
//         });
//     });
// });