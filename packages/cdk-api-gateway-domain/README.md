# Welcome to the Open Source Construct for an Api Gateway Custom Domain!

This CDK Construct Library includes a construct (`CdkApiGatewayDomain`)
which creates a custom domain for the specified API Gateway api, along with a base path mapping and route53 alias record to the endpoint cloudfront distribution

The construct defines an interface (`CdkApiGatewayDomainProps`) with the following properties that can be passed in:

  * companyDomainName => The Hosted Zone name in Route53 (ex. daysmart.com)
  * companyHostedZoneId => The Hosted Zone ID in Route53 (ex. "Z2FDTNDATAQYW2")
  * project => The name of the project that is using this construct for some of its resources. (ex. pdfconverter)
  * baseEnv => The name of your base environment. (ex. dev, stage, prod)
  * dynamicEnv? => The name of a dynamic environment if applicable. (ex. matt-test)
  * certificateArn => The arn of a valid AWS Certificate Manager certificate that covers your intended custom domain name.  This can be a raw string, but should preferably be a Frank reference to the cert. arn output of another CloudFormation stack, made by the @cdk-certificate module. (ex. ${matttest:pdfconverter-cert-06-04-2021:CertificateArn} => The first part of a Frank reference is the env specified in the Frank template for the certificate stack; the second portion is the certificate stack name; the last part is the name of the desired stack output which should almost always be "CertificateArn")
  * restApiId => The ID of an API Gateway Rest API, provisioned beforehand through serverless or some other provider (ex. ae2u06ed94)
  * basePath => The desired path for the api's base path mapping (ex. api)

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile