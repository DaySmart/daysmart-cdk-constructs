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
const route53targets = __importStar(require("@aws-cdk/aws-route53-targets"));
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
        new route53.ARecord(this, `${props.stage}-${props.projectName}-a-record`, {
            zone: hostedZone,
            recordName: `${props.stage}-${props.projectName}`,
            target: route53.RecordTarget.fromAlias(new route53targets.ApiGateway(api)),
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFxQztBQUNyQyxvRUFBc0Q7QUFDdEQsNEVBQTZEO0FBQzdELGdFQUFrRDtBQUNsRCxvRUFBc0Q7QUFDdEQsOERBQWdEO0FBQ2hELHFFQUF1RDtBQUN2RCxzREFBd0M7QUFDeEMsNkVBQStEO0FBRS9ELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBWTlDLE1BQWEsaUJBQWtCLFNBQVEsR0FBRyxDQUFDLFNBQVM7SUFFbEQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLHFCQUFxQixFQUFFO1lBQzlGLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDLENBQUM7U0FDOUksQ0FBQyxDQUFDO1FBQ0gsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDO1FBQ3BILFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQztRQUV4SCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDakYs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ZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1NBQ2pELENBQUMsQ0FBQztRQUVILEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hDLHNDQUFzQztJQUN4QyxDQUFDO0NBQ0Y7QUFoSUQsOENBZ0lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgeyBIdHRwT3JpZ2luIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdAYXdzLWNkay9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIHJvdXRlNTN0YXJnZXRzIGZyb20gJ0Bhd3MtY2RrL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuXG5jb25zdCBsYW1iZGEgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbGFtYmRhJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2RrUm91dGVTcGxpdHRpbmdQcm9wcyB7XG4gIGhvc3RlZFpvbmVOYW1lOiBzdHJpbmc7XG4gIGhvc3RlZFpvbmVJZDogc3RyaW5nO1xuICBwcm9qZWN0TmFtZTogc3RyaW5nO1xuICBvcmlnaW5Tb3VyY2VEb21haW46IHN0cmluZztcbiAgcGFydGl0aW9uS2V5OiBzdHJpbmc7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIG9yaWdpbk5vdEZvdW5kVXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBDZGtSb3V0ZVNwbGl0dGluZyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2RrUm91dGVTcGxpdHRpbmdQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1lZGdlLWZ1bmN0aW9uLXJvbGVgLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQ29tcG9zaXRlUHJpbmNpcGFsKG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSwgbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlZGdlbGFtYmRhLmFtYXpvbmF3cy5jb20nKSksXG4gICAgfSk7XG4gICAgbGFtYmRhUm9sZS5hZGRNYW5hZ2VkUG9saWN5KGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIikpO1xuICAgIGxhbWJkYVJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhVlBDQWNjZXNzRXhlY3V0aW9uUm9sZVwiKSk7IFxuXG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXModGhpcywgXCJIb3N0ZWRab25lXCIsIHtcbiAgICAgIHpvbmVOYW1lOiBwcm9wcy5ob3N0ZWRab25lTmFtZSxcbiAgICAgIGhvc3RlZFpvbmVJZDogcHJvcHMuaG9zdGVkWm9uZUlkLFxuICAgIH0pO1xuXG4gICAgbGV0IGRvbWFpbk5hbWU6IHN0cmluZztcbiAgICBpZihwcm9wcy5zdGFnZSA9PSBcInByb2RcIikge1xuICAgICAgZG9tYWluTmFtZSA9IGAke3Byb3BzLnByb2plY3ROYW1lfS4ke3Byb3BzLmhvc3RlZFpvbmVOYW1lfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvbWFpbk5hbWUgPSBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0uJHtwcm9wcy5ob3N0ZWRab25lTmFtZX1gO1xuICAgIH1cblxuICAgIGNvbnN0IGNlcnQgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsIFwiQ2VydGlmaWNhdGVcIiwge1xuICAgICAgZG9tYWluTmFtZTogZG9tYWluTmFtZSxcbiAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFkZEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1hZGQtaW5kZXhgLCB7XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgICB9LFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvYWRkXCIpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXIuYWRkJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LXVwZGF0ZS1pbmRleGAsIHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFsnRFNJX0FXU19SRUdJT04nXTogJ3VzLWVhc3QtMScsXG4gICAgICAgIFsnRFNJX09SSUdJTl9OT1RfRk9VTkRfVVJMJ106IHByb3BzLm9yaWdpbk5vdEZvdW5kVXJsLFxuICAgICAgICBbJ0RTSV9ST1VUSU5HX1NQTElUX1RBQkxFJ106IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWBcbiAgICAgIH0sXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcIi4vZGlzdC91cGRhdGVcIiksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlci51cGRhdGUnXG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWxldGVIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tZGVsZXRlLWluZGV4YCwge1xuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgWydEU0lfQVdTX1JFR0lPTiddOiAndXMtZWFzdC0xJyxcbiAgICAgICAgWydEU0lfT1JJR0lOX05PVF9GT1VORF9VUkwnXTogcHJvcHMub3JpZ2luTm90Rm91bmRVcmwsXG4gICAgICAgIFsnRFNJX1JPVVRJTkdfU1BMSVRfVEFCTEUnXTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYFxuICAgICAgfSxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFwiLi9kaXN0L2RlbGV0ZVwiKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyLmRlbCdcbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGVkZ2VGdW5jID0gbmV3IGNsb3VkZnJvbnQuZXhwZXJpbWVudGFsLkVkZ2VGdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5hcHBOYW1lfS1nZXQtb3JpZ2luYCwge1xuICAgIC8vICAgZW52aXJvbm1lbnQ6IHtcbiAgICAvLyAgICAgWydEU0lfQVdTX1JFR0lPTiddOiAndXMtZWFzdC0xJyxcbiAgICAvLyAgICAgWydEU0lfT1JJR0lOX05PVF9GT1VORF9VUkwnXTogcHJvcHMub3JpZ2luTm90Rm91bmRVcmwsXG4gICAgLy8gICAgIFsnRFNJX1JPVVRJTkdfU1BMSVRfVEFCTEUnXTogYCR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYFxuICAgIC8vICAgfSxcbiAgICAvLyAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgIC8vICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFwiLi9kaXN0L2dldC1vcmlnaW5cIiksXG4gICAgLy8gICBoYW5kbGVyOiBcImhhbmRsZXIuZ2V0T3JpZ2luXCIsXG4gICAgLy8gICByb2xlOiBsYW1iZGFSb2xlIGFzIGFueSxcbiAgICAvLyB9KTtcblxuICAgIG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tZGlzdHJpYnV0aW9uYCwge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IEh0dHBPcmlnaW4ocHJvcHMub3JpZ2luU291cmNlRG9tYWluKSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIC8vIGVkZ2VMYW1iZGFzOiBbXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgZnVuY3Rpb25WZXJzaW9uOiBlZGdlRnVuYy5jdXJyZW50VmVyc2lvbixcbiAgICAgICAgLy8gICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5MYW1iZGFFZGdlRXZlbnRUeXBlLk9SSUdJTl9SRVFVRVNULFxuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gXVxuICAgICAgfSxcbiAgICAgIGNvbW1lbnQ6IGAke3Byb3BzLnN0YWdlfSAke3Byb3BzLnByb2plY3ROYW1lfSBEaXN0cmlidXRpb25gLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tYXBpYCwge1xuICAgICAgcmVzdEFwaU5hbWU6IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1hcGlgLFxuICAgICAgZG9tYWluTmFtZToge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogY2VydCBhcyBhbnksXG4gICAgICB9LFxuICAgICAgZGVzY3JpcHRpb246IFwiUm91dGluZyBhcGkgZm9yIGVhY2ggbGFtYmRhIGFzc29zaWF0ZWQgd2l0aCByb3V0aW5nIHNlcnZpY2UuXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IHBvc3RBZGRJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkZEhhbmRsZXIpO1xuICAgIGNvbnN0IGRlbGV0ZURlbGV0ZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVsZXRlSGFuZGxlcik7XG4gICAgY29uc3QgcG9zdFVwZGF0ZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlSGFuZGxlcik7XG5cbiAgICBjb25zdCByZWNvcmRzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JlY29yZHMnKTtcbiAgICBjb25zdCBhZGRSZWNvcmRzID0gcmVjb3Jkcy5hZGRSZXNvdXJjZSgnYWRkJyk7XG4gICAgY29uc3QgZGVsZXRlUmVjb3JkcyA9IHJlY29yZHMuYWRkUmVzb3VyY2UoJ2RlbGV0ZScpO1xuICAgIGNvbnN0IHVwZGF0ZVJlY29yZHMgPSByZWNvcmRzLmFkZFJlc291cmNlKCd1cGRhdGUnKTtcblxuICAgIGFkZFJlY29yZHMuYWRkTWV0aG9kKFwiUE9TVFwiLCBwb3N0QWRkSW50ZWdyYXRpb24pO1xuICAgIGRlbGV0ZVJlY29yZHMuYWRkTWV0aG9kKFwiREVMRVRFXCIsIGRlbGV0ZURlbGV0ZUludGVncmF0aW9uKTtcbiAgICB1cGRhdGVSZWNvcmRzLmFkZE1ldGhvZChcIlBPU1RcIiwgcG9zdFVwZGF0ZUludGVncmF0aW9uKTtcbiAgICBcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS1hLXJlY29yZGAsIHtcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICByZWNvcmROYW1lOiBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX1gLFxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHJvdXRlNTN0YXJnZXRzLkFwaUdhdGV3YXkoYXBpKSksXG4gICAgfSk7XG5cbiAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgLCB7XG4gICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogcHJvcHMucGFydGl0aW9uS2V5LCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcmVwbGljYXRpb25SZWdpb25zOiBbJ3VzLWVhc3QtMicsICd1cy13ZXN0LTInXSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgfSk7XG5cbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWRkSGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZUhhbmRsZXIpO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkZWxldGVIYW5kbGVyKTtcbiAgICAvLyB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZWRnZUZ1bmMpO1xuICB9XG59XG4iXX0=