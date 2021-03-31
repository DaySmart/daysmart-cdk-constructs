import * as cdk from "@aws-cdk/core";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as logs from "@aws-cdk/aws-logs";
import * as elb from "@aws-cdk/aws-elasticloadbalancing";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
export interface CdkEcsAlbProps {
    clusterName: string;
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    lbType: string;
}

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;
        let productionHttpsListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;
        let productionHttpListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;
        let testHttpsListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;
        let testHttpListener: elbv2.ApplicationListener | elbv2.NetworkListener | void;

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const repository = ecr.Repository.fromRepositoryName(
            this,
            "Repo",
            props.repositoryName
        );

        const securityGroup = ec2.SecurityGroup.fromLookup(
            this,
            "Security Group",
            props.securityGroupId
        );

        const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
            clusterName: props.clusterName,
            vpc: vpc,
            securityGroups: [securityGroup],
        });

        const taskDefinition = new ecs.Ec2TaskDefinition(
            this,
            "TaskDefinition",
            {
                networkMode: ecs.NetworkMode.NAT,
            }
        );

        taskDefinition.addContainer("Container", {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            memoryLimitMiB: 4096,
            cpu: 2048,
            portMappings: [
                {
                    containerPort: 80,
                    hostPort: 0,
                    protocol: ecs.Protocol.TCP,
                },
            ],
            entryPoint: ["powershell", "-Command"],
            command: ["C:\\ServiceMonitor.exe w3svc"],
            // logging: ecs.LogDriver.awsLogs({
            //     logGroup: new logs.LogGroup(this, "LogGroup", {
            //         logGroupName: `${props.appName}-ecs`,
            //     }),
            //     streamPrefix: "ecs",
            // }),
        });

        //Service Definition Call
        const serviceDefinition = new ecs.Ec2Service(this, `${props.appName}-ServiceDefinition`, {
            taskDefinition: taskDefinition,
            cluster: cluster,
            serviceName: `${props.appName}-service`,
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
        switch (props.lbType) {
            case "ALB":
                // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
                // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
                // securityGroup.addEgressRule(ec2.Peer.ipv4('10.128.0.0/16'), ec2.Port.tcp(80));
                // securityGroup.addEgressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.allTcp());
                loadBalancer = new elbv2.ApplicationLoadBalancer(this, `${props.appName}-ApplicationLoadBalancer`, {
                    vpc: vpc,
                    loadBalancerName: `alb-${props.appName}`,
                    internetFacing: true,
                    ipAddressType: elbv2.IpAddressType.IPV4,
                    securityGroup: securityGroup
                });
                const albTargetGroupBlue = new elbv2.ApplicationTargetGroup(this, `${props.appName}-ApplicationLoadBalancerTargetGroupBlue`, {
                    targetGroupName: `alb-Target-Group-${props.appName}`,
                    targetType: elbv2.TargetType.INSTANCE,
                    port: 80,
                    protocol: elbv2.ApplicationProtocol.HTTP,
                    healthCheck: {
                        path: "/",
                        healthyThresholdCount: 4,
                        unhealthyThresholdCount: 2,
                        interval: cdk.Duration.seconds(30),
                        timeout: cdk.Duration.seconds(15)
                    },
                    vpc: vpc
                });
                // const albTargetGroupGreen = new elbv2.ApplicationTargetGroup(this, `${props.appName}-ApplicationLoadBalancerTargetGroupGreen`, {
                //     targetGroupName: `alb-Target-Group-${props.appName}`,
                //     targetType: elbv2.TargetType.INSTANCE,
                //     port: 80,
                //     protocol: elbv2.ApplicationProtocol.HTTP,
                //     healthCheck: {
                //         port: '80',
                //         path: "/",
                //         healthyThresholdCount: 4,
                //         unhealthyThresholdCount: 2,
                //         interval: cdk.Duration.seconds(30),
                //         timeout: cdk.Duration.seconds(15)
                //     }
                // });
                // testHttpsListener = loadBalancer.addListener(`${props.appName}-TestApplicationLoadBalancerHttpsListener`, {
                //     port: 443,
                //     protocol: elbv2.ApplicationProtocol.HTTPS,
                //     sslPolicy: elbv2.SslPolicy.RECOMMENDED,
                //     // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : undefined, //TODO: region information in these libraries?
                // })
                //     .addTargetGroups(`alb-Target-Group-${props.appName}`, {
                //         targetGroups: [
                //             albTargetGroupBlue
                //         ]
                //     });
                // testHttpListener = loadBalancer.addListener(`${props.appName}-TestApplicationLoadBalancerHttpListener`, {
                //     port: 80,
                //     protocol: elbv2.ApplicationProtocol.HTTP,
                //     sslPolicy: elbv2.SslPolicy.RECOMMENDED
                // })
                //     .addTargetGroups(`alb-Target-Group-${props.appName}`, {
                //         targetGroups: [
                //             albTargetGroupBlue
                //         ]
                //     });
                // productionHttpsListener = loadBalancer.addListener(`${props.appName}-ApplicationLoadBalancerHttpsListener`, {
                //     port: 443,
                //     protocol: elbv2.ApplicationProtocol.HTTPS,
                //     sslPolicy: elbv2.SslPolicy.RECOMMENDED,
                //     // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : undefined, //TODO: region information in these libraries?
                // })
                //     .addTargetGroups(`alb-Target-Group-${props.appName}`, {
                //         targetGroups: [
                //             albTargetGroupBlue
                //         ]
                //     });
                productionHttpListener = loadBalancer.addListener(`${props.appName}-ApplicationLoadBalancerHttpListener`, {
                    port: 80,
                    protocol: elbv2.ApplicationProtocol.HTTP,
                })
                    .addTargetGroups(`alb-Target-Group-${props.appName}`, {
                        targetGroups: [
                            albTargetGroupBlue
                        ]
                    });
                serviceDefinition.attachToApplicationTargetGroup(albTargetGroupBlue);
                break;
            case "NLB":
                // loadBalancer = new elbv2.NetworkLoadBalancer(this, `${props.appName}-NetworkLoadBalancer`, {
                //     vpc: vpc,
                //     loadBalancerName: `nlb-${props.appName}`,
                //     internetFacing: true,
                //     crossZoneEnabled: true,
                //     vpcSubnets: {
                //         availabilityZones: [
                //             'us-east-1a',
                //             'us-east-1b',
                //             'us-east-1c'
                //         ]
                //     }
                // });
                // const nlbTargetGroupBlue = new elbv2.NetworkTargetGroup(this, `${props.appName}-NetworkLoadBalancerTargetGroupBlue`, {
                //   targetGroupName: `nlb-Target-Group-${props.appName}`,
                //   targetType: elbv2.TargetType.INSTANCE,
                //   port: 80,
                //   protocol: elbv2.Protocol.TCP,
                //   healthCheck: {
                //     port: '80',
                //     path: "/",
                //     healthyThresholdCount: 4,
                //     unhealthyThresholdCount: 2,
                //     interval: cdk.Duration.seconds(30),
                //     timeout: cdk.Duration.seconds(15)
                //   }
                // });
                // const nlbTargetGroupGreen = new elbv2.NetworkTargetGroup(this, `${props.appName}-NetworkLoadBalancerTargetGroupGreen`, {
                //   targetGroupName: `nlb-Target-Group-${props.appName}`,
                //   targetType: elbv2.TargetType.INSTANCE,
                //   port: 80,
                //   protocol: elbv2.Protocol.TCP,
                //   healthCheck: {
                //     port: '80',
                //     path: "/",
                //     healthyThresholdCount: 4,
                //     unhealthyThresholdCount: 2,
                //     interval: cdk.Duration.seconds(30),
                //     timeout: cdk.Duration.seconds(15)
                //   }
                // });
                // testHttpsListener = loadBalancer.addListener(`${props.appName}-TestNetworkLoadBalancerHttpsListener`, {
                //   port: 443,
                //   protocol: elbv2.Protocol.HTTPS,
                //   sslPolicy: elbv2.SslPolicy.RECOMMENDED,
                //   // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : props.dsiRegion.elbCert, //TODO: region information in these libraries?
                // })
                //   .addTargetGroups(`nlb-Target-Group-${props.appName}`, {
                //     targetGroups: [
                //       nlbTargetGroupBlue
                //     ]
                //   });
                // testHttpListener = loadBalancer.addListener(`${props.appName}-TestNetworkLoadBalancerHttpListener`, {
                //   port: 80,
                //   protocol: elbv2.Protocol.HTTP,
                //   sslPolicy: elbv2.SslPolicy.RECOMMENDED
                // })
                //   .addTargetGroups(`nlb-Target-Group-${props.appName}`, {
                //     targetGroups: [
                //       nlbTargetGroupBlue
                //     ]
                //   });
                // productionHttpsListener = loadBalancer.addListener(`${props.appName}-NetworkLoadBalancerHttpsListener`, {
                //   port: 443,
                //   protocol: elbv2.Protocol.HTTPS,
                //   sslPolicy: elbv2.SslPolicy.RECOMMENDED,
                //   // certificates: props.project === 'onlinebooking' ? cdk.Fn.importValue(`${props.stage}-OLB-CERTIFICATE-ARN`) : props.dsiRegion.elbCert, //TODO: region information in these libraries?
                // })
                //   .addTargetGroups(`nlb-Target-Group-${props.appName}`, {
                //     targetGroups: [
                //       nlbTargetGroupBlue
                //     ]
                //   });
                // productionHttpListener = loadBalancer.addListener(`${props.appName}-NetworkLoadBalancerHttpListener`, {
                //   port: 80,
                //   protocol: elbv2.Protocol.HTTP,
                //   sslPolicy: elbv2.SslPolicy.RECOMMENDED
                // })
                //   .addTargetGroups(`nlb-Target-Group-${props.appName}`, {
                //     targetGroups: [
                //       nlbTargetGroupBlue
                //     ]
                //   });
                // serviceDefinition.attachToApplicationTargetGroup(nlbTargetGroupBlue);
                break;
            default:
                throw new Error("Load Balancer type not specified");
        }

        // new ecspattern.ApplicationLoadBalancedEc2Service(this, "ALB", {
        //     cluster,
        //     serviceName: props.appName,
        //     desiredCount: 1,
        //     taskDefinition: taskDefinition,
        //     publicLoadBalancer: true,
        // });
    }
}
