import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { Request as DeleteRequest } from '../../../src/delete/request';

describe('When an api user', () => {
    let request: DeleteRequest;
    beforeEach(() => {
        request = given.a_delete_request_body();
    });

    const invalidKeyValues = [undefined, null, '', 'invalidKey'];
    it.each(invalidKeyValues)('calls delete with invalid key field', async (caseArg) => {
        request.key = caseArg;
        const expectedResponse = {
            statusCode: 400,
            body: 'Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, FirstPathSegment',
        };

        const response = await when.we_invoke_delete(request);

        expect(response).toStrictEqual(expectedResponse);
    });

    const invalidValues = [undefined, null, ''];
    it.each(invalidValues)('calls delete with invalid value field', async (caseArg) => {
        request.value = caseArg;
        const expectedResponse = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_delete(request);

        expect(response).toStrictEqual(expectedResponse);
    });
});
