import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';

/**
 * Properties for a hosted zone to be delegated
 */
export interface DelegatedHostedZoneProps {
    /**
     * Name of the hosted zone. i.e. example.domain.com
     */
    zoneName: string;
}

/**
 * A Route 53 hosted zone to be delegated from another account
 */
export class DelegatedHostedZone extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: DelegatedHostedZoneProps) {
        super(scope, id);

        const hostedZone = new route53.HostedZone(this, 'HostedZone', {
            zoneName: props.zoneName
        });

        const zoneId = new cdk.CfnOutput(this, 'HostedZoneId', {
            value: hostedZone.hostedZoneId
        });
        zoneId.overrideLogicalId('HostedZoneId');

        if(hostedZone.hostedZoneNameServers) {
            const nameServersList = hostedZone.hostedZoneNameServers as string[];
            const nameServers = new cdk.CfnOutput(this, 'NameServers', {
                value: cdk.Fn.join(',', nameServersList)
            });
            nameServers.overrideLogicalId('NameServers');
        }
    }

}