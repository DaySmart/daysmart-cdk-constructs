import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls delete', async () => {
        const response = await when.we_invoke_delete();
        expect(response).toBe(true);
    });
});
