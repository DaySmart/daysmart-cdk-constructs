import * as cdk from "@aws-cdk/core";
export interface CdkEcsAlbProps {
    clusterName: string;
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    lbType: string;
    stage: string;
    tag?: string;
}
export declare class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps);
}
