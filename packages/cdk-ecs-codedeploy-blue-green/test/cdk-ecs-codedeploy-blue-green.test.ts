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
    appName: "posapi",
    clusterName: "dev-dsicollection",
    serviceName: "posapi-service",
    lbType: "ALB",
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic",0));
});
