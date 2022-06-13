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
  secondarySourceAction?: codepipeline.IAction;
}

export interface AWSTestAccount {
  name: string;
  codeBucket: s3.IBucket;
  crossAccountRole: iam.IRole;
}

export class CdkPipeline extends cdk.Construct {

  public pipeline: codepipeline.Pipeline;
  public buildProject: codebuild.PipelineProject;
  public buildAction: codepipeline_actions.CodeBuildAction;
  public buildOutput: codepipeline.Artifact;
  public sourceAction: codepipeline_actions.CodeStarConnectionsSourceAction;
  public sourceArtifact: codepipeline.Artifact;

  constructor(scope: cdk.Construct, id: string, props: CdkPipelineProps) {
    super(scope, id);

    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.repoName}_${props.branch}`,
      crossAccountKeys: true,
      artifactBucket: props.artifactBucket,
    });

    this.sourceArtifact = new codepipeline.Artifact();

    this.sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'Source',
      owner: props.repoOwner,
      repo: props.repoName,
      connectionArn: props.codeStartConnectionArn,
      output: this.sourceArtifact,
      triggerOnPush: true,
      codeBuildCloneOutput: true,
      branch: props.branch
    });

    this.pipeline.addStage({
      stageName: 'Source',
      actions: props.secondarySourceAction ? [this.sourceAction, props.secondarySourceAction] : [this.sourceAction]
    });

    this.buildProject = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      projectName: `${props.repoName}_${props.branch}`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: codebuild.ComputeType.SMALL
      }
    });

    this.buildOutput = new codepipeline.Artifact();
    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: this.buildProject,
      input: this.sourceArtifact,
      outputs: [this.buildOutput],
    });

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [this.buildAction]
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
        input: this.buildOutput,
        objectKey: `${publishConfig.service}/${this.buildAction.variable('GIT_TAG')}-${this.buildAction.variable('BUILD_DATE')}-${this.buildAction.variable('GIT_SHORT_HASH')}.zip`,
        extract: false,
        role: publishConfig.account.crossAccountRole
      }))
    });
  }
}
