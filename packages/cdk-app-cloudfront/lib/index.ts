import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'

export interface CdkAppCloudfrontProps {
    s3BucketName: string;
    originAccessIdentity: string;
    loggingBucketName?: string;
    stage: string;
    project: string;
    certArn: string;
    companyDomainName: string;
    companyHostedZoneId: string;
    dynamicEnvName?: string;
    appName?: string;
    projectHostedZoneId?: string;
    projectDomainName?: string;
}

export class CdkAppCloudfront extends Construct {

  constructor(scope: Construct, id: string, props: CdkAppCloudfrontProps) {
    super(scope, id);

    const codeBucket = s3.Bucket.fromBucketName(
        this,
        'CodeBucket',
        props.s3BucketName
    );

    const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(
        this,
        "OriginAccessIdentity",
        props.originAccessIdentity
    );

    let aliases: string[] = [];
    aliases.push(...this.getCompanyDomainAliases(props));

    if(props.projectDomainName && props.projectHostedZoneId) {
        aliases.push(...this.getProjectDomainAliases(props));
    }

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
        originConfigs: [
            {
                s3OriginSource: {
                    s3BucketSource: codeBucket,
                    originAccessIdentity: originAccessIdentity
                },
                behaviors: [
                    {
                        isDefaultBehavior: true,
                        allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                        forwardedValues: {
                            queryString: true,
                            cookies: {
                              forward: "all",
                            },
                            headers: ["Referer"],
                        },
                    }
                ]
            }
        ],
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        httpVersion: cloudfront.HttpVersion.HTTP2,
        loggingConfig: props.loggingBucketName ? {
            bucket: s3.Bucket.fromBucketName(
                this,
                "CloudfrontLoggingBucket",
                props.loggingBucketName
            ),
            prefix: `${props.stage}-${props.project}`,
            includeCookies: true
        } : undefined,
        errorConfigurations: [
            {
              errorCode: 404,
              responseCode: 200,
              errorCachingMinTtl: 1,
              responsePagePath: "/index.html",
            },
            {
              errorCode: 403,
              responseCode: 200,
              errorCachingMinTtl: 1,
              responsePagePath: "/index.html",
            },
        ],
        comment: `${props.stage} ${props.project}`,
        viewerCertificate: {
          props: {
            acmCertificateArn: props.certArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.1_2016",
          },
          aliases: aliases
        },
    });

    const cloudfrontTarget = new targets.CloudFrontTarget(distribution);

    const companyHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.companyHostedZoneId,
        zoneName: props.companyDomainName
    });

    this.getCompanyDomainAliases(props).forEach(alias => {
        new route53.ARecord(this, alias, {
            zone: companyHostedZone,
            target: route53.RecordTarget.fromAlias(cloudfrontTarget),
            recordName: alias
        });
    });

    if(props.projectDomainName && props.projectHostedZoneId) {
        const projectHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ProjectHostedZone', {
            hostedZoneId: props.projectHostedZoneId,
            zoneName: props.projectDomainName
        });

        this.getProjectDomainAliases(props).forEach(alias => {
            new route53.ARecord(this, alias, {
                zone: projectHostedZone,
                target: route53.RecordTarget.fromAlias(cloudfrontTarget),
                recordName: alias
            });
        });
    }

    let output = new cdk.CfnOutput(this, "CloudfrontDistribution", {
        value: distribution.distributionId
    });

    let output2 = new cdk.CfnOutput(this, "DistributionDomainName", {
        value: distribution.distributionDomainName
    })

    output.overrideLogicalId("CloudfrontDistribution");
    output2.overrideLogicalId("DistributionDomainName");
  }

  getCompanyDomainAliases(props: CdkAppCloudfrontProps): Array<string> {
    let aliases: Array<string> = [];
    if(props.dynamicEnvName && props.appName) {
        aliases.push(`${props.dynamicEnvName}-${props.appName}.${props.stage}.${props.project}.${props.companyDomainName}`);
    } else if(props.appName) {
        aliases.push(`${props.appName}.${props.stage}.${props.project}.${props.companyDomainName}`);
    } else {
        aliases.push(`${props.stage}.${props.project}.${props.companyDomainName}`);

        if(props.stage === 'prod') {
            aliases.push(`${props.project}.${props.companyDomainName}`);
        }
    }

    return aliases;
  }

  getProjectDomainAliases(props: CdkAppCloudfrontProps): Array<string> {
    let aliases: Array<string> = []
    if(props.dynamicEnvName && props.appName) {
        aliases.push(`${props.dynamicEnvName}-${props.appName}.${props.stage}.${props.projectDomainName}`);
    } else if (props.appName) {
        aliases.push(`${props.appName}.${props.stage}.${props.projectDomainName}`);
    } else {
        aliases.push(`${props.stage}.${props.projectDomainName}`);
    }

    if(props.stage === "prod") {
        if(props.appName) {
            aliases.push(`${props.appName}.${props.projectDomainName}`);
        } else {
            aliases.push(props.projectDomainName as string);
        }
    }
    

    return aliases;
  }
}
