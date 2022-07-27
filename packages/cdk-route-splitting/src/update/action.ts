import { getClient } from './shared/get-client';
import { createPK } from './shared/make-keys';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { HttpError } from './shared/http-error';

export const action = async (key: string, value: string, priority: number, origin: string): Promise<void> => {
    const dynamo = getClient();
    const partitionKey: string = createPK(key, value);
    const originRecord = await dynamo
        .get({
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            Key: {
                PK: partitionKey,
            },
        })
        .promise();

    if (!originRecord?.Item) {
        throw new HttpError(400, 'Origin record not found.');
    }

    const params: DocumentClient.UpdateItemInput = {
        TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
        Key: {
            PK: partitionKey,
        },
        UpdateExpression: `SET Origin =:origin,
        Priority =:priority`,
        ExpressionAttributeValues: {
            ':origin': origin,
            ':priority': priority,
        },
    };

    await dynamo.update(params).promise();
};
