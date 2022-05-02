import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface ApiGatewayProps {
    companyDomainName: string;
    domainName: string;
    project: string;
    baseEnv: string;
    dynamicEnv?: string;
    certificateArn: string;
    restApiId: string;
    basePath?: string;
}

export class ApiGateway extends Construct {
    constructor(scope: Construct, id: string, props: ApiGatewayProps) {
        super(scope, id);

        let customDomain: apigw.DomainName;
        let cloudformationBasePathMapping: apigw.CfnBasePathMapping;

        customDomain = new apigw.DomainName(this, 'Custom Domain', {
            domainName: `${props.domainName}`,
            certificate: acm.Certificate.fromCertificateArn(this, "Certificate", `${props.certificateArn}`),
            endpointType: apigw.EndpointType.REGIONAL,
            securityPolicy: apigw.SecurityPolicy.TLS_1_2
        })

        cloudformationBasePathMapping = new apigw.CfnBasePathMapping(this, "CloudformationBasePathMapping", {
            basePath: `${props.basePath}`,
            domainName: customDomain.domainName
        })
    };
}