import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface CdkCloudfrontCachePolicyProps {
  queryStringBehavior: "all" | "none" | string[];
  cookieBehavior: "all" | "none" | string[];
  headerBehavior: "none" | string[];
  policyName: string;
  description?: string;
}

export class CdkCloudfrontCachePolicy extends Construct {

  constructor(scope: Construct, id: string, props: CdkCloudfrontCachePolicyProps) {
    super(scope, id);
    let queryStringBehavior: cloudfront.CacheQueryStringBehavior;
    let cookieBehavior: cloudfront.CacheCookieBehavior;
    let headerBehavior: cloudfront.CacheHeaderBehavior;

    if (props.queryStringBehavior == "all") {
      queryStringBehavior = cloudfront.CacheQueryStringBehavior.all();
    } else if (props.queryStringBehavior == "none") {
      queryStringBehavior = cloudfront.CacheQueryStringBehavior.none();
    } else {
      queryStringBehavior = cloudfront.CacheQueryStringBehavior.allowList(
        ...props.queryStringBehavior
      );
    }

    if (props.cookieBehavior == "all") {
      cookieBehavior = cloudfront.CacheCookieBehavior.all();
    } else if (props.cookieBehavior == "none") {
      cookieBehavior = cloudfront.CacheCookieBehavior.none();
    } else {
      cookieBehavior = cloudfront.CacheCookieBehavior.allowList(
        ...props.cookieBehavior
      );
    }

    if (props.headerBehavior == "none") {
      headerBehavior = cloudfront.CacheHeaderBehavior.none();
    } else {
      headerBehavior = cloudfront.CacheHeaderBehavior.allowList(
        ...props.headerBehavior
      );
    }

    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      cachePolicyName: props.policyName,
      comment: (props.description) ? props.description : undefined,
      queryStringBehavior: queryStringBehavior,
      cookieBehavior: cookieBehavior,
      headerBehavior: headerBehavior
    });

    var cachePolicyId = new cdk.CfnOutput(this, "CachePolicyId", {
      value: cachePolicy.cachePolicyId
    })
    cachePolicyId.overrideLogicalId("CachePolicyId");
  }
}
