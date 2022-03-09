import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';

describe('When an api user', () => {
    let addRequestBody: any;

    beforeEach(() => {
        addRequestBody = given.an_add_request_body();
    });

    it('calls delete with valid fields', async () => {
        await when.we_invoke_add(addRequestBody);
        const expectedResponse = { statusCode: 200 };
        const expectedItem = {
            PK: createPK(addRequestBody.key, addRequestBody.value),
        };
        const deleteRequestBody = {
            key: addRequestBody['key'],
            value: addRequestBody['value'],
        };

        const deleteResponse = await when.we_invoke_delete(deleteRequestBody);

        expect(deleteResponse).toStrictEqual(expectedResponse);
        await then.item_not_in_CdkRoutingSplitTable(expectedItem);
    });
});
