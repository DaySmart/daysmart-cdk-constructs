import * as cdk from "aws-cdk-lib/core";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from 'constructs'; 

export interface CdkRoute53RecordProps {
  targetType: string;
  loadBalancerArn: string;
  hostedZoneDomainNames: string[];
  dnsRecords: string[];
}

export class CdkRoute53Record extends Construct {

  constructor(scope: Construct, id: string, props: CdkRoute53RecordProps) {
    super(scope, id);

    if (props.dnsRecords.length == props.hostedZoneDomainNames.length) {
      switch (props.targetType) {
        case "alb":
          var loadBalancer = elbv2.ApplicationLoadBalancer.fromLookup(this, "LoadBalancer", {
            loadBalancerArn: props.loadBalancerArn
          });

          var albTarget = new targets.LoadBalancerTarget(loadBalancer);

          for (let index = 0; index < props.dnsRecords.length; index++) {
            const domainHostedZone = route53.HostedZone.fromLookup(this, `${props.hostedZoneDomainNames[index]}-HostedZone`, {
              domainName: props.hostedZoneDomainNames[index],
              privateZone: false
            });

            const dnsRecord = new route53.ARecord(this, `${props.dnsRecords[index]}-Record`, {
              target: route53.RecordTarget.fromAlias(albTarget),
              zone: domainHostedZone,
              recordName: props.dnsRecords[index]
            });
          }
          break;
        // NOT YET IMPLEMENTED
        // case "nlb":

        //   break;
        // case "cloudfront":

        //   break;
        default:
          throw new Error("Invalid Record Type Parameter");
      }
    } else {
      throw Error("The number of Dns Records and Hosted Zone Names do not match.");
    }
  }
}
