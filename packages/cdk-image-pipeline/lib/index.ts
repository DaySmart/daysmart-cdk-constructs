import * as cdk from '@aws-cdk/core';
import * as imagebuilder from '@aws-cdk/aws-imagebuilder';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';

export interface CdkImagePipelineProps {
    appName: string;
    vpcId: string;
    securityGroupId: string;
    repositoryName: string;
    stage: string;
}

export class CdkImagePipeline extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkImagePipelineProps) {
    super(scope, id);

    const recipe = new imagebuilder.CfnImageRecipe(this, 'ImageRecipe', {
        name: `${props.appName}-recipe`,
        version: '1.0.0',
        parentImage: props.repositoryName,
        components: 
    });

    const role = new iam.Role(this, 'Role', {
        roleName: `${props.appName}-imagebuilder-role`,
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    })

    const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceRole', {
        instanceProfileName: `${props.appName}-instanceprofile`,
        roles: 
    });

    const infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, 'InfraConfig', {
        name: `${props.appName}-config`,
        instanceTypes: ['t3.medium'],
        instanceProfileName: `${props.appName}-imageprofile`,
        subnetId: props.vpcId,
        securityGroupIds: [props.securityGroupId]
    });

    const pipeline = new imagebuilder.CfnImagePipeline(this, 'ImagePipeline', {
        name: `${props.appName}-pipeline`,
        imageRecipeArn: recipe.attrArn,
        infrastructureConfigurationArn: infraConfig.attrArn,

    });

  }
}
