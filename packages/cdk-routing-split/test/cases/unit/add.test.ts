import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { Key } from '../../../src/add/interface';

describe('When an api user', () => {
    let body: any;

    beforeEach(() => {
        body = given.valid_api_endpoint_body();
    });

    it('calls add with invalid key field', async () => {
        body['key'] = 'invalidKey';
        const expectedError = { statusCode: 400, body: `Field key is invalid. Valid values are: ${Object.values(Key)}` };

        const response = await when.we_invoke_add(JSON.stringify(body));

        expect(response).toStrictEqual(expectedError);
    });

    it('calls add with missing value field', async () => {
        body['value'] = '';
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_add(JSON.stringify(body));

        expect(response).toStrictEqual(expectedError);
    });
});
