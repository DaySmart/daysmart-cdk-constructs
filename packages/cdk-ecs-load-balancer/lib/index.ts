import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elb from "@aws-cdk/aws-elasticloadbalancing";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";


export interface CdkEcsLoadBalancerProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
  isALB: boolean
}

export class CdkEcsLoadBalancer extends cdk.Construct {
  private loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;

  constructor(scope: cdk.Construct, id: string, props: CdkEcsLoadBalancerProps) {
    super(scope, id);

    //Load Balancer Call
    switch(props.isALB) {
      case true:
        const lbSecurityGroup = new ec2.SecurityGroup(scope, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-SecurityGroup`, {
          vpc: /*TODO: vpc info*/,
          description: `Enable communication to ${props.appName} application Elb`,
          allowAllOutbound: false,
          securityGroupName: `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-SecurityGroup`,
        });
      
        lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        lbSecurityGroup.addEgressRule(ec2.Peer.ipv4('10.128.0.0/16'), ec2.Port.tcp(80));
        lbSecurityGroup.addEgressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.allTcp());

        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ApplicationLoadBalancer`, {
          vpc: /*TODO: vpc info*/,
          loadBalancerName: `alb-${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}`,
          internetFacing: true,
          ipAddressType: elbv2.IpAddressType.IPV4,
          securityGroup: lbSecurityGroup /*TODO: security group info*/
        });

        const albTargetGroup = new elbv2.ApplicationTargetGroup(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ApplicationLoadBalancerTargetGroup`, {
          targetGroupName: `alb-Target-Group-${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}`,
          targetType: elbv2.TargetType.INSTANCE,
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP
        });

        this.loadBalancer.addListener(`${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ApplicationLoadBalancerHttpsListener`, {
          port: 443,
          protocol: elbv2.ApplicationProtocol.HTTPS,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED,
          certificates: props.appName === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : props.dsiRegion.elbCert, //TODO: region information in these libraries?
        })
        .addTargetGroups(`alb-Target-Group-${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}`, {
          targetGroups: [
            albTargetGroup
          ]
        });

        this.loadBalancer.addListener(`${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ApplicationLoadBalancerHttpListener`, {
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED
        })
        .addTargetGroups(`alb-Target-Group-${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}`, {
          targetGroups: [
            albTargetGroup
          ]
        });
          break;
      case false:
        this.loadBalancer = new elbv2.NetworkLoadBalancer(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-NetworkLoadBalancer`, {
          vpc: /*TODO: vpc info*/,
          loadBalancerName: `nlb-${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}`,
          internetFacing: true,
          crossZoneEnabled: true,
          vpcSubnets: {
            availabilityZones: [
              'us-east-1a',
              'us-east-1b',
              'us-east-1c'
            ]
          }
        });

          break;
      default:
          throw new Error("Load Balancer type not specified");
    }

  }
}
