import { APIGatewayEvent, Context, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
import { HttpError } from '../shared/http-error';
import { Request as AddRequest } from './request';
import { transformUrlSegment } from '../shared/transform-url-segment';
import { validateKey, validateOrigin, validatePriority, validateValue } from '../shared/record-property-validators';

export const add = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResultV2> => {
    let logger: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('add event', { event });

        const request: AddRequest = JSON.parse(event.body as string);
        validateRequest(request, logger);

        const value = transformUrlSegment(request.key, request.value);

        await action(request.key, value, request.priority, request.origin);

        return { statusCode: 200 };
    } catch (error) {
        logger?.error('handler_error', { logError: serializeError(error) });

        if (error instanceof HttpError) {
            return { statusCode: error.statusCode, body: error.message };
        } else {
            return { statusCode: 500, body: error.message };
        }
    }
};

const validateRequest = (request: AddRequest, logger: Logger): void => {
    validateKey(request?.key);
    validateValue(request?.value);
    validatePriority(request?.priority);
    validateOrigin(request?.origin, logger);
};
