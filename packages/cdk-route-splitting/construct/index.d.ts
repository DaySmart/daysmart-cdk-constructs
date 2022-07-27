import * as cdk from '@aws-cdk/core';
export interface CdkRouteSplittingProps {
    hostedZoneName: string;
    hostedZoneId: string;
    projectName: string;
    originSourceDomain: string;
    partitionKey: string;
    stage: string;
    originNotFoundUrl: string;
}
export declare class CdkRouteSplitting extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkRouteSplittingProps);
}
