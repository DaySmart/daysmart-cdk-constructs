import * as cdk from '@aws-cdk/core';
import * as s3 from "@aws-cdk/aws-s3";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";

export interface CdkS3RedirectProps {
  oldEndpoint: string;
  newEndpoint: string;
  hostedZoneDomainName: string;
}

export class CdkS3Redirect extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkS3RedirectProps) {
    super(scope, id);

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

    const bucketWebsiteTarget = new targets.BucketWebsiteTarget(bucket);

    const domainHostedZone = route53.HostedZone.fromLookup(this, `${props.hostedZoneDomainName}-HostedZone`, {
      domainName: props.hostedZoneDomainName,
      privateZone: false
    });

    const websiteRecord = new route53.ARecord(this, `${props.hostedZoneDomainName}-RecordSet`, {
      zone: domainHostedZone,
      target: route53.RecordTarget.fromAlias(bucketWebsiteTarget),
      recordName: props.oldEndpoint
    });

  }
}
