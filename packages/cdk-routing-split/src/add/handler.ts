import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../http-error';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('add event', { event });

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
