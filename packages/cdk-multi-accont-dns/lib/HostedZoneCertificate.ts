import * as cdk from 'aws-cdk-lib'; 
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

/**
 * Properties for a ACM certificate for a hosted zone
 */
export interface HostedZoneCertificateProps {
    /**
     * The domain name of the hosted zone. i.e example.domain.com
     */
    domainName: string;
}

/**
 * An ACM certificate for all domains in a hosted zone
 * For example the domain example.domain.com would include:
 *  - example.domain.com
 *  - *.example.domain.com
 */
export class HostedZoneCertificate extends Construct {
    constructor(scope: Construct, id: string, props: HostedZoneCertificateProps) {
        super(scope, id);

        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.domainName
        });

        const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
            hostedZone: hostedZone,
            domainName: props.domainName,
            subjectAlternativeNames: [`*.${props.domainName}`]
        });

        const certificateArn = new cdk.CfnOutput(this, 'CertificateArn', {
            value: certificate.certificateArn
        });
        certificateArn.overrideLogicalId('CertificateArn');
    }
}