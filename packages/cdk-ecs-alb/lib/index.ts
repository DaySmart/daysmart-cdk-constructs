import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecspattern from "aws-cdk-lib/aws-ecs-patterns";
import * as route53 from "aws-cdk-lib/aws-route53";
import { SslPolicy } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from 'constructs'; 

export interface CdkEcsAlbProps {
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
    legacyTargetGroupName?: string;
    legacyLoadBalancerName?: string;
    publicFacing?: "true" | "false";    
    redirectHTTP?: "true" | "false";
    securityGroupIngressPort?: string;
}

export class CdkEcsAlb extends Construct {
    constructor(scope: Construct, id: string, props: CdkEcsAlbProps) {
        super(scope, id);

        let applicationLoadBalancedService: ecspattern.ApplicationLoadBalancedEc2Service | ecspattern.ApplicationLoadBalancedFargateService;
        let listenerOutput: cdk.CfnOutput;
        let taskDefinition: ecs.TaskDefinition;
        let portMappings: ecs.PortMapping[];
        let albTargetGroup2: elbv2.TargetGroupBase;

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
       
        if (props.redirectHTTP === undefined) {            
            props.redirectHTTP = "true"
        }
                
        if (props.publicFacing === undefined) {             
            props.publicFacing  = "true";
        }

        if (props.isFargate) {
            portMappings = [
                {
                    containerPort: 80,
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
            albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
                targetGroupName: (props.legacyTargetGroupName) ? `${props.stage}-${props.appName}-TargetGroup2` : undefined,
                targetType: elbv2.TargetType.IP,
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
        } else {
            portMappings = [
                {
                    containerPort: 80,
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
            albTargetGroup2 = new elbv2.ApplicationTargetGroup(this, `ApplicationLoadBalancerTargetGroup2`, {
                targetGroupName: (props.legacyTargetGroupName) ? `${props.stage}-${props.appName}-TargetGroup2` : undefined,
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

            if(props.isFargate){
                applicationLoadBalancedService = new ecspattern.ApplicationLoadBalancedFargateService(this, "ApplicationLB Fargate Service", {
                    cluster,
                    serviceName: `${props.stage}-${props.appName}`,
                    desiredCount: 1,
                    sslPolicy: SslPolicy.TLS12,
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
                    loadBalancerName: (props.legacyLoadBalancerName) ? `${props.stage}-${props.appName}-ecs-alb` : undefined                    
                });
            } else {
                applicationLoadBalancedService = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
                    cluster,
                    serviceName: `${props.stage}-${props.appName}`,
                    desiredCount: 1,
                    sslPolicy: SslPolicy.TLS12,
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
                    loadBalancerName: (props.legacyLoadBalancerName) ? `${props.stage}-${props.appName}-ecs-alb` : undefined
                });
            }

            listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
                value: applicationLoadBalancedService.listener.listenerArn
            });

            listenerOutput.overrideLogicalId("ListenerARN");
        }
        else {                                
            let alb: elbv2.ApplicationLoadBalancer            
            
            if (props.publicFacing === "true") {                               
                alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
                    vpc: vpc,
                    loadBalancerName: (props.legacyLoadBalancerName) ? `${props.stage}-${props.appName}-ecs-alb` : undefined,
                    internetFacing: true,              
                    vpcSubnets: { 
                        subnetType: ec2.SubnetType.PUBLIC, 
                    }                
                }); 
            } else {                
                alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
                    vpc: vpc,
                    loadBalancerName: (props.legacyLoadBalancerName) ? `${props.stage}-${props.appName}-ecs-alb` : undefined,
                    internetFacing: false,              
                    vpcSubnets: { 
                        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT, 
                    }                
                }); 
            }

            if(props.isFargate) {     
                    applicationLoadBalancedService = new ecspattern.ApplicationLoadBalancedFargateService(this, "ApplicationLB Fargate Service", {
                    cluster,
                    serviceName: `${props.stage}-${props.appName}`,
                    desiredCount: 1,
                    taskDefinition: taskDefinition,
                    deploymentController: {
                        type: ecs.DeploymentControllerType.CODE_DEPLOY
                    },                                         
                    loadBalancer: alb
                });                
            } else {
                applicationLoadBalancedService = new ecspattern.ApplicationLoadBalancedEc2Service(this, "ApplicationLB EC2 Service", {
                    cluster,
                    serviceName: `${props.stage}-${props.appName}`,
                    desiredCount: 1,
                    taskDefinition: taskDefinition,
                    deploymentController: {
                        type: ecs.DeploymentControllerType.CODE_DEPLOY
                    },                                                                           
                    loadBalancer: alb
                });
            }
            
            if (!props.redirectHTTP) {
                const httpsListenerCertificate = elbv2.ListenerCertificate.fromArn(props.certificateArn)

                const httpsListener = applicationLoadBalancedService.loadBalancer.addListener("HttpsListener", {
                    protocol: elbv2.ApplicationProtocol.HTTPS,
                    sslPolicy: SslPolicy.TLS12,
                    port: 443,
                    certificates: [
                        httpsListenerCertificate
                    ],
                    defaultTargetGroups: [
                        applicationLoadBalancedService.targetGroup
                    ]
                });
                applicationLoadBalancedService.listener.addAction("HttpsRedirect", {
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
            } else {
                listenerOutput = new cdk.CfnOutput(this, "ListenerARN", {
                    value: applicationLoadBalancedService.listener.listenerArn
                });
            }

            listenerOutput.overrideLogicalId("ListenerARN");
        }

        if (props.securityGroupIngressPort) {
            applicationLoadBalancedService.service.connections.securityGroups[0].addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(parseInt(props.securityGroupIngressPort)));  
        }

        applicationLoadBalancedService.service.connections.securityGroups[0].addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        applicationLoadBalancedService.service.connections.securityGroups[0].addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));


        applicationLoadBalancedService.targetGroup.configureHealthCheck({
            path: props.healthCheckPath,
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(10)
        });

        const scalableTarget = applicationLoadBalancedService.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 4,
        });

        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
        });

        const cfnService = applicationLoadBalancedService.service.node.defaultChild as ecs.CfnService;

        cfnService.addPropertyOverride('TaskDefinition', props.taskDefinitionArn);

        const ecsServiceOutput = new cdk.CfnOutput(this, "ServiceName", {
            value: applicationLoadBalancedService.service.serviceName
        });

        ecsServiceOutput.overrideLogicalId("ServiceName");

        const targetGroup = new cdk.CfnOutput(this, "TargetGroupName", {
            value: applicationLoadBalancedService.targetGroup.targetGroupName
        });

        targetGroup.overrideLogicalId("TargetGroupName");

        const targetGroup1 = new cdk.CfnOutput(this, "TargetGroup1Name", {
            value: applicationLoadBalancedService.targetGroup.targetGroupName
        });

        targetGroup1.overrideLogicalId("TargetGroup1Name");

        const targetGroup2 = new cdk.CfnOutput(this, "TargetGroup2Name", {
            value: albTargetGroup2.targetGroupName
        });

        targetGroup2.overrideLogicalId("TargetGroup2Name");
    }
}
