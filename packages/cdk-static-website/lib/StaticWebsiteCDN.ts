import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as alias from '@aws-cdk/aws-route53-targets';


/**
 * Static website CDN properties
 */
export interface StaticWebsiteCDNProps {
    /**
     * The name of the S3 bucket hosting the static website
     */
    bucketName: string;

    /**
     * The Origin Access Identity for the S3 bucket required to read
     */
    originAccessIdentity: string;

    /**
     * The ACM certificate ARN for the domain names
     */
    certificateArn: string;

    /**
     * A list of domain names that will be aliases on the Cloudfront distribution
     */
    domainNames: string[];

    /**
     * The name of the hosted zone that includes all of the domain names given
     */
    hostedZoneDomain: string;

    /**
     * A custom origin path in the S3 bucket for the CloudFront origin
     */
    originPath?: string;
}

/**
 * A CDN for a static website that includes a cloudfront distribution that directs traffic to
 * an S3 bucket and includes a Route 53 record set
 */
export class StaticWebsiteCDN extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: StaticWebsiteCDNProps) {
        super(scope, id);

        const appBucket = s3.Bucket.fromBucketName(this, 'AppBucket', props.bucketName);

        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(appBucket, {
                    originAccessIdentity: cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, 'OriginAccessIdentity', props.originAccessIdentity),
                    originPath: props.originPath
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn),
            domainNames: props.domainNames,
            enableLogging: true,
            logIncludesCookies: true,
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html'
                }
            ]
        })

        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.hostedZoneDomain
        });

        props.domainNames.forEach((domainName, i) => {
            new route53.ARecord(this, `Alias${i}`, {
                zone: hostedZone,
                recordName: domainName,
                target: route53.RecordTarget.fromAlias(new alias.CloudFrontTarget(distribution))
            }) 
        })
        const distributionIdOutput = new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId
        });
        distributionIdOutput.overrideLogicalId('DistributionId');

        const distributionDomainNameOutput = new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: distribution.distributionDomainName
        });
        distributionDomainNameOutput.overrideLogicalId('DistributionDomainName');
    }
}