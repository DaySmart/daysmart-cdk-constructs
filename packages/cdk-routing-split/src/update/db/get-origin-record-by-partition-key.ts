export const getOriginRecordByPartitionKey = async (dynamo: any, pk: string) => {
    const response = await dynamo
        .get({
            TableName: process.env.CDK_ROUTING_SPLIT_TABLE,
            Key: {
                PK: pk
            }
        }).promise();

    return response.Item;
};