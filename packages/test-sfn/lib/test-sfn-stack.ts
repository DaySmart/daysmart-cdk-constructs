import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { AwsCliLayer } from '@aws-cdk/lambda-layer-awscli';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { IntegrationPattern } from '@aws-cdk/aws-stepfunctions';
import { v4 as uuidv4 } from 'uuid';
import * as iam from '@aws-cdk/aws-iam';

export class TestSfnStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    //const sendResultLambda = new lambda.Function(this, 'SendResultLambda', {
    //  code: lambda.Code.fromInline(`
    //  `),
    //  layers: [new AwsCliLayer(this, 'AWSCliLayer')],
    //  runtime: lambda.Runtime.PYTHON_3_6,
    //  handler: 'handler.handler',
    //})

    // setup consts to put into step function
    //const sendResult = new tasks.LambdaInvoke(this, 'Send Result', {
    //  lambdaFunction: sendResultLambda,
    //});

    const waitTime = new sfn.Wait(this, 'Wait 30 Seconds',{
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)) 
    });

	const callerReference = uuidv4();

	const createInvalidation = new tasks.CallAwsService(this, 'Create Invalidation', {
		action: 'createInvalidation',
		parameters: {
			"DistributionId.$": '$.distributionId',
			InvalidationBatch: {
				Paths: {
					Quantity: 1,
					Items: '$.distributionPaths'
				},
				CallerReference: callerReference
			}
		},
		service: 'cloudfront',
		iamResources: ['arn:aws:cloudfront::933922255734:distribution/EWRQHRGQH2GDD'],
		integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
		resultPath: '$.createInvalidationResult'
	});

	const getInvalidation = new tasks.CallAwsService(this, 'Get Invalidation', {
		action: 'getInvalidation',
		parameters: {
		  "DistributionId.$": "$.distributionId",
		  "Id.$": "$.createInvalidationResult.Invalidation.Id"
		},
		service: 'cloudfront',
		iamResources: ['arn:aws:cloudfront::933922255734:distribution/EWRQHRGQH2GDD'],
		integrationPattern: IntegrationPattern.REQUEST_RESPONSE,
		resultPath: '$.getInvalidationResult'
	});

	
	const invalidationComplete = new sfn.Pass(this, 'Invalidation Complete');

	const definition = sfn.Chain.start(createInvalidation)
		.next(waitTime)
		.next(getInvalidation)
		.next(new sfn.Choice(this, 'Invalidation Complete?')
			.when(sfn.Condition.stringEquals('$.getInvalidationResult.Invalidation.Status', 'Completed'), invalidationComplete)
			.otherwise(waitTime)
		);

	const statemachine = new sfn.StateMachine(this, 'Test Machine', {
		definition
	});

	const policy = new iam.PolicyStatement();
	policy.addResources("*")
	policy.addActions('cloudfront:createInvalidation', 'cloudfront:getInvalidation');
	statemachine.addToRolePolicy(policy);

    //const getStatus = new tasks.LambdaInvoke(this, 'Get Job Status',{
      //lambdaFunction: getStatusLambda,
      //Pass field name "guid" into Lambda, put Lambda result in field called "status" in response
      //inputPath: '$.guid',
      //outputPath: '$.Payload',
    //});   
    //const choice = new sfn.Choice(this, 'Did it finish validating?');
    //const successState = new sfn.Pass(this, 'SuccessState');
    //const failureState = new sfn.Pass(this, 'FailureState');

    //const map = new sfn.Map(this, 'Map State', {
      //maxConcurrency: 2,
     // itemsPath: sfn.JsonPath.stringAt('$.inputForMap'),

    //});
    //map.iterator(new sfn.Pass(this, 'Pass State'));

    //map.next(sendResult)
    // Invalidate Cloud Front Distribution task,   Service integration.  
    // Start invalidation... Get invalidation... put together

    //Start State machine
  }
}
