import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

export interface CdkPipelineProps {
  repoName: string;
  repoOwner: string;
  branch: string;
  artifactBucket: s3.IBucket;
  codeStartConnectionArn: string;
  services?: Array<string>;
  testAccounts: Array<AWSTestAccount>;
}

export interface AWSTestAccount {
  name: string;
  codeBucket: s3.IBucket;
  crossAccountRole: iam.IRole;
}

export class CdkPipeline extends cdk.Construct {

  public pipeline: codepipeline.Pipeline;
  public buildProject: codebuild.PipelineProject;

  constructor(scope: cdk.Construct, id: string, props: CdkPipelineProps) {
    super(scope, id);

    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.repoName}_${props.branch}`,
      crossAccountKeys: true,
      artifactBucket: props.artifactBucket,
    });

    const sourceArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'Source',
      owner: props.repoOwner,
      repo: props.repoName,
      connectionArn: props.codeStartConnectionArn,
      output: sourceArtifact,
      triggerOnPush: true,
      codeBuildCloneOutput: true,
      branch: props.branch
    });

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    });

    this.buildProject = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      projectName: `${props.repoName}_${props.branch}`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: codebuild.ComputeType.SMALL
      }
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: this.buildProject,
      input: sourceArtifact,
      outputs: [buildOutput],
    });

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction]
    });

    let publishList: Array<{account: AWSTestAccount, service: string}> = [];
    props.testAccounts.forEach(account => {
      (props.services ? props.services : [props.repoName]).forEach(service => {
        publishList.push({account: account, service: service});
      });
    });

    this.pipeline.addStage({
      stageName: 'PubishArtifacts',
      actions: publishList.map(publishConfig => new codepipeline_actions.S3DeployAction({
        actionName: `Copy-Artifact_${publishConfig.account.name}-${publishConfig.service}`,
        bucket: publishConfig.account.codeBucket,
        input: buildOutput,
        objectKey: `${publishConfig.service}/${buildAction.variable('GIT_TAG')}-${buildAction.variable('BUILD_DATE')}-${buildAction.variable('GIT_SHORT_HASH')}.zip`,
        extract: false,
        role: publishConfig.account.crossAccountRole
      }))
    });
  }
}
