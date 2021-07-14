import * as cdk from '@aws-cdk/core';
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkBaseCfAcmR53Props {
  defaultBehaviorOptions: cloudfront.BehaviorOptions;
  project: string;
  stage: string;
  loggingBucketName?: string;
  domains: string[];
}

export interface Zones {
  [key: string]: route53.IHostedZone
}

export class CdkBaseCfAcmR53 extends cdk.Construct {
  public distribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, id: string, props: CdkBaseCfAcmR53Props) {
    super(scope, id);

    let subjectAlternativeNames: Array<string> = [];
    let multiZones: Zones = {};
    const companyDomainNames = props.domains;

    companyDomainNames.forEach(companyDomainName => {
      var companyHostedZone = route53.HostedZone.fromLookup(this, `${companyDomainName} HostedZone`, {
        domainName: companyDomainName,
        privateZone: false
      });

      subjectAlternativeNames.push(
        `${props.stage}.${props.project}.${companyDomainName}`,
        `*.${props.stage}.${props.project}.${companyDomainName}`,
        `*.${companyDomainName}`
      );

      if (props.stage === 'prod') {
        subjectAlternativeNames.push(
          `${props.project}.${companyDomainName}`,
          `*.${props.project}.${companyDomainName}`
        );
      }

      multiZones[companyDomainName] = companyHostedZone
    });

    var certificateValidation = acm.CertificateValidation.fromDnsMultiZone(multiZones);

    var certificate = new acm.Certificate(this, 'Certificate', {
      domainName: subjectAlternativeNames[0],
      subjectAlternativeNames: subjectAlternativeNames.slice(1),
      validation: certificateValidation
    });

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: props.defaultBehaviorOptions,
      certificate: certificate,
      domainNames: this.getAliases(props, companyDomainNames),
      defaultRootObject: "index.html",
      comment: `${props.stage} ${props.project}`,
      enableLogging: (props.loggingBucketName) ? true : false,
      logBucket: (props.loggingBucketName) ? s3.Bucket.fromBucketName(this, "CloudfrontLoggingBucket", props.loggingBucketName) : undefined,
      logIncludesCookies: (props.loggingBucketName) ? true : false,
      logFilePrefix: (props.loggingBucketName) ? `${props.stage}-${props.project}` : undefined,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          ttl: cdk.Duration.minutes(1),
          responsePagePath: "/index.html"
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          ttl: cdk.Duration.minutes(1),
          responsePagePath: "/index.html"
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
    });

    var cloudfrontTarget = new targets.CloudFrontTarget(this.distribution);

    companyDomainNames.forEach(companyDomainName => {
      var companyHostedZone = route53.HostedZone.fromLookup(this, `Same ${companyDomainName} HostedZone`, {
        domainName: companyDomainName,
        privateZone: false
      });
      new route53.ARecord(this, `${props.stage}.${props.project}.${companyDomainName}-RecordSet`, {
        zone: companyHostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: `${props.stage}.${props.project}.${companyDomainName}`
      });
      new route53.ARecord(this, `${props.stage}-${props.project}.${companyDomainName}-RecordSet`, {
        zone: companyHostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: `${props.stage}-${props.project}.${companyDomainName}`
      });
    });


    var output = new cdk.CfnOutput(this, "CertificateArn", {
      value: certificate.certificateArn
    });

    var output2 = new cdk.CfnOutput(this, "CloudfrontDistribution", {
      value: this.distribution.distributionId
    });

    var output3 = new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName
    })

    output.overrideLogicalId("CertificateArn");
    output2.overrideLogicalId("CloudfrontDistribution");
    output3.overrideLogicalId("DistributionDomainName");
  }

  getAliases(props: CdkBaseCfAcmR53Props, companyDomainNames: Array<string>): Array<string> {
    let aliases: Array<string> = [];
    companyDomainNames.forEach(companyDomainName => {
      aliases.push(
        `${props.stage}.${props.project}.${companyDomainName}`,
        `${props.stage}-${props.project}.${companyDomainName}`
      );
    });
    
    return aliases;
  }
}
