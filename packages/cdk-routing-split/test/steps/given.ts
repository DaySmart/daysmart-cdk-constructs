import { Key } from '../../src/add/interface';
import { Chance } from 'chance';

export const valid_api_request_body = (): any => {
    return {
        key: Key.domain,
        value: `domain${new Chance().string({ alpha: true })}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};
