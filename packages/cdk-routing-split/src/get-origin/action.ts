import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { getClient } from '../shared/get-client';
import { createPK } from '../shared/make-keys';
import { DomainSegment } from '../shared/url-key.enum';
import { getDomainData } from '../shared/get-domain-data';
const makeKey = (urlKey: DomainSegment, part: string) => ({ PK: createPK(urlKey, `${part}`) } as DocumentClient.Key);
export const action = async (tableName: string, url: string): Promise<string> => {
    const { domain, subdomain, pathname, queryStrings } = getDomainData(url);
    const keys: DocumentClient.KeyList = [];

    keys.push(makeKey(DomainSegment.Domain, domain));

    if (subdomain) {
        keys.push(makeKey(DomainSegment.Subdomain, subdomain));
    }

    if (pathname) {
        keys.push(makeKey(DomainSegment.PathStartsWith, pathname));
    }

    queryStrings.forEach((q) => {
        keys.push(makeKey(DomainSegment.QueryStringParam, q));
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
