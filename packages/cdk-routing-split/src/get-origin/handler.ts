import { Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { HttpError } from '../http-error';
import { action } from './action';

export const handler = async (event: any, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(!!(event?.debug || process.env.DEBUG), context.awsRequestId);
        logger.debug('get-origin event', { event });

        return {
            statusCode: 200,
            body: action(),
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
