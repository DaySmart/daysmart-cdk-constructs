import * as cdk from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { PipelineProvisioner} from '../lib/index'

test('App Cloudfront', () => {
    const stack = new cdk.Stack(undefined, 'stack', {
        env: {
            account: '123456',
            region: 'us-east-1'
        }
    });
    new PipelineProvisioner(stack, 'AppCloudfront', {
        owner: 'tester',
        repo: 'cdk'
    });

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template, null, 2));

    expect(Template.fromStack(stack)).toMatchSnapshot();
})