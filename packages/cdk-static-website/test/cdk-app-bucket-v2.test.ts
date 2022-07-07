import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { Template } from "aws-cdk-lib/assertions"
import { AppBucket } from '../lib/index'

test('AppBucket', () => {
    const stack = new Stack();
    new AppBucket(stack, 'AppBucket', {
        stage: 'test',
        appName: 'test2',
        dynamicEnvName: 'test3',
        projectName: 'test4',
        sharedServicesAccountId: '1234567'
    });
    expect(Template).toMatchSnapshot();
})