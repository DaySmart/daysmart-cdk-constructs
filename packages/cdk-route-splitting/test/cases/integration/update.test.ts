import * as when from '../../steps/when';
import * as given from '../../steps/given';
import * as then from '../../steps/then';
import { createPK } from '../../../src/shared/make-keys';
import { Request as AddRequest } from '../../../src/add/request';
import { Request as UpdateRequest } from '../../../src/update/request';
import { Chance } from 'chance';
import { transformUrlSegment } from '../../../src/shared/transform-url-segment';
const chance = new Chance();

describe('When an api user', () => {
    let addRequest: AddRequest;
    let updateRequest: UpdateRequest;
    beforeEach(() => {
        addRequest = given.an_add_request_body();

        updateRequest = {
            key: addRequest.key,
            value: addRequest.value,
            priority: chance.integer({ min: 0 }),
            origin: given.a_simple_url(true),
        };
    });

    it('calls update with no matching record in table', async () => {
        const expectedValue = transformUrlSegment(updateRequest.key, updateRequest.value);
        const partitionKey = createPK(updateRequest.key, expectedValue);
        const expectedError = { statusCode: 400, body: 'Origin record not found.' };

        const response = await when.we_invoke_update(updateRequest);

        await then.item_does_not_exist_in_DynamoDbTable(partitionKey);
        expect(response).toStrictEqual(expectedError);
    });

    it('calls update with valid fields', async () => {
        await when.we_invoke_add(addRequest);

        const expectedResponse = { statusCode: 200 };
        const expectedValue = transformUrlSegment(updateRequest.key, updateRequest.value);
        const expectedItem = {
            PK: createPK(updateRequest.key, expectedValue),
            Priority: updateRequest.priority,
            Origin: updateRequest.origin,
        };

        const updateResponse = await when.we_invoke_update(updateRequest);

        expect(updateResponse).toStrictEqual(expectedResponse);
        await then.item_exists_in_DynamoDbTable(expectedItem.PK);
    });
});
