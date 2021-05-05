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

    const customResourceIamRole = new iam.Role(this, "CustomResourceRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess")
      ]
    });

    const codeDeployServiceRole = new iam.Role(this, "CodeDeployServiceRole", {
      assumedBy: new iam.ServicePrincipal("codedeploy.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployRoleForECS"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"),
      ]
    });

    const appPrefix = `${props.stage}-${props.appName}`
    const applicationName = `${appPrefix}-CodeDeployApplication`
    const deploymentGroupName = `${appPrefix}-CodeDeployDeploymentGroup`

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
        applicationName: applicationName,
        computePlatform: "ECS"
      },
      physicalResourceId: customresource.PhysicalResourceId.of('deployment-application-custom-resource')
    }

    let codedeployUpdateApplicationCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'updateApplication',
      parameters: {
        applicationName: applicationName
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
          applicationName: applicationName,
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: customResourceIamRole
    });

    let codedeployCreateDeploymentGroupCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeploymentGroup',
      parameters: {
        applicationName: applicationName,
        deploymentGroupName: deploymentGroupName,
        serviceRoleArn: codeDeployServiceRole.roleArn,
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
                  name: `${appPrefix}-TargetGroup2`
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
        applicationName: applicationName,
        currentDeploymentGroupName: deploymentGroupName,
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
                  name: `${appPrefix}-TargetGroup2`
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
          applicationName: applicationName,
          deploymentGroupName: deploymentGroupName
        }
      },
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: customResourceIamRole
    })

    codeDeployDeploymentGroup.node.addDependency(codeDeployApplication);

    let codedeployListDeploymentsCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'listDeployments',
      parameters: {
        applicationName: applicationName,
        deploymentGroupName: deploymentGroupName,
      },
      physicalResourceId: customresource.PhysicalResourceId.of(`${appPrefix}-deployment-${props.commitHash}`)
    }

    let codedeployCreateDeploymentCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeployment',
      parameters: {
        applicationName: applicationName,
        autoRollbackConfiguration: {
          enabled: true,
          events: [
            "DEPLOYMENT_FAILURE",
            "DEPLOYMENT_STOP_ON_REQUEST"
          ]
        },
        deploymentGroupName: deploymentGroupName,
        description: `Blue/Green ECS Deployment Created for ${appPrefix}`,
        revision: {
          revisionType: "S3",
          s3Location: {
            bucket: bucket.bucketName,
            bundleType: "YAML",
            key: 'appspec.yml'
          }
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of(`${appPrefix}-deployment-${props.commitHash}`)
    }

    const blueGreenDeployment = new customresource.AwsCustomResource(this, `BlueGreenDeployment`, {
      onCreate: codedeployListDeploymentsCall, //this is the onCreate hook in order to not trigger a deployment during initial stack creation
      onUpdate: codedeployCreateDeploymentCall, //only trigger a deployment upon stack updates
      policy: customresource.AwsCustomResourcePolicy.fromSdkCalls({ resources: customresource.AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: customResourceIamRole
    })

    blueGreenDeployment.node.addDependency(codeDeployDeploymentGroup);
  }
}
