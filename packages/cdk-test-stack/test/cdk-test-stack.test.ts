import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkTestStack from '../lib/cdk-test-stack-stack';

test('SQS Queue Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkTestStack.CdkTestStackStack(app, 'MyTestStack',{
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
    expectCDK(stack).to(haveResource("AWS::SQS::Queue",{
      VisibilityTimeout: 300
    }));
});

test('SNS Topic Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkTestStack.CdkTestStackStack(app, 'MyTestStack', {
    stage: "dev",
    vpcId: "vpc-0470e96bf61191dd6",
    appName: "posapi",
    securityGroupId: "sg-0819814219a19b69c",
    repositoryName: "posapitest",
    clusterName: "dev-dsicollection",
    serviceName: "posapi-service",
    lbType: "ALB",
    lbName: "alb-posapi",
    listenerARN: "arn:aws:elasticloadbalancing:us-east-1:022393549274:listener/app/alb-posapi/63c05eb161f645c4/7526a203f1229e84"
  });
  // THEN
  expectCDK(stack).to(haveResource("AWS::SNS::Topic"));
});
