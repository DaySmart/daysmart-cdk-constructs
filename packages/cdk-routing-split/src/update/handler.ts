import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { HttpError } from '../shared/http-error';
import { validateKey, validateOrigin, validatePriority, validateValue } from '../shared/record-property-validators';
import { transformUrlSegment } from '../shared/transform-url-segment';
import { action } from './action';
import { Request } from './request';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('update event', { event });

        const request: Request = JSON.parse(event.body as string);
        validateRequest(request, logger);

        const value = transformUrlSegment(request.key, request.value);

        await action(request.key, value, request.priority, request.origin);

        return {
            statusCode: 200,
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

const validateRequest = (request: Request, logger: Logger): void => {
    validateKey(request?.key);
    validateValue(request?.value);
    validatePriority(request?.priority);
    validateOrigin(request?.origin, logger);
};
