import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../http-error';
import { DeleteRequest, Key } from './interface';

export const deleteRecord = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('delete event', { event });

        const request: DeleteRequest = JSON.parse(event.body as string);
        validateRequest(request);

        await action(request);

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

const validateRequest = (request: DeleteRequest): void => {
    const keyList: string[] = Object.values(Key);

    if (!keyList?.includes(request.key)) {
        throw new HttpError(400, `Field key is invalid. Valid values are: ${keyList.join(', ')}`);
    }

    if (!request.value?.length) {
        throw new HttpError(400, 'Field value is required.');
    }
};
