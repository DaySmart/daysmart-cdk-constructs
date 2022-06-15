import * as route53 from 'aws-cdk-lib/aws-route53';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets'
import { getAliasTarget } from './alias-target';
import { Construct } from 'constructs';

export interface ApiGatewayDomainRoute53AliasProps {
    companyDomainName: string;
    project: string;
    customDomainAlias: string;
    customDomainHostedZoneId: string;
    baseEnv: string;
    dynamicEnv?: string;
}

export class ApiGatewayDomainRoute53Alias extends Construct {
    constructor(scope: Construct, id: string, props: ApiGatewayDomainRoute53AliasProps) {
        super(scope, id);

        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.companyDomainName
        });
        const aliasTarget = getAliasTarget({
            baseEnv: props.baseEnv,
            project: props.project,
            companyDomainName: props.companyDomainName,
            dynamicEnv: props.dynamicEnv
        })

        const customDomain = apigw.DomainName.fromDomainNameAttributes(this, 'CustomDomain', {
            domainName: aliasTarget,
            domainNameAliasHostedZoneId: props.customDomainHostedZoneId,
            domainNameAliasTarget: props.customDomainAlias
        })

        new route53.ARecord(this, 'Route53Alias', {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new route53_targets.ApiGatewayDomain(customDomain)),
            recordName: aliasTarget
        });
    }
}