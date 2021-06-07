import * as cdk from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as customresource from '@aws-cdk/custom-resources'

export interface CdkApiGatewayDomainProps {
  companyDomainName: string;
  companyHostedZoneId: string;
  project: string;
  stage: string;
  certificateArn: string;
  restApiId: string;
  basePath: string;
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

    let apiGatewayCreateBasePathMappingCall: customresource.AwsSdkCall = {
      service: 'APIGateway',
      action: 'createBasePathMapping',
      parameters: {
        domainName: customDomain.domainName,
        restApiId: `${props.restApiId}`,
        basePath: `${props.basePath}`,
        stage: `${props.stage}`
      },
      physicalResourceId: customresource.PhysicalResourceId.of('base-path-mapping-custom-resource')
    }

    const apiGatewayBasePathMapping = new customresource.AwsCustomResource(this, 'ApiGatewayBasePathMapping', {
      onCreate: apiGatewayCreateBasePathMappingCall,
      onDelete: {
        service: 'APIGateway',
        action: 'deleteBasePathMapping',
        parameters: {
          basePath: `${props.basePath}`,
          domainName: customDomain.domainName
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "apigateway:*"
          ],
          resources: [
            `arn:aws:apigateway:${cdk.Stack.of(this).region}::/restapis/${api.restApiId}/*`,
            `arn:aws:apigateway:${cdk.Stack.of(this).region}::/domainnames/${customDomain.domainName}/*`
          ],
          effect: iam.Effect.ALLOW
        })
      ])
    })

    let route53ChangeResourceRecordSetsCall: customresource.AwsSdkCall = {
      service: 'Route53',
      action: 'changeResourceRecordSets',
      parameters: {
        ChangeBatch: {
          Changes: [
            {
              Action: "UPSERT",
              ResourceRecordSet: {
                AliasTarget: {
                  DNSName: customDomain.domainNameAliasDomainName,
                  EvaluateTargetHealth: false,
                  HostedZoneId: "Z2FDTNDATAQYW2"
                },
                Name: customDomain.domainName,
                Type: "A"
              }
            }
          ],
          Comment: `CloudFront distribution for ${customDomain.domainName}`
        },
        HostedZoneId: props.companyHostedZoneId
      },
      physicalResourceId: customresource.PhysicalResourceId.of('cloudfront-alias-record-custom-resource')
    }

    const route53CloudfrontCustomDomainAlias = new customresource.AwsCustomResource(this, 'Route53CloudfrontCustomDomainAlias', {
      onCreate: route53ChangeResourceRecordSetsCall,
      onDelete: {
        service: 'Route53',
        action: 'changeResourceRecordSets',
        parameters: {
          ChangeBatch: {
            Changes: [
              {
                Action: "DELETE",
                ResourceRecordSet: {
                  AliasTarget: {
                    DNSName: customDomain.domainNameAliasDomainName,
                    EvaluateTargetHealth: false,
                    HostedZoneId: "Z2FDTNDATAQYW2"
                  },
                  Name: customDomain.domainName,
                  Type: "A"
                }
              }
            ],
            Comment: `CloudFront distribution for ${customDomain.domainName}`
          },
          HostedZoneId: props.companyHostedZoneId
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "apigateway:*"
          ],
          resources: [
            `arn:aws:apigateway:${cdk.Stack.of(this).region}::/restapis/${api.restApiId}/*`,
            `arn:aws:apigateway:${cdk.Stack.of(this).region}::/domainnames/${customDomain.domainName}/*`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: [
            "cloudfront:*"
          ],
          resources: [
            `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/*`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:*"
          ],
          resources: [
            `arn:aws:route53:::hostedzone/Z2FDTNDATAQYW2`,
            `arn:aws:route53:::hostedzone/${props.companyHostedZoneId}`,
            `arn:aws:route53:::*`
          ],
          effect: iam.Effect.ALLOW
        }),
      ])
    })


    // This was having issues creating a Route53 alias.  However, the custom resource way works fine.

    // const dnsRecord = new route53.ARecord(this, 'CustomDomainAliasRecord', {
    //   zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
    //     hostedZoneId: props.companyHostedZoneId,
    //     zoneName: props.companyDomainName
    //   }),
    //   target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    // });
  }
}
