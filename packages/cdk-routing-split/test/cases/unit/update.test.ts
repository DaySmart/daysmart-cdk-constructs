import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls update', async () => {
        const response = await when.we_invoke_update();
        expect(response).toBe(true);
    });
});
