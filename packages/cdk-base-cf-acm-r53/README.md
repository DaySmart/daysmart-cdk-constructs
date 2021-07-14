# Welcome to your CDK TypeScript Construct Library project!

You should explore the contents of this project. It demonstrates a CDK Construct Library that includes a construct (`CdkBaseCfAcmR53`)
which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

The construct defines an interface (`CdkBaseCfAcmR53Props`) to configure the visibility timeout of the queue.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests

# Welcome to the Open Source Construct for an Api Gateway Custom Domain!

This CDK Construct Library includes a simple construct (`CdkBaseCfAcmR53`)
which is meant to be instantiated by the (`CdkCloudfrontBehavior`) construct.  (`CdkBaseCfAcmR53`) creates a certificate manager certificate with the stage, project, and domains[] provided; it also creates Route53 aliases for each provided domain following the formats below:

```
${stage}.${project}.${companyDomainName}
${stage}-${project}.${companyDomainName}
```
(and for stage == "prod")
```
${project}.${companyDomainName}
```

and lastly, this construct creates a cloudfront distribution for the route53 domains and defines a default behavior for the distribution.

The construct defines an interface (`CdkBaseCfAcmR53Props`) with the following properties that can be passed in:

- defaultBehaviorOptions: cloudfront.BehaviorOptions => The BehaviorOptions object according to the typescript cdk [documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.BehaviorOptions.html)
- project: string => The project name (ex. onlineconverter)
- stage: string => The environment for this project. (ex. dev)
- domains: string[] => An array of domain names for this project environment. (ex. ['google.com', 'bing.com', 'apple.com'])
- (optional) loggingBucketName: string => The name of an existing s3 bucket for receiving logs. (ex. logbucket1)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
