# Welcome to the Open Source Construct for CdkEcsAlb, which provisions application level resources for ecs services!

This CDK Construct Library (`CdkEcsAlb`) creates an ecs service task definition, two target groups, and a complete [ApplicationLoadBalancedEc2Service](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ecs-patterns.ApplicationLoadBalancedEc2Service.html) (see documentation), and an https listener.  This construct defines an interface (`CdkEcsAlbProps`) with the following properties that can be passed in:

- vpcId: string => The string of the vpc id used for the ecs cluster and ec2 resources (ex. vpc-76594053)
- stage: string => The environment of the service to be created (ex. devtest)
- appName: string => The name of the desired ecs service (ex. api2)
- repositoryName: string => The name of an existing ecr repository (ex. api2)
- clusterName: string => The name of the existing cluster which your load balanced service will run inside (ex. dev-cluster3)
- securityGroupId: string => The string of the security group id used for the ecs cluster and ec2 resources (ex. sg-h6k7d5v3)
- healthCheckPath: string => A valid uri path that can be pinged for target group health checks on the ecs service (ex. /HealthCheck/testpath)
- (optional) tag: string => A n optional tag that can specify a particular docker image to use from the provided ecr repository (ex. dev)
- taskRoleArn: string => The arn of an existing iam task role that will be attached to the ecs containers created (ex. arn:aws:iam::674907216843:role/test-iam-task-role-8g9j4m5s4h7j)
- certificateArn: string => The arn of an existing acm certificate which will be used in the https load balancer listener created (ex. arn:aws:iam::674907216843:certificate/56hf4-nyi6984df-w85ntf74)
- (optional) serviceDnsRecord: string => An optional parameter for a route 53 dns record, if one already exists that you want to use for the ecs service (required if hostedZoneDomainName specified) (ex. test-ecs-service.google.com)
- (optional) hostedZoneDomainName: string => The optional name of the dns record's hosted zone name (required if serviceDnsRecord specified) (ex. google.com)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile