import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';
import { UrlSegment } from '../shared/url-segment.enum';

const makeKey = (urlKey: UrlSegment, part: string) => ({ PK: createPK(urlKey, `${part}`) } as DocumentClient.Key);
export const action = async (
    tableName: string,
    domain: string,
    subdomain: string,
    pathSegment: string,
    queryStrings: string[]
): Promise<string> => {
    const keys: DocumentClient.KeyList = [];

    keys.push(makeKey(UrlSegment.Domain, domain));

    if (subdomain) {
        keys.push(makeKey(UrlSegment.Subdomain, subdomain));
    }

    if (pathSegment) {
        keys.push(makeKey(UrlSegment.FirstPathSegment, pathSegment));
    }

    queryStrings.forEach((q) => {
        keys.push(makeKey(UrlSegment.QueryStringParam, q));
    });

    const dynamo = getClient();
    const input: DocumentClient.BatchGetItemInput = {
        RequestItems: {
            [tableName]: {
                Keys: keys,
            },
        },
    };
    const batchResponse = await dynamo.batchGet(input).promise();
    const response = batchResponse.Responses[tableName];
    return response.sort((a, b) => +a.Priority - +b.Priority)[0]?.Origin;
};
