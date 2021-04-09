#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkTestStackStack } from '../lib/cdk-test-stack-stack';

const app = new cdk.App();
new CdkTestStackStack(app, 'CdkTestStackStack', {
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



app.synth();
