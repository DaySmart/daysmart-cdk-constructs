import * as cdk from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';

export interface CdkApiGatewayDomainProps {
  companyDomainName: string,
  project: string,
  stage: string,
  certificateArn: string,
  restApiId: string
}

export class CdkApiGatewayDomain extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkApiGatewayDomainProps) {
    super(scope, id);

    const api = apigw.RestApi.fromRestApiId(this, "Rest API", `${props.restApiId}`);

    const customDomain = new apigw.DomainName(this, 'Custom Domain', {
      domainName: (props.stage == "prod") ? `api.${props.project}.${props.companyDomainName}` : `api.${props.stage}.${props.project}.${props.companyDomainName}`,
      certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
      endpointType: apigw.EndpointType.EDGE,
      securityPolicy: apigw.SecurityPolicy.TLS_1_0
    });

    customDomain.addBasePathMapping(api, { basePath: 'api', stage: api.deploymentStage });

  }
}
