#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkTestStackStack } from '../lib/cdk-test-stack-stack';

const app = new cdk.App();
const stack = new CdkTestStackStack(app, 'CdkTestStackStack', {
    stage: "dev",
    project: "ecs-posapi",
    vpcId: "vpc-0470e96bf61191dd6",
    securityGroupId: "sg-0819814219a19b69c",
    repositoryName: "posapitest",
    isALB: true
});

stack.templateOptions.transforms = ["AWS::CodeDeployBlueGreen"];
app.synth();

