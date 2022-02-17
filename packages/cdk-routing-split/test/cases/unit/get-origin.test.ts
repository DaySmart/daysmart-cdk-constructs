import * as when from '../../steps/when';

describe('When an entity', () => {
    it('calls getOrigin', async () => {
        const response = await when.we_invoke_getOrigin();
        const success = { statusCode: 200, body: '*' };
        expect(response).toStrictEqual(success);
    });
});
