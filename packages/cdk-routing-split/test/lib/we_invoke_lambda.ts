import { APIGatewayEvent, Context } from 'aws-lambda';

export const we_invoke_lambda = async (
    handler: (event: APIGatewayEvent, context: Context, error: any) => any,
    event: APIGatewayEvent,
    context: Context
) => await handler(event, context, (error: any, result?: any) => new Promise((resolve) => resolve(result ? result : error)));
