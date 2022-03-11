import { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontRequestResult, CloudFrontResponseResult, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { getPathnameSegment, getQueryStrings } from '../shared/get-domain-data';
import { parse } from 'tldts';

export const handler = async (
    event: CloudFrontRequestEvent,
    context: Context
): Promise<CloudFrontRequestResult | CloudFrontResponseResult> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);

        logger.debug('get-origin event', { event });

        const request: CloudFrontRequest = event.Records[0].cf.request;
        const { domain, subdomain } = parse(request.origin.custom.domainName);
        const pathname = getPathnameSegment(request.uri);
        const queryStrings = getQueryStrings(request.querystring);
        console.log('jest-', subdomain, domain, pathname, queryStrings);
        const origin = await action(process.env.DSI_ROUTING_SPLIT_TABLE, domain, subdomain, pathname, queryStrings);
        if (!origin) {
            return createFailureRedirectResponse();
        }

        request.origin = {
            custom: {
                domainName: origin,
                port: 443,
                protocol: 'https',
                path: '',
                sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                readTimeout: 5,
                keepaliveTimeout: 5,
                customHeaders: {},
            },
        };
        request.headers['host'] = [{ key: 'host', value: origin }];

        return request;
    } catch (error: any) {
        logger?.error('handler_error', { logError: serializeError(error) });
        return createFailureRedirectResponse();
    }
};

const createFailureRedirectResponse = (): CloudFrontResponseResult => ({
    status: '404',
    statusDescription: 'Not Found',
    headers: {
        location: [
            {
                key: 'Location',
                value: process.env.DSI_ORIGIN_NOT_FOUND_URL,
            },
        ],
    },
});
