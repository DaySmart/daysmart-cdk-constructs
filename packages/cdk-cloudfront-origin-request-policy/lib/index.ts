import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface CdkCloudfrontOriginRequestPolicyProps {
  queryStringBehavior: "all" | "none" | string[];
  cookieBehavior: "all" | "none" | string[];
  headerBehavior: "all" | "none" | string[];
  policyName: string;
  description?: string;
}

export class CdkCloudfrontOriginRequestPolicy extends Construct {

  constructor(scope: Construct, id: string, props: CdkCloudfrontOriginRequestPolicyProps) {
    super(scope, id);
    let queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior;
    let cookieBehavior: cloudfront.OriginRequestCookieBehavior;
    let headerBehavior: cloudfront.OriginRequestHeaderBehavior;

    if (props.queryStringBehavior == "all") {
      queryStringBehavior = cloudfront.OriginRequestQueryStringBehavior.all();
    } else if (props.queryStringBehavior == "none") {
      queryStringBehavior = cloudfront.OriginRequestQueryStringBehavior.none();
    } else {
      queryStringBehavior = cloudfront.OriginRequestQueryStringBehavior.allowList(
        ...props.queryStringBehavior
      );
    }

    if (props.cookieBehavior == "all") {
      cookieBehavior = cloudfront.OriginRequestCookieBehavior.all();
    } else if (props.cookieBehavior == "none") {
      cookieBehavior = cloudfront.OriginRequestCookieBehavior.none();
    } else {
      cookieBehavior = cloudfront.OriginRequestCookieBehavior.allowList(
        ...props.cookieBehavior
      );
    }

    if (props.headerBehavior == "all") {
      headerBehavior = cloudfront.OriginRequestHeaderBehavior.all();
    } else if (props.headerBehavior == "none") {
      headerBehavior = cloudfront.OriginRequestHeaderBehavior.none();
    } else {
      headerBehavior = cloudfront.OriginRequestHeaderBehavior.allowList(
        ...props.headerBehavior
      );
    }

    const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, "OriginRequestPolicy", {
      originRequestPolicyName: props.policyName,
      comment: (props.description) ? props.description : undefined,
      queryStringBehavior: queryStringBehavior,
      cookieBehavior: cookieBehavior,
      headerBehavior: headerBehavior
    });

    var originRequestPolicyId = new cdk.CfnOutput(this, "OriginRequestPolicyId", {
      value: originRequestPolicy.originRequestPolicyId
    })
    originRequestPolicyId.overrideLogicalId("OriginRequestPolicyId");
  }
}
