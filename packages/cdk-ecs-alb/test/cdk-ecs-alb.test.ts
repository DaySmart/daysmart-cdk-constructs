import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkEcsAlb from '../lib/index';

/*
 * Example test 
 */
test('SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new CdkEcsAlb.CdkEcsAlb(stack, 'MyTestConstruct', {
    clusterName: "dev-dsicollection",
    appName: "posapi",
    vpcId: "vpc-0470e96bf61191dd6",
    securityGroupId: "sg-0819814219a19b69c",
    repositoryName: "posapitest",
    lbType: "ALB"
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic",0));
});
