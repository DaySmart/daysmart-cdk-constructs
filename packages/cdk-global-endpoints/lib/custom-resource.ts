import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface CdkCustomResourceProps {
    policy: string;
}