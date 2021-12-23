import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Source, SourceConfig, ISource } from '@aws-cdk/aws-s3-deployment';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import { AwsCliLayer } from '@aws-cdk/lambda-layer-awscli';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { StateMachine } from '@aws-cdk/aws-stepfunctions';
import { Construct } from '@aws-cdk/core';
import { stringify } from 'querystring';

export interface CdkS3DeploymentProps {
  bucketName: string;
  distributionId: string;
  distributionDomain: string;
  sourceDir?: string;
  distributionPath?: string;
  environment: string;
  snsTopicArn: string;
}

declare const submitLambda: lambda.Function;
declare const getStatusLambda: lambda.Function;

export class CdkS3Deployment extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkS3DeploymentProps) {
    super(scope, id);

    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', props.bucketName);

    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'Distribution', {
      distributionId: props.distributionId,
      domainName: props.distributionDomain
    });

    let destinationPrefix = props.distributionPath;
    if(destinationPrefix && destinationPrefix.startsWith('/')) {
      destinationPrefix = destinationPrefix.substring(1);
    }

    const handler = new lambda.SingletonFunction(this, 'BucketDeploymentHandler', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      layers: [new AwsCliLayer(this, 'AWSCliLayer')],
      runtime: lambda.Runtime.PYTHON_3_6,
      handler: 'handler.handler',
      lambdaPurpose: 'Custom::BucketDeployment',
      timeout: cdk.Duration.minutes(15),
      uuid: '8693BB64-9689-44B6-9AAF-B0CC9EB8756C'
    });

    bucket.grantReadWrite(handler);

    const handlerRole = handler.role;
    if(!handlerRole) { throw new Error('lambda.SingletonFunction should have created a Role'); }
    const sources: SourceConfig[] = [Source.asset(props.sourceDir ? props.sourceDir : '../dist')].map((source: ISource) => source.bind(this, {  handlerRole }));

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

    // New Lambda for step function
    const sendResultLambda = new lambda.SingletonFunction(this, 'SendResultLambda', {
      code: lambda.Code.fromInline(`
      //Source code of lambda
      `),
      layers: [new AwsCliLayer(this, 'AWSCliLayer')],
      runtime: lambda.Runtime.PYTHON_3_6,
      handler: 'handler.handler',
      lambdaPurpose: 'Custom::BucketDeployment',
      timeout: cdk.Duration.minutes(15),
      uuid: '8693BB64-9689-44B6-9AAF-B0CC9EB8756C'
    })

    // setup consts to put into step function
    const sendResult = new tasks.LambdaInvoke(this, 'Send Result', {
      lambdaFunction: sendResultLambda,
      // Result is in attribute Payload
      outputPath: '$.Payload',
    });
    const waitTime = new sfn.Wait(this, 'Wait X Seconds',{
      time: sfn.WaitTime.secondsPath('$.waitSeconds'),
    });
    const getStatus = new tasks.LambdaInvoke(this, 'Get Job Status',{
      lambdaFunction: getStatusLambda,
      //Pass field name "guid" into Lambda, put Lambda result in field called "status" in response
      inputPath: '$.guid',
      outputPath: '$.Payload',
    });   
    const choice = new sfn.Choice(this, 'Did it finish validating?');
    const successState = new sfn.Pass(this, 'SuccessState');
    const failureState = new sfn.Pass(this, 'FailureState');

    const map = new sfn.Map(this, 'Map State', {
      maxConcurrency: 2,
      itemsPath: sfn.JsonPath.stringAt('$.inputForMap'),

    });
    map.iterator(new sfn.Pass(this, 'Pass State'));

    map.next(sendResult)
    // Invalidate Cloud Front Distribution task,   Service integration.  
    // Start invalidation... Get invalidation... put together

    //Start State machine
    


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
