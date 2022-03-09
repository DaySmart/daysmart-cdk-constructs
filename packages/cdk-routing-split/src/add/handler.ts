import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../http-error';
import { AddRequest } from './add-request';
import { UrlKey } from '../shared/url-key.enum';
import { getDomainData } from '../shared/get-domain-data';

export const add = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('add event', { event });

        const request: AddRequest = JSON.parse(event.body as string);

        validateRequest(request);

        //const { key, value, priority, origin } = request;
        let possibleDomain = request.value;

        if (request.key === UrlKey.Domain) {
            const domainData = getDomainData(possibleDomain);
            possibleDomain = domainData.domain;
        } else if (request.key === UrlKey.Subdomain) {
            const domainData = getDomainData(`http://${request.value}.domain.com`); // can't pass just a subdomain down
            possibleDomain = domainData.subdomain;
        }

        await action(request.key, possibleDomain, request.priority, request.origin);

        return { statusCode: 200 };
    } catch (error: any) {
        logger?.error('handler_error', { logError: serializeError(error) });

        if (error instanceof HttpError) {
            return { statusCode: error.statusCode, body: error.message };
        } else {
            return { statusCode: 500, body: error.message };
        }
    }
};

const validateRequest = (request: AddRequest): void => {
    const keyList: string[] = Object.keys(UrlKey);

    if (!keyList?.includes(request?.key)) {
        throw new HttpError(400, `Field key is invalid. Valid values are: ${keyList.join(', ')}`);
    }

    if (!request?.value?.length) {
        throw new HttpError(400, 'Field value is required.');
    }
};
