import * as cdk from '@aws-cdk/core';
import acm = require('@aws-cdk/aws-certificatemanager');
import route53 = require('@aws-cdk/aws-route53');

export interface CdkCertificateProps {
    domainName: string;
    stage: string;
    project: string;
    hostedZoneId: string;
}

export class CdkCertificate extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkCertificateProps) {
    super(scope, id);

    const hostedZone = route53.HostedZone.fromHostedZoneId(this, 'HostedZone', props.hostedZoneId);

    const cert = new acm.Certificate(this, 'Certificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [
            `${props.stage}.${props.project}.${props.domainName}`,
            `*.${props.stage}.${props.project}.${props.domainName}`
        ],
        validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    let output = new cdk.CfnOutput(this, "CertificateArn",{
        value: cert.certificateArn
    });

    output.overrideLogicalId("CertificateArn");
  }
}
