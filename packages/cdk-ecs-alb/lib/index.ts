import * as cdk from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as iam from "@aws-cdk/aws-iam";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as logs from "@aws-cdk/aws-logs";
import * as route53 from "@aws-cdk/aws-route53";

export interface CdkEcsAlbProps {
    clusterName: string;
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    stage: string;
    healthCheckPath: string;
    tag?: string;
    taskRoleArn: string;
    certificateArn: string;
    serviceDnsRecord?: string;
    hostedZoneDomainName?: string
}

export class CdkEcsAlb extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let applicationLoadBalancedEC2Service: ecspattern.ApplicationLoadBalancedEc2Service;
        let listenerOutput: cdk.CfnOutput;

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

        var taskRole = iam.Role.fromRoleArn(this, "TaskRole", props.taskRoleArn)

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
            memoryLimitMiB: 2048,
            cpu: 512,
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
                    logGroupName: `${props.stage}-${props.appName}-ecs`,
                    retention: logs.RetentionDays.INFINITE
                }),
                streamPrefix: "ecs",
            }),
        });

        const albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
            targetGroupName: `${props.stage}-${props.appName}-TargetGroup2`,
            targetType: elbv2.TargetType.INSTANCE,
            protocol: elbv2.ApplicationProtocol.HTTP,
            healthCheck: {
                path: props.healthCheckPath,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 5,
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(10)
            },
            vpc: vpc
        });

        if (props.serviceDnsRecord && props.hostedZoneDomainName) {
            const httpsCertificate = acm.Certificate.fromCertificateArn(this, "HttpsCertificate", props.certificateArn);
            const domainHostedZone = route53.HostedZone.fromLookup(this, `${props.hostedZoneDomainName} HostedZone`, {
                domainName: props.hostedZoneDomainName,
                privateZone: false
            });

            applicationLoadBalancedEC2Service = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
                cluster,
                serviceName: `${props.stage}-${props.appName}`,
                desiredCount: 1,
                taskDefinition: taskDefinition,
                deploymentController: {
                    type: ecs.DeploymentControllerType.CODE_DEPLOY
                },
                certificate: httpsCertificate,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                domainName: props.serviceDnsRecord,
                domainZone: domainHostedZone,
                recordType: ecspattern.ApplicationLoadBalancedServiceRecordType.ALIAS,
                redirectHTTP: true,
                loadBalancerName: `${props.stage}-${props.appName}-ecs-alb`
            });

            listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
                value: applicationLoadBalancedEC2Service.listener.listenerArn
            });

            listenerOutput.overrideLogicalId("ListenerARN");
        }
        else {
            applicationLoadBalancedEC2Service = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
                cluster,
                serviceName: `${props.stage}-${props.appName}`,
                desiredCount: 1,
                taskDefinition: taskDefinition,
                deploymentController: {
                    type: ecs.DeploymentControllerType.CODE_DEPLOY
                },
                loadBalancerName: `${props.stage}-${props.appName}-ecs-alb`
            });

            const httpsListenerCertificate = elbv2.ListenerCertificate.fromArn(props.certificateArn)

            const httpsListener = applicationLoadBalancedEC2Service.loadBalancer.addListener("HttpsListener", {
                protocol: elbv2.ApplicationProtocol.HTTPS,
                port: 443,
                certificates: [
                    httpsListenerCertificate
                ],
                defaultTargetGroups: [
                    applicationLoadBalancedEC2Service.targetGroup
                ]
            });

            applicationLoadBalancedEC2Service.listener.addAction("HttpsRedirect", {
                action: elbv2.ListenerAction.redirect({
                    protocol: "HTTPS",
                    host: "#{host}",
                    port: "443",
                    path: "/#{path}",
                    query: "#{query}"
                })
            });

            listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
                value: httpsListener.listenerArn
            });

            listenerOutput.overrideLogicalId("ListenerARN");
        }

        applicationLoadBalancedEC2Service.targetGroup.configureHealthCheck({
            path: props.healthCheckPath,
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(10)
        });

        const scalableTarget = applicationLoadBalancedEC2Service.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 4,
        });

        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
        });

        const ecsServiceOutput = new cdk.CfnOutput(this, "ServiceName", {
            value: applicationLoadBalancedEC2Service.service.serviceName
        });

        ecsServiceOutput.overrideLogicalId("ServiceName");

        const targetGroup = new cdk.CfnOutput(this, "TargetGroupName", {
            value: applicationLoadBalancedEC2Service.targetGroup.targetGroupName
        });

        targetGroup.overrideLogicalId("TargetGroupName");
    }
}
