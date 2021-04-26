import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as autoscaling from "@aws-cdk/aws-applicationautoscaling";
import { TargetTrackingScalingPolicy } from "@aws-cdk/aws-applicationautoscaling";

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

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let loadBalancer: elbv2.ApplicationLoadBalancer | elbv2.NetworkLoadBalancer;
        let listener: elbv2.ApplicationListener | elbv2.NetworkListener | void;

        var taskRole = new iam.Role(this, "EcsTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        });

        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "ssm:GetParameters",
                "ssm:PutParameter",
                "ssm:GetParameter",
                "secretsmanager:GetSecretValue",
                "kms:Decrypt"
            ],
            resources: [
                "*"
            ],
            effect: iam.Effect.ALLOW
        }))

        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });

        const repository = ecr.Repository.fromRepositoryName(
            this,
            "Repo",
            props.repositoryName
        );

        const securityGroup = ec2.SecurityGroup.fromLookup(
            this,
            "SecurityGroup",
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
                taskRole: taskRole,
                executionRole: taskRole,
                family: `${props.stage}-${props.appName}`
            }
        );

        taskDefinition.addContainer("Container", {
            image: ecs.ContainerImage.fromEcrRepository(repository, props.tag),
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
            logging: ecs.LogDriver.awsLogs({
                logGroup: new logs.LogGroup(this, "LogGroup", {
                    logGroupName: `${props.appName}-ecs`,
                }),
                streamPrefix: "ecs",
            }),
        });

        //Service Definition Call
        const serviceDefinition = new ecs.Ec2Service(this, `ServiceDefinition`, {
            taskDefinition: taskDefinition,
            cluster: cluster,
            serviceName: props.appName,
            desiredCount: 1,
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            deploymentController: {
                type: ecs.DeploymentControllerType.CODE_DEPLOY
            },
            placementStrategies: [
                ecs.PlacementStrategy.spreadAcrossInstances(),
                // TODO: Figure out how to explicitly say to spread by availability zone as well 
            ],
            enableECSManagedTags: true,
            propagateTags: ecs.PropagatedTagSource.TASK_DEFINITION,
            healthCheckGracePeriod: cdk.Duration.seconds(60)
        });

        const scalingTarget = new autoscaling.ScalableTarget(this, 'ScalableTarget', {
            maxCapacity: 3,
            minCapacity: 1,
            resourceId: `service/${props.clusterName}/${props.appName}`,
            scalableDimension: "ecs:service:DesiredCount",
            serviceNamespace: autoscaling.ServiceNamespace.ECS
        });

        new TargetTrackingScalingPolicy(this, 'ScalingPolicy', {
            scalingTarget: scalingTarget,
            targetValue: 50,
            policyName: `${props.appName}-scaling-policy`,
            predefinedMetric: autoscaling.PredefinedMetric.ECS_SERVICE_AVERAGE_CPU_UTILIZATION
        });

        switch (props.lbType) {
            case "ALB":
                loadBalancer = new elbv2.ApplicationLoadBalancer(this, `ApplicationLoadBalancer`, {
                    vpc: vpc,
                    loadBalancerName: `${props.appName}-alb`,
                    internetFacing: true,
                    ipAddressType: elbv2.IpAddressType.IPV4,
                    securityGroup: securityGroup
                });

                const albTargetGroup1 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup1`, {
                    targetGroupName: `${props.appName}-alb-Target-Group-1`,
                    targetType: elbv2.TargetType.INSTANCE,
                    protocol: elbv2.ApplicationProtocol.HTTP,
                    healthCheck: {
                        path: "/api/v2/Health/Check",
                        healthyThresholdCount: 2,
                        unhealthyThresholdCount: 5,
                        interval: cdk.Duration.seconds(30),
                        timeout: cdk.Duration.seconds(10)
                    },
                    vpc: vpc
                });

                const albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
                    targetGroupName: `${props.appName}-alb-Target-Group-2`,
                    targetType: elbv2.TargetType.INSTANCE,
                    protocol: elbv2.ApplicationProtocol.HTTP,
                    healthCheck: {
                        path: "/api/v2/Health/Check",
                        healthyThresholdCount: 2,
                        unhealthyThresholdCount: 5,
                        interval: cdk.Duration.seconds(30),
                        timeout: cdk.Duration.seconds(10)
                    },
                    vpc: vpc
                });

                listener = loadBalancer.addListener(`ApplicationLoadBalancerHttpListener`, {
                    port: 80,
                    protocol: elbv2.ApplicationProtocol.HTTP,
                }).addTargetGroups(`${props.appName}-alb-Target-Group`, {
                        targetGroups: [
                            albTargetGroup1
                        ]
                    });

                serviceDefinition.attachToApplicationTargetGroup(albTargetGroup1);

                const loadBalancerOutput = new cdk.CfnOutput(this, "LoadBalancer", {
                    value: loadBalancer.loadBalancerArn
                });
        
                loadBalancerOutput.overrideLogicalId("LoadBalancer");
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

        const ecsServiceOutput = new cdk.CfnOutput(this, "ServiceName", {
            value: serviceDefinition.serviceName
        });

        ecsServiceOutput.overrideLogicalId("ServiceName");        
    }
}
