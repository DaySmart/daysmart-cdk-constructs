import * as when from '../../steps/when';
import * as given from '../../steps/given';

describe('When an api user', () => {
    let requestBody: any;

    beforeEach(() => {
        requestBody = given.get_add_request_body();
    });

    const invalidKeyValues = [undefined, null, '', 'invalidKey'];
    it.each(invalidKeyValues)('calls add with invalid key field', async (caseArg) => {
        requestBody['key'] = caseArg;
        const expectedError = {
            statusCode: 400,
            body: 'Field key is invalid. Valid values are: Subdomain, Domain, QueryStringParam, PathStartsWith',
        };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidValues = [undefined, null, ''];
    it.each(invalidValues)('calls add with invalid value field', async (caseArg) => {
        requestBody['value'] = caseArg;
        const expectedError = { statusCode: 400, body: 'Field value is required.' };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidPriorityValues = [undefined, null, '', -1];
    it.each(invalidPriorityValues)('calls add with invalid priority field', async (caseArg) => {
        requestBody['priority'] = caseArg;
        const expectedError = { statusCode: 400, body: 'Field priority must be greater than or equal to 0.' };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });

    const invalidOriginValues = [undefined, null, '', 'cloud'];
    it.each(invalidOriginValues)('calls add with invalid origin field', async (caseArg) => {
        requestBody['origin'] = caseArg;
        const expectedError = { statusCode: 400, body: 'Field origin must be a valid url.' };

        const response = await when.we_invoke_add(requestBody);

        expect(response).toStrictEqual(expectedError);
    });
});
