import { Key } from '../../src/add/interface';

export const valid_api_endpoint_body = (): any => {
    return {
        key: Key.domain,
        value: 'daysmart.com',
        priority: 1,
        origin: 'Cloud',
    };
};
