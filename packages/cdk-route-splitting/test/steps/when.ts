import * as when from '../lib/we_invoke_lambda';
import { add as addHandler } from '../../src/add/handler';
import { handler as deleteHandler } from '../../src/delete/handler';
import { handler as updateHandler } from '../../src/update/handler';
import { handler as getOriginHandler } from '../../src/get-origin/handler';
import { CloudFrontRequestEvent, Context } from 'aws-lambda';
import { Request as AddRequest } from '../../src/add/request';
import { Request as DeleteRequest } from '../../src/delete/request';
import { Request as UpdateRequest } from '../../src/update/request';

export const we_invoke_add = async (body: AddRequest) => {
    console.log('add - body', body);
    const addEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(addHandler, addEvent, context);
};

export const we_invoke_delete = async (body: DeleteRequest) => {
    const deleteEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(deleteHandler, deleteEvent, context);
};

export const we_invoke_update = async (body: UpdateRequest) => {
    const updateEvent: any = {
        body: JSON.stringify(body),
    };
    const context: any = {};

    return await when.we_invoke_lambda(updateHandler, updateEvent, context);
};

export const we_invoke_getOrigin = async (request: any) => {
    return await when.we_invoke_cloudfront(getOriginHandler, request as CloudFrontRequestEvent, {} as Context);
};
