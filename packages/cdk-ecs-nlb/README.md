# Welcome to the Open Source Construct for CdkEcsNlb, which provisions application/network level resources for ecs services!

This CDK Construct Library (`CdkEcsNlb`) creates an ecs service task definition, two target groups, and a complete [NetworkLoadBalancedFargateService](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.NetworkLoadBalancedFargateService.html) or [NetworkLoadBalancedEc2Service](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ecs-patterns.ApplicationLoadBalancedEc2Service.html) (see documentation).  This construct defines an interface (`CdkEcsNlbProps`) with the following properties that can be passed in:

- vpcId: string => The string of the vpc id used for the ecs cluster and resources (ex. vpc-76594053)
- stage: string => The environment of the service to be created (ex. devtest)
- appName: string => The name of the desired ecs service (ex. api2)
- repositoryName: string => The name of an existing ecr repository (ex. api2)
- clusterName: string => The name of the existing cluster which your load balanced service will run inside (ex. dev-cluster3)
- securityGroupId: string => The string of the security group id used for the ecs cluster and resources (ex. sg-h6k7d5v3)
- taskDefinitionArn: string => The arn of an existing ecs task definition that will be used to provision the containers in the ecs service (ex. arn:aws:ecs:us-west-2:123456789012:task-definition/hello_world:8)
- healthCheckPath: string => A valid uri path that can be pinged for target group health checks on the ecs service (ex. /HealthCheck/testpath)
- (optional) tag: string => A n optional tag that can specify a particular docker image to use from the provided ecr repository (ex. dev)
- certificateArn: string => The arn of an existing acm certificate which will be used in the https load balancer listener created (ex. arn:aws:iam::674907216843:certificate/56hf4-nyi6984df-w85ntf74)
- (optional) serviceDnsRecord: string => An optional parameter for a route 53 dns record, if one already exists that you want to use for the ecs service (required if hostedZoneDomainName specified) (ex. test-ecs-service.google.com)
- (optional) hostedZoneDomainName: string => The optional name of the dns record's hosted zone name (required if serviceDnsRecord specified) (ex. google.com)
- (optional) isFargate: string => The optional input that should be set as "true" if you want the ecs service to run on the fargate platform
- (optional) targetGroupPort: string => The optional input for specifying the port that the target group in the service will use
- (optional) healthCheckHealthyThreshold: string => The optional input for specifying the number of successful health checks required before a target can be resolved as healthy
- (optional) healthCheckUnhealthyThreshold: string => The optional input for specifying the number of unsuccessful health checks before a target is resolved as unhealthy
- (optional) healthCheckInterval: string => The optional input in seconds of how often health checks should be performed
- healthCheckProtocol: "https" | "tcp" => Whether the protocol used for the health check is over https or tcp
- (optional) healthyHttpCodes: string => The optional input for specifying the range of http codes that can be returned and considered healthy for the health check
- (optional) healthCheckTimeout: string => The optional input for how long health checks should wait before timing out in seconds
- (optional) containerPort: string => The optional input for what port on the container should be hit by the load balancer

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile