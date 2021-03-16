import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import { CdkEcsTaskDefinition } from "../../cdk-ecs-task-definition/lib/index";

export interface CdkEcsServiceProps {
  stage: string;
  appName: string;
  dynamicEnvName: string;
  projectName: string;
  isALB: boolean
}

export class CdkEcsService extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsServiceProps) {
    super(scope, id);

    //environement level TODO: Remove and use Chris' code instead
    const applicationCluster = new ecs.Cluster(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ApplicationCluster`, {
 
    });


    //Task Definition Call
    const taskDefinition = new CdkEcsTaskDefinition(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-TaskDefinition`, {
      stage: props.stage,
      appName: props.appName,
      dynamicEnvName: props.dynamicEnvName,
      projectName: props.projectName,
    })

    //Service Definition Call
    const serviceDefinition = new ecs.Ec2Service(this, `${(props.dynamicEnvName) ? `${props.dynamicEnvName}-${props.appName}` : `${props.stage}-${props.appName}`}-ServiceDefinition`, {
      taskDefinition: taskDefinition.getEcsTaskDefinition(),
      cluster: applicationCluster,
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

      //   //Load Balancer Call
  //   switch(props.isALB) {
  //     case true:
  //       const applicationLoadBalancer = 
  //         const classicLb = new DsiClassicLoadBalancer(this, "ApplicationELB", {
  //             healthCheck: props.healthCheck,
  //             public: props.public,
  //             appName: props.appName,
  //             dsiRegion: props.dsiRegion,
  //             stage: props.stage,
  //             stickySessions: props.stickySessions
  //         });
  //         codeDeployLoadBalancer = codedeploy.LoadBalancer.classic(classicLb.loadBalancer);
  //         loadBalancerInfo = {
  //             elbInfoList: [{
  //                 name: classicLb.loadBalancer.loadBalancerName
  //             }]
  //         }
  //         loadBalancerName = classicLb.loadBalancer.loadBalancerName;
  //         dnsRecordTarget = new targets.ClassicLoadBalancerTarget(classicLb.loadBalancer);
  //         classicElb = classicLb.loadBalancer;
  //         break;
  //     case false:
  //         const networkLb = new DsiNetworkLoadBalancer(this, "ApplicationNLB", {
  //             appName: props.appName,
  //             dsiRegion: props.dsiRegion,
  //             public: props.public,
  //             stage: props.stage,
  //             healthCheck: props.healthCheck,
  //             port: props.port
  //         });
  //         codeDeployLoadBalancer = codedeploy.LoadBalancer.network(networkLb.targetGroup);
  //         loadBalancerInfo = {
  //             targetGroupInfoList: [{
  //                 name: networkLb.targetGroup.targetGroupName
  //             }]
  //         }
  //         loadBalancerName = networkLb.loadBalancer.loadBalancerName;
  //         dnsRecordTarget = new targets.LoadBalancerTarget(networkLb.loadBalancer);
  //         targetGroup = networkLb.targetGroup;
  //         break;
  //     default:
  //         throw new Error("Load Balancer type not specified");
  // }


    // serviceDefinition.attachToApplicationTargetGroup();
  }
}
