import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { CfnUsagePlanKey } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs'; 
import { CdkUsagePlan } from './usage-plan';

export interface CdkApiGatewayDomainProps {
  companyDomainName: string;
  companyHostedZoneId: string;
  project: string;
  baseEnv: string;
  dynamicEnv?: string;
  certificateArn: string;
  restApiId: string;
  basePath: string;
  stageName?: string;
  appName?: string;
  apiKeyIDs?: string[];
  usagePlanIDs?: string[];
}

export class CdkApiGatewayDomain extends Construct {

  constructor(scope: Construct, id: string, props: CdkApiGatewayDomainProps) {
    super(scope, id);

    const api = apigw.RestApi.fromRestApiId(this, "Rest API", `${props.restApiId}`);

    let customDomain: apigw.DomainName;
    let usagePlan: apigw.CfnUsagePlan;
    let cloudformationBasePathMapping: apigw.CfnBasePathMapping;

    const stageName = props.stageName || props.dynamicEnv || props.baseEnv;

    const appName = props.appName || "api"

    if (props.dynamicEnv) {
      customDomain = new apigw.DomainName(this, 'Custom Domain', {
        domainName: (props.baseEnv == 'prod') ? `${props.dynamicEnv}-${appName}.${props.project}.${props.companyDomainName}`: `${props.dynamicEnv}-${appName}.${props.baseEnv}.${props.project}.${props.companyDomainName}`,
        certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
        endpointType: apigw.EndpointType.EDGE,
        securityPolicy: apigw.SecurityPolicy.TLS_1_0
      });
      if(props.usagePlanIDs && props.usagePlanIDs.length < 0){
        
      } else {
        usagePlan = new apigw.CfnUsagePlan(this, "UsagePlan", {
          usagePlanName: `${props.dynamicEnv}-${props.project}-usagePlan`,
          apiStages: [
            {
              apiId: props.restApiId,
              stage: stageName
            }
          ]
        });
      }

      cloudformationBasePathMapping = new apigw.CfnBasePathMapping(this, "CloudformationBasePathMapping", {
        basePath: `${props.basePath}`,
        domainName: customDomain.domainName,
        restApiId: `${props.restApiId}`,
        stage: `${stageName}`
      });
    } else {
      customDomain = new apigw.DomainName(this, 'Custom Domain', {
        domainName: (props.baseEnv == "prod") ? `${appName}.${props.project}.${props.companyDomainName}` : `${appName}.${props.baseEnv}.${props.project}.${props.companyDomainName}`,
        certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
        endpointType: apigw.EndpointType.EDGE,
        securityPolicy: apigw.SecurityPolicy.TLS_1_0
      });
      
      usagePlan = new apigw.CfnUsagePlan(this, "UsagePlan", {
        usagePlanName: `${props.baseEnv}-${props.project}-usagePlan`,
        apiStages: [
          {
            apiId: props.restApiId,
            stage: stageName
          }
        ]
      });

      cloudformationBasePathMapping = new apigw.CfnBasePathMapping(this, "CloudformationBasePathMapping", {
        basePath: `${props.basePath}`,
        domainName: customDomain.domainName,
        restApiId: `${props.restApiId}`,
        stage: `${stageName}`
      });
    }

    if (props.apiKeyIDs && props.apiKeyIDs.length > 0) {
      props.apiKeyIDs.forEach(apiKeyID => {
        new CfnUsagePlanKey(this, `apiKey${apiKeyID}`, {
          keyId: apiKeyID,
          keyType: 'API_KEY',
          usagePlanId: usagePlan.ref
        })
      })
    }

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
