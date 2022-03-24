import * as cdk from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as route53 from "@aws-cdk/aws-route53";

export interface CdkEcsNlbProps {
  clusterName: string;
  appName: string;
  vpcId: string;
  securityGroupId: string;
  taskDefinitionArn: string;
  stage: string;
  healthCheckPath: string;
  repositoryName: string;
  tag?: string;
  certificateArn: string;
  serviceDnsRecord?: string;
  hostedZoneDomainName?: string;
  isFargate?: string;
  targetGroupPort?: string;
  healthCheckHealthyThreshold?: string;
  healthCheckUnhealthyThreshold?: string;
  healthCheckInterval?: string;
  healthCheckProtocol: "https" | "tcp";
  healthyHttpCodes?: string;
  healthCheckTimeout?: string;
  containerPort?: string;
}

export class CdkEcsNlb extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CdkEcsNlbProps) {
    super(scope, id);

    let networkLoadBalancedService: ecspattern.NetworkLoadBalancedEc2Service | ecspattern.NetworkLoadBalancedFargateService;
    let listenerOutput: cdk.CfnOutput;
    let taskDefinition: ecs.TaskDefinition;
    let portMappings: ecs.PortMapping[];
    let nlbTargetGroup2: elbv2.TargetGroupBase;
    const healthyHttpCodes = '200-399';

    const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

    const repository = ecr.Repository.fromRepositoryName(
      this,
      "Repo",
      props.repositoryName
    );

    const securityGroup = ec2.SecurityGroup.fromLookupById(
      this,
      "SecurityGroup",
      props.securityGroupId
    );

    const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
      clusterName: props.clusterName,
      vpc: vpc,
      securityGroups: [securityGroup],
    });


    if (props.isFargate) {
      portMappings = [
        {
          containerPort: (props.containerPort) ? parseInt(props.containerPort) : 443,
          protocol: ecs.Protocol.TCP
        }
      ];
      //---------------------------------------------------------------------------------------------------
      //Temporary task definition created.  This will eventually be overrided so it can be ignored. 
      taskDefinition = new ecs.FargateTaskDefinition(
        this,
        "TaskDefinition",
        {
          family: `temp-${props.stage}-${props.appName}-ecs-task-definition`,
          cpu: 1024,
          memoryLimitMiB: 2048
        }
      );
      //---------------------------------------------------------------------------------------------------
      const healthyHttpCodes = '200-399';

      nlbTargetGroup2 = new elbv2.NetworkTargetGroup(this, `NetworkLoadBalancerTargetGroup2`, {
        port: props.targetGroupPort ? parseInt(props.targetGroupPort) : 443,
        protocol: elbv2.Protocol.TCP,
        preserveClientIp: true,
        targetType: elbv2.TargetType.IP,
        deregistrationDelay: props.stage.includes("prod") ? cdk.Duration.seconds(30) : undefined,
        healthCheck: {
          path: props.healthCheckPath,
          healthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
          unhealthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
          interval: props.healthCheckInterval ? cdk.Duration.seconds(parseInt(props.healthCheckInterval)) : cdk.Duration.seconds(30),
          timeout: props.healthCheckTimeout ? cdk.Duration.seconds(parseInt(props.healthCheckTimeout)) : cdk.Duration.seconds(10),
          protocol: (props.healthCheckProtocol == "https") ? elbv2.Protocol.HTTPS : elbv2.Protocol.TCP,
          healthyHttpCodes: (props.healthCheckProtocol == "https") ? healthyHttpCodes : props.healthyHttpCodes
        },
        vpc: vpc
      });
    } else {
      portMappings = [
        {
          containerPort: (props.containerPort) ? parseInt(props.containerPort) : 443,
          hostPort: 0,
          protocol: ecs.Protocol.TCP
        }
      ];
      //---------------------------------------------------------------------------------------------------
      //Temporary task definition created.  This will eventually be overrided so it can be ignored. 
      taskDefinition = new ecs.Ec2TaskDefinition(
        this,
        "TaskDefinition",
        {
          networkMode: ecs.NetworkMode.NAT,
          family: `temp-${props.stage}-${props.appName}-ecs-task-definition`
        }
      );
      //---------------------------------------------------------------------------------------------------

      nlbTargetGroup2 = new elbv2.NetworkTargetGroup(this, `NetworkLoadBalancerTargetGroup2`, {
        port: props.targetGroupPort ? parseInt(props.targetGroupPort) : 443,
        protocol: elbv2.Protocol.TCP,
        preserveClientIp: true,
        targetType: elbv2.TargetType.INSTANCE,
        deregistrationDelay: props.stage.includes("prod") ? cdk.Duration.seconds(30) : undefined,
        healthCheck: {
          port: props.targetGroupPort ? props.targetGroupPort : "443",
          path: props.healthCheckPath,
          healthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
          unhealthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
          interval: props.healthCheckInterval ? cdk.Duration.seconds(parseInt(props.healthCheckInterval)) : cdk.Duration.seconds(30),
          timeout: props.healthCheckTimeout ? cdk.Duration.seconds(parseInt(props.healthCheckTimeout)) : cdk.Duration.seconds(10),
          protocol: (props.healthCheckProtocol == "https") ? elbv2.Protocol.HTTPS : elbv2.Protocol.TCP,
          healthyHttpCodes: (props.healthCheckProtocol == "https") ? healthyHttpCodes : props.healthyHttpCodes
        },
        vpc: vpc
      });
    }

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.tag),
      memoryLimitMiB: 2048,
      cpu: 512,
      portMappings: portMappings,
      entryPoint: ["powershell", "-Command"],
      command: ["C:\\ServiceMonitor.exe w3svc"],
    });

    if (props.serviceDnsRecord && props.hostedZoneDomainName) {
      const httpsCertificate = acm.Certificate.fromCertificateArn(this, "HttpsCertificate", props.certificateArn);
      const domainHostedZone = route53.HostedZone.fromLookup(this, `${props.hostedZoneDomainName} HostedZone`, {
        domainName: props.hostedZoneDomainName,
        privateZone: false
      });

      if (props.isFargate) {
        networkLoadBalancedService = new ecspattern.NetworkLoadBalancedFargateService(this, "NetworkLB Fargate Service", {
          cluster,
          serviceName: `${props.stage}-${props.appName}`,
          desiredCount: 1,
          taskDefinition: taskDefinition,
          deploymentController: {
            type: ecs.DeploymentControllerType.CODE_DEPLOY
          },
          domainName: props.serviceDnsRecord,
          domainZone: domainHostedZone,
          recordType: ecspattern.NetworkLoadBalancedServiceRecordType.ALIAS,
          listenerPort: (props.containerPort) ? parseInt(props.containerPort) : 443
        });

      } else {
        networkLoadBalancedService = new ecspattern.NetworkLoadBalancedEc2Service(this, "NetworkLB EC2 Service", {
          cluster,
          serviceName: `${props.stage}-${props.appName}`,
          desiredCount: 1,
          taskDefinition: taskDefinition,
          deploymentController: {
            type: ecs.DeploymentControllerType.CODE_DEPLOY
          },
          domainName: props.serviceDnsRecord,
          domainZone: domainHostedZone,
          recordType: ecspattern.NetworkLoadBalancedServiceRecordType.ALIAS,
          listenerPort: (props.containerPort) ? parseInt(props.containerPort) : 443
        });
      }

      listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
        value: networkLoadBalancedService.listener.listenerArn
      });

      listenerOutput.overrideLogicalId("ListenerARN");
    }
    else {
      if (props.isFargate) {
        networkLoadBalancedService = new ecspattern.NetworkLoadBalancedFargateService(this, "NetworkLB Fargate Service", {
          cluster,
          serviceName: `${props.stage}-${props.appName}`,
          desiredCount: 1,
          taskDefinition: taskDefinition,
          deploymentController: {
            type: ecs.DeploymentControllerType.CODE_DEPLOY
          },
          listenerPort: (props.containerPort) ? parseInt(props.containerPort) : 443
        });
      } else {
        networkLoadBalancedService = new ecspattern.NetworkLoadBalancedEc2Service(this, "NetworkLB EC2 Service", {
          cluster,
          serviceName: `${props.stage}-${props.appName}`,
          desiredCount: 1,
          taskDefinition: taskDefinition,
          deploymentController: {
            type: ecs.DeploymentControllerType.CODE_DEPLOY
          },
          listenerPort: (props.containerPort) ? parseInt(props.containerPort) : 443
        });
      }

      listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
        value: networkLoadBalancedService.listener.listenerArn
      });

      listenerOutput.overrideLogicalId("ListenerARN");
    }

    networkLoadBalancedService.service.connections.securityGroups[0].addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    networkLoadBalancedService.targetGroup.configureHealthCheck({
      port: (props.containerPort) ? props.containerPort : "443",
      path: props.healthCheckPath,
      healthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
      unhealthyThresholdCount: props.healthCheckHealthyThreshold ? parseInt(props.healthCheckHealthyThreshold) : 3,
      interval: props.healthCheckInterval ? cdk.Duration.seconds(parseInt(props.healthCheckInterval)) : cdk.Duration.seconds(30),
      timeout: props.healthCheckTimeout ? cdk.Duration.seconds(parseInt(props.healthCheckTimeout)) : cdk.Duration.seconds(10),
      protocol: (props.healthCheckProtocol == "https") ? elbv2.Protocol.HTTPS : elbv2.Protocol.TCP,
      healthyHttpCodes: (props.healthCheckProtocol == "https") ? healthyHttpCodes : props.healthyHttpCodes
    });

    const scalableTarget = networkLoadBalancedService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });

    const cfnService = networkLoadBalancedService.service.node.defaultChild as ecs.CfnService;

    cfnService.addPropertyOverride('TaskDefinition', props.taskDefinitionArn);

    const ecsServiceOutput = new cdk.CfnOutput(this, "ServiceName", {
      value: networkLoadBalancedService.service.serviceName
    });

    ecsServiceOutput.overrideLogicalId("ServiceName");

    const targetGroup1 = new cdk.CfnOutput(this, "TargetGroup1Name", {
      value: networkLoadBalancedService.targetGroup.targetGroupName
    });

    targetGroup1.overrideLogicalId("TargetGroup1Name");

    const targetGroup2 = new cdk.CfnOutput(this, "TargetGroup2Name", {
      value: nlbTargetGroup2.targetGroupName
    });

    targetGroup2.overrideLogicalId("TargetGroup2Name");
  }
}
