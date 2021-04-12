import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkEcsCodedeployBlueGreen from '../lib/index';

/*
 * Example test 
 */
test('SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new CdkEcsCodedeployBlueGreen.CdkEcsCodedeployBlueGreen(stack, 'MyTestConstruct', {
    stage: "dev",
    vpcId: "vpc-0470e96bf61191dd6",
    appName: "posapi",
    securityGroupId: "sg-0819814219a19b69c",
    repositoryName: "posapitest",
    clusterName: "dev-dsicollection",
    serviceName: "posapi-service",
    lbType: "ALB",
    lbName: "alb-posapi",
    listenerARN: "arn:aws:elasticloadbalancing:us-east-1:022393549274:listener/app/alb-posapi/3f8b2616f26b9fce/098aa314900adcdd"
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic",0));
});
