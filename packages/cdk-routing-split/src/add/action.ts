import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';
import { AddRequest } from './interface';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const action = async (request: AddRequest): Promise<void> => {
    const dynamo = getClient();
    const input: DocumentClient.PutItemInput = {
        TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
        Item: {
            PK: createPK(request.key, request.value),
            Priority: request.priority,
            Origin: request.origin,
        },
    };

    await dynamo.put(input).promise();
};
