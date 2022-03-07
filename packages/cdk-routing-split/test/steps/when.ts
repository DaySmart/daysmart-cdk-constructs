import * as when from '../lib/we_invoke_lambda';
import { add as addHandler } from '../../src/add/handler';
import { deleteRecord as deleteHandler } from '../../src/delete/handler';
import { handler as updateHandler } from '../../src/update/handler';
import { handler as getOriginHandler } from '../../src/get-origin/handler';
import { APIGatewayEvent, Context } from 'aws-lambda';

export const we_invoke_add = async (body: any) => {
    const addEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(addHandler, addEvent, context);
};

export const we_invoke_delete = async (body: any) => {
    const deleteEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(deleteHandler, deleteEvent, context);
};

export const we_invoke_update = async () => {
    return await when.we_invoke_lambda(updateHandler, {} as APIGatewayEvent, {} as Context);
};

export const we_invoke_getOrigin = async () => {
    return await when.we_invoke_lambda(getOriginHandler, {} as APIGatewayEvent, {} as Context);
};
