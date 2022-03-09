import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.get_delete_request_body();
    });

    const invalidKeyValues = [undefined, null, '', 'invalidKey'];
    it.each(invalidKeyValues)('calls delete with invalid key field', async (caseArg) => {
        requestBody['key'] = caseArg;
        const expectedError = {
            statusCode: 400,
            body: 'Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, FirstPathSegment',
        };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidValues = [undefined, null, ''];
    it.each(invalidValues)('calls delete with invalid value field', async (caseArg) => {
        requestBody['value'] = caseArg;
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    it('calls delete with no matching record in table', async () => {
        requestBody = given.get_delete_request_body();
        const expectedResponse = { statusCode: 200 };
        const expectedItem = {
            PK: createPK(requestBody.key, requestBody.value),
        };

        const response = await when.we_invoke_delete(requestBody);

        expect(response).toStrictEqual(expectedResponse);
        await then.item_not_in_CdkRoutingSplitTable(expectedItem);
    });
});
