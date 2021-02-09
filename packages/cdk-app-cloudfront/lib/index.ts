import * as cdk from '@aws-cdk/core';
import cloudfront = require('@aws-cdk/aws-cloudfront');
import s3 = require('@aws-cdk/aws-s3');
import route53 = require('@aws-cdk/aws-route53');
import targets = require('@aws-cdk/aws-route53-targets');

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
    appName: string;
    projectHostedZoneId?: string;
    projectDomainName?: string;
}

export class CdkAppCloudfront extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkAppCloudfrontProps) {
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

    if(props.dynamicEnvName) {
        aliases.push(`${props.dynamicEnvName}-${props.appName}.${props.stage}.${props.project}.${props.companyDomainName}`);
    } else {
        aliases.push(`${props.appName}.${props.stage}.${props.project}.${props.companyDomainName}`);
    }

    if(props.projectDomainName && props.projectHostedZoneId) {
        if(props.dynamicEnvName) {
            aliases.push(`${props.dynamicEnvName}.${props.stage}.${props.projectDomainName}`);
        } else {
            aliases.push(`${props.stage}.${props.projectDomainName}`);
        }

        if(props.stage === "prod") {
            aliases.push(props.projectDomainName);
        }
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

    new route53.ARecord(this, "Company Record Set", {
        zone: companyHostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: `${props.stage}.${props.project}.${props.companyDomainName}`
    });

    if(props.projectDomainName && props.projectHostedZoneId) {
        const projectHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ProjectHostedZone', {
            hostedZoneId: props.projectHostedZoneId,
            zoneName: props.projectDomainName
        });

        new route53.ARecord(this, "Project Environment Record Set", {
            zone: projectHostedZone,
            target: route53.RecordTarget.fromAlias(cloudfrontTarget),
            recordName: props.dynamicEnvName ? `${props.dynamicEnvName}.${props.stage}.${props.projectDomainName}` : `${props.stage}.${props.projectDomainName}`
        });

        if(props.stage === "prod") {
            new route53.ARecord(this, "Prod Record Set", {
                zone: projectHostedZone,
                target: route53.RecordTarget.fromAlias(cloudfrontTarget),
                recordName: props.projectDomainName
            });
        }
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
}
