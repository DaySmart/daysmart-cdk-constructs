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
    domainName: string;
    hostedZoneId: string;
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

    let aliases = [
        `${props.stage}.${props.project}.daysmart.com`,
        `*.${props.stage}.${props.project}.daysmart.com`
    ];

    if(props.stage === "prod") {
        aliases.push(props.domainName);
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
    
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName
    });

    new route53.ARecord(this, "Environment Record Set", {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: `${props.stage}.${props.project}.daysmart.com`
    });

    new route53.ARecord(this, "Dynamic Environment Record Set", {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(cloudfrontTarget),
        recordName: `*.${props.stage}.${props.project}.daysmart.com`
    });

    if(props.stage === "prod") {
        new route53.ARecord(this, "Prod Record Set", {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(cloudfrontTarget),
            recordName: props.domainName
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
}
