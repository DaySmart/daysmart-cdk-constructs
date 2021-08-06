# Welcome to the Open Source Construct for CdkEcsCodedeployResources, which provisions blue/green codedeploy resources for ecs services!

This CDK Construct Library (`CdkEcsCodedeployResources`) creates a codedeploy service role, appspec file deployment to the env level s3 bucket, codedeploy application, codedeploy deployment group, and sdk call for a blue/green ecs deployment.  This construct defines an interface (`CdkEcsCodedeployResourcesProps`) with the following properties that can be passed in:

- stage: string => The environment of the ecs service (ex. devtest)
- appName: string => The name of the desired ecs service and the codedeploy app to be created (ex. api2)
- serviceName: string => The name of the desired ecs service (ex. stage-api2)
- clusterName: string => The name of the existing cluster which your load balanced service operates inside (ex. dev-cluster3)
- listenerArn: string => The arn of the https listener for the ecs service (ex. arn:aws:elasticloadbalancing:us-east-1:674907216843:listener/app/stage-api2-loadbalancer/67jdn57f6m789e/m8sa43f58ykj)
- targetGroupName: string => The string of the initial target group name that receives load balancer traffic (ex. test-CdkEc-6NDUD6JF5)
- commitHash: string => A commit hash or other unique id that must be changed on each subsequent deployment in order to trigger a new blue/green codedeploy deployment (ex. h675fnt7)
- deployBucket: string => The name of the deploy bucket created by the environment level resources construct (ex. stage-deploy-bucket)
- (optional) taskDefinitionVersion: string => An optional task definition version to be added to the appspec file if provided (ex. 6)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile