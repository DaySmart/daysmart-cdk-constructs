import * as cdk from "@aws-cdk/core";
import * as customresource from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";

export interface CdkEcsCodedeployResourcesProps {
  stage: string;
  clusterName: string;
  serviceName: string;
  appName: string;
  lbType: string;
  lbArn: string;
}

export class CdkEcsCodedeployResources extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsCodedeployResourcesProps) {
    super(scope, id);

    const iamRole = iam.Role.fromRoleArn(this, "EcsBlueGreenDeploymentResourcesRole", "arn:aws:iam::022393549274:role/AWSCustomResourceRoleFullAccess")

    var terminationTimeout: number = props.stage.includes('prod') ? 120 : 0;

    let time: string = Date.UTC.toString() 

    const listener = elbv2.ApplicationListener.fromLookup(this, `${props.stage}-${props.appName}-Listener`, {
      loadBalancerArn: props.lbArn
    });

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
      role: iamRole
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
                  listener.listenerArn
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
                  listener.listenerArn
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

    const codeDeployDeploymentGroup = new customresource.AwsCustomResource(this, 'CodeDeployDeploymentGroup', {
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
      role: iamRole
    })

    codeDeployDeploymentGroup.node.addDependency(codeDeployApplication);

    let codedeployCreateDeploymentCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeployment',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        autoRollbackConfiguration: {
          enabled: true,
          events: [
            "DEPLOYMENT_FAILURE",
            "DEPLOYMENT_STOP_ON_REQUEST"
          ]
        },
        deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
        description: `Blue/Green ECS Deployment Created for ${props.stage}-${props.appName}`,
        revision: {
          revisionType: "S3",
          s3Location: {
            bucket: `deploy-${props.appName}.${props.stage}.ecs`,
            bundleType: "YAML",
            key: 'appspec.yml'
          }
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of(time)
    }

    const blueGreenDeployment = new customresource.AwsCustomResource(this, `BlueGreenDeployment`, {
      onUpdate: codedeployCreateDeploymentCall,
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: iamRole
    })

    blueGreenDeployment.node.addDependency(codeDeployDeploymentGroup);
  }
}
