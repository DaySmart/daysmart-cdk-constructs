# CdkPipeline

CodePipeline that uses includes a build step and will send build artifacts to S3 to multiple AWS accounts for deployment.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## Construct Parameters
 | Parameter                | Type                     | Description                  |
 | ------------------------ | ------------------------ | ---------------------------- |
 | `repoName`               | `string`                 | Repository name              |
 | `repoOwner`              | `string`                 | Owner of the repository      |
 | `branch`                 | `string`                 | Branch name for the pipeline |
 | `artifactBucket`         | `s3:IBucket`             | S3 bucket in Shared Services account for artifacts |
 | `codeStartConnectionArn` | `string`                 | ARN of CodeStart connection  |
 | `services`               | `Array<string>`          | (Optional) list of services in repo |
 | `testAccounts`           | `Array<AWSTestAccounts>` | List of AWS accounts to deploy artifacts to |

 ### `AWSTestAccount` properties
| Parameter                | Type                     | Description                  |
 | ------------------------ | ------------------------ | ---------------------------- |
 | `name`                  | `string`                 | Human readable name for AWS account |
 | `codeBucket`            | `s3:IBucket`             | S3 bucket to send code artifacts to |
| `crossAccountRole`       | `iam:IRole`              | IAM role needed by CodePipeline to write artifacts cross account |
