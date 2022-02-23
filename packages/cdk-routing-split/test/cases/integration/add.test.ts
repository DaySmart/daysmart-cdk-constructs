import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.valid_api_request_body();
    });

    it('calls add with valid fields', async () => {
        const expectedResponse = { statusCode: 200, body: 'Success' };
        const expectedItem = {
            PK: createPK(requestBody.key, requestBody.value),
            Priority: requestBody.priority,
            Origin: requestBody.origin,
        };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedResponse);
        await then.item_exists_in_CdkRoutingSplitTable(expectedItem);
    });
});
