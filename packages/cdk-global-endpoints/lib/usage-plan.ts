import { Construct } from 'constructs';
import * as apigate from 'aws-cdk-lib/aws-apigateway';
import { QuotaSettings, ThrottleSettings, UsagePlanPerApiStage } from 'aws-cdk-lib/aws-apigateway';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { Stage } from 'aws-cdk-lib';

export interface CdkUsagePlanProps {
    apiStages: UsagePlanPerApiStage[],
    quota: QuotaSettings,
    throttle: ThrottleSettings,
    name?: string
}

export class CdkUsagePlan extends Construct {

    constructor(scope: Construct, id: string, props: CdkUsagePlanProps) {
        super(scope, id);

        const api = new apigate.RestApi(this, 'api');
        const plan = api.addUsagePlan('UsagePlan', {
            name: `${props.name}`,
            throttle: {
                rateLimit: 10, // average request per burstLimit seconds
                burstLimit: 2 // Max API request rate limit over 2 seconds
            },
            quota: {
                limit: 10000, // Max number of requests that user can make
                period: apigate.Period.WEEK // Max number in one week
            },
        });
        const key = api.addApiKey('ApiKey');
        plan.addApiKey(key);
    }
}