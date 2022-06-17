import { Construct } from 'constructs';
import * as usage from 'aws-cdk-lib/aws-apigateway';
import { QuotaSettings, ThrottleSettings, UsagePlanPerApiStage } from 'aws-cdk-lib/aws-apigateway';

export interface CdkUsagePlanProps {
    apiStages: UsagePlanPerApiStage[],
    quota: QuotaSettings,
    throttle: ThrottleSettings,
    name?: string
}

export class CdkUsagePlan extends Construct {

    constructor(scope: Construct, id: string, props: CdkUsagePlanProps) {
        super(scope, id);

        let customPlan: usage.UsagePlan;
        const plan = usage.addUsagePlan('UsagePlan', {
            name: `${props.name}`,
            throttle: `${props.ThrottleSettings}`
        })
    }
}