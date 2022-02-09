import { APIGatewayEvent, Context } from 'aws-lambda';
import { createLogger } from 'dsi-aws-boilerplate';
import { serializeError } from 'serialize-error';
import { action } from './action';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<any> => {
    let logger: any;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);
        logger.debug('delete event', { event });

        return action();
    } catch (err) {
        logger?.error('handler_error', { logError: serializeError(err) });
        throw new Error(JSON.stringify(err));
    }
};
