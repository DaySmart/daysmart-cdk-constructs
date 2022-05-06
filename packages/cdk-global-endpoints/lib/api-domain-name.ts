import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export interface CustomDomainProps {
    companyDomainName: string;
    domainName: string;
    dynamicEnv?: string;
    certificateArn: string;
    restApiId: string;
    restApiRootResourceId: string;
    basePath?: string;
}

export class CustomDomain extends Construct {
    constructor(scope: Construct, id: string, props: CustomDomainProps) {
        super(scope, id);

        let customDomain: apigw.DomainName;
        
        const api = apigw.RestApi.fromRestApiAttributes(this, "RestApi", {
            restApiId: props.restApiId,
            rootResourceId: props.restApiRootResourceId
          });

        customDomain = new apigw.DomainName(this, 'Custom Domain', {
            domainName: `${props.domainName}`,
            certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
            endpointType: apigw.EndpointType.REGIONAL,
            securityPolicy: apigw.SecurityPolicy.TLS_1_2
        })

        customDomain.addBasePathMapping(api, {
            basePath: props.basePath,
            stage: api.deploymentStage
          });
    };
}