"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkRouteSplitting = void 0;
const cdk = __importStar(require("@aws-cdk/core"));
const cloudfront = __importStar(require("@aws-cdk/aws-cloudfront"));
const aws_cloudfront_origins_1 = require("@aws-cdk/aws-cloudfront-origins");
const dynamodb = __importStar(require("@aws-cdk/aws-dynamodb"));
const apigateway = __importStar(require("@aws-cdk/aws-apigateway"));
const route53 = __importStar(require("@aws-cdk/aws-route53"));
const acm = __importStar(require("@aws-cdk/aws-certificatemanager"));
const iam = __importStar(require("@aws-cdk/aws-iam"));
const lambda = require('@aws-cdk/aws-lambda');
class CdkRouteSplitting extends cdk.Construct {
    constructor(scope, id, props) {
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
        let domainName;
        if (props.stage == "prod") {
            domainName = `${props.projectName}.${props.hostedZoneName}`;
        }
        else {
            domainName = `${props.stage}-${props.projectName}.${props.hostedZoneName}`;
        }
        const cert = new acm.Certificate(this, "Certificate", {
            domainName: domainName,
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });
        const addHandler = new lambda.Function(this, `${props.stage}-${props.appName}-add-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.stage}-${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/add"),
            handler: 'handler.add'
        });
        const updateHandler = new lambda.Function(this, `${props.stage}-${props.appName}-update-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.stage}-${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/update"),
            handler: 'handler.update'
        });
        const deleteHandler = new lambda.Function(this, `${props.stage}-${props.appName}-delete-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.stage}-${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/delete"),
            handler: 'handler.del'
        });
        // const edgeFunc = new cloudfront.experimental.EdgeFunction(this, `${props.stage}-${props.appName}-get-origin`, {
        //   environment: {
        //     ['DSI_AWS_REGION']: 'us-east-1',
        //     ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
        //     ['DSI_ROUTING_SPLIT_TABLE']: `${props.projectName}-table`
        //   },
        //   runtime: lambda.Runtime.NODEJS_14_X,
        //   code: lambda.Code.fromAsset("./dist/get-origin"),
        //   handler: "handler.getOrigin",
        //   role: lambdaRole as any,
        // });
        new cloudfront.Distribution(this, `${props.stage}-${props.appName}-distribution`, {
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.HttpOrigin(props.originSourceDomain),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            comment: `${props.stage} ${props.appName} route split Distribution`,
        });
        const api = new apigateway.RestApi(this, `${props.stage}-${props.appName}-route-splitting-api`, {
            restApiName: `${props.stage}-${props.appName}-route-splitting-api`,
            domainName: {
                domainName: domainName,
                certificate: cert,
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
        const table = new dynamodb.Table(this, `${props.stage}-${props.appName}-route-splitting-table`, {
            tableName: `${props.stage}-${props.projectName}-table`,
            partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
            replicationRegions: ['us-east-2', 'us-west-2'],
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
        table.grantReadWriteData(addHandler);
        table.grantReadWriteData(updateHandler);
        table.grantReadWriteData(deleteHandler);
        // table.grantReadWriteData(edgeFunc);
    }
}
exports.CdkRouteSplitting = CdkRouteSplitting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFxQztBQUNyQyxvRUFBc0Q7QUFDdEQsNEVBQTZEO0FBQzdELGdFQUFrRDtBQUNsRCxvRUFBc0Q7QUFDdEQsOERBQWdEO0FBQ2hELHFFQUF1RDtBQUN2RCxzREFBd0M7QUFFeEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFhOUMsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsU0FBUztJQUVsRCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8scUJBQXFCLEVBQUU7WUFDMUYsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUM5SSxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO1FBRXhILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNqRixRQUFRLEVBQUUsS0FB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L2NvcmUnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgeyBIdHRwT3JpZ2luIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdAYXdzLWNkay9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcblxuY29uc3QgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENka1JvdXRlU3BsaXR0aW5nUHJvcHMge1xuICBob3N0ZWRab25lTmFtZTogc3RyaW5nO1xuICBob3N0ZWRab25lSWQ6IHN0cmluZztcbiAgcHJvamVjdE5hbWU6IHN0cmluZztcbiAgb3JpZ2luU291cmNlRG9tYWluOiBzdHJpbmc7XG4gIGFwcE5hbWU6IHN0cmluZztcbiAgcGFydGl0aW9uS2V5OiBzdHJpbmc7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIG9yaWdpbk5vdEZvdW5kVXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBDZGtSb3V0ZVNwbGl0dGluZyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2RrUm91dGVTcGxpdHRpbmdQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LWVkZ2UtZnVuY3Rpb24tcm9sZWAsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5Db21wb3NpdGVQcmluY2lwYWwobmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VkZ2VsYW1iZGEuYW1hem9uYXdzLmNvbScpKSxcbiAgICB9KTtcbiAgICBsYW1iZGFSb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwic2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiKSk7XG4gICAgbGFtYmRhUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlXCIpKTsgXG5cbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCBcIkhvc3RlZFpvbmVcIiwge1xuICAgICAgem9uZU5hbWU6IHByb3BzLmhvc3RlZFpvbmVOYW1lLFxuICAgICAgaG9zdGVkWm9uZUlkOiBwcm9wcy5ob3N0ZWRab25lSWQsXG4gICAgfSk7XG5cbiAgICBsZXQgZG9tYWluTmFtZTogc3RyaW5nO1xuICAgIGlmKHByb3BzLnN0YWdlID09IFwicHJvZFwiKSB7XG4gICAgICBkb21haW5OYW1lID0gYCR7cHJvcHMucHJvamVjdE5hbWV9LiR7cHJvcHMuaG9zdGVkWm9uZU5hbWV9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluTmFtZSA9IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS4ke3Byb3BzLmhvc3RlZFpvbmVOYW1lfWA7XG4gICAgfVxuXG4gICAgY29uc3QgY2VydCA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgXCJDZXJ0aWZpY2F0ZVwiLCB7XG4gICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWRkSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tYWRkLWluZGV4YCwge1xuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgWydEU0lfQVdTX1JFR0lPTiddOiAndXMtZWFzdC0xJyxcbiAgICAgICAgWydEU0lfT1JJR0lOX05PVF9GT1VORF9VUkwnXTogcHJvcHMub3JpZ2luTm90Rm91bmRVcmwsXG4gICAgICAgIFsnRFNJX1JPVVRJTkdfU1BMSVRfVEFCTEUnXTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYFxuICAgICAgfSxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFwiLi9kaXN0L2FkZFwiKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyLmFkZCdcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LXVwZGF0ZS1pbmRleGAsIHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFsnRFNJX0FXU19SRUdJT04nXTogJ3VzLWVhc3QtMScsXG4gICAgICAgIFsnRFNJX09SSUdJTl9OT1RfRk9VTkRfVVJMJ106IHByb3BzLm9yaWdpbk5vdEZvdW5kVXJsLFxuICAgICAgICBbJ0RTSV9ST1VUSU5HX1NQTElUX1RBQkxFJ106IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWBcbiAgICAgIH0sXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcIi4vZGlzdC91cGRhdGVcIiksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlci51cGRhdGUnXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWxldGVIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5hcHBOYW1lfS1kZWxldGUtaW5kZXhgLCB7XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgICB9LFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvZGVsZXRlXCIpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXIuZGVsJ1xuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgZWRnZUZ1bmMgPSBuZXcgY2xvdWRmcm9udC5leHBlcmltZW50YWwuRWRnZUZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LWdldC1vcmlnaW5gLCB7XG4gICAgLy8gICBlbnZpcm9ubWVudDoge1xuICAgIC8vICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgIC8vICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAvLyAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgLy8gICB9LFxuICAgIC8vICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgLy8gICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvZ2V0LW9yaWdpblwiKSxcbiAgICAvLyAgIGhhbmRsZXI6IFwiaGFuZGxlci5nZXRPcmlnaW5cIixcbiAgICAvLyAgIHJvbGU6IGxhbWJkYVJvbGUgYXMgYW55LFxuICAgIC8vIH0pO1xuXG4gICAgbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LWRpc3RyaWJ1dGlvbmAsIHtcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBIdHRwT3JpZ2luKHByb3BzLm9yaWdpblNvdXJjZURvbWFpbiksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAvLyBlZGdlTGFtYmRhczogW1xuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGZ1bmN0aW9uVmVyc2lvbjogZWRnZUZ1bmMuY3VycmVudFZlcnNpb24sXG4gICAgICAgIC8vICAgICBldmVudFR5cGU6IGNsb3VkZnJvbnQuTGFtYmRhRWRnZUV2ZW50VHlwZS5PUklHSU5fUkVRVUVTVCxcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIF1cbiAgICAgIH0sXG4gICAgICBjb21tZW50OiBgJHtwcm9wcy5zdGFnZX0gJHtwcm9wcy5hcHBOYW1lfSByb3V0ZSBzcGxpdCBEaXN0cmlidXRpb25gLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5hcHBOYW1lfS1yb3V0ZS1zcGxpdHRpbmctYXBpYCwge1xuICAgICAgcmVzdEFwaU5hbWU6IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LXJvdXRlLXNwbGl0dGluZy1hcGlgLFxuICAgICAgZG9tYWluTmFtZToge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogY2VydCBhcyBhbnksXG4gICAgICB9LFxuICAgICAgZGVzY3JpcHRpb246IFwiUm91dGluZyBhcGkgZm9yIGVhY2ggbGFtYmRhIGFzc29zaWF0ZWQgd2l0aCByb3V0aW5nIHNlcnZpY2UuXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvc3RBZGRJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkZEhhbmRsZXIpO1xuICAgIGNvbnN0IGRlbGV0ZURlbGV0ZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlSGFuZGxlcik7XG4gICAgY29uc3QgcG9zdFVwZGF0ZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlSGFuZGxlcik7XG5cbiAgICBjb25zdCByZWNvcmRzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JlY29yZHMnKTtcbiAgICBjb25zdCBhZGRSZWNvcmRzID0gcmVjb3Jkcy5hZGRSZXNvdXJjZSgnYWRkJyk7XG4gICAgY29uc3QgZGVsZXRlUmVjb3JkcyA9IHJlY29yZHMuYWRkUmVzb3VyY2UoJ2RlbGV0ZScpO1xuICAgIGNvbnN0IHVwZGF0ZVJlY29yZHMgPSByZWNvcmRzLmFkZFJlc291cmNlKCd1cGRhdGUnKTtcblxuICAgIGFkZFJlY29yZHMuYWRkTWV0aG9kKFwiUE9TVFwiLCBwb3N0QWRkSW50ZWdyYXRpb24pO1xuICAgIGRlbGV0ZVJlY29yZHMuYWRkTWV0aG9kKFwiREVMRVRFXCIsIGRlbGV0ZURlbGV0ZUludGVncmF0aW9uKTtcbiAgICB1cGRhdGVSZWNvcmRzLmFkZE1ldGhvZChcIlBPU1RcIiwgcG9zdFVwZGF0ZUludGVncmF0aW9uKTtcblxuXG4gICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5hcHBOYW1lfS1yb3V0ZS1zcGxpdHRpbmctdGFibGVgLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogcHJvcHMucGFydGl0aW9uS2V5LCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcmVwbGljYXRpb25SZWdpb25zOiBbJ3VzLWVhc3QtMicsICd1cy13ZXN0LTInXSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgfSk7XG5cbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWRkSGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZUhhbmRsZXIpO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkZWxldGVIYW5kbGVyKTtcbiAgICAvLyB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZWRnZUZ1bmMpO1xuICB9XG59XG4iXX0=