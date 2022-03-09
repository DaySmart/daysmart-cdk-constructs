import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { GetOriginRequest } from '../../../src/get-origin/get-origin-request';

describe('When an entity', () => {
    let request: GetOriginRequest;
    beforeEach(() => {
        request = given.get_getOrigin_domain_request_body();
    });
    it('calls get-origin with no url', async () => {
        request.url = undefined;
        const response = await when.we_invoke_getOrigin(request);
        const failure = { statusCode: 200, body: { origin: '' } };
        expect(response).toStrictEqual(failure);
    });

    it('calls get-origin with invalid url', async () => {
        request.url = 'asdfsfsfds';
        const response = await when.we_invoke_getOrigin(request);
        const failure = { statusCode: 200, body: { origin: '' } };
        expect(response).toStrictEqual(failure);
    });
    it('calls get-origin with no request', async () => {
        const response = await when.we_invoke_getOrigin(undefined);
        const failure = { statusCode: 200, body: { origin: '' } };
        expect(response).toStrictEqual(failure);
    });
});
