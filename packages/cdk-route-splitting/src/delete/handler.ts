import { APIGatewayEvent, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { HttpError } from './shared/http-error';
import { action } from './action';
import { Request } from './request';
import { validateKey, validateValue } from './shared/record-property-validators';
import { transformUrlSegment } from './shared/transform-url-segment';

export const del = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResultV2> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('delete event', { event });

        const request: Request = JSON.parse(event.body as string);
        validateRequest(request);

        const value = transformUrlSegment(request.key, request.value);

        await action(request.key, value);

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

const validateRequest = (request: Request): void => {
    validateKey(request?.key);
    validateValue(request?.value);
};
