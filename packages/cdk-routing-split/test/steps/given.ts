import { Chance } from 'chance';

export const get_add_request_body = (): any => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};
export const get_update_request_body = (): any => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};

export const key = (): any => {
    return 'Domain';
};

export const value = (): string => {
    return 'domain-origintest.com';
};