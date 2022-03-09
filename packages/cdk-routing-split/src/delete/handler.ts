import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { HttpError } from '../shared/http-error';
import { action } from './action';
import { DeleteRequest } from './interface';
import { validateKey, validateValue } from '../shared/record-property-validators';

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
    validateKey(request?.key);
    validateValue(request?.value);
};
