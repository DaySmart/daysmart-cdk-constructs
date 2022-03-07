import { Chance } from 'chance';
import { Key } from '../../src/delete/interface';

export const get_add_request_body = (): any => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`,
        priority: 1,
        origin: 'Cloud',
    };
};

export const get_delete_request_body = (): any => {
    return {
        key: Key.domain,
        value: `domain-${new Chance().string({ alpha: true })}.com`,
    };
};
