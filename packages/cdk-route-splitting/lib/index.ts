import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { HttpOrigin } from '@aws-cdk/aws-cloudfront-origins';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as iam from '@aws-cdk/aws-iam';

const lambda = require('@aws-cdk/aws-lambda');

export interface CdkRouteSplittingProps {
  hostedZoneName: string;
  hostedZoneId: string;
  projectName: string;
  originSourceDomain: string;
  appName: string;
  partitionKey: string;
  stage: string;
}

export class CdkRouteSplitting extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkRouteSplittingProps) {
    super(scope, id);

    const lambdaRole = new iam.Role(this, `${props.stage}-${props.appName}-edge-function-role`, {
      assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('lambda.amazonaws.com'), new iam.ServicePrincipal('edgelambda.amazonaws.com')),
    });
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")); 

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      zoneName: props.hostedZoneName,
      hostedZoneId: props.hostedZoneId,
    });

    let domainName: string;
    if(props.stage == "prod") {
      domainName = `${props.projectName}.${props.hostedZoneName}`;
    } else {
      domainName = `${props.stage}-${props.projectName}.${props.hostedZoneName}`;
    }

    const cert = new acm.Certificate(this, "Certificate", {
      domainName: domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const addHandler = new lambda.Function(this, `${props.stage}-${props.appName}-add-index`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("./dist/add"),
      handler: 'handler.handler'
    });

    const updateHandler = new lambda.Function(this, `${props.stage}-${props.appName}-update-index`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("./dist/update"),
      handler: 'handler.handler'
    });

    const deleteHandler = new lambda.Function(this, `${props.stage}-${props.appName}-delete-index`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("./dist/delete"),
      handler: 'handler.handler'
    });

    const edgeFunc = new cloudfront.experimental.EdgeFunction(this, `${props.stage}-${props.appName}-get-origin`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("./dist/get-origin"),
      handler: "handler.handler",
      role: lambdaRole as any,
    });

    new cloudfront.Distribution(this, `${props.stage}-${props.appName}-distribution`, {
      defaultBehavior: {
        origin: new HttpOrigin(props.originSourceDomain),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [
          {
            functionVersion: edgeFunc.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          }
        ]
      },
      comment: `${props.stage} ${props.appName} route split Distribution`,
    });

    const api = new apigateway.RestApi(this, `${props.stage}-${props.appName}-route-splitting-api`, {
      restApiName: `${props.stage}-${props.appName}-route-splitting-api`,
      domainName: {
        domainName: domainName,
        certificate: cert as any,
      },
      description: "Routing api for each lambda assosiated with routing service."
    });

    const postAddIntegration = new apigateway.LambdaIntegration(addHandler);
    const deleteDeleteIntegration = new apigateway.LambdaIntegration(deleteHandler);
    const postUpdateIntegration = new apigateway.LambdaIntegration(updateHandler);

    const records = api.root.addResource('records');
    const addRecords = records.addResource('add');
    const deleteRecords = records.addResource('delete');
    const updateRecords = records.addResource('update');

    addRecords.addMethod("POST", postAddIntegration);
    deleteRecords.addMethod("DELETE", deleteDeleteIntegration);
    updateRecords.addMethod("POST", postUpdateIntegration);


    new dynamodb.Table(this, `${props.stage}-${props.appName}-route-splitting-table`, {
      partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
      replicationRegions: ['us-east-2', 'us-west-2'],
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
  }
}
