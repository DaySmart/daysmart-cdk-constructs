import { Context } from 'aws-lambda';
import { createLogger, Logger, serializeError } from '@daysmart/aws-lambda-logger';
import { action } from './action';
type CloudfrontEvent = { body: any };
export const handler = async (event: CloudfrontEvent, context: Context): Promise<any> => {
    let logger!: Logger;

    try {
        logger = createLogger(process.env.DEBUG === 'true', context.awsRequestId);

        logger.debug('get-origin event', { event });

        const { url } = event?.body;
        let origin = await action(process.env.CDK_ROUTING_SPLIT_TABLE, url);
        if (!origin) {
            origin = '';
        }
        return {
            statusCode: 200,
            body: { origin: origin },
        };
    } catch (error: any) {
        logger?.error('handler_error', { logError: serializeError(error) });
        return {
            statusCode: 200,
            body: { origin: '' },
        };
    }
};
