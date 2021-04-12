import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as codedeploy from "@aws-cdk/aws-codedeploy";
import * as customresource from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";

export interface CdkEcsCodedeployBlueGreenProps extends cdk.StackProps {
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

export class CdkTestStackStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CdkEcsCodedeployBlueGreenProps) {
    super(scope, id, props);

    var terminationTimeout: number = props.stage.includes('prod') ? 120 : 0;

    let codedeployCreateApplicationCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createApplication',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        computePlatform: "ECS"
      },
      physicalResourceId: customresource.PhysicalResourceId.of('deployment-application-custom-resource')
    }

    let codedeployUpdateApplicationCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'updateApplication',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`
      },
      physicalResourceId: customresource.PhysicalResourceId.of('deployment-application-update-custom-resource')
    }

    const codeDeployApplication = new customresource.AwsCustomResource(this, 'CodeDeployApplication', {
      onCreate: codedeployCreateApplicationCall,
      onUpdate: codedeployUpdateApplicationCall,
      onDelete: {
        service: 'CodeDeploy',
        action: 'deleteApplication',
        parameters: {
          applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: iam.Role.fromRoleArn(this, "CodeDeployApplicationRole", "arn:aws:iam::022393549274:role/AWSCustomResourceRoleFullAccess")
    });

    let codedeployCreateDeploymentGroupCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeploymentGroup',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
        serviceRoleArn: "arn:aws:iam::022393549274:role/CodeDeployServiceRoleECS",
        deploymentConfigName: "CodeDeployDefault.ECSAllAtOnce",
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

    let codedeployUpdateDeploymentGroupCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'updateDeploymentGroup',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        currentDeploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
        deploymentConfigName: "CodeDeployDefault.ECSAllAtOnce",
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

    const blueGreenDeployment = new customresource.AwsCustomResource(this, 'BlueGreenDeployment', {
      onCreate: codedeployCreateDeploymentGroupCall,
      onUpdate: codedeployUpdateDeploymentGroupCall,
      onDelete: {
        service: 'CodeDeploy',
        action: 'deleteDeploymentGroup',
        parameters: {
          applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
          deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: iam.Role.fromRoleArn(this, "EcsBlueGreenDeploymentRole", "arn:aws:iam::022393549274:role/AWSCustomResourceRoleFullAccess")
    })
  }
}
