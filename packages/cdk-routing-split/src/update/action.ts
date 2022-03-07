import { getClient } from "../shared/get-client";
import { createPK } from '../shared/make-keys';
import { UpdateRequest } from "./interface";
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { HttpError } from "../http-error";
import { getOriginRecordByPartitionKey } from "./db/get-origin-record-by-partition-key";

export const action = async(request: UpdateRequest): Promise<void> => {
    const partitionKey: string = createPK(request.key, request.value);
    const originRecord = await getOriginRecordByPartitionKey(partitionKey);

    if(!originRecord) {
        throw new HttpError(400, 'Origin record not found.');
    }

    const dynamo = getClient();
    const params: DocumentClient.UpdateItemInput = {
        TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
        Key: {
            PK: partitionKey
        },
        UpdateExpression: `SET Origin =:origin,
        Priority =:priority`,
        ExpressionAttributeValues: {
            ':origin': request.origin,
            ':priority': request.priority
        }
    };

    await dynamo.update(params).promise();
};
