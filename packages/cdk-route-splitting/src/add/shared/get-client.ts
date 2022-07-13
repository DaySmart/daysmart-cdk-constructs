import { DynamoDB } from 'aws-sdk';

let dynamo: DynamoDB.DocumentClient;

export const getClient = () => {
    if (!dynamo) {
        dynamo = new DynamoDB.DocumentClient({
            service: new DynamoDB({
                region: process.env.DSI_AWS_REGION,
            }),
        });
    }

    return dynamo;
};
