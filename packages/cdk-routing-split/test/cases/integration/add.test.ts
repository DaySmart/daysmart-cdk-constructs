import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';
import { transformHostnameSegment } from '../../../src/shared/transform-hostname-segment';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.an_add_request_body();
    });

    it('calls add with valid fields', async () => {
        const expectedResponse = { statusCode: 200 };
        const value = transformHostnameSegment(requestBody.key, requestBody.value);
        const expectedItem = {
            PK: createPK(requestBody.key, value),
            Priority: requestBody.priority,
            Origin: requestBody.origin,
        };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedResponse);
        await then.item_exists_in_CdkRoutingSplitTable(expectedItem);
    });
});
