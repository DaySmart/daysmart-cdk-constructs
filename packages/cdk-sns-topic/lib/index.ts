import * as cdk from 'aws-cdk-lib/core';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs'; 

export interface CdkSnsTopicProps {
  stage: string;
  project: string;
}

export class CdkSnsTopic extends Construct {
  constructor(scope: Construct, id: string, props: CdkSnsTopicProps) {
    super(scope, id);

    const snsTopic = new sns.Topic(this, "SnsTopic", {
      displayName: `${props.stage}-${props.project}`,
      topicName: `${props.stage}-${props.project}`
    });

    const topicOutput = new cdk.CfnOutput(this, "SnsTopicArn", {
      value: snsTopic.topicArn
    });

    topicOutput.overrideLogicalId("SnsTopicArn");
  }
}
