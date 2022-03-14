import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';

import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const action = async (key: string, value: string, priority: number, origin: string): Promise<void> => {
    const dynamo = getClient();
    const input: DocumentClient.PutItemInput = {
        TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
        Item: {
            PK: createPK(key, value),
            Priority: priority,
            Origin: origin,
        },
    };
    await dynamo.put(input).promise();
};
