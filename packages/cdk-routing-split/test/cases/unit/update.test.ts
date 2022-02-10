import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls update', async () => {
        const response = await when.we_invoke_update();
        const success = { statusCode: 200, body: true };
        expect(response).toBe(success);
    });
});
