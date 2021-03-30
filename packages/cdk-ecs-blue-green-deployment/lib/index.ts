import * as cdk from "@aws-cdk/core";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as deployment from "@cloudcomponents/cdk-blue-green-container-deployment";
import * as cfnInclude from "@aws-cdk/cloudformation-include";
import * as cfn from "@aws-cdk/aws-cloudformation"
import * as elb from "@aws-cdk/aws-elasticloadbalancing";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";

export interface CdkEcsBlueGreenDeploymentProps {
  stage: string;
  project: string;
  vpcId: string;
  securityGroupId: string;
  repositoryName: string;
  isALB: boolean;
}

export class CdkEcsBlueGreenDeployment extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsBlueGreenDeploymentProps) {
    super(scope, id);

    let loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;
    let httpsListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;
    let testHttpsListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;
    let httpListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;

    // const transform = new cfn.CfnMacro(this, "Transform", {
    //   functionName: "AWS::CloudFormation::Macro.FunctionName",
    //   name: "AWS::CloudFormation::Macro.Name"
    // })

    const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

    const repository = ecr.Repository.fromRepositoryName(
        this,
        "Repo",
        props.repositoryName
    );

    //get id
    const securityGroup = ec2.SecurityGroup.fromLookup(
        this,
        "Security Group",
        props.securityGroupId
    );

    const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
        clusterName: `${props.stage}-${props.project}`,
        vpc: vpc,
        securityGroups: [securityGroup],
    });

    const taskDefinitionBlue = new ecs.Ec2TaskDefinition(this, `${props.stage}-${props.project}-TaskDefinitionBlue`, {
      // compatibility: 0,
      family: `${props.stage}-${props.project}`
    });

    taskDefinitionBlue.addContainer(props.project, {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      command: [`New-Item -Path C:\\inetpub\\wwwroot\\index.html -ItemType file -Value '<html> <head> <title>Amazon ECS Sample App</title> 
      <style>body {margin-top: 40px; background-color: #333;} </style> </head><body> <div style=color:white;text-align:center> <h1>Amazon ECS Sample App</h1> 
      <h2>Congratulations!</h2> <p>Your application is now running on a container in Amazon ECS.</p>' -Force ; C:\\ServiceMonitor.exe w3svc`],
      cpu: 512,
      entryPoint: ['powershell','-Command'],
      portMappings: [{
        containerPort: 80,
        hostPort: 8080,
        protocol: ecs.Protocol.TCP
      }],
      memoryLimitMiB: 768,
      essential: true 
    });

    //Service Definition Call
    const serviceDefinition = new ecs.Ec2Service(this, `${props.stage}-${props.project}-ServiceDefinition`, {
      taskDefinition: taskDefinitionBlue,
      cluster: cluster,
      serviceName: 'windows-simple-iis',
      desiredCount: 2,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: {
        rollback: true
      },
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS
      },
      placementStrategies: [
        ecs.PlacementStrategy.spreadAcrossInstances(),
        // TODO: Figure out how to explicitly say to spread by availability zone as well 
      ],
      enableECSManagedTags: true,
      propagateTags: ecs.PropagatedTagSource.TASK_DEFINITION,
      healthCheckGracePeriod: cdk.Duration.seconds(45)
    });


    switch(props.isALB) {
      case true:
        const lbSecurityGroup = new ec2.SecurityGroup(scope, `${props.stage}-${props.project}-SecurityGroup`, {
          vpc: vpc,
          description: `Enable communication to ${props.project} application Elb`,
          allowAllOutbound: false,
          securityGroupName: `${props.stage}-${props.project}-SecurityGroup`,
        });
      
        lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        lbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        lbSecurityGroup.addEgressRule(ec2.Peer.ipv4('10.128.0.0/16'), ec2.Port.tcp(80));
        lbSecurityGroup.addEgressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.allTcp());

        loadBalancer = new elbv2.ApplicationLoadBalancer(this, `${props.stage}-${props.project}-ApplicationLoadBalancer`, {
          vpc: vpc,
          loadBalancerName: `alb-${props.stage}-${props.project}`,
          internetFacing: true,
          ipAddressType: elbv2.IpAddressType.IPV4,
          securityGroup: lbSecurityGroup /*TODO: security group info*/
        });

        const albTargetGroupBlue = new elbv2.ApplicationTargetGroup(this, `${props.stage}-${props.project}-ApplicationLoadBalancerTargetGroupBlue`, {
          targetGroupName: `alb-Target-Group-${props.stage}-${props.project}`,
          targetType: elbv2.TargetType.INSTANCE,
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          healthCheck: {
            port: '80',
            path: "/",
            healthyThresholdCount: 4,
            unhealthyThresholdCount: 2,
            interval: cdk.Duration.seconds(30),  // TODO: Type errors
            timeout: cdk.Duration.seconds(15) // TODO: Type errors
          }
        });

        const albTargetGroupGreen = new elbv2.ApplicationTargetGroup(this, `${props.stage}-${props.project}-ApplicationLoadBalancerTargetGroupGreen`, {
          targetGroupName: `alb-Target-Group-${props.stage}-${props.project}`,
          targetType: elbv2.TargetType.INSTANCE,
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          healthCheck: {
            port: '80',
            path: "/",
            healthyThresholdCount: 4,
            unhealthyThresholdCount: 2,
            interval: cdk.Duration.seconds(30),  // TODO: Type errors
            timeout: cdk.Duration.seconds(15) // TODO: Type errors
          }
        });

        testHttpsListener = loadBalancer.addListener(`${props.stage}-${props.project}-TestApplicationLoadBalancerHttpsListener`, {
          port: 443,
          protocol: elbv2.ApplicationProtocol.HTTPS,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED,
          // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : undefined, //TODO: region information in these libraries?
        })
        .addTargetGroups(`alb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            albTargetGroupBlue
          ]
        });

        httpsListener = loadBalancer.addListener(`${props.stage}-${props.project}-ApplicationLoadBalancerHttpsListener`, {
          port: 443,
          protocol: elbv2.ApplicationProtocol.HTTPS,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED,
          // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : undefined, //TODO: region information in these libraries?
        })
        .addTargetGroups(`alb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            albTargetGroupBlue
          ]
        });

        httpListener = loadBalancer.addListener(`${props.stage}-${props.project}-ApplicationLoadBalancerHttpListener`, {
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED
        })
        .addTargetGroups(`alb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            albTargetGroupBlue
          ]
        });

        serviceDefinition.attachToApplicationTargetGroup(albTargetGroupBlue);
          break;
      case false:
        loadBalancer = new elbv2.NetworkLoadBalancer(this, `${props.stage}-${props.project}-NetworkLoadBalancer`, {
          vpc: vpc,
          loadBalancerName: `nlb-${props.stage}-${props.project}`,
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

        const nlbTargetGroupBlue = new elbv2.NetworkTargetGroup(this, `${props.stage}-${props.project}-NetworkLoadBalancerTargetGroupBlue`, {
          targetGroupName: `nlb-Target-Group-${props.stage}-${props.project}`,
          targetType: elbv2.TargetType.INSTANCE,
          port: 80,
          protocol: elbv2.Protocol.TCP,
          healthCheck: {
            port: '80',
            path: "/",
            healthyThresholdCount: 4,
            unhealthyThresholdCount: 2,
            interval: cdk.Duration.seconds(30),  // TODO: Type errors
            timeout: cdk.Duration.seconds(15) // TODO: Type errors
          }
        });

        const nlbTargetGroupGreen = new elbv2.NetworkTargetGroup(this, `${props.stage}-${props.project}-NetworkLoadBalancerTargetGroupGreen`, {
          targetGroupName: `nlb-Target-Group-${props.stage}-${props.project}`,
          targetType: elbv2.TargetType.INSTANCE,
          port: 80,
          protocol: elbv2.Protocol.TCP,
          healthCheck: {
            port: '80',
            path: "/",
            healthyThresholdCount: 4,
            unhealthyThresholdCount: 2,
            interval: cdk.Duration.seconds(30),  // TODO: Type errors
            timeout: cdk.Duration.seconds(15) // TODO: Type errors
          }
        });

        testHttpsListener = loadBalancer.addListener(`${props.stage}-${props.project}-TestNetworkLoadBalancerHttpsListener`, {
          port: 443,
          protocol: elbv2.Protocol.HTTPS,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED,
          // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : props.dsiRegion.elbCert, //TODO: region information in these libraries?
        })
        .addTargetGroups(`nlb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            nlbTargetGroupBlue
          ]
        });

        httpsListener = loadBalancer.addListener(`${props.stage}-${props.project}-NetworkLoadBalancerHttpsListener`, {
          port: 443,
          protocol: elbv2.Protocol.HTTPS,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED,
          // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : props.dsiRegion.elbCert, //TODO: region information in these libraries?
        })
        .addTargetGroups(`nlb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            nlbTargetGroupBlue
          ]
        });

        httpListener = loadBalancer.addListener(`${props.stage}-${props.project}-NetworkLoadBalancerHttpListener`, {
          port: 80,
          protocol: elbv2.Protocol.HTTP,
          sslPolicy: elbv2.SslPolicy.RECOMMENDED
        })
        .addTargetGroups(`nlb-Target-Group-${props.stage}-${props.project}`, {
          targetGroups: [
            nlbTargetGroupBlue
          ]
        });

        serviceDefinition.attachToApplicationTargetGroup(nlbTargetGroupBlue);
          break;
      default:
          throw new Error("Load Balancer type not specified");
    }


    // ?????????????????????????
    const taskSetBlue = new ecs.CfnTaskSet(this, `${props.stage}-${props.project}-TaskSetBlue`, {
      cluster: "Cluster",
      service: `${props.stage}-${props.project}-ServiceDefinition`,
      taskDefinition: `${props.stage}-${props.project}-TaskDefinitionBlue` 
    });

    const codeDeployBlueGreenHook = new cdk.CfnCodeDeployBlueGreenHook(this, "Hook", {
      serviceRole: "ecsCodeDeployRole",
      trafficRoutingConfig: {
        type: cdk.CfnTrafficRoutingType.TIME_BASED_LINEAR,
        timeBasedLinear: {
          stepPercentage: 20,
          bakeTimeMins: 2
        }
      },
      additionalOptions: {
        terminationWaitTimeInMinutes: 60
      },
      lifecycleEventHooks: {
        beforeInstall: "",
        afterInstall: "",
        afterAllowTestTraffic: "",
        beforeAllowTraffic: "",
        afterAllowTraffic: ""
      },
      applications: [
        {
          target: {
            type: "AWS::ECS::Service",
            logicalId: ""
          },
          ecsAttributes: {
            taskDefinitions: [
              `${props.stage}-${props.project}-TaskDefinitionBlue`,
              `${props.stage}-${props.project}-TaskDefinitionGreen`
            ],
            taskSets: [
              `${props.stage}-${props.project}-TaskSetBlue`,
              `${props.stage}-${props.project}-TaskSetGreen`,
            ],
            trafficRouting: {
              prodTrafficRoute: {
                type: "AWS::ElasticLoadBalancingV2::Listener",
                logicalId: (props.isALB) ? `${props.stage}-${props.project}-ApplicationLoadBalancerHttpsListener` : `${props.stage}-${props.project}-NetworkLoadBalancerHttpsListener`
              },
              testTrafficRoute: {
                type: "AWS::ElasticLoadBalancingV2::Listener",
                logicalId: (props.isALB) ? `${props.stage}-${props.project}-TestApplicationLoadBalancerHttpsListener` : `${props.stage}-${props.project}-TestNetworkLoadBalancerHttpsListener`
              },
              targetGroups: [
                (props.isALB) ? `${props.stage}-${props.project}-ApplicationLoadBalancerTargetGroupBlue` : `${props.stage}-${props.project}-NetworkLoadBalancerTargetGroupBlue`,
                (props.isALB) ? `${props.stage}-${props.project}-ApplicationLoadBalancerTargetGroupGreen` : `${props.stage}-${props.project}-NetworkLoadBalancerTargetGroupGreen`
              ]
            },
          }
        }
      ]  
      });

  }
}
