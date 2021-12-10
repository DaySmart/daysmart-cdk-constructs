import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { AppBucket } from '../lib/index';

test("AppBucket", () => {
    const stack = new Stack();
    new AppBucket(stack, 'AppBucket', {
        stage: 'test',
        appName: 'test2',
        dynamicEnvName: 'test3',
        projectName: 'test4',
        sharedServicesAccountId: '1234567'
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
})
