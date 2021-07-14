import * as cdk from '@aws-cdk/core';
import * as base from '@daysmart/cdk-base-cf-acm-r53';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkCloudfrontBehaviorProps {
  defaultBehaviorOrigin: "http" | "s3"/* | "load-balancer"*/;
  defaultS3OriginBucketName?: string;
  defaultS3OriginPath?: string;
  defaultOriginAccessIdentity?: string;
  defaultHttpOriginName?: string;
  defaultHttpOriginPath?: string;
  project: string;
  stage: string;
  loggingBucketName?: string;
  domains: string[];
}

export interface CdkCloudfrontAddS3OriginProps {
  project: string;
  stage: string;
  origins: S3Origin[];
}

export interface CdkCloudfrontAddHttpOriginProps {
  project: string;
  stage: string;
  origins: HttpOrigin[];
}

export interface S3Origin {
  bucketName: string;
  path: string;
  originAccessIdentity: string
}

export interface HttpOrigin {
  host: string;
  path: string;
}

export class CdkCloudfrontBehavior extends cdk.Construct {
  public distribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, id: string, props: CdkCloudfrontBehaviorProps) {
    super(scope, id);
    let defaultBehaviorOptions: cloudfront.BehaviorOptions

    if (props.defaultBehaviorOrigin == "s3" && props.defaultS3OriginBucketName && props.defaultS3OriginPath && props.defaultOriginAccessIdentity) {
      const codeBucket = s3.Bucket.fromBucketName(this, "DefaultOriginBucket", props.defaultS3OriginBucketName);

      const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, `${props.defaultS3OriginBucketName.split(".").join("-")}-DefaultOriginAcessIdentity`, props.defaultOriginAccessIdentity);

      const cachePolicy = new cloudfront.CachePolicy(this, "DefaultS3OriginCachePolicy", {
        cachePolicyName: `${props.stage}-${props.project}-${props.defaultS3OriginBucketName.split(".").join("-")}-default-s3-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} Default S3 Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Referer"
        )
      });

      defaultBehaviorOptions = {
        origin: new origins.S3Origin(codeBucket, {
          originPath: props.defaultS3OriginPath,
          originAccessIdentity: originAccessIdentity
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy
      }
    }
    // else if(props.defaultBehaviorOrigin == "load-balancer"){
    //   defaultBehaviorOptions = {
    //     origin: new origins.LoadBalancerV2Origin()
    //   }
    //   // NOT YET IMPLEMENTED
    // } 
    else if (props.defaultBehaviorOrigin == "http" && props.defaultHttpOriginName && props.defaultHttpOriginPath) {
      const cachePolicy = new cloudfront.CachePolicy(this, "DefaultHttpOriginCachePolicy", {
        cachePolicyName: `${props.stage}-${props.project}-${props.defaultHttpOriginName.split(".").join("-")}-default-http-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} Default Http Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Host",
          "Referer"
        )
      });

      defaultBehaviorOptions = {
        origin: new origins.HttpOrigin(props.defaultHttpOriginName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          originSslProtocols: [
            cloudfront.OriginSslPolicy.TLS_V1_1,
            cloudfront.OriginSslPolicy.TLS_V1_2
          ],
          readTimeout: cdk.Duration.seconds(60)
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy
      }
    }
    else {
      throw Error("Required Origin Parameter Not Specified.")
    }

    const baseResources = new base.CdkBaseCfAcmR53(this, "Cf-Acm-R53", {
      project: props.project,
      stage: props.stage,
      domains: props.domains,
      defaultBehaviorOptions: defaultBehaviorOptions,
      loggingBucketName: (props.loggingBucketName) ? props.loggingBucketName : undefined
    });

    this.distribution = baseResources.distribution;
  }

  addS3OriginBehavior(props: CdkCloudfrontAddS3OriginProps): void {
    const s3Origins = props.origins;

    s3Origins.forEach(origin => {
      const codeBucket = s3.Bucket.fromBucketName(this, `${origin.bucketName.split(".").join("-")}-OriginBucket`, origin.bucketName);

      const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, `${origin.bucketName.split(".").join("-")}-OriginAcessIdentity`, origin.originAccessIdentity);

      const cachePolicy = new cloudfront.CachePolicy(this, `${origin.bucketName.split(".").join("-")}-S3OriginCachePolicy`, {
        cachePolicyName: `${props.stage}-${props.project}-${origin.bucketName.split(".").join("-")}-s3-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} ${origin.bucketName} S3 Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Referer"
        )
      });

      this.distribution.addBehavior(origin.path, new origins.S3Origin(codeBucket, {
        originAccessIdentity: originAccessIdentity
      }),
        {
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cachePolicy
        }
      );
    });
  }

  addHttpOriginBehavior(props: CdkCloudfrontAddHttpOriginProps): void {
    const httpOrigins = props.origins;

    httpOrigins.forEach(origin => {
      const cachePolicy = new cloudfront.CachePolicy(this, `${origin.host}-HttpOriginCachePolicy`, {
        cachePolicyName: `${props.stage}-${props.project}-${origin.host.split(".").join("-")}-http-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} ${origin.host} Http Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Host",
          "Referer"
        )
      });

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
          cachePolicy: cachePolicy
        }
      );
    });
  }
}
