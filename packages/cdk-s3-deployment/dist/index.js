"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkS3Deployment = void 0;
const path = require("path");
const cdk = require("@aws-cdk/core");
const lambda = require("@aws-cdk/aws-lambda");
const aws_s3_deployment_1 = require("@aws-cdk/aws-s3-deployment");
const s3 = require("@aws-cdk/aws-s3");
const cloudfront = require("@aws-cdk/aws-cloudfront");
const iam = require("@aws-cdk/aws-iam");
const lambda_layer_awscli_1 = require("@aws-cdk/lambda-layer-awscli");
class CdkS3Deployment extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);
        const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'Distribution', {
            distributionId: props.distributionId,
            domainName: props.distributionDomain
        });
        let destinationPrefix = props.distributionPath;
        if (destinationPrefix && destinationPrefix.startsWith('/')) {
            destinationPrefix = destinationPrefix.substring(1);
        }
        const handler = new lambda.SingletonFunction(this, 'BucketDeploymentHandler', {
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            layers: [new lambda_layer_awscli_1.AwsCliLayer(this, 'AWSCliLayer')],
            runtime: lambda.Runtime.PYTHON_3_6,
            handler: 'handler.handler',
            lambdaPurpose: 'Custom::BucketDeployment',
            timeout: cdk.Duration.minutes(15),
            uuid: '8693BB64-9689-44B6-9AAF-B0CC9EB8756C'
        });
        bucket.grantReadWrite(handler);
        const handlerRole = handler.role;
        if (!handlerRole) {
            throw new Error('lambda.SingletonFunction should have created a Role');
        }
        const sources = [aws_s3_deployment_1.Source.asset(props.sourceDir ? props.sourceDir : '../dist')].map((source) => source.bind(this, { handlerRole }));
        handler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudfront:GetInvalidation',
                'cloudfront:CreateInvalidation',
                'cloudfront:ListDistributions'
            ],
            resources: ['*']
        }));
        handler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'sns:Publish'
            ],
            resources: [`${props.snsTopicArn}`]
        }));
        new cdk.CustomResource(this, 'CustomResource', {
            serviceToken: handler.functionArn,
            resourceType: 'Custom::BucketDeployment',
            properties: {
                SourceBucketNames: sources.map(source => source.bucket.bucketName),
                SourceObjectKeys: sources.map(source => source.zipObjectKey),
                DestinationBucketName: bucket.bucketName,
                DestinationBucketKeyPrefix: destinationPrefix,
                DistributionId: distribution.distributionId,
                DistributionPaths: [props.distributionPath ? `${props.distributionPath}/*` : '/*'],
                Environment: props.environment,
                SnsTopicArn: props.snsTopicArn
            }
        });
    }
}
exports.CdkS3Deployment = CdkS3Deployment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyw4Q0FBOEM7QUFDOUMsa0VBQTJFO0FBQzNFLHNDQUFzQztBQUN0QyxzREFBc0Q7QUFDdEQsd0NBQXdDO0FBQ3hDLHNFQUEyRDtBQVkzRCxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLFNBQVM7SUFFaEQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTFFLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM1RixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7WUFDcEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxrQkFBa0I7U0FDckMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7UUFDL0MsSUFBRyxpQkFBaUIsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekQsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BEO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRCxNQUFNLEVBQUUsQ0FBQyxJQUFJLGlDQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVU7WUFDbEMsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixhQUFhLEVBQUUsMEJBQTBCO1lBQ3pDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxFQUFFLHNDQUFzQztTQUM3QyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDakMsSUFBRyxDQUFDLFdBQVcsRUFBRTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztTQUFFO1FBQzVGLE1BQU0sT0FBTyxHQUFtQixDQUFDLDBCQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBZSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFHLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1SixPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM5QyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCw0QkFBNEI7Z0JBQzVCLCtCQUErQjtnQkFDL0IsOEJBQThCO2FBQy9CO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDOUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsYUFBYTthQUNkO1lBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzdDLFlBQVksRUFBRSxPQUFPLENBQUMsV0FBVztZQUNqQyxZQUFZLEVBQUUsMEJBQTBCO1lBQ3hDLFVBQVUsRUFBRTtnQkFDVixpQkFBaUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7Z0JBQ2xFLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO2dCQUM1RCxxQkFBcUIsRUFBRSxNQUFNLENBQUMsVUFBVTtnQkFDeEMsMEJBQTBCLEVBQUUsaUJBQWlCO2dCQUM3QyxjQUFjLEVBQUUsWUFBWSxDQUFDLGNBQWM7Z0JBQzNDLGlCQUFpQixFQUFFLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xGLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztnQkFDOUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2FBQy9CO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbEVELDBDQWtFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTb3VyY2UsIFNvdXJjZUNvbmZpZywgSVNvdXJjZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1kZXBsb3ltZW50JztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnQGF3cy1jZGsvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcclxuaW1wb3J0IHsgQXdzQ2xpTGF5ZXIgfSBmcm9tICdAYXdzLWNkay9sYW1iZGEtbGF5ZXItYXdzY2xpJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2RrUzNEZXBsb3ltZW50UHJvcHMge1xyXG4gIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuICBkaXN0cmlidXRpb25JZDogc3RyaW5nO1xyXG4gIGRpc3RyaWJ1dGlvbkRvbWFpbjogc3RyaW5nO1xyXG4gIHNvdXJjZURpcj86IHN0cmluZztcclxuICBkaXN0cmlidXRpb25QYXRoPzogc3RyaW5nO1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgc25zVG9waWNBcm46IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENka1MzRGVwbG95bWVudCBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENka1MzRGVwbG95bWVudFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGJ1Y2tldCA9IHMzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZSh0aGlzLCAnQnVja2V0JywgcHJvcHMuYnVja2V0TmFtZSk7XHJcblxyXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gY2xvdWRmcm9udC5EaXN0cmlidXRpb24uZnJvbURpc3RyaWJ1dGlvbkF0dHJpYnV0ZXModGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcclxuICAgICAgZGlzdHJpYnV0aW9uSWQ6IHByb3BzLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICBkb21haW5OYW1lOiBwcm9wcy5kaXN0cmlidXRpb25Eb21haW5cclxuICAgIH0pO1xyXG5cclxuICAgIGxldCBkZXN0aW5hdGlvblByZWZpeCA9IHByb3BzLmRpc3RyaWJ1dGlvblBhdGg7XHJcbiAgICBpZihkZXN0aW5hdGlvblByZWZpeCAmJiBkZXN0aW5hdGlvblByZWZpeC5zdGFydHNXaXRoKCcvJykpIHtcclxuICAgICAgZGVzdGluYXRpb25QcmVmaXggPSBkZXN0aW5hdGlvblByZWZpeC5zdWJzdHJpbmcoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaGFuZGxlciA9IG5ldyBsYW1iZGEuU2luZ2xldG9uRnVuY3Rpb24odGhpcywgJ0J1Y2tldERlcGxveW1lbnRIYW5kbGVyJywge1xyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xhbWJkYScpKSxcclxuICAgICAgbGF5ZXJzOiBbbmV3IEF3c0NsaUxheWVyKHRoaXMsICdBV1NDbGlMYXllcicpXSxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfNixcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXIuaGFuZGxlcicsXHJcbiAgICAgIGxhbWJkYVB1cnBvc2U6ICdDdXN0b206OkJ1Y2tldERlcGxveW1lbnQnLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksXHJcbiAgICAgIHV1aWQ6ICc4NjkzQkI2NC05Njg5LTQ0QjYtOUFBRi1CMENDOUVCODc1NkMnXHJcbiAgICB9KTtcclxuXHJcbiAgICBidWNrZXQuZ3JhbnRSZWFkV3JpdGUoaGFuZGxlcik7XHJcblxyXG4gICAgY29uc3QgaGFuZGxlclJvbGUgPSBoYW5kbGVyLnJvbGU7XHJcbiAgICBpZighaGFuZGxlclJvbGUpIHsgdGhyb3cgbmV3IEVycm9yKCdsYW1iZGEuU2luZ2xldG9uRnVuY3Rpb24gc2hvdWxkIGhhdmUgY3JlYXRlZCBhIFJvbGUnKTsgfVxyXG4gICAgY29uc3Qgc291cmNlczogU291cmNlQ29uZmlnW10gPSBbU291cmNlLmFzc2V0KHByb3BzLnNvdXJjZURpciA/IHByb3BzLnNvdXJjZURpciA6ICcuLi9kaXN0JyldLm1hcCgoc291cmNlOiBJU291cmNlKSA9PiBzb3VyY2UuYmluZCh0aGlzLCB7ICBoYW5kbGVyUm9sZSB9KSk7XHJcblxyXG4gICAgaGFuZGxlci5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY2xvdWRmcm9udDpHZXRJbnZhbGlkYXRpb24nLFxyXG4gICAgICAgICdjbG91ZGZyb250OkNyZWF0ZUludmFsaWRhdGlvbicsXHJcbiAgICAgICAgJ2Nsb3VkZnJvbnQ6TGlzdERpc3RyaWJ1dGlvbnMnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ11cclxuICAgIH0pKTtcclxuXHJcbiAgICBoYW5kbGVyLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzbnM6UHVibGlzaCdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbYCR7cHJvcHMuc25zVG9waWNBcm59YF1cclxuICAgIH0pKTtcclxuXHJcbiAgICBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdDdXN0b21SZXNvdXJjZScsIHtcclxuICAgICAgc2VydmljZVRva2VuOiBoYW5kbGVyLmZ1bmN0aW9uQXJuLFxyXG4gICAgICByZXNvdXJjZVR5cGU6ICdDdXN0b206OkJ1Y2tldERlcGxveW1lbnQnLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgU291cmNlQnVja2V0TmFtZXM6IHNvdXJjZXMubWFwKHNvdXJjZSA9PiBzb3VyY2UuYnVja2V0LmJ1Y2tldE5hbWUpLFxyXG4gICAgICAgIFNvdXJjZU9iamVjdEtleXM6IHNvdXJjZXMubWFwKHNvdXJjZSA9PiBzb3VyY2UuemlwT2JqZWN0S2V5KSxcclxuICAgICAgICBEZXN0aW5hdGlvbkJ1Y2tldE5hbWU6IGJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIERlc3RpbmF0aW9uQnVja2V0S2V5UHJlZml4OiBkZXN0aW5hdGlvblByZWZpeCxcclxuICAgICAgICBEaXN0cmlidXRpb25JZDogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICAgIERpc3RyaWJ1dGlvblBhdGhzOiBbcHJvcHMuZGlzdHJpYnV0aW9uUGF0aCA/IGAke3Byb3BzLmRpc3RyaWJ1dGlvblBhdGh9LypgIDogJy8qJ10sXHJcbiAgICAgICAgRW52aXJvbm1lbnQ6IHByb3BzLmVudmlyb25tZW50LFxyXG4gICAgICAgIFNuc1RvcGljQXJuOiBwcm9wcy5zbnNUb3BpY0FyblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19