import * as when from '../lib/we_invoke_lambda';
import { add as addHandler } from '../../src/add/handler';
import { handler as deleteHandler } from '../../src/delete/handler';
import { handler as updateHandler } from '../../src/update/handler';
import { handler as getOriginHandler } from '../../src/get-origin/handler';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { AddRequest } from '../../src/add/add-request';

export const we_invoke_add = async (body: AddRequest) => {
    const addEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(addHandler, addEvent, context);
};

export const we_invoke_delete = async () => {
    return await when.we_invoke_lambda(deleteHandler, {} as APIGatewayEvent, {} as Context);
};

export const we_invoke_update = async (body: any) => {
    const updateEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(updateHandler, updateEvent, context);
};

export const we_invoke_getOrigin = async (request: any) => {
    return await when.we_invoke_lambda(getOriginHandler, { body: request } as APIGatewayEvent, {} as Context);
};
