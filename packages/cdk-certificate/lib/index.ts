import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface CdkCertificateProps {
    companyDomainName: string;
    stage: string;
    project: string;
    companyHostedZoneId: string;
    projectDomainName?: string;
    projectHostedZoneId?: string;
}

export class CdkCertificate extends Construct {

  constructor(scope: Construct, id: string, props: CdkCertificateProps) {
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
        subjectAlternativeNames.push(
            `${props.project}.${props.companyDomainName}`,
            `*.${props.project}.${props.companyDomainName}`
        );
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
            [props.projectDomainName]: projectHostedZone,
            [`${props.stage}.${props.projectDomainName}`]: projectHostedZone
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
