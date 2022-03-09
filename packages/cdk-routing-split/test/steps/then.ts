import { getClient } from '../../src/shared/get-client';

export const item_exists_in_CdkRoutingSplitTable = async (expectedItem: any) => {
    console.log(`looking for item with PK [${expectedItem.PK}] in table [${process.env.DSI_ROUTING_SPLIT_TABLE}]`);

    const dynamo = getClient();
    const response = await dynamo
        .query({
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            ExpressionAttributeValues: {
                ':pk': expectedItem.PK,
            },
            KeyConditionExpression: '#PK = :pk',
            ExpressionAttributeNames: {
                '#PK': 'PK',
            },
        })
        .promise();

    expect(response.Items.length).toEqual(1);
    expect(response.Items[0]).toStrictEqual(expectedItem);
};

export const item_does_not_exist_in_CdkRoutingSplitTable = async (expectedItem: any) => {
    console.log(`looking for item with PK [${expectedItem.PK}] in table [${process.env.DSI_ROUTING_SPLIT_TABLE}]`);

    const dynamo = getClient();
    const response = await dynamo
        .query({
            TableName: process.env.DSI_ROUTING_SPLIT_TABLE,
            ExpressionAttributeValues: {
                ':pk': expectedItem.PK,
            },
            KeyConditionExpression: '#PK = :pk',
            ExpressionAttributeNames: {
                '#PK': 'PK',
            },
        })
        .promise();

    expect(response.Items.length).toEqual(0);
};
