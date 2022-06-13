import * as cdk from 'aws-cdk-lib/core';
import { getAliasTarget } from './alias-target';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs'; 

export interface ApiGatewayDomainMultiRegionProps {
  companyDomainName: string;
  project: string;
  baseEnv: string;
  dynamicEnv?: string;
  certificateArn: string;
  restApiId: string;
  restApiRootResourceId: string;
  basePath?: string;
  endpointType?: apigw.EndpointType;
}

export class ApiGatewayDomainMultiRegion extends Construct {

  constructor(scope: Construct, id: string, props: ApiGatewayDomainMultiRegionProps) {
    super(scope, id);

    const api = apigw.RestApi.fromRestApiAttributes(this, "RestApi", {
      restApiId: props.restApiId,
      rootResourceId: props.restApiRootResourceId
    });

    const aliasTarget = getAliasTarget({
        baseEnv: props.baseEnv,
        companyDomainName: props.companyDomainName,
        project: props.project,
        dynamicEnv: props.dynamicEnv
    });

    const customDomain = new apigw.DomainName(this, 'CustomDomain', {
      domainName: aliasTarget,
      certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
      endpointType: props.endpointType || apigw.EndpointType.REGIONAL,
      securityPolicy: apigw.SecurityPolicy.TLS_1_2,
    });

    customDomain.addBasePathMapping(api, {
      basePath: props.basePath,
      stage: api.deploymentStage
    });

    const customDomainNameOutput = new cdk.CfnOutput(this, 'CustomDomainName', {
        value: customDomain.domainNameAliasDomainName
    });

    const customDomainHostedZoneOutput = new cdk.CfnOutput(this, 'CustomDomainHostedZoneId', {
        value: customDomain.domainNameAliasHostedZoneId
    })

    customDomainNameOutput.overrideLogicalId('CustomDomainName');
    customDomainHostedZoneOutput.overrideLogicalId('CustomDomainHostedZoneId')

  }
}
