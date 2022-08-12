import * as cdk from 'aws-cdk-lib';
import * as base from '@daysmart/cdk-base-cf-acm-r53';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from 'constructs';

export interface CdkCloudfrontBehaviorProps {
  defaultBehaviorOrigin: "http" | "s3"/* | "load-balancer"*/;
  defaultS3OriginBucketName?: string;
  defaultOriginAccessIdentity?: string;
  defaultHttpOriginName?: string;
  s3OriginCachePolicyId: string;
  httpOriginCachePolicyId: string;
  s3OriginRequestPolicyId: string;
  httpOriginRequestPolicyId: string;
  project: string;
  baseEnv: string;
  dynamicEnv?: string;
  certificateArn?: string;
  componentName: string;
  loggingBucketName?: string;
  errorResponses?: cloudfront.ErrorResponse[]
  domains: string[];
}

export interface CdkCloudfrontAddS3OriginProps {
  project: string;
  baseEnv: string;
  origins: S3Origin[];
}

export interface CdkCloudfrontAddHttpOriginProps {
  project: string;
  baseEnv: string;
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

export class CdkCloudfrontBehavior extends Construct {
  readonly s3OriginCachePolicy: cloudfront.ICachePolicy;
  readonly httpOriginCachePolicy: cloudfront.ICachePolicy;
  readonly s3OriginRequestPolicy: cloudfront.IOriginRequestPolicy;
  readonly httpOriginRequestPolicy: cloudfront.IOriginRequestPolicy;
  public distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CdkCloudfrontBehaviorProps) {
    super(scope, id);
    let defaultBehaviorOptions: cloudfront.BehaviorOptions
    this.s3OriginCachePolicy = cloudfront.CachePolicy.fromCachePolicyId(this, "S3OriginCachePolicy", props.s3OriginCachePolicyId);
    this.httpOriginCachePolicy = cloudfront.CachePolicy.fromCachePolicyId(this, "HttpOriginCachePolicy", props.httpOriginCachePolicyId);
    this.s3OriginRequestPolicy = cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, "S3OriginRequestPolicy", props.s3OriginRequestPolicyId);
    this.httpOriginRequestPolicy = cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(this, "HttpOriginRequestPolicy", props.httpOriginRequestPolicyId);

    if (props.defaultBehaviorOrigin == "s3" && props.defaultS3OriginBucketName && props.defaultOriginAccessIdentity) {
      const codeBucket = s3.Bucket.fromBucketName(this, "DefaultOriginBucket", props.defaultS3OriginBucketName);

      const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, `${props.defaultS3OriginBucketName.split(".").join("-")}-DefaultOriginAccessIdentity`, props.defaultOriginAccessIdentity);

      defaultBehaviorOptions = {
        origin: new origins.S3Origin(codeBucket, {
          originAccessIdentity: originAccessIdentity
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: this.s3OriginCachePolicy,
        originRequestPolicy: this.s3OriginRequestPolicy
      }
    }
    // else if(props.defaultBehaviorOrigin == "load-balancer"){
    //   defaultBehaviorOptions = {
    //     origin: new origins.LoadBalancerV2Origin()
    //   }
    //   // NOT YET IMPLEMENTED
    // } 
    else if (props.defaultBehaviorOrigin == "http" && props.defaultHttpOriginName) {
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
        cachePolicy: this.httpOriginCachePolicy,
        originRequestPolicy: this.httpOriginRequestPolicy
      }
    }
    else {
      throw Error("Required Origin Parameter Not Specified.")
    }

    const baseResources = new base.CdkBaseCfAcmR53(this, "Cf-Acm-R53", {
      project: props.project,
      baseEnv: props.baseEnv,
      dynamicEnv: (props.dynamicEnv) ? props.dynamicEnv : undefined,
      certificateArn: (props.certificateArn) ? props.certificateArn : undefined,
      domains: props.domains,
      componentName: props.componentName,
      defaultBehaviorOptions: defaultBehaviorOptions,
      loggingBucketName: (props.loggingBucketName) ? props.loggingBucketName : undefined,
      errorResponses: (props.errorResponses) ? props.errorResponses : undefined
    });

    this.distribution = baseResources.distribution;
  }

  addS3OriginBehavior(props: CdkCloudfrontAddS3OriginProps): void {
    const s3Origins = props.origins;

    s3Origins.forEach(origin => {
      const codeBucket = s3.Bucket.fromBucketName(this, `${origin.bucketName.split(".").join("-")}-OriginBucket`, origin.bucketName);

      const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, `${origin.bucketName.split(".").join("-")}-OriginAccessIdentity`, origin.originAccessIdentity);

      this.distribution.addBehavior(origin.path, new origins.S3Origin(codeBucket, {
        originAccessIdentity: originAccessIdentity
      }),
        {
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: this.s3OriginCachePolicy,
          originRequestPolicy: this.s3OriginRequestPolicy
        }
      );
    });
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
