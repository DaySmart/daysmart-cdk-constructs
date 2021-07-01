import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';

export interface CdkSnsTopicProps {
  stage: string;
  project: string;
  subscription: string;
  lambdaArn?: string;
  email?: string;
}

export class CdkSnsTopic extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CdkSnsTopicProps) {
    super(scope, id);

    const snsTopic = new sns.Topic(this, "SnsTopic", {
      displayName: `${props.stage}-${props.project}`,
      topicName: `${props.stage}-${props.project}`
    });
    let subscription: subs.EmailSubscription | subs.LambdaSubscription;

    if (props.subscription == "lambda" && props.lambdaArn) {
      subscription = new subs.LambdaSubscription(lambda.Function.fromFunctionArn(this, "LambdaFunction", props.lambdaArn));
      snsTopic.addSubscription(subscription);
    } else if (props.subscription == "email" && props.email) {
      subscription = new subs.EmailSubscription(props.email);
      snsTopic.addSubscription(subscription);
    } else { /*Unsupported subscription type*/ }

    const topicOutput = new cdk.CfnOutput(this, "SnsTopicArn", {
      value: snsTopic.topicArn
    });

    topicOutput.overrideLogicalId("SnsTopicArn");
  }
}
