import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest'
import { SharedKMSKey } from '../lib/SharedKMSKey';
import { arrayWith, objectLike, stringLike } from '@aws-cdk/assert';

const stack = new cdk.Stack();
    
new SharedKMSKey(stack, 'Key', {
    applicationGroup: 'app',
    productGroup: 'prod',
    organizationId: 'o-1234'
});

test('KMS key is enabled', () => {
    expect(stack).toHaveResource('AWS::KMS::Key', {
        Enabled: true
    });
});

test('Key policy grants decrypt to the organization', () => {
    expect(stack).toHaveResourceLike('AWS::KMS::Key', {
        KeyPolicy: {
            Statement: arrayWith(
                objectLike({
                    Action: 'kms:Decrypt',
                    Condition: {
                        StringEquals: {
                            'aws:PrincipalOrgID': 'o-1234'
                        }
                    },
                    Effect: "Allow",
                    Principal: {
                        AWS: "*"
                    }
                })
            )
        }
    });
});

test('alias created', () => {
    expect(stack).toHaveResourceLike('AWS::KMS::Alias', {
        AliasName: {
            'Fn::Join': [
                "",
                [
                    'alias/prod-app-shared-services-',
                    {
                        'Ref': 'AWS::Region'
                    }
                ]
            ]
        },
        TargetKeyId: {
            'Fn::GetAtt': [
                stringLike('Key*'),
                'Arn'
            ]
        }
    })
})