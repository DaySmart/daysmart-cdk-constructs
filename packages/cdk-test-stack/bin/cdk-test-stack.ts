#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkTestStackStack } from '../lib/cdk-test-stack-stack';

const app = new cdk.App();
new CdkTestStackStack(app, 'CdkTestStackStack');
