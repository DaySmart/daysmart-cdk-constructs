import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls add', async () => {
        const response = await when.we_invoke_add();
        const success = { statusCode: 200, body: true };
        expect(response).toBe(success);
    });
});
