import * as when from '../../steps/when';

describe('When an entity', async () => {
    it('calls getOrigin', async () => {
        const response = await when.we_invoke_getOrigin();
        expect(response).toBe('*');
    });
});
