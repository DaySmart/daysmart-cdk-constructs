import * as cdk from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';

export interface CdkApiGatewayDomainProps {
  companyDomainName: string;
  companyHostedZoneId: string;
  project: string;
  baseEnv: string;
  dynamicEnv?: string;
  certificateArn: string;
  restApiId: string;
  basePath: string;
}

export class CdkApiGatewayDomain extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkApiGatewayDomainProps) {
    super(scope, id);

    const api = apigw.RestApi.fromRestApiId(this, "Rest API", `${props.restApiId}`);

    let customDomain: apigw.DomainName;

    if (props.dynamicEnv) {
      customDomain = new apigw.DomainName(this, 'Custom Domain', {
        domainName: `${props.dynamicEnv}-api.${props.baseEnv}.${props.project}.${props.companyDomainName}`,
        certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
        endpointType: apigw.EndpointType.EDGE,
        securityPolicy: apigw.SecurityPolicy.TLS_1_0
      });
    } else {
      customDomain = new apigw.DomainName(this, 'Custom Domain', {
        domainName: (props.baseEnv == "prod") ? `api.${props.project}.${props.companyDomainName}` : `api.${props.baseEnv}.${props.project}.${props.companyDomainName}`,
        certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
        endpointType: apigw.EndpointType.EDGE,
        securityPolicy: apigw.SecurityPolicy.TLS_1_0
      });
    }

    const cloudformationBasePathMapping = new apigw.CfnBasePathMapping(this, "CloudformationBasePathMapping", {
      basePath: `${props.basePath}`,
      domainName: customDomain.domainName,
      restApiId: `${props.restApiId}`,
      stage: `${props.baseEnv}` 
    });

    const cloudformationRoute53Change = new route53.CfnRecordSet(this, "CloudformationAliasRecordRoute53", {
      aliasTarget: {
        dnsName: customDomain.domainNameAliasDomainName,
        evaluateTargetHealth: false,
        hostedZoneId: "Z2FDTNDATAQYW2"
      },
      comment: `CloudFront distribution for ${customDomain.domainName}`,
      hostedZoneId: props.companyHostedZoneId,
      name: customDomain.domainName,
      type: "A"
    });
  }
}
