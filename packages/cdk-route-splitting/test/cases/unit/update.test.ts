import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { Request as UpdateRequest } from '../../../src/update/request';

describe('When an api user', () => {
    let requestBody: UpdateRequest;
    beforeEach(() => {
        requestBody = given.an_update_request_body();
    });
    const invalidKeyValues = [undefined, null, '', 'invalidKey'];
    it.each(invalidKeyValues)('calls update with invalid key field', async (caseArg) => {
        requestBody.key = caseArg;
        const expectedError = {
            statusCode: 400,
            body: 'Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, FirstPathSegment',
        };

        const response = await when.we_invoke_update(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidValues = [undefined, null, ''];
    it.each(invalidValues)('calls update with invalid value field', async (caseArg) => {
        requestBody.value = caseArg;
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_update(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidPriorityValues = [undefined, null, '', -1];
    it.each(invalidPriorityValues)('calls update with invalid priority field', async (caseArg) => {
        requestBody.priority = caseArg as any;
        const expectedError = { statusCode: 400, body: 'Field priority must be greater than or equal to 0.' };

        const response = await when.we_invoke_update(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidOriginValues = [undefined, null, '', 'cloud'];
    it.each(invalidOriginValues)('calls update with invalid origin field', async (caseArg) => {
        requestBody.origin = caseArg;
        const expectedError = { statusCode: 400, body: 'Field origin must be a valid url.' };

        const response = await when.we_invoke_update(requestBody);

        expect(response).toStrictEqual(expectedError);
    });
});
