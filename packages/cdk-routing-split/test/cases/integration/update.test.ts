import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';
import { getClient } from '../../../src/shared/get-client';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

describe('When an api user', () => {
    let request: any;
    const dynamo = getClient();

    beforeAll(async () => {
        const key = given.key();
        const value = given.value();

        request = {
            key: key,
            value: value,
            priority: 1,
            origin: 'Cloud'
        };

        const input: DocumentClient.PutItemInput = {
            TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
            Item: {
                PK: createPK(request.key, request.value),
                Priority: request.priority,
                Origin: request.origin,
            },
        };

        await dynamo.put(input).promise();
    });

    it('calls update with valid fields', async () => {
        const priority = 2;
        const origin = 'Winform';
        const expectedResponse = { statusCode: 200 };
        const expectedItem = {
            pk: createPK(request.key, request.value),
            priority: priority,
            origin: origin
        };

        const updateRequestBody = {
            key: request.key,
            value: request.value,
            priority: priority,
            origin: origin
        };

        const updateResponse = when.we_invoke_update(updateRequestBody);

        expect(updateResponse).toStrictEqual(expectedResponse);
        await then.item_exists_in_CdkRoutingSplitTable(expectedItem);
    });
});
