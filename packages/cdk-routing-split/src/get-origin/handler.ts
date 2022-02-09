import { Context } from 'aws-lambda';
import { createLogger } from 'dsi-aws-boilerplate';
import { serializeError } from 'serialize-error';
import { action } from './action';

export const handler = async (event: any, context: Context): Promise<any> => {
    let logger: any;

    try {
        logger = createLogger(!!(event?.debug || process.env.DEBUG), context.awsRequestId);
        logger.debug('get-origin event', { event });

        return action();
    } catch (err) {
        logger?.error('handler_error', { logError: serializeError(err) });
        throw new Error(JSON.stringify(err));
    }
};
