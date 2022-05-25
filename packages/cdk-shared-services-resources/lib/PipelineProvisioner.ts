import * as cdk from 'aws-cdk-lib/core';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for a CodeBuild project to provision CodePipeline pipelines for all branches in a given repo
 * 
 */
export interface PipelineProvisionerProps {
    /**
     * Owner of the repository
     */
    owner: string;

    /**
     * Name of the repository
     */
    repo: string;
}

/**
 * CodeBuild project with the necessary permissions to provision a CodePipeline for each branch
 */
export class PipelineProvisioner extends Construct {
    readonly buildProject: codebuild.IProject;

    constructor(scope: Construct, id: string, props: PipelineProvisionerProps) {
        super(scope, id);

        const role = new iam.Role(this, 'Role', {
            roleName: `pipeline-provisioner-role-${props.repo}`,
            description: 'Enables the pipeline provisioner CodeBuild projects to provision new CodePipelines',
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        });

        role.attachInlinePolicy(new iam.Policy(this, 'Policy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'cloudformation:*',
                        'codepipeline:*',
                        'codebuild:*',
                        'codedeploy:*',
                        'codestar:*',
                        'codestar-connections:*',
                        's3:List*',
                        's3:Get*',
                        's3:Describe',
                        'iam:Attach*',
                        'iam:Create*',
                        'iam:Get*',
                        'iam:List*',
                        'iam:PassRole',
                        'iam:Put*',
                        'lambda:*'
                    ],
                    resources: ['*']
                })
            ]
        }));

        this.buildProject = new codebuild.Project(this, 'Project', {
            projectName: `${props.repo}-pipeline-provisioner`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                computeType: codebuild.ComputeType.SMALL
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            nodejs: 14
                        },
                        commands: [
                            'cd infrastructure/pipeline',
                            'npm i'
                        ]
                    },
                    build: {
                        commands: [
                            'npx cdk deploy --require-approval never'
                        ]
                    }
                }
            }),
            concurrentBuildLimit: 1,
            source: codebuild.Source.bitBucket({
                owner: props.owner,
                repo: props.repo,
                webhook: true,
                webhookFilters: [
                    codebuild.FilterGroup.inEventOf(
                        codebuild.EventAction.PUSH
                    )
                ]
            }),
            role: role,
            badge: false
        })
    }
}