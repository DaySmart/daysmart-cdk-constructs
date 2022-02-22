import { AddRequest } from '../../src/add/interface';
import { getClient } from '../../src/shared/get-client';
import { createPK } from '../../src/shared/make-keys';

export const item_exists_in_CdkRoutingSplitTable = async (request: AddRequest) => {
    const pk: string = createPK(request.key, request.value);

    console.log(`looking for item with PK [${pk}] in table [${process.env.CDK_ROUTING_SPLIT_TABLE}]`);

    const dynamo = getClient();
    const response = await dynamo
        .query({
            TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
            ExpressionAttributeValues: {
                ':pk': pk,
            },
            KeyConditionExpression: '#PK = :pk',
            ExpressionAttributeNames: {
                '#PK': 'PK',
            },
        })
        .promise();

    expect(response).toStrictEqual({ PK: pk, Priority: request.priority, Origin: request.origin });
};
