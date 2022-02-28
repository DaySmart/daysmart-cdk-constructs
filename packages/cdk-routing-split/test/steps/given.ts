import { Chance } from 'chance';

export const get_add_request_body = (): any => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};
