import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.get_delete_request_body();
    });

    it('calls delete with invalid key field', async () => {
        requestBody['key'] = 'invalidKey';
        const expectedError = {
            statusCode: 400,
            body: `Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, PathStartsWith`,
        };

        const response = await when.we_invoke_delete(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    it('calls delete with missing value field', async () => {
        requestBody['value'] = '';
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_delete(requestBody);

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
