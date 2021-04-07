import * as cdk from "@aws-cdk/core";
import * as ecspattern from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cfnInclude from "@aws-cdk/cloudformation-include";
import * as cfn from "@aws-cdk/aws-cloudformation"
import * as elb from "@aws-cdk/aws-elasticloadbalancing";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as codedeploy from "@aws-cdk/aws-codedeploy";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as customresource from "@aws-cdk/custom-resources";
import { CodeDeploy } from "aws-sdk";

export interface CdkEcsCodedeployBlueGreenProps {
  stage: string;
  clusterName: string;
  serviceName: string;
  appName: string;
  vpcId: string;
  securityGroupId: string;
  repositoryName: string;
  lbType: string;
  lbName: string;
  listenerARN: string;
}

export class CdkEcsCodedeployBlueGreen extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsCodedeployBlueGreenProps) {
    super(scope, id);

    const codedeployApplication = new codedeploy.EcsApplication(scope, 'CodeDeployApplication', {
      applicationName: `${props.stage}-${props.appName}`
    });

    var terminationTimeout: number = props.stage.includes('prod') ? 120 : 0;

    // let codedeployApplicationCall: customresource.AwsSdkCall = {
    //   service: 'CodeDeploy',
    //   action: 'createApplication',
    //   parameters: {
    //     applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
    //     computePlatform: "ECS"
    //   },
    //   physicalResourceId: customresource.PhysicalResourceId.of('deployment-application-custom-resource')
    // }

    // const codeDeployApplication = new customresource.AwsCustomResource(scope, 'CodeDeployApplication', {
    //   onCreate: codedeployApplicationCall,
    //   onUpdate: codedeployApplicationCall,
    //   onDelete: {
    //     service: 'CodeDeploy',
    //     action: 'deleteApplication',
    //     parameters: {
    //       applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
    //     }
    //   },
    //   policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE })
    // });

    let codedeployDeploymentGroupCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeploymentGroup',
      parameters: {
        applicationName: codedeployApplication.applicationName,
        deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
        serviceRoleArn: "arn:aws:iam::022393549274:role/CodeDeployServiceRoleECS",
        deploymentConfigName: "CodeDeployDefault.ECSLinear10PercentEvery1Minutes",
        autoRollbackConfiguration: {
          enabled: true,
          events: [
            "DEPLOYMENT_FAILURE",
            "DEPLOYMENT_STOP_ON_REQUEST"
          ]
        },
        blueGreenDeploymentConfiguration: {
          deploymentReadyOption: {
            actionOnTimeout: "CONTINUE_DEPLOYMENT"
          },
          greenFleetProvisioningOption: {
            action: "COPY_AUTO_SCALING_GROUP"
          },
          terminateBlueInstancesOnDeploymentSuccess: {
            action: "TERMINATE",
            terminationWaitTimeInMinutes: terminationTimeout
          }
        },
        deploymentStyle: {
          deploymentOption: "WITH_TRAFFIC_CONTROL",
          deploymentType: "BLUE_GREEN"
        },
        ecsServices: [
          {
            serviceName: props.serviceName,
            clusterName: props.clusterName
          }
        ],
        loadBalancerInfo: {
          elbInfoList: [
            {
              name: props.lbName
            }
          ],
          targetGroupPairInfoList: [
            {
              prodTrafficRoute: {
                listenerArns: [
                  props.listenerARN
                ]
              },
              targetGroups: [
                {
                  name: (props.lbType == "ALB") ? `alb-Target-Group-${props.appName}-1` : `nlb-Target-Group-${props.appName}-1`
                },
                {
                  name: (props.lbType == "ALB") ? `alb-Target-Group-${props.appName}-2` : `nlb-Target-Group-${props.appName}-2`
                }
              ]
            }
          ]
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of('deployment-group-custom-resource')
    }

    let blueGreenDeploymentCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'updateDeploymentGroup',
      parameters: {
        applicationName: codedeployApplication.applicationName,
        currentDeploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
        deploymentConfigName: "CodeDeployDefault.ECSLinear10PercentEvery1Minutes",
        autoRollbackConfiguration: {
          enabled: true,
          events: [
            "DEPLOYMENT_FAILURE",
            "DEPLOYMENT_STOP_ON_REQUEST"
          ]
        },
        blueGreenDeploymentConfiguration: {
          deploymentReadyOption: {
            actionOnTimeout: "CONTINUE_DEPLOYMENT"
          },
          greenFleetProvisioningOption: {
            action: "COPY_AUTO_SCALING_GROUP"
          },
          terminateBlueInstancesOnDeploymentSuccess: {
            action: "TERMINATE",
            terminationWaitTimeInMinutes: terminationTimeout
          }
        },
        deploymentStyle: {
          deploymentOption: "WITH_TRAFFIC_CONTROL",
          deploymentType: "BLUE_GREEN"
        },
        ecsServices: [
          {
            serviceName: props.serviceName,
            clusterName: props.clusterName
          }
        ],
        loadBalancerInfo: {
          elbInfoList: [
            {
              name: props.lbName
            }
          ],
          targetGroupPairInfoList: [
            {
              prodTrafficRoute: {
                listenerArns: [
                  props.listenerARN
                ]
              },
              targetGroups: [
                {
                  name: (props.lbType == "ALB") ? `alb-Target-Group-${props.appName}-1` : `nlb-Target-Group-${props.appName}-1`
                },
                {
                  name: (props.lbType == "ALB") ? `alb-Target-Group-${props.appName}-2` : `nlb-Target-Group-${props.appName}-2`
                }
              ]
            }
          ]
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of('deployment-group-update-custom-resource')
    }

    const blueGreenDeployment = new customresource.AwsCustomResource(scope, 'BlueGreenDeployment', {
      onCreate: codedeployDeploymentGroupCall,
      onUpdate: blueGreenDeploymentCall,
      onDelete: {
        service: 'CodeDeploy',
        action: 'deleteDeploymentGroup',
        parameters: {
          applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
          deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE })
    })

  }
}
