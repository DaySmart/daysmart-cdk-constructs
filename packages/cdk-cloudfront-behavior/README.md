# Welcome to the Open Source Construct for instantiating the CdkBaseCfAcmR53 construct and adding desired S3 or Http Origins/Behaviors to the Cloudfront Distribution!

This CDK Construct Library includes (`CdkCloudfrontBehavior`) which instantiates the [CdkBaseCfAcmR53](https://github.com/DaySmart/daysmart-cdk-constructs/tree/main/packages/cdk-base-cf-acm-r53) construct. The cloudfront distribution which is a part of the instantiated base construct can then have additional behaviors added to it by calling this (`CdkCloudfrontBehavior`) construct's `addS3OriginBehavior` or `addHttpOriginBehavior` methods.

The construct defines an interface (`CdkCloudfrontBehaviorProps`) with the following properties that can be passed in:

- defaultBehaviorOrigin: "http" | "s3" => The string identifying whether the default CloudFront distribution behavior will be with an s3 or http origin. (ex. "http" or "s3")
- (required only if defaultBehaviorOrigin == "s3") defaultS3OriginBucketName: string => The bucket name for a default s3 origin (ex. app-bucket)
- (required only if defaultBehaviorOrigin == "s3") defaultOriginAccessIdentity: string => The origin access identity for a default s3 origin (ex. EGIMNVDRYJKK243HJNV)
- (required only if defaultBehaviorOrigin == "http") defaultHttpOriginName: string => The dns record for a default http origin (ex. test.google.com)
- project: string => The project name (ex. onlineconverter)
- stage: string => The project environment (ex. dev)
- domains: string[] => An array of domain names for this project environment (ex. ['google.com', 'bing.com', 'apple.com'])
- (optional) loggingBucketName: string => The name of an existing s3 bucket for receiving logs. (ex. logbucket1)

---

The `addS3OriginBehavior` method has the following required properties in order to call it:

- project: string => The project name (ex. onlineconverter)
- stage: string => The project environment (ex. dev)
- origins: S3Origin[] => An array of S3Origin objects, with an S3Origin defined as:

```
{
  bucketName: string;
  path: string;
  originAccessIdentity: string
}
```

---

The `addHttpOriginBehavior` method has the following required properties in order to call it:

- project: string => The project name (ex. onlineconverter)
- stage: string => The project environment (ex. dev)
- origins: HttpOrigin[] => An array of HttpOrigin objects, with a HttpOrigin defined as:

```
{
  host: string;
  path: string;
}
```

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
