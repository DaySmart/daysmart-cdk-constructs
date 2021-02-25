import * as cdk from '@aws-cdk/core';
import acm = require('@aws-cdk/aws-certificatemanager');
import route53 = require('@aws-cdk/aws-route53');

export interface CdkCertificateProps {
    companyDomainName: string;
    stage: string;
    project: string;
    companyHostedZoneId: string;
    projectDomainName?: string;
    projectHostedZoneId?: string;
}

export class CdkCertificate extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkCertificateProps) {
    super(scope, id);

    const companyHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.companyHostedZoneId,
        zoneName: props.companyDomainName
    });

    let subjectAlternativeNames = [
        `${props.stage}.${props.project}.${props.companyDomainName}`,
        `*.${props.stage}.${props.project}.${props.companyDomainName}` 
    ];

    if(props.stage === 'prod') {
        subjectAlternativeNames.push(`${props.project}.${props.companyDomainName}`);
    }

    let certificateValidation: acm.CertificateValidation;

    if(props.projectDomainName && props.projectHostedZoneId) {
        subjectAlternativeNames.push(
            props.projectDomainName, 
            `${props.stage}.${props.projectDomainName}`, 
            `*.${props.projectDomainName}`, 
            `*.${props.stage}.${props.projectDomainName}`
        );

        const projectHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Project HostedZone', {
            hostedZoneId: props.projectHostedZoneId,
            zoneName: props.projectDomainName
        });

        certificateValidation = acm.CertificateValidation.fromDnsMultiZone({
            [props.companyDomainName]: companyHostedZone,
            [props.projectDomainName]: projectHostedZone 
        });
    } else {
        certificateValidation = acm.CertificateValidation.fromDns(companyHostedZone);
    };

    const cert = new acm.Certificate(this, 'Certificate', {
        domainName: props.companyDomainName,
        subjectAlternativeNames: subjectAlternativeNames,
        validation: certificateValidation
    });

    let output = new cdk.CfnOutput(this, "CertificateArn",{
        value: cert.certificateArn
    });

    output.overrideLogicalId("CertificateArn");
  }
}
