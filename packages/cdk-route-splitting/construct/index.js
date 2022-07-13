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
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/add"),
            handler: 'handler.add'
        });
        const updateHandler = new lambda.Function(this, `${props.stage}-${props.appName}-update-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/update"),
            handler: 'handler.update'
        });
        const deleteHandler = new lambda.Function(this, `${props.stage}-${props.appName}-delete-index`, {
            environment: {
                ['DSI_AWS_REGION']: 'us-east-1',
                ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
                ['DSI_ROUTING_SPLIT_TABLE']: `${props.projectName}-table`
            },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/delete"),
            handler: 'handler.del'
        });
        const edgeFunc = new cloudfront.experimental.EdgeFunction(this, `${props.stage}-${props.appName}-get-origin`, {
            // environment: {
            //   ['DSI_AWS_REGION']: 'us-east-1',
            //   ['DSI_ORIGIN_NOT_FOUND_URL']: props.originNotFoundUrl,
            //   ['DSI_ROUTING_SPLIT_TABLE']: `${props.projectName}-table`
            // },
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("./dist/get-origin"),
            handler: "handler.getOrigin",
            role: lambdaRole,
        });
        new cloudfront.Distribution(this, `${props.stage}-${props.appName}-distribution`, {
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.HttpOrigin(props.originSourceDomain),
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
            tableName: `${props.projectName}-table`,
            partitionKey: { name: props.partitionKey, type: dynamodb.AttributeType.STRING },
            replicationRegions: ['us-east-2', 'us-west-2'],
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
        table.grantReadWriteData(addHandler);
        table.grantReadWriteData(updateHandler);
        table.grantReadWriteData(deleteHandler);
        table.grantReadWriteData(edgeFunc);
    }
}
exports.CdkRouteSplitting = CdkRouteSplitting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFxQztBQUNyQyxvRUFBc0Q7QUFDdEQsNEVBQTZEO0FBQzdELGdFQUFrRDtBQUNsRCxvRUFBc0Q7QUFDdEQsOERBQWdEO0FBQ2hELHFFQUF1RDtBQUN2RCxzREFBd0M7QUFFeEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFhOUMsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsU0FBUztJQUVsRCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8scUJBQXFCLEVBQUU7WUFDMUYsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUFDLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUM5SSxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO1FBRXhILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNqRixRQUFRLEVBQUUsS0FB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Q0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4QyxLQUFLLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FDRjtBQTNIRCw4Q0EySEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ0Bhd3MtY2RrL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCB7IEh0dHBPcmlnaW4gfSBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnQGF3cy1jZGsvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ0Bhd3MtY2RrL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuXG5jb25zdCBsYW1iZGEgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtbGFtYmRhJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2RrUm91dGVTcGxpdHRpbmdQcm9wcyB7XG4gIGhvc3RlZFpvbmVOYW1lOiBzdHJpbmc7XG4gIGhvc3RlZFpvbmVJZDogc3RyaW5nO1xuICBwcm9qZWN0TmFtZTogc3RyaW5nO1xuICBvcmlnaW5Tb3VyY2VEb21haW46IHN0cmluZztcbiAgYXBwTmFtZTogc3RyaW5nO1xuICBwYXJ0aXRpb25LZXk6IHN0cmluZztcbiAgc3RhZ2U6IHN0cmluZztcbiAgb3JpZ2luTm90Rm91bmRVcmw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENka1JvdXRlU3BsaXR0aW5nIGV4dGVuZHMgY2RrLkNvbnN0cnVjdCB7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDZGtSb3V0ZVNwbGl0dGluZ1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tZWRnZS1mdW5jdGlvbi1yb2xlYCwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkNvbXBvc2l0ZVByaW5jaXBhbChuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWRnZWxhbWJkYS5hbWF6b25hd3MuY29tJykpLFxuICAgIH0pO1xuICAgIGxhbWJkYVJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIpKTtcbiAgICBsYW1iZGFSb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwic2VydmljZS1yb2xlL0FXU0xhbWJkYVZQQ0FjY2Vzc0V4ZWN1dGlvblJvbGVcIikpOyBcblxuICAgIGNvbnN0IGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKHRoaXMsIFwiSG9zdGVkWm9uZVwiLCB7XG4gICAgICB6b25lTmFtZTogcHJvcHMuaG9zdGVkWm9uZU5hbWUsXG4gICAgICBob3N0ZWRab25lSWQ6IHByb3BzLmhvc3RlZFpvbmVJZCxcbiAgICB9KTtcblxuICAgIGxldCBkb21haW5OYW1lOiBzdHJpbmc7XG4gICAgaWYocHJvcHMuc3RhZ2UgPT0gXCJwcm9kXCIpIHtcbiAgICAgIGRvbWFpbk5hbWUgPSBgJHtwcm9wcy5wcm9qZWN0TmFtZX0uJHtwcm9wcy5ob3N0ZWRab25lTmFtZX1gO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW5OYW1lID0gYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMucHJvamVjdE5hbWV9LiR7cHJvcHMuaG9zdGVkWm9uZU5hbWV9YDtcbiAgICB9XG5cbiAgICBjb25zdCBjZXJ0ID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCBcIkNlcnRpZmljYXRlXCIsIHtcbiAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBhZGRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgJHtwcm9wcy5zdGFnZX0tJHtwcm9wcy5hcHBOYW1lfS1hZGQtaW5kZXhgLCB7XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBbJ0RTSV9BV1NfUkVHSU9OJ106ICd1cy1lYXN0LTEnLFxuICAgICAgICBbJ0RTSV9PUklHSU5fTk9UX0ZPVU5EX1VSTCddOiBwcm9wcy5vcmlnaW5Ob3RGb3VuZFVybCxcbiAgICAgICAgWydEU0lfUk9VVElOR19TUExJVF9UQUJMRSddOiBgJHtwcm9wcy5wcm9qZWN0TmFtZX0tdGFibGVgXG4gICAgICB9LFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoXCIuL2Rpc3QvYWRkXCIpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXIuYWRkJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tdXBkYXRlLWluZGV4YCwge1xuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgWydEU0lfQVdTX1JFR0lPTiddOiAndXMtZWFzdC0xJyxcbiAgICAgICAgWydEU0lfT1JJR0lOX05PVF9GT1VORF9VUkwnXTogcHJvcHMub3JpZ2luTm90Rm91bmRVcmwsXG4gICAgICAgIFsnRFNJX1JPVVRJTkdfU1BMSVRfVEFCTEUnXTogYCR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYFxuICAgICAgfSxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KFwiLi9kaXN0L3VwZGF0ZVwiKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyLnVwZGF0ZSdcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlbGV0ZUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LWRlbGV0ZS1pbmRleGAsIHtcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFsnRFNJX0FXU19SRUdJT04nXTogJ3VzLWVhc3QtMScsXG4gICAgICAgIFsnRFNJX09SSUdJTl9OT1RfRk9VTkRfVVJMJ106IHByb3BzLm9yaWdpbk5vdEZvdW5kVXJsLFxuICAgICAgICBbJ0RTSV9ST1VUSU5HX1NQTElUX1RBQkxFJ106IGAke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWBcbiAgICAgIH0sXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcIi4vZGlzdC9kZWxldGVcIiksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlci5kZWwnXG4gICAgfSk7XG5cbiAgICBjb25zdCBlZGdlRnVuYyA9IG5ldyBjbG91ZGZyb250LmV4cGVyaW1lbnRhbC5FZGdlRnVuY3Rpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tZ2V0LW9yaWdpbmAsIHtcbiAgICAgIC8vIGVudmlyb25tZW50OiB7XG4gICAgICAvLyAgIFsnRFNJX0FXU19SRUdJT04nXTogJ3VzLWVhc3QtMScsXG4gICAgICAvLyAgIFsnRFNJX09SSUdJTl9OT1RfRk9VTkRfVVJMJ106IHByb3BzLm9yaWdpbk5vdEZvdW5kVXJsLFxuICAgICAgLy8gICBbJ0RTSV9ST1VUSU5HX1NQTElUX1RBQkxFJ106IGAke3Byb3BzLnByb2plY3ROYW1lfS10YWJsZWBcbiAgICAgIC8vIH0sXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChcIi4vZGlzdC9nZXQtb3JpZ2luXCIpLFxuICAgICAgaGFuZGxlcjogXCJoYW5kbGVyLmdldE9yaWdpblwiLFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tZGlzdHJpYnV0aW9uYCwge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IEh0dHBPcmlnaW4ocHJvcHMub3JpZ2luU291cmNlRG9tYWluKSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGVkZ2VMYW1iZGFzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZnVuY3Rpb25WZXJzaW9uOiBlZGdlRnVuYy5jdXJyZW50VmVyc2lvbixcbiAgICAgICAgICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5MYW1iZGFFZGdlRXZlbnRUeXBlLk9SSUdJTl9SRVFVRVNULFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIGNvbW1lbnQ6IGAke3Byb3BzLnN0YWdlfSAke3Byb3BzLmFwcE5hbWV9IHJvdXRlIHNwbGl0IERpc3RyaWJ1dGlvbmAsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LXJvdXRlLXNwbGl0dGluZy1hcGlgLCB7XG4gICAgICByZXN0QXBpTmFtZTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX0tcm91dGUtc3BsaXR0aW5nLWFwaWAsXG4gICAgICBkb21haW5OYW1lOiB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBjZXJ0IGFzIGFueSxcbiAgICAgIH0sXG4gICAgICBkZXNjcmlwdGlvbjogXCJSb3V0aW5nIGFwaSBmb3IgZWFjaCBsYW1iZGEgYXNzb3NpYXRlZCB3aXRoIHJvdXRpbmcgc2VydmljZS5cIlxuICAgIH0pO1xuXG4gICAgY29uc3QgcG9zdEFkZEludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRkSGFuZGxlcik7XG4gICAgY29uc3QgZGVsZXRlRGVsZXRlSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihkZWxldGVIYW5kbGVyKTtcbiAgICBjb25zdCBwb3N0VXBkYXRlSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGRhdGVIYW5kbGVyKTtcblxuICAgIGNvbnN0IHJlY29yZHMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmVjb3JkcycpO1xuICAgIGNvbnN0IGFkZFJlY29yZHMgPSByZWNvcmRzLmFkZFJlc291cmNlKCdhZGQnKTtcbiAgICBjb25zdCBkZWxldGVSZWNvcmRzID0gcmVjb3Jkcy5hZGRSZXNvdXJjZSgnZGVsZXRlJyk7XG4gICAgY29uc3QgdXBkYXRlUmVjb3JkcyA9IHJlY29yZHMuYWRkUmVzb3VyY2UoJ3VwZGF0ZScpO1xuXG4gICAgYWRkUmVjb3Jkcy5hZGRNZXRob2QoXCJQT1NUXCIsIHBvc3RBZGRJbnRlZ3JhdGlvbik7XG4gICAgZGVsZXRlUmVjb3Jkcy5hZGRNZXRob2QoXCJERUxFVEVcIiwgZGVsZXRlRGVsZXRlSW50ZWdyYXRpb24pO1xuICAgIHVwZGF0ZVJlY29yZHMuYWRkTWV0aG9kKFwiUE9TVFwiLCBwb3N0VXBkYXRlSW50ZWdyYXRpb24pO1xuXG5cbiAgIGNvbnN0IHRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGAke3Byb3BzLnN0YWdlfS0ke3Byb3BzLmFwcE5hbWV9LXJvdXRlLXNwbGl0dGluZy10YWJsZWAsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvcHMucHJvamVjdE5hbWV9LXRhYmxlYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBwcm9wcy5wYXJ0aXRpb25LZXksIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICByZXBsaWNhdGlvblJlZ2lvbnM6IFsndXMtZWFzdC0yJywgJ3VzLXdlc3QtMiddLFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICB9KTtcblxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhZGRIYW5kbGVyKTtcbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlSGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZUhhbmRsZXIpO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShlZGdlRnVuYyk7XG4gIH1cbn1cbiJdfQ==