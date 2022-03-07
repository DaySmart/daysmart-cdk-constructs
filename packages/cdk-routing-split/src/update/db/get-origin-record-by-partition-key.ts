import { getClient } from "../../shared/get-client";

export const getOriginRecordByPartitionKey = async (pk: string) => {
    const dynamo = getClient();
    const response = await dynamo
        .get({
            TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
            Key: {
                PK: pk
            }
        }).promise();

    return response.Item;
};