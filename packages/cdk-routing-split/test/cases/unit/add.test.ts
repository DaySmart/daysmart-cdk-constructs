import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls add', async () => {
        const response = await when.we_invoke_add();
        expect(response).toBe(true);
    });
});
