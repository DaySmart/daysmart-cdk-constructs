import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const action = async (key: string, value: string): Promise<void> => {
    const dynamo = getClient();
    const input: DocumentClient.DeleteItemInput = {
        TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
        Key: {
            PK: createPK(key, value),
        },
    };

    await dynamo.delete(input).promise();
};
