import { getClient } from '../../src/shared/get-client';

export const item_exists_in_CdkRoutingSplitTable = async (pk: string) => {
    console.log(`looking for item with PK [${pk}] in table [${process.env.DSI_ROUTING_SPLIT_TABLE}]`);

    const dynamo = getClient();
    const response = await dynamo
        .get({
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            Key: {
                PK: pk,
            },
        })

        .promise();

    expect(response.Item).toBeDefined();
};
export const item_does_not_exist_in_CdkRoutingSplitTable = async (pk: string) => {
    console.log(`looking for item with PK [${pk}] in table [${process.env.DSI_ROUTING_SPLIT_TABLE}]`);

    const dynamo = getClient();
    const response = await dynamo
        .get({
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            Key: {
                PK: pk,
            },
        })
        .promise();

    expect(response.Item).toBeUndefined();
};
