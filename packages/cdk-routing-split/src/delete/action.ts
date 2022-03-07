import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';
import { DeleteRequest } from './interface';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const action = async (request: DeleteRequest): Promise<void> => {
    const dynamo = getClient();
    const input: DocumentClient.DeleteItemInput = {
        TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
        Key: {
            PK: createPK(request.key, request.value),
        },
    };

    await dynamo.delete(input).promise();
};
