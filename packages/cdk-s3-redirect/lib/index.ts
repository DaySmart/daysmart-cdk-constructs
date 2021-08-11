import * as cdk from '@aws-cdk/core';
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as acm from "@aws-cdk/aws-certificatemanager";

export interface CdkS3RedirectProps {
  oldEndpoint: string;
  newEndpoint: string;
  certificateArn: string;
  httpOriginCachePolicyId: string;
  httpOriginRequestPolicyId: string;
  project: string;
  baseEnv: string;
  dynamicEnv?: string;
  componentName: string;
  loggingBucketName?: string;
  errorResponses?: cloudfront.ErrorResponse[]
  oldDomains: string[];
}

export interface CdkCloudfrontAddHttpOriginProps {
  project: string;
  baseEnv: string;
  origins: HttpOrigin[];
}

export interface HttpOrigin {
  host: string;
  path: string;
}

export class CdkS3Redirect extends cdk.Construct {
  readonly httpOriginCachePolicy: cloudfront.ICachePolicy;
  readonly httpOriginRequestPolicy: cloudfront.IOriginRequestPolicy;
  private distribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, id: string, props: CdkS3RedirectProps) {
    super(scope, id);

    let logFilePrefix: string | undefined = undefined;

    const bucket = new s3.Bucket(this, `${props.oldEndpoint}-Redirect-Bucket`, {
      bucketName: props.oldEndpoint,
      publicReadAccess: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteRedirect: {
        hostName: props.newEndpoint,
        protocol: s3.RedirectProtocol.HTTPS
      }
    });

    const certificate = acm.Certificate.fromCertificateArn(this, "Certificate", props.certificateArn);

    this.httpOriginCachePolicy = cloudfront.CachePolicy.fromCachePolicyId(this, "HttpOriginCachePolicy", props.httpOriginCachePolicyId);
    this.httpOriginRequestPolicy = cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, "HttpOriginRequestPolicy", props.httpOriginRequestPolicyId);

    const defaultBehaviorOptions = {
      origin: new origins.HttpOrigin(bucket.bucketWebsiteDomainName, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        originSslProtocols: [
          cloudfront.OriginSslPolicy.TLS_V1_1,
          cloudfront.OriginSslPolicy.TLS_V1_2
        ],
        readTimeout: cdk.Duration.seconds(60)
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: this.httpOriginCachePolicy,
      originRequestPolicy: this.httpOriginRequestPolicy
    }

    if (props.loggingBucketName) {
      logFilePrefix = (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}-redirect` : `${props.baseEnv}-${props.project}-redirect`
    }

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: defaultBehaviorOptions,
      certificate: certificate,
      domainNames: this.getAliases(props, props.oldDomains),
      defaultRootObject: "index.html",
      comment: (props.dynamicEnv) ? `${props.dynamicEnv} ${props.project} redirect` : `${props.baseEnv} ${props.project} redirect`,
      enableLogging: (props.loggingBucketName) ? true : false,
      logBucket: (props.loggingBucketName) ? s3.Bucket.fromBucketName(this, "CloudfrontLoggingBucket", props.loggingBucketName) : undefined,
      logIncludesCookies: (props.loggingBucketName) ? true : false,
      logFilePrefix: logFilePrefix,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      errorResponses: (props.errorResponses) ? props.errorResponses : undefined,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
    });

  }

  getAliases(props: CdkS3RedirectProps, oldDomains: string[]): string[] {
    let aliases: string[] = [];
    oldDomains.forEach(oldDomain => {
      aliases.push(
        // (props.dynamicEnv) ? `${props.dynamicEnv}-${props.componentName}.${props.baseEnv}.${props.project}.${oldDomain}` : `${props.componentName}.${props.baseEnv}.${props.project}.${oldDomain}`,
        (props.dynamicEnv) ? `${props.dynamicEnv}-${props.project}.${oldDomain}` : `${props.baseEnv}-${props.project}.${oldDomain}`
      );

      if (props.dynamicEnv == undefined && props.baseEnv == "prod") {
        aliases.push(
          `${props.project}.${oldDomain}`
        );
      }
    });

    return aliases;
  }

  addHttpOriginBehavior(props: CdkCloudfrontAddHttpOriginProps): void {
    const httpOrigins = props.origins;

    httpOrigins.forEach(origin => {
      this.distribution.addBehavior(origin.path, new origins.HttpOrigin(origin.host, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        originSslProtocols: [
          cloudfront.OriginSslPolicy.TLS_V1_1,
          cloudfront.OriginSslPolicy.TLS_V1_2
        ],
        readTimeout: cdk.Duration.seconds(60)
      }),
        {
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: this.httpOriginCachePolicy,
          originRequestPolicy: this.httpOriginRequestPolicy
        }
      );
    });
  }
}
