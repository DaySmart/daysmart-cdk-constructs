import * as cdk from '@aws-cdk/core';
import * as base from '@daysmart/cdk-base-cf-acm-r53';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export interface CdkCloudfrontBehaviorProps {
  defaultBehaviorOrigin: "http" | "s3"/* | "load-balancer"*/;
  defaultS3OriginBucketName?: string;
  defaultS3OriginPath?: string;
  defaultHttpOriginName?: string;
  defaultHttpOriginPath?: string;
  project: string;
  stage: string;
  loggingBucketName?: string;
  domain1: string;
  domain2?: string;
  domain3?: string;
  domain4?: string;
  domain5?: string;
  domain6?: string;
  domain7?: string;
  domain8?: string;
}

export interface CdkCloudfrontAddS3OriginProps {
  s3OriginBucketName1: string;
  s3OriginPath1: string;
  s3OriginBucketName2?: string;
  s3OriginPath2?: string;
  s3OriginBucketName3?: string;
  s3OriginPath3?: string;
  s3OriginBucketName4?: string;
  s3OriginPath4?: string;
  project: string;
  stage: string;
}

export interface CdkCloudfrontAddHttpOriginProps {
  httpOriginName1: string;
  httpOriginPath1: string;
  httpOriginName2?: string;
  httpOriginPath2?: string;
  httpOriginName3?: string;
  httpOriginPath3?: string;
  httpOriginName4?: string;
  httpOriginPath4?: string;
  project: string;
  stage: string;
}

export interface Origin {
  name: string;
  path: string;
}

export class CdkCloudfrontBehavior extends cdk.Construct {
  public distribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, id: string, props: CdkCloudfrontBehaviorProps) {
    super(scope, id);
    let defaultBehaviorOptions: cloudfront.BehaviorOptions

    if (props.defaultBehaviorOrigin == "s3" && props.defaultS3OriginBucketName && props.defaultS3OriginPath) {
      const codeBucket = s3.Bucket.fromBucketName(this, "DefaultOriginBucket", `${props.defaultS3OriginBucketName}`)

      const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAcessIdentity', {
        comment: `OriginAccessIdentity for ${codeBucket.bucketName}.`
      });

      codeBucket.policy?.document.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [originAccessIdentity.grantPrincipal],
          actions: ['s3:GetObject'],
          resources: [codeBucket.bucketArn + "/*"],
        })
      );

      const cachePolicy = new cloudfront.CachePolicy(this, "DefaultS3OriginCachePolicy", {
        cachePolicyName: `${props.stage}-${props.project}-default-s3-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} Default S3 Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Referer"
        )
      });

      defaultBehaviorOptions = {
        origin: new origins.S3Origin(codeBucket, {
          originPath: `${props.defaultS3OriginPath}`,
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
        cachePolicyName: `${props.stage}-${props.project}-default-http-cloudfront-cache-policy`,
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
          readTimeout: cdk.Duration.seconds(180),
          originPath: `${props.defaultHttpOriginPath}`
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy
      }
    }
    else {
      throw Error("Required Origin Parameter Not Specified.")
    }

    this.distribution = new base.CdkBaseCfAcmR53(this, "Cf-Acm-R53", {
      project: props.project,
      stage: props.stage,
      domain1: props.domain1,
      domain2: (props.domain2) ? props.domain2 : undefined,
      domain3: (props.domain3) ? props.domain3 : undefined,
      domain4: (props.domain4) ? props.domain4 : undefined,
      domain5: (props.domain5) ? props.domain5 : undefined,
      domain6: (props.domain6) ? props.domain6 : undefined,
      domain7: (props.domain7) ? props.domain7 : undefined,
      domain8: (props.domain8) ? props.domain8 : undefined,
      defaultBehaviorOptions: defaultBehaviorOptions,
      loggingBucketName: (props.loggingBucketName) ? props.loggingBucketName : undefined
    }).distribution;

    var output = new cdk.CfnOutput(this, "CloudfrontDistribution", {
      value: this.distribution.distributionId
    });

    var output2 = new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName
    })

    output.overrideLogicalId("CloudfrontDistribution");
    output2.overrideLogicalId("DistributionDomainName");
  }

  addS3OriginBehavior(props: CdkCloudfrontAddS3OriginProps): void {
    let s3Origins: Array<Origin> = []

    s3Origins.push({
      name: props.s3OriginBucketName1,
      path: props.s3OriginPath1
    })

    if (props.s3OriginBucketName2 && props.s3OriginPath2) {
      s3Origins.push({
        name: props.s3OriginBucketName2,
        path: props.s3OriginPath2
      })
    }
    if (props.s3OriginBucketName3 && props.s3OriginPath3) {
      s3Origins.push({
        name: props.s3OriginBucketName3,
        path: props.s3OriginPath3
      })
    }
    if (props.s3OriginBucketName4 && props.s3OriginPath4) {
      s3Origins.push({
        name: props.s3OriginBucketName4,
        path: props.s3OriginPath4
      })
    }

    s3Origins.forEach(origin => {
      const codeBucket = s3.Bucket.fromBucketName(this, "OriginBucket", `${origin.name}`)

      const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, `${origin.name}-OriginAcessIdentity`, {
        comment: `OriginAccessIdentity for ${codeBucket.bucketName}.`
      });

      codeBucket.policy?.document.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [originAccessIdentity.grantPrincipal],
          actions: ['s3:GetObject'],
          resources: [codeBucket.bucketArn + "/*"],
        })
      );

      const cachePolicy = new cloudfront.CachePolicy(this, `${origin.name}-S3OriginCachePolicy`, {
        cachePolicyName: `${props.stage}-${props.project}-${origin.name}-s3-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} ${origin.name} S3 Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Referer"
        )
      });

      this.distribution.addBehavior(`${origin.path}`, new origins.S3Origin(codeBucket, {
        originPath: `${origin.path}`,
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
    let httpOrigins: Array<Origin> = []

    httpOrigins.push({
      name: props.httpOriginName1,
      path: props.httpOriginPath1
    })

    if (props.httpOriginName2 && props.httpOriginPath2) {
      httpOrigins.push({
        name: props.httpOriginName2,
        path: props.httpOriginPath2
      })
    }
    if (props.httpOriginName3 && props.httpOriginPath3) {
      httpOrigins.push({
        name: props.httpOriginName3,
        path: props.httpOriginPath3
      })
    }
    if (props.httpOriginName4 && props.httpOriginPath4) {
      httpOrigins.push({
        name: props.httpOriginName4,
        path: props.httpOriginPath4
      })
    }

    httpOrigins.forEach(origin => {
      const cachePolicy = new cloudfront.CachePolicy(this, `${origin.name}-HttpOriginCachePolicy`, {
        cachePolicyName: `${props.stage}-${props.project}-${origin.name}-http-cloudfront-cache-policy`,
        comment: `Cloudfront Cache Policy for ${props.stage} ${props.project} ${origin.name} Http Origin`,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Host",
          "Referer"
        )
      });

      this.distribution.addBehavior(`${origin.path}`, new origins.HttpOrigin(`${origin.name}`, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        originSslProtocols: [
          cloudfront.OriginSslPolicy.TLS_V1_1,
          cloudfront.OriginSslPolicy.TLS_V1_2
        ],
        readTimeout: cdk.Duration.seconds(180),
        originPath: `${origin.path}`
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
