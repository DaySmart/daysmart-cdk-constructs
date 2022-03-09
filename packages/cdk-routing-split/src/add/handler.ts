import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../http-error';
import { AddRequest } from './add-request';
import { DomainSegment } from '../shared/url-key.enum';
import { transformHostnameSegment } from '../shared/transform-hostname-segment';

export const add = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('add event', { event });

        const request: AddRequest = JSON.parse(event.body as string);

        validateRequest(request);

        const possibleDomain = transformHostnameSegment(request.key, request.value);

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
    const keyList: string[] = Object.keys(DomainSegment);

    if (!keyList?.includes(request?.key)) {
        throw new HttpError(400, `Field key is invalid. Valid values are: ${keyList.join(', ')}`);
    }

    if (!request?.value?.length) {
        throw new HttpError(400, 'Field value is required.');
    }
};
