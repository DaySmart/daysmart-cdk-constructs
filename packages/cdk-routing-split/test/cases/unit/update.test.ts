import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.get_update_request_body();
    });

    it('calls update with invalid key field', async () => {
        requestBody['key'] = 'invalidKey';
        const expectedError = {
            statusCode: 400,
            body: 'Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, PathStartsWith',
        };
        const response = await when.we_invoke_update(requestBody);
        expect(response).toStrictEqual(expectedError);
    });

    it('calls update with missing value field', async () => {
        requestBody['value'] = '';
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_update(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    it('calls update with no matching record in table', async () => {
        const partitionKey: string = createPK(requestBody.key, requestBody.value);
        const expectedError = { statusCode: 400, body: 'Origin record not found.'};

        const response = await when.we_invoke_update(requestBody);

        await then.item_does_not_exist_in_CdkRoutingSplitTable(partitionKey);
        expect(response).toStrictEqual(expectedError);
    });
});