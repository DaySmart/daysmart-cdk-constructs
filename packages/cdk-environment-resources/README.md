# Welcome to the Open Source Construct for CdkEnvironmentResources, which provisions environment level resources for running ecs applications!

This CDK Construct Library (`CdkEnvironmentResources`) creates an ecs cluster, s3 deployment bucket, and an autoscaling group used as a capacity provider for the cluster.  This construct defines an interface (`CdkEnvironmentResourcesProps`) with the following properties that can be passed in:

- vpcId: string => The string of a vpc id that you want to use for the ecs cluster and ec2 resources (ex. vpc-76594053)
- stage: string => The base environment of the cluster and ecs instances to be created.  Dynamic environments will be services that run inside the base environment cluster (ex. dev)
- project: string => The name of the desired ecs project that will also be the suffix of the cluster name and compute resources (ex. fileswappingservice)
- (optional) instanceKeyName: string => The name of an existing ec2 Key pair name (ex. TestKey)
- amiName: string => The name of the existing ami which you want cdk to lookup and use as the base image for your ecs instances (ex. golden-image-2014)
- securityGroupId: string => The string of a security group id that you want to use for the ecs cluster and ec2 resources (ex. sg-h6k7d5v3)
- instanceProfileArn: string => The arn of an existing iam instance profile that will be attached to the ecs instances created (ex. arn:aws:iam::674907216843:role/test-iam-instance-role-8g9j4m5s4h7j)
- (optional) userData: string => A multi-line string that represents a script of user data to place on the ecs instances created (ex:

```
$file = $env:SystemRoot + "\Temp\" + (Get-Date).ToString("MM-dd-yy-hh-mm")
New-Item $file -ItemType file
```
)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile