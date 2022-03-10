import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';
import { getClient } from '../../../src/shared/get-client';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Request as AddRequest } from '../../../src/add/request';
import { Request as DeleteRequest } from '../../../src/delete/request';
import { transformUrlSegment } from '../../../src/shared/transform-url-segment';

describe('When an api user', () => {
    let addRequest: AddRequest;
    let partitionKey: string;
    const dynamo = getClient();

    beforeEach(async () => {
        addRequest = given.an_add_request_body();
        const value = transformUrlSegment(addRequest.key, addRequest.value);
        partitionKey = createPK(addRequest.key, value);

        const input: DocumentClient.PutItemInput = {
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            Item: {
                PK: partitionKey,
                Priority: addRequest.priority,
                Origin: addRequest.origin,
            },
        };

        await dynamo.put(input).promise();
    });

    it('calls delete with valid fields', async () => {
        const deleteRequest: DeleteRequest = {
            key: addRequest.key,
            value: addRequest.value,
        };
        const expectedItem = {
            PK: partitionKey,
        };
        const expectedResponse = { statusCode: 200 };

        const deleteResponse = await when.we_invoke_delete(deleteRequest);

        expect(deleteResponse).toStrictEqual(expectedResponse);
        await then.item_does_not_exist_in_CdkRoutingSplitTable(expectedItem);
    });
});
