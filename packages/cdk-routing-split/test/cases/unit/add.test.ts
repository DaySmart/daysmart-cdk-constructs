import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { Key } from '../../../src/add/interface';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.valid_api_request_body();
    });

    it('calls add with invalid key field', async () => {
        requestBody['key'] = 'invalidKey';
        const expectedError = { statusCode: 400, body: `Field key is invalid. Valid values are: ${Object.values(Key)}` };

        const response = await when.we_invoke_add(JSON.stringify(requestBody));

        expect(response).toStrictEqual(expectedError);
    });

    it('calls add with missing value field', async () => {
        requestBody['value'] = '';
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_add(JSON.stringify(requestBody));

        expect(response).toStrictEqual(expectedError);
    });
});
