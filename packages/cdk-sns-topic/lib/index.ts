import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';

export interface CdkSnsTopicProps {
  stage: string;
  project: string;
}

export class CdkSnsTopic extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CdkSnsTopicProps) {
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
