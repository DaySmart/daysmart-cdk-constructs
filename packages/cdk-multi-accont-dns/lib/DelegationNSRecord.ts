import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';

/**
 * Properties for an NS record to delegate a hosted zone
 */
export interface DelegatedNSRecordProps {
    /**
     * The hosted zone that requires the NS record. i.e domain.com
     */
    hostedZoneDomain: string;

    /**
     * The hosted zone to delegate. i.e. example.domain.com
     */
    delegatedDomainName: string;

    /**
     * A comma seperated list of name servers for the delegated hosted zone.
     * This can be derived from the NameServers output on the DelegatedHostedZone construct
     */
    nameServers: string;
}

/**
 * A Route 53 record set to delegate a hosted zone to another account
 */
export class DelegatedNSRecord extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: DelegatedNSRecordProps) {
        super(scope, id);

        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.hostedZoneDomain
        });

        new route53.NsRecord(this, 'NSRecordSet', {
            zone: hostedZone,
            recordName: props.delegatedDomainName,
            values: props.nameServers.split(',')
        });
    }
}