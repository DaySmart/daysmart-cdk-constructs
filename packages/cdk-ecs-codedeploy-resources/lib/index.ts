import * as cdk from "@aws-cdk/core";
import * as customresource from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
const fs = require('fs');
const yaml = require('js-yaml');

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

    const codeDeployServiceRole = new iam.Role(this, "CodeDeployServiceRole", {
      assumedBy: new iam.ServicePrincipal("codedeploy.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployRoleForECS")
      ]
    });

    const appPrefix = `${props.stage}-${props.appName}`
    const applicationName = `${appPrefix}-CodeDeployApplication`
    const deploymentGroupName = `${appPrefix}-CodeDeployDeploymentGroup`
    const deploymentConfig: string = "CodeDeployDefault.ECSAllAtOnce"

    let data = {
      version: 0.0,
      Resources: [
        {
          TargetService: {
            Type: "AWS::ECS::Service",
            Properties: {
              TaskDefinition: `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:task-definition/${appPrefix}`,
              LoadBalancerInfo: {
                ContainerName: "Container",
                ContainerPort: 80
              }
            }
          }
        }
      ]
    };

    let yamlStr = yaml.dump(data);
    fs.writeFileSync(__dirname + `/../assets/${appPrefix}-appspec.yml`, yamlStr);

    var terminationTimeout: number = props.stage.includes('prod') ? 120 : 0;

    const bucket = s3.Bucket.fromBucketName(this, "Bucket", "deploy-template.dsicollection.ecs")

    new s3deploy.BucketDeployment(this, "S3 Yaml Upload", {
      sources: [
        s3deploy.Source.asset(__dirname + '/../assets')
      ],
      destinationBucket: bucket,
      destinationKeyPrefix: `${props.stage}`
    });

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
      policy: customresource.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "codedeploy:CreateApplication",
            "codedeploy:UpdateApplication",
            "codedeploy:DeleteApplication"
          ],
          resources: [`arn:aws:codedeploy:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application:${applicationName}`],
          effect: iam.Effect.ALLOW
        })
      ])
    });

    let codedeployCreateDeploymentGroupCall: customresource.AwsSdkCall = {
      service: 'CodeDeploy',
      action: 'createDeploymentGroup',
      parameters: {
        applicationName: applicationName,
        deploymentGroupName: deploymentGroupName,
        serviceRoleArn: codeDeployServiceRole.roleArn,
        deploymentConfigName: deploymentConfig,
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
        deploymentConfigName: deploymentConfig,
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
      policy: customresource.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "codedeploy:CreateDeploymentGroup",
            "codedeploy:UpdateDeploymentGroup",
            "codedeploy:DeleteDeploymentGroup"
          ],
          resources: [`arn:aws:codedeploy:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:deploymentgroup:${applicationName}/${deploymentGroupName}`],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          resources: ["*"],
          effect: iam.Effect.ALLOW
        })
      ])
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
            key: `${props.stage}/${appPrefix}-appspec.yml`
          }
        },
      },
      physicalResourceId: customresource.PhysicalResourceId.of(`${appPrefix}-deployment-${props.commitHash}`)
    }

    const blueGreenDeployment = new customresource.AwsCustomResource(this, `BlueGreenDeployment`, {
      onCreate: codedeployListDeploymentsCall, //this is the onCreate hook in order to not trigger a deployment during initial stack creation
      onUpdate: codedeployCreateDeploymentCall, //only trigger a deployment upon stack updates
      policy: customresource.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "codedeploy:*",
          ],
          resources: [
            `arn:aws:codedeploy:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:application:${applicationName}`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: [
            "codedeploy:*",
          ],
          resources: [
            `arn:aws:codedeploy:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:deploymentgroup:${applicationName}/${deploymentGroupName}`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: [
            "codedeploy:*",
          ],
          resources: [
            `arn:aws:codedeploy:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:deploymentconfig:${deploymentConfig}`
          ],
          effect: iam.Effect.ALLOW
        })
      ])
    })

    blueGreenDeployment.node.addDependency(codeDeployDeploymentGroup);
  }
}
