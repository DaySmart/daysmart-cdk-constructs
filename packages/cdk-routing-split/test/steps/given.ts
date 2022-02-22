import { Key } from '../../src/add/interface';

export const valid_api_request_body = (): any => {
    return {
        key: Key.domain,
        value: `domain${Math.random().toString(16)}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};
