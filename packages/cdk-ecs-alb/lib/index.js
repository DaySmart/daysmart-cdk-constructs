"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkEcsAlb = void 0;
const cdk = require("@aws-cdk/core");
const ecs = require("@aws-cdk/aws-ecs");
const ecr = require("@aws-cdk/aws-ecr");
const ec2 = require("@aws-cdk/aws-ec2");
const elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
const iam = require("@aws-cdk/aws-iam");
const autoscaling = require("@aws-cdk/aws-applicationautoscaling");
const aws_applicationautoscaling_1 = require("@aws-cdk/aws-applicationautoscaling");
class CdkEcsAlb extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        let loadBalancer;
        let listener;
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
        }));
        const vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: props.vpcId });
        const repository = ecr.Repository.fromRepositoryName(this, "Repo", props.repositoryName);
        const securityGroup = ec2.SecurityGroup.fromLookup(this, "SecurityGroup", props.securityGroupId);
        const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
            clusterName: props.clusterName,
            vpc: vpc,
            securityGroups: [securityGroup],
        });
        const taskDefinition = new ecs.Ec2TaskDefinition(this, "TaskDefinition", {
            networkMode: ecs.NetworkMode.NAT,
            taskRole: taskRole,
            executionRole: taskRole,
            family: `${props.stage}-${props.appName}`
        });
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
        scalingTarget.node.addDependency(serviceDefinition);
        new aws_applicationautoscaling_1.TargetTrackingScalingPolicy(this, 'ScalingPolicy', {
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
exports.CdkEcsAlb = CdkEcsAlb;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBd0M7QUFDeEMsNkRBQTZEO0FBQzdELHdDQUF3QztBQUV4QyxtRUFBbUU7QUFDbkUsb0ZBQWtGO0FBYWxGLE1BQWEsU0FBVSxTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBQ3hDLFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBcUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLFlBQXVFLENBQUM7UUFDNUUsSUFBSSxRQUFrRSxDQUFDO1FBRXZFLElBQUksUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzdDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQztTQUNqRSxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN6QyxPQUFPLEVBQUU7Z0JBQ0wsbUJBQW1CO2dCQUNuQixrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIsK0JBQStCO2dCQUMvQixhQUFhO2FBQ2hCO1lBQ0QsU0FBUyxFQUFFO2dCQUNQLEdBQUc7YUFDTjtZQUNELE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7U0FDM0IsQ0FBQyxDQUFDLENBQUE7UUFFSCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXBFLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQ2hELElBQUks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Z0JBQ2QsbUNBQW1DO2dCQUNuQywyQ0FBMkM7Z0JBQzNDLEtBQUs7Z0JBQ0wsNERBQTREO2dCQUM1RCxzQkFBc0I7Z0JBQ3RCLDJCQUEyQjtnQkFDM0IsUUFBUTtnQkFDUixRQUFRO2dCQUNSLHdFQUF3RTtnQkFDeEUsTUFBTTtZQUNWO2dCQUNJLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztTQUMzRDtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDNUQsS0FBSyxFQUFFLGlCQUFpQixDQUFDLFdBQVc7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNKO0FBelFELDhCQXlRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xyXG5pbXBvcnQgKiBhcyBlY3MgZnJvbSBcIkBhd3MtY2RrL2F3cy1lY3NcIjtcclxuaW1wb3J0ICogYXMgZWNyIGZyb20gXCJAYXdzLWNkay9hd3MtZWNyXCI7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tIFwiQGF3cy1jZGsvYXdzLWVjMlwiO1xyXG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tIFwiQGF3cy1jZGsvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjJcIjtcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCI7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcIkBhd3MtY2RrL2F3cy1sb2dzXCI7XHJcbmltcG9ydCAqIGFzIGF1dG9zY2FsaW5nIGZyb20gXCJAYXdzLWNkay9hd3MtYXBwbGljYXRpb25hdXRvc2NhbGluZ1wiO1xyXG5pbXBvcnQgeyBUYXJnZXRUcmFja2luZ1NjYWxpbmdQb2xpY3kgfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwcGxpY2F0aW9uYXV0b3NjYWxpbmdcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2RrRWNzQWxiUHJvcHMge1xyXG4gICAgY2x1c3Rlck5hbWU6IHN0cmluZztcclxuICAgIGFwcE5hbWU6IHN0cmluZztcclxuICAgIHZwY0lkOiBzdHJpbmc7XHJcbiAgICBzZWN1cml0eUdyb3VwSWQ6IHN0cmluZztcclxuICAgIHJlcG9zaXRvcnlOYW1lOiBzdHJpbmc7XHJcbiAgICBsYlR5cGU6IHN0cmluZztcclxuICAgIHN0YWdlOiBzdHJpbmc7XHJcbiAgICB0YWc/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDZGtFY3NBbGIgZXh0ZW5kcyBjZGsuQ29uc3RydWN0IHtcclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2RrRWNzQWxiUHJvcHMpIHtcclxuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgICAgICBsZXQgbG9hZEJhbGFuY2VyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlciB8IGVsYnYyLk5ldHdvcmtMb2FkQmFsYW5jZXI7XHJcbiAgICAgICAgbGV0IGxpc3RlbmVyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxpc3RlbmVyIHwgZWxidjIuTmV0d29ya0xpc3RlbmVyIHwgdm9pZDtcclxuXHJcbiAgICAgICAgdmFyIHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIFwiRWNzVGFza1JvbGVcIiwge1xyXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcImVjcy10YXNrcy5hbWF6b25hd3MuY29tXCIpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRhc2tSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgXCJzc206R2V0UGFyYW1ldGVyc1wiLFxyXG4gICAgICAgICAgICAgICAgXCJzc206UHV0UGFyYW1ldGVyXCIsXHJcbiAgICAgICAgICAgICAgICBcInNzbTpHZXRQYXJhbWV0ZXJcIixcclxuICAgICAgICAgICAgICAgIFwic2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWVcIixcclxuICAgICAgICAgICAgICAgIFwia21zOkRlY3J5cHRcIlxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgIFwiKlwiXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPV1xyXG4gICAgICAgIH0pKVxyXG5cclxuICAgICAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgXCJWUENcIiwgeyB2cGNJZDogcHJvcHMudnBjSWQgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHJlcG9zaXRvcnkgPSBlY3IuUmVwb3NpdG9yeS5mcm9tUmVwb3NpdG9yeU5hbWUoXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIFwiUmVwb1wiLFxyXG4gICAgICAgICAgICBwcm9wcy5yZXBvc2l0b3J5TmFtZVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBlYzIuU2VjdXJpdHlHcm91cC5mcm9tTG9va3VwKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBcIlNlY3VyaXR5R3JvdXBcIixcclxuICAgICAgICAgICAgcHJvcHMuc2VjdXJpdHlHcm91cElkXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgY29uc3QgY2x1c3RlciA9IGVjcy5DbHVzdGVyLmZyb21DbHVzdGVyQXR0cmlidXRlcyh0aGlzLCBcIkNsdXN0ZXJcIiwge1xyXG4gICAgICAgICAgICBjbHVzdGVyTmFtZTogcHJvcHMuY2x1c3Rlck5hbWUsXHJcbiAgICAgICAgICAgIHZwYzogdnBjLFxyXG4gICAgICAgICAgICBzZWN1cml0eUdyb3VwczogW3NlY3VyaXR5R3JvdXBdLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCB0YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRWMyVGFza0RlZmluaXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIFwiVGFza0RlZmluaXRpb25cIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmV0d29ya01vZGU6IGVjcy5OZXR3b3JrTW9kZS5OQVQsXHJcbiAgICAgICAgICAgICAgICB0YXNrUm9sZTogdGFza1JvbGUsXHJcbiAgICAgICAgICAgICAgICBleGVjdXRpb25Sb2xlOiB0YXNrUm9sZSxcclxuICAgICAgICAgICAgICAgIGZhbWlseTogYCR7cHJvcHMuc3RhZ2V9LSR7cHJvcHMuYXBwTmFtZX1gXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG5cclxuICAgICAgICB0YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoXCJDb250YWluZXJcIiwge1xyXG4gICAgICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21FY3JSZXBvc2l0b3J5KHJlcG9zaXRvcnksIHByb3BzLnRhZyksXHJcbiAgICAgICAgICAgIG1lbW9yeUxpbWl0TWlCOiA0MDk2LFxyXG4gICAgICAgICAgICBjcHU6IDIwNDgsXHJcbiAgICAgICAgICAgIHBvcnRNYXBwaW5nczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclBvcnQ6IDgwLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvc3RQb3J0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZW50cnlQb2ludDogW1wicG93ZXJzaGVsbFwiLCBcIi1Db21tYW5kXCJdLFxyXG4gICAgICAgICAgICBjb21tYW5kOiBbXCJDOlxcXFxTZXJ2aWNlTW9uaXRvci5leGUgdzNzdmNcIl0sXHJcbiAgICAgICAgICAgIC8vIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXIuYXdzTG9ncyh7XHJcbiAgICAgICAgICAgIC8vICAgICBsb2dHcm91cDogbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgXCJMb2dHcm91cFwiLCB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgbG9nR3JvdXBOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1lY3NgLFxyXG4gICAgICAgICAgICAvLyAgICAgfSksXHJcbiAgICAgICAgICAgIC8vICAgICBzdHJlYW1QcmVmaXg6IFwiZWNzXCIsXHJcbiAgICAgICAgICAgIC8vIH0pLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1NlcnZpY2UgRGVmaW5pdGlvbiBDYWxsXHJcbiAgICAgICAgY29uc3Qgc2VydmljZURlZmluaXRpb24gPSBuZXcgZWNzLkVjMlNlcnZpY2UodGhpcywgYFNlcnZpY2VEZWZpbml0aW9uYCwge1xyXG4gICAgICAgICAgICB0YXNrRGVmaW5pdGlvbjogdGFza0RlZmluaXRpb24sXHJcbiAgICAgICAgICAgIGNsdXN0ZXI6IGNsdXN0ZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VOYW1lOiBwcm9wcy5hcHBOYW1lLFxyXG4gICAgICAgICAgICBkZXNpcmVkQ291bnQ6IDEsXHJcbiAgICAgICAgICAgIG1pbkhlYWx0aHlQZXJjZW50OiAxMDAsXHJcbiAgICAgICAgICAgIG1heEhlYWx0aHlQZXJjZW50OiAyMDAsXHJcbiAgICAgICAgICAgIGRlcGxveW1lbnRDb250cm9sbGVyOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBlY3MuRGVwbG95bWVudENvbnRyb2xsZXJUeXBlLkNPREVfREVQTE9ZXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHBsYWNlbWVudFN0cmF0ZWdpZXM6IFtcclxuICAgICAgICAgICAgICAgIGVjcy5QbGFjZW1lbnRTdHJhdGVneS5zcHJlYWRBY3Jvc3NJbnN0YW5jZXMoKSxcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IEZpZ3VyZSBvdXQgaG93IHRvIGV4cGxpY2l0bHkgc2F5IHRvIHNwcmVhZCBieSBhdmFpbGFiaWxpdHkgem9uZSBhcyB3ZWxsIFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBlbmFibGVFQ1NNYW5hZ2VkVGFnczogdHJ1ZSxcclxuICAgICAgICAgICAgcHJvcGFnYXRlVGFnczogZWNzLlByb3BhZ2F0ZWRUYWdTb3VyY2UuVEFTS19ERUZJTklUSU9OLFxyXG4gICAgICAgICAgICBoZWFsdGhDaGVja0dyYWNlUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2NhbGluZ1RhcmdldCA9IG5ldyBhdXRvc2NhbGluZy5TY2FsYWJsZVRhcmdldCh0aGlzLCAnU2NhbGFibGVUYXJnZXQnLCB7XHJcbiAgICAgICAgICAgIG1heENhcGFjaXR5OiAzLFxyXG4gICAgICAgICAgICBtaW5DYXBhY2l0eTogMSxcclxuICAgICAgICAgICAgcmVzb3VyY2VJZDogYHNlcnZpY2UvJHtwcm9wcy5jbHVzdGVyTmFtZX0vJHtwcm9wcy5hcHBOYW1lfWAsXHJcbiAgICAgICAgICAgIHNjYWxhYmxlRGltZW5zaW9uOiBcImVjczpzZXJ2aWNlOkRlc2lyZWRDb3VudFwiLFxyXG4gICAgICAgICAgICBzZXJ2aWNlTmFtZXNwYWNlOiBhdXRvc2NhbGluZy5TZXJ2aWNlTmFtZXNwYWNlLkVDU1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzY2FsaW5nVGFyZ2V0Lm5vZGUuYWRkRGVwZW5kZW5jeShzZXJ2aWNlRGVmaW5pdGlvbilcclxuXHJcbiAgICAgICAgbmV3IFRhcmdldFRyYWNraW5nU2NhbGluZ1BvbGljeSh0aGlzLCAnU2NhbGluZ1BvbGljeScsIHtcclxuICAgICAgICAgICAgc2NhbGluZ1RhcmdldDogc2NhbGluZ1RhcmdldCxcclxuICAgICAgICAgICAgdGFyZ2V0VmFsdWU6IDUwLFxyXG4gICAgICAgICAgICBwb2xpY3lOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1zY2FsaW5nLXBvbGljeWAsXHJcbiAgICAgICAgICAgIHByZWRlZmluZWRNZXRyaWM6IGF1dG9zY2FsaW5nLlByZWRlZmluZWRNZXRyaWMuRUNTX1NFUlZJQ0VfQVZFUkFHRV9DUFVfVVRJTElaQVRJT05cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChwcm9wcy5sYlR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcIkFMQlwiOlxyXG4gICAgICAgICAgICAgICAgbG9hZEJhbGFuY2VyID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsIGBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcmAsIHtcclxuICAgICAgICAgICAgICAgICAgICB2cGM6IHZwYyxcclxuICAgICAgICAgICAgICAgICAgICBsb2FkQmFsYW5jZXJOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1hbGJgLFxyXG4gICAgICAgICAgICAgICAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlwQWRkcmVzc1R5cGU6IGVsYnYyLklwQWRkcmVzc1R5cGUuSVBWNCxcclxuICAgICAgICAgICAgICAgICAgICBzZWN1cml0eUdyb3VwOiBzZWN1cml0eUdyb3VwXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGJUYXJnZXRHcm91cDEgPSBuZXcgZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCh0aGlzLCBgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJUYXJnZXRHcm91cDFgLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0R3JvdXBOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1hbGItVGFyZ2V0LUdyb3VwLTFgLFxyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSU5TVEFOQ0UsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgICAgICAgICAgICAgICBoZWFsdGhDaGVjazoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBcIi9hcGkvdjIvSGVhbHRoL0NoZWNrXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdnBjOiB2cGNcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGFsYlRhcmdldEdyb3VwMiA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsIGBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclRhcmdldEdyb3VwMmAsIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRHcm91cE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LWFsYi1UYXJnZXQtR3JvdXAtMmAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JTlNUQU5DRSxcclxuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IFwiL2FwaS92Mi9IZWFsdGgvQ2hlY2tcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhbHRoeVRocmVzaG9sZENvdW50OiAyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmhlYWx0aHlUaHJlc2hvbGRDb3VudDogNSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB2cGM6IHZwY1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXIgPSBsb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoYEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VySHR0cExpc3RlbmVyYCwge1xyXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IDgwLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXHJcbiAgICAgICAgICAgICAgICB9KS5hZGRUYXJnZXRHcm91cHMoYCR7cHJvcHMuYXBwTmFtZX0tYWxiLVRhcmdldC1Hcm91cGAsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0R3JvdXBzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGJUYXJnZXRHcm91cDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHNlcnZpY2VEZWZpbml0aW9uLmF0dGFjaFRvQXBwbGljYXRpb25UYXJnZXRHcm91cChhbGJUYXJnZXRHcm91cDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRCYWxhbmNlck91dHB1dCA9IG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiTG9hZEJhbGFuY2VyXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckFyblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBsb2FkQmFsYW5jZXJPdXRwdXQub3ZlcnJpZGVMb2dpY2FsSWQoXCJMb2FkQmFsYW5jZXJcIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIk5MQlwiOlxyXG4gICAgICAgICAgICAgICAgLy8gbG9hZEJhbGFuY2VyID0gbmV3IGVsYnYyLk5ldHdvcmtMb2FkQmFsYW5jZXIodGhpcywgYCR7cHJvcHMuYXBwTmFtZX0tTmV0d29ya0xvYWRCYWxhbmNlcmAsIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICB2cGM6IHZwYyxcclxuICAgICAgICAgICAgICAgIC8vICAgICBsb2FkQmFsYW5jZXJOYW1lOiBgbmxiLSR7cHJvcHMuYXBwTmFtZX1gLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIGNyb3NzWm9uZUVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBhdmFpbGFiaWxpdHlab25lczogW1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgJ3VzLWVhc3QtMWEnLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgJ3VzLWVhc3QtMWInLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgJ3VzLWVhc3QtMWMnXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB9KTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnN0IG5sYlRhcmdldEdyb3VwQmx1ZSA9IG5ldyBlbGJ2Mi5OZXR3b3JrVGFyZ2V0R3JvdXAodGhpcywgYCR7cHJvcHMuYXBwTmFtZX0tTmV0d29ya0xvYWRCYWxhbmNlclRhcmdldEdyb3VwQmx1ZWAsIHtcclxuICAgICAgICAgICAgICAgIC8vICAgdGFyZ2V0R3JvdXBOYW1lOiBgbmxiLVRhcmdldC1Hcm91cC0ke3Byb3BzLmFwcE5hbWV9YCxcclxuICAgICAgICAgICAgICAgIC8vICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JTlNUQU5DRSxcclxuICAgICAgICAgICAgICAgIC8vICAgcG9ydDogODAsXHJcbiAgICAgICAgICAgICAgICAvLyAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5UQ1AsXHJcbiAgICAgICAgICAgICAgICAvLyAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgcG9ydDogJzgwJyxcclxuICAgICAgICAgICAgICAgIC8vICAgICBwYXRoOiBcIi9cIixcclxuICAgICAgICAgICAgICAgIC8vICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDQsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSlcclxuICAgICAgICAgICAgICAgIC8vICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBubGJUYXJnZXRHcm91cEdyZWVuID0gbmV3IGVsYnYyLk5ldHdvcmtUYXJnZXRHcm91cCh0aGlzLCBgJHtwcm9wcy5hcHBOYW1lfS1OZXR3b3JrTG9hZEJhbGFuY2VyVGFyZ2V0R3JvdXBHcmVlbmAsIHtcclxuICAgICAgICAgICAgICAgIC8vICAgdGFyZ2V0R3JvdXBOYW1lOiBgbmxiLVRhcmdldC1Hcm91cC0ke3Byb3BzLmFwcE5hbWV9YCxcclxuICAgICAgICAgICAgICAgIC8vICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JTlNUQU5DRSxcclxuICAgICAgICAgICAgICAgIC8vICAgcG9ydDogODAsXHJcbiAgICAgICAgICAgICAgICAvLyAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5UQ1AsXHJcbiAgICAgICAgICAgICAgICAvLyAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgcG9ydDogJzgwJyxcclxuICAgICAgICAgICAgICAgIC8vICAgICBwYXRoOiBcIi9cIixcclxuICAgICAgICAgICAgICAgIC8vICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDQsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSlcclxuICAgICAgICAgICAgICAgIC8vICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgICAgICAvLyB0ZXN0SHR0cHNMaXN0ZW5lciA9IGxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcihgJHtwcm9wcy5hcHBOYW1lfS1UZXN0TmV0d29ya0xvYWRCYWxhbmNlckh0dHBzTGlzdGVuZXJgLCB7XHJcbiAgICAgICAgICAgICAgICAvLyAgIHBvcnQ6IDQ0MyxcclxuICAgICAgICAgICAgICAgIC8vICAgcHJvdG9jb2w6IGVsYnYyLlByb3RvY29sLkhUVFBTLFxyXG4gICAgICAgICAgICAgICAgLy8gICBzc2xQb2xpY3k6IGVsYnYyLlNzbFBvbGljeS5SRUNPTU1FTkRFRCxcclxuICAgICAgICAgICAgICAgIC8vICAgLy8gY2VydGlmaWNhdGVzOiBwcm9wcy5wcm9qZWN0ID09PSAnb25saW5lYm9va2luZycgPyBjZGsuRm4uaW1wb3J0VmFsdWUoYCR7cHJvcHMuc3RhZ2V9LU9MQi1DRVJUSUZJQ0FURS1BUk5gKSA6IHByb3BzLmRzaVJlZ2lvbi5lbGJDZXJ0LCAvL1RPRE86IHJlZ2lvbiBpbmZvcm1hdGlvbiBpbiB0aGVzZSBsaWJyYXJpZXM/XHJcbiAgICAgICAgICAgICAgICAvLyB9KVxyXG4gICAgICAgICAgICAgICAgLy8gICAuYWRkVGFyZ2V0R3JvdXBzKGBubGItVGFyZ2V0LUdyb3VwLSR7cHJvcHMuYXBwTmFtZX1gLCB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGFyZ2V0R3JvdXBzOiBbXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICBubGJUYXJnZXRHcm91cEJsdWVcclxuICAgICAgICAgICAgICAgIC8vICAgICBdXHJcbiAgICAgICAgICAgICAgICAvLyAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gdGVzdEh0dHBMaXN0ZW5lciA9IGxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcihgJHtwcm9wcy5hcHBOYW1lfS1UZXN0TmV0d29ya0xvYWRCYWxhbmNlckh0dHBMaXN0ZW5lcmAsIHtcclxuICAgICAgICAgICAgICAgIC8vICAgcG9ydDogODAsXHJcbiAgICAgICAgICAgICAgICAvLyAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5IVFRQLFxyXG4gICAgICAgICAgICAgICAgLy8gICBzc2xQb2xpY3k6IGVsYnYyLlNzbFBvbGljeS5SRUNPTU1FTkRFRFxyXG4gICAgICAgICAgICAgICAgLy8gfSlcclxuICAgICAgICAgICAgICAgIC8vICAgLmFkZFRhcmdldEdyb3VwcyhgbmxiLVRhcmdldC1Hcm91cC0ke3Byb3BzLmFwcE5hbWV9YCwge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRhcmdldEdyb3VwczogW1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgbmxiVGFyZ2V0R3JvdXBCbHVlXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgXVxyXG4gICAgICAgICAgICAgICAgLy8gICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIHByb2R1Y3Rpb25IdHRwc0xpc3RlbmVyID0gbG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKGAke3Byb3BzLmFwcE5hbWV9LU5ldHdvcmtMb2FkQmFsYW5jZXJIdHRwc0xpc3RlbmVyYCwge1xyXG4gICAgICAgICAgICAgICAgLy8gICBwb3J0OiA0NDMsXHJcbiAgICAgICAgICAgICAgICAvLyAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5IVFRQUyxcclxuICAgICAgICAgICAgICAgIC8vICAgc3NsUG9saWN5OiBlbGJ2Mi5Tc2xQb2xpY3kuUkVDT01NRU5ERUQsXHJcbiAgICAgICAgICAgICAgICAvLyAgIC8vIGNlcnRpZmljYXRlczogcHJvcHMucHJvamVjdCA9PT0gJ29ubGluZWJvb2tpbmcnID8gY2RrLkZuLmltcG9ydFZhbHVlKGAke3Byb3BzLnN0YWdlfS1PTEItQ0VSVElGSUNBVEUtQVJOYCkgOiBwcm9wcy5kc2lSZWdpb24uZWxiQ2VydCwgLy9UT0RPOiByZWdpb24gaW5mb3JtYXRpb24gaW4gdGhlc2UgbGlicmFyaWVzP1xyXG4gICAgICAgICAgICAgICAgLy8gfSlcclxuICAgICAgICAgICAgICAgIC8vICAgLmFkZFRhcmdldEdyb3VwcyhgbmxiLVRhcmdldC1Hcm91cC0ke3Byb3BzLmFwcE5hbWV9YCwge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRhcmdldEdyb3VwczogW1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgbmxiVGFyZ2V0R3JvdXBCbHVlXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgXVxyXG4gICAgICAgICAgICAgICAgLy8gICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIHByb2R1Y3Rpb25IdHRwTGlzdGVuZXIgPSBsb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoYCR7cHJvcHMuYXBwTmFtZX0tTmV0d29ya0xvYWRCYWxhbmNlckh0dHBMaXN0ZW5lcmAsIHtcclxuICAgICAgICAgICAgICAgIC8vICAgcG9ydDogODAsXHJcbiAgICAgICAgICAgICAgICAvLyAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5IVFRQLFxyXG4gICAgICAgICAgICAgICAgLy8gICBzc2xQb2xpY3k6IGVsYnYyLlNzbFBvbGljeS5SRUNPTU1FTkRFRFxyXG4gICAgICAgICAgICAgICAgLy8gfSlcclxuICAgICAgICAgICAgICAgIC8vICAgLmFkZFRhcmdldEdyb3VwcyhgbmxiLVRhcmdldC1Hcm91cC0ke3Byb3BzLmFwcE5hbWV9YCwge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRhcmdldEdyb3VwczogW1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgbmxiVGFyZ2V0R3JvdXBCbHVlXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgXVxyXG4gICAgICAgICAgICAgICAgLy8gICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIHNlcnZpY2VEZWZpbml0aW9uLmF0dGFjaFRvQXBwbGljYXRpb25UYXJnZXRHcm91cChubGJUYXJnZXRHcm91cEJsdWUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMb2FkIEJhbGFuY2VyIHR5cGUgbm90IHNwZWNpZmllZFwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGVjc1NlcnZpY2VPdXRwdXQgPSBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlNlcnZpY2VOYW1lXCIsIHtcclxuICAgICAgICAgICAgdmFsdWU6IHNlcnZpY2VEZWZpbml0aW9uLnNlcnZpY2VOYW1lXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGVjc1NlcnZpY2VPdXRwdXQub3ZlcnJpZGVMb2dpY2FsSWQoXCJTZXJ2aWNlTmFtZVwiKTsgICAgICAgIFxyXG4gICAgfVxyXG59XHJcbiJdfQ==