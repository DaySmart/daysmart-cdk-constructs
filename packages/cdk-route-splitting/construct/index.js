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
        const lambdaRole = new iam.Role(this, `${props.stage}-${props.projectName}-edge-function-role`, {
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
        const addHandler = new lambda.Function(this, `${props.stage}-${props.projectName}-add-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.stage}-${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/add"),
            handler: 'handler.add'
        });
        const updateHandler = new lambda.Function(this, `${props.stage}-${props.projectName}-update-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.stage}-${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/update"),
            handler: 'handler.update'
        });
        const deleteHandler = new lambda.Function(this, `${props.stage}-${props.projectName}-delete-index`, {
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
        new cloudfront.Distribution(this, `${props.stage}-${props.projectName}-distribution`, {
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.HttpOrigin(props.originSourceDomain),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            comment: `${props.stage} ${props.projectName} Distribution`,
        });
        const api = new apigateway.RestApi(this, `${props.stage}-${props.projectName}-api`, {
            restApiName: `${props.stage}-${props.projectName}-api`,
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
        const table = new dynamodb.Table(this, `${props.stage}-${props.projectName}-table`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFxQztBQUNyQyxvRUFBc0Q7QUFDdEQsNEVBQTZEO0FBQzdELGdFQUFrRDtBQUNsRCxvRUFBc0Q7QUFDdEQsOERBQWdEO0FBQ2hELHFFQUF1RDtBQUN2RCxzREFBd0M7QUFFeEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFZOUMsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsU0FBUztJQUVsRCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcscUJBQXFCLEVBQUU7WUFDOUYsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUM5SSxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO1FBRXhILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNqRixRQUFRLEVBQUUsS0FB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bmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnQGF3cy1jZGsvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHsgSHR0cE9yaWdpbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnQGF3cy1jZGsvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnQGF3cy1jZGsvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5cbmNvbnN0IGxhbWJkYSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnKTtcblxuZXhwb3J0IGludGVyZmFjZSBDZGtSb3V0ZVNwbGl0dGluZ1Byb3BzIHtcbiAgaG9zdGVkWm9uZU5hbWU6IHN0cmluZztcbiAgaG9zdGVkWm9uZUlkOiBzdHJpbmc7XG4gIHByb2plY3ROYW1lOiBzdHJpbmc7XG4gIG9yaWdpblNvdXJjZURvbWFpbjogc3RyaW5nO1xuICBwYXJ0aXRpb25LZXk6IHN0cmluZztcbiAgc3RhZ2U6IHN0cmluZztcbiAgb3JpZ2luTm90Rm91bmRVcmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENka1JvdXRlU3BsaXR0aW5nIGV4dGVuZHMgY2RrLkNvbnN0cnVjdCB7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDZGtSb3V0ZVNwbGl0dGluZ1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LWVkZ2UtZnVuY3Rpb24tcm9sZWAsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5Db21wb3NpdGVQcmluY2lwYWwobmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VkZ2VsYW1iZGEuYW1hem9uYXdzLmNvbScpKSxcbiAgICB9KTtcbiAgICBsYW1iZGFSb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwic2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiKSk7XG4gICAgbGFtYmRhUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlXCIpKTsgXG5cbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCBcIkhvc3RlZFpvbmVcIiwge1xuICAgICAgem9uZU5hbWU6IHByb3BzLmhvc3RlZFpvbmVOYW1lLFxuICAgICAgaG9zdGVkWm9uZUlkOiBwcm9wcy5ob3N0ZWRab25lSWQsXG4gICAgfSk7XG5cbiAgICBsZXQgZG9tYWluTmFtZTogc3RyaW5nO1xuICAgIGlmKHByb3BzLnN0YWdlID09IFwicHJvZFwiKSB7XG4gICAgICBkb21haW5OYW1lID0gYCR7cHJvcHMucHJvamVjdE5hbWV9LiR7cHJvcHMuaG9zdGVkWm9uZU5hbWV9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluTmFtZSA9IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS4ke3Byb3BzLmhvc3RlZFpvbmVOYW1lfWA7XG4gICAgfVxuXG4gICAgY29uc3QgY2VydCA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgXCJDZXJ0aWZpY2F0ZVwiLCB7XG4gICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWRkSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LWFkZC1pbmRleGAsIHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFsnRFNJX0FXU19SRUdJT04nXTogJ3VzLWVhc3QtMScsXG4gICAgICAgIFsnRFNJX09SSUdJTl9OT1RfRk9VTkRfVVJMJ106IHByb3BzLm9yaWdpbk5vdEZvdW5kVXJsLFxuICAgICAgICBbJ0RTSV9ST1VUSU5HX1NQTElUX1RBQkxFJ106IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWBcbiAgICAgIH0sXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcIi4vZGlzdC9hZGRcIiksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlci5hZGQnXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tdXBkYXRlLWluZGV4YCwge1xuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgWydEU0lfQVdTX1JFR0lPTiddOiAndXMtZWFzdC0xJyxcbiAgICAgICAgWydEU0lfT1JJR0lOX05PVF9GT1VORF9VUkwnXTogcHJvcHMub3JpZ2luTm90Rm91bmRVcmwsXG4gICAgICAgIFsnRFNJX1JPVVRJTkdfU1BMSVRfVEFCTEUnXTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYFxuICAgICAgfSxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFwiLi9kaXN0L3VwZGF0ZVwiKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyLnVwZGF0ZSdcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlbGV0ZUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1kZWxldGUtaW5kZXhgLCB7XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgICB9LFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvZGVsZXRlXCIpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXIuZGVsJ1xuICAgIH0pO1xuXG4gICAgLy8gY29uc3QgZWRnZUZ1bmMgPSBuZXcgY2xvdWRmcm9udC5leHBlcmltZW50YWwuRWRnZUZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LWdldC1vcmlnaW5gLCB7XG4gICAgLy8gICBlbnZpcm9ubWVudDoge1xuICAgIC8vICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgIC8vICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAvLyAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgLy8gICB9LFxuICAgIC8vICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgLy8gICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvZ2V0LW9yaWdpblwiKSxcbiAgICAvLyAgIGhhbmRsZXI6IFwiaGFuZGxlci5nZXRPcmlnaW5cIixcbiAgICAvLyAgIHJvbGU6IGxhbWJkYVJvbGUgYXMgYW55LFxuICAgIC8vIH0pO1xuXG4gICAgbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1kaXN0cmlidXRpb25gLCB7XG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgSHR0cE9yaWdpbihwcm9wcy5vcmlnaW5Tb3VyY2VEb21haW4pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgLy8gZWRnZUxhbWJkYXM6IFtcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBmdW5jdGlvblZlcnNpb246IGVkZ2VGdW5jLmN1cnJlbnRWZXJzaW9uLFxuICAgICAgICAvLyAgICAgZXZlbnRUeXBlOiBjbG91ZGZyb250LkxhbWJkYUVkZ2VFdmVudFR5cGUuT1JJR0lOX1JFUVVFU1QsXG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyBdXG4gICAgICB9LFxuICAgICAgY29tbWVudDogYCR7cHJvcHMuc3RhZ2V9ICR7cHJvcHMucHJvamVjdE5hbWV9IERpc3RyaWJ1dGlvbmAsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1hcGlgLCB7XG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LWFwaWAsXG4gICAgICBkb21haW5OYW1lOiB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBjZXJ0IGFzIGFueSxcbiAgICAgIH0sXG4gICAgICBkZXNjcmlwdGlvbjogXCJSb3V0aW5nIGFwaSBmb3IgZWFjaCBsYW1iZGEgYXNzb3NpYXRlZCB3aXRoIHJvdXRpbmcgc2VydmljZS5cIlxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9zdEFkZEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRkSGFuZGxlcik7XG4gICAgY29uc3QgZGVsZXRlRGVsZXRlSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihkZWxldGVIYW5kbGVyKTtcbiAgICBjb25zdCBwb3N0VXBkYXRlSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVIYW5kbGVyKTtcblxuICAgIGNvbnN0IHJlY29yZHMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmVjb3JkcycpO1xuICAgIGNvbnN0IGFkZFJlY29yZHMgPSByZWNvcmRzLmFkZFJlc291cmNlKCdhZGQnKTtcbiAgICBjb25zdCBkZWxldGVSZWNvcmRzID0gcmVjb3Jkcy5hZGRSZXNvdXJjZSgnZGVsZXRlJyk7XG4gICAgY29uc3QgdXBkYXRlUmVjb3JkcyA9IHJlY29yZHMuYWRkUmVzb3VyY2UoJ3VwZGF0ZScpO1xuXG4gICAgYWRkUmVjb3Jkcy5hZGRNZXRob2QoXCJQT1NUXCIsIHBvc3RBZGRJbnRlZ3JhdGlvbik7XG4gICAgZGVsZXRlUmVjb3Jkcy5hZGRNZXRob2QoXCJERUxFVEVcIiwgZGVsZXRlRGVsZXRlSW50ZWdyYXRpb24pO1xuICAgIHVwZGF0ZVJlY29yZHMuYWRkTWV0aG9kKFwiUE9TVFwiLCBwb3N0VXBkYXRlSW50ZWdyYXRpb24pO1xuXG5cbiAgIGNvbnN0IHRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWAsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBwcm9wcy5wYXJ0aXRpb25LZXksIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICByZXBsaWNhdGlvblJlZ2lvbnM6IFsndXMtZWFzdC0yJywgJ3VzLXdlc3QtMiddLFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICB9KTtcblxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhZGRIYW5kbGVyKTtcbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlSGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZUhhbmRsZXIpO1xuICAgIC8vIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShlZGdlRnVuYyk7XG4gIH1cbn1cbiJdfQ==