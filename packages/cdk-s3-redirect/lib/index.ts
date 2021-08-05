import * as cdk from '@aws-cdk/core';
import * as customresource from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";

export interface CdkS3RedirectProps {
  // Define construct properties here
}

export class CdkS3Redirect extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkS3RedirectProps) {
    super(scope, id);

    // Define construct contents here
  }
}
