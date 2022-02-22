import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../http-error';
import { AddRequest, Key } from './interface';

export const add = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('add event', { event });

        const body = JSON.parse(event.body as string);
        validateEvent(body);

        const request: AddRequest = body;
        return {
            statusCode: 200,
            body: await action(request),
        };
    } catch (error: any) {
        logger?.error('handler_error', { logError: serializeError(error) });

        if (error instanceof HttpError) {
            return { statusCode: error.statusCode, body: error.message };
        } else {
            return { statusCode: 500, body: error.message };
        }
    }
};

const validateEvent = (body: any): void => {
    const keyList: string[] = Object.values(Key);

    if (!keyList?.includes(body.key)) {
        throw new HttpError(400, `Field key is invalid. Valid values are: ${keyList}`);
    }

    if (!body.value?.length) {
        throw new HttpError(400, 'Field value is required.');
    }
};
