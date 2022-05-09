import { Stack } from '@aws-cdk/core';
import { CdkEcsAlb } from '../lib/index';
import '@aws-cdk/assert/jest'
import { Template } from "aws-cdk-lib/assertions"

const stack = new Stack();
new CdkEcsAlb(stack, "CdkEcsAlb", {
    appName: 'test',
    certificateArn: '123456',
    clusterName: 'cluster',
    healthCheckPath: '',
    repositoryName: 'CDK',
    securityGroupId: '987654',
    stage: 'test',
    taskDefinitionArn: 'asdfg',
    vpcId: 'abcde'
}) 

// const template = Template.fromStack(stack)
console.log(JSON.stringify(template, null, 2))

test("cert set", () => {
    expect(stack).toHaveProperty("", {

    })
})

// test('Cert Set', () => {
//     const stack = new Stack(undefined, 'stack', {
//         env: {
//             account: '12345',
//             region: 'us-east-1'
//         }
//     });

//     new CdkEcsAlb(stack, 'CdkEcsAlb', {
//         appName: 'test',
//         certificateArn: '123456',
//         clusterName: 'cluster',
//         healthCheckPath: '',
//         repositoryName: 'CDK',
//         securityGroupId: '987654',
//         stage: 'test',
//         taskDefinitionArn: 'asdfg',
//         vpcId: 'abcde'
//     });
//     const template = Template.fromStack(stack)
//     console.log(JSON.stringify(template, null, 2))
// })
