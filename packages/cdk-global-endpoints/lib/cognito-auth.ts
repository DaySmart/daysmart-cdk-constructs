import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apiGatewayAuthorizers from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs'; 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path = require('path');

export interface CdkCognitoAuthProps {
    UserPoolName: string,    
}

export class CdkCognitoAuth extends Construct {
    constructor(scope: Construct, id: string, props: CdkCognitoAuthProps) {
        super(scope, id);

        const userPool = new cognito.UserPool(this, 'userpool', {
            userPoolName: `${props.UserPoolName}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled: true,
            signInAliases: {email: true},
            autoVerify: {email: true},
            passwordPolicy: {
                minLength: 6,
                requireLowercase: false,
                requireDigits: false,
                requireUppercase: false,
                requireSymbols: false
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        });

        // Create user pool client
        const userPoolClient = new cognito.UserPoolClient(this, 'userpool-client', {
            userPool,
            authFlows: {
                adminUserPassword: true,
                userPassword: true,
                custom: true,
                userSrp: true,
            },
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO,
            ],
        });

        // Create lambda that sits behind authorizer
        const lambdaFunction = new NodejsFunction(this, 'function', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'main',
            entry: path.join(__dirname, `./protected-function/index.ts`),
        });

        // Create API
        const httpApi = new apiGateway.HttpApi(this, 'api', {
            apiName: `my-api`,
          });
      
          // 👇 create the Authorizer
          const authorizer = new apiGatewayAuthorizers.HttpUserPoolAuthorizer(
            'user-pool-authorizer',
            userPool,
            {
              userPoolClients: [userPoolClient],
              identitySource: ['$request.header.Authorization'],
            },
          );
      
          // 👇 set the Authorizer on the Route
          httpApi.addRoutes({
            integration: new apiGatewayIntegrations.HttpLambdaIntegration(
              'protected-fn-integration',
              lambdaFunction,
            ),
            path: '/protected',
            authorizer,
          });
      
          new cdk.CfnOutput(this, 'region', {value: cdk.Stack.of(this).region});
          new cdk.CfnOutput(this, 'userPoolId', {value: userPool.userPoolId});
          new cdk.CfnOutput(this, 'userPoolClientId', {
            value: userPoolClient.userPoolClientId,
          });
          new cdk.CfnOutput(this, 'apiUrl', {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value: httpApi.url!,
          });
    }
}