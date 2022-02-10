import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls delete', async () => {
        const response = await when.we_invoke_delete();
        const success = { statusCode: 200, body: true };
        expect(response).toBe(success);
    });
});
