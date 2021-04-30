import * as cdk from "@aws-cdk/core";
import * as customresource from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";

export interface CdkEcsCodedeployResourcesProps {
  stage: string;
  clusterName: string;
  serviceName: string;
  appName: string;
  listenerArn: string;
  targetGroupName: string;
  commitHash: string;
}

export class CdkEcsCodedeployResources extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkEcsCodedeployResourcesProps) {
    super(scope, id);

    const iamRole = iam.Role.fromRoleArn(this, "EcsBlueGreenDeploymentResourcesRole", "arn:aws:iam::022393549274:role/AWSCustomResourceRoleFullAccess")

    var terminationTimeout: number = props.stage.includes('prod') ? 120 : 0;

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `deploy-${props.appName}.${props.stage}.ecs`,
      publicReadAccess: true,
      versioned: true,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAcessIdentity', {
      comment: `OriginAccessIdentity for ${bucket.bucketName}.`
    });

    const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
      bucket: bucket
    });

    bucketPolicy.document.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [originAccessIdentity.grantPrincipal],
        actions: ['s3:GetObject'],
        resources: [bucket.bucketArn + "/*"],
      })
    );

    let output = new cdk.CfnOutput(this, "AppspecBucket", {
      value: bucket.bucketName
    });

    let output2 = new cdk.CfnOutput(this, "OriginAccessIdentity", {
      value: originAccessIdentity.originAccessIdentityName
    });

    output.overrideLogicalId("AppspecBucket");
    output2.overrideLogicalId("OriginAccessIdentity");

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
                  props.listenerArn
                ]
              },
              targetGroups: [
                {
                  name: `${props.targetGroupName}`
                },
                {
                  name: `${props.stage}-${props.appName}-TargetGroup2`
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
                  props.listenerArn
                ]
              },
              targetGroups: [
                {
                  name: `${props.targetGroupName}`
                },
                {
                  name: `${props.stage}-${props.appName}-TargetGroup2`
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

    let codedeployListDeploymentsCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'listDeployments',
      parameters: {
        applicationName: `${props.stage}-${props.appName}-CodeDeployApplication`,
        deploymentGroupName: `${props.stage}-${props.appName}-CodeDeployDeploymentGroup`,
      },
      physicalResourceId: customresource.PhysicalResourceId.of(`${props.stage}-${props.appName}-deployment-${props.commitHash}`)
    }

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
            bucket: bucket.bucketName,
            bundleType: "YAML",
            key: 'appspec.yml'
          }
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of(`${props.stage}-${props.appName}-deployment-${props.commitHash}`)
    }

    const blueGreenDeployment = new customresource.AwsCustomResource(this, `BlueGreenDeployment`, {
      onCreate: codedeployListDeploymentsCall, //this is the onCreate hook in order to not trigger a deployment during initial stack creation
      onUpdate: codedeployCreateDeploymentCall, //only trigger a deployment upon stack updates
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: iamRole
    })

    blueGreenDeployment.node.addDependency(codeDeployDeploymentGroup);
  }
}
