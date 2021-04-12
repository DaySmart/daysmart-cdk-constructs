import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkEcsBlueGreenDeployment from '../lib/index';

/*
 * Example test 
 */

export interface CdkEcsBlueGreenDeploymentProps {
  stage: string;
  project: string;
  vpcId: string;
  securityGroupId: string;
  repositoryName: string;
  isALB: boolean;
}

test('SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new CdkEcsBlueGreenDeployment.CdkEcsBlueGreenDeployment(stack, 'MyTestConstruct', {
    stage: "dev",
    project: "ecs-posapi",
    vpcId: "vpc-0470e96bf61191dd6",
    securityGroupId: "sg-0819814219a19b69c",
    repositoryName: "posapitest",
    isALB: true
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic",0));
});
