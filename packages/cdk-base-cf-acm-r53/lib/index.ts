import * as cdk from '@aws-cdk/core';
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkBaseCfAcmR53Props {
  defaultBehaviorOptions: cloudfront.BehaviorOptions;
  project: string;
  baseEnv: string;
  componentName: string;
  dynamicEnv?: string;
  certificateArn?: string;
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

    let subjectAlternativeNames: string[] = [];
    let multiZones: Zones = {};
    let certificate: acm.ICertificate;
    const companyDomainNames = props.domains;
    let logFilePrefix: string | undefined = undefined;

    if (props.certificateArn) {
      certificate = acm.Certificate.fromCertificateArn(this, "Certificate", props.certificateArn);
    } else {
      companyDomainNames.forEach(companyDomainName => {
        var companyHostedZone = route53.HostedZone.fromLookup(this, `${companyDomainName} HostedZone`, {
          domainName: companyDomainName,
          privateZone: false
        });

        subjectAlternativeNames.push(
          `${props.baseEnv}.${props.project}.${companyDomainName}`,
          `*.${props.baseEnv}.${props.project}.${companyDomainName}`,
          `*.${companyDomainName}`
        );

        if (props.baseEnv === 'prod') {
          subjectAlternativeNames.push(
            `${props.project}.${companyDomainName}`,
            `*.${props.project}.${companyDomainName}`
          );
        }

        multiZones[companyDomainName] = companyHostedZone
      });

      var certificateValidation = acm.CertificateValidation.fromDnsMultiZone(multiZones);

      certificate = new acm.Certificate(this, 'Certificate', {
        domainName: subjectAlternativeNames[0],
        subjectAlternativeNames: subjectAlternativeNames.slice(1),
        validation: certificateValidation
      });
    }

    if (props.loggingBucketName) {
      logFilePrefix = (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}` : `${props.baseEnv}-${props.project}`
    }

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: props.defaultBehaviorOptions,
      certificate: certificate,
      domainNames: this.getAliases(props, companyDomainNames),
      defaultRootObject: "index.html",
      comment: (props.dynamicEnv) ? `${props.dynamicEnv} ${props.project}` : `${props.baseEnv} ${props.project}`,
      enableLogging: (props.loggingBucketName) ? true : false,
      logBucket: (props.loggingBucketName) ? s3.Bucket.fromBucketName(this, "CloudfrontLoggingBucket", props.loggingBucketName) : undefined,
      logIncludesCookies: (props.loggingBucketName) ? true : false,
      logFilePrefix: logFilePrefix,
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
      new route53.ARecord(this, (props.dynamicEnv) ? `${props.dynamicEnv}-${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}-RecordSet` : `${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}-RecordSet`, {
        zone: companyHostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: (props.dynamicEnv) ? `${props.dynamicEnv}-${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}` : `${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}`
      });
      new route53.ARecord(this, (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}.${companyDomainName}-RecordSet` : `${props.baseEnv}-${props.project}.${companyDomainName}-RecordSet`, {
        zone: companyHostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}.${companyDomainName}` : `${props.baseEnv}-${props.project}.${companyDomainName}`
      });

      if (props.dynamicEnv == undefined && props.baseEnv == "prod") {
        new route53.ARecord(this, `${props.project}.${companyDomainName}-RecordSet`, {
          zone: companyHostedZone,
          target: route53.RecordTarget.fromAlias(cloudfrontTarget),
          recordName: `${props.project}.${companyDomainName}`
        });
      }
    });

    var certificateArn = new cdk.CfnOutput(this, "CertificateArn", {
      value: certificate.certificateArn
    });

    var distributionId = new cdk.CfnOutput(this, "CloudfrontDistribution", {
      value: this.distribution.distributionId
    });

    var distributionDomainName = new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName
    })

    certificateArn.overrideLogicalId("CertificateArn");
    distributionId.overrideLogicalId("CloudfrontDistribution");
    distributionDomainName.overrideLogicalId("DistributionDomainName");
  }

  getAliases(props: CdkBaseCfAcmR53Props, companyDomainNames: string[]): string[] {
    let aliases: string[] = [];
    companyDomainNames.forEach(companyDomainName => {
      aliases.push(
        (props.dynamicEnv) ? `${props.dynamicEnv}-${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}` : `${props.componentName}.${props.baseEnv}.${props.project}.${companyDomainName}`,
        (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}.${companyDomainName}` : `${props.baseEnv}-${props.project}.${companyDomainName}`
      );

      if (props.dynamicEnv == undefined && props.baseEnv == "prod") {
        aliases.push(
          `${props.project}.${companyDomainName}`
        );
      }
    });

    return aliases;
  }
}
