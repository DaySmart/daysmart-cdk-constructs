import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core';
import { CdkEcsBlueGreenDeployment } from "../../cdk-ecs-blue-green-deployment/lib/index"

export interface CdkTestStackStackProps extends cdk.StackProps {
  stage: string;
  project: string;
  vpcId: string;
  securityGroupId: string;
  repositoryName: string;
  isALB: boolean;
}

export class CdkTestStackStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CdkTestStackStackProps) {
    super(scope, id, props);

    const cfnDeployment = new CdkEcsBlueGreenDeployment(this, "All Resources", {
      stage: props.stage,
      project: props.project,
      vpcId: props.vpcId,
      securityGroupId: props.securityGroupId,
      repositoryName: props.repositoryName,
      isALB: props.isALB
    })
  }
}
