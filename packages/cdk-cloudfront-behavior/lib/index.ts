import * as cdk from '@aws-cdk/core';
import * as base from '@daysmart/cdk-base-cf-acm-r53';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as s3 from "@aws-cdk/aws-s3";

export interface CdkCloudfrontBehaviorProps {
  defaultBehaviorOrigin: "http" | "s3" | "load-balancer";
  defaultBucketName?: string;
  defaultHttpOriginName?: string;
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

export class CdkCloudfrontBehavior extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkCloudfrontBehaviorProps) {
    super(scope, id);
    let defaultBehaviorOptions: cloudfront.BehaviorOptions

    if (props.defaultBehaviorOrigin == "s3") {
      defaultBehaviorOptions = {
        origin: new origins.S3Origin(s3.Bucket.fromBucketName(this, "DefaultOriginBucket", `${props.defaultBucketName}`))
      }
    }
    // else if(props.defaultBehaviorOrigin == "load-balancer"){
    //   defaultBehaviorOptions = {
    //     origin: new origins.LoadBalancerV2Origin()
    //   }
    //   // NOT YET IMPLEMENTED
    // } 
    else if(props.defaultBehaviorOrigin == "http" && props.defaultHttpOriginName) {
      defaultBehaviorOptions = {
        origin: new origins.HttpOrigin(props.defaultHttpOriginName)
      }
    }
    else {
      throw Error("Default HTTP Origin Domain Parameter Not Specified.")
    }

    const distribution = new base.CdkBaseCfAcmR53(this, "Cf-Acm-R53", {
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

    // Define construct contents here
  }
}
