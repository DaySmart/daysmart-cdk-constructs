import { Chance } from 'chance';
import { AddRequest } from '../../src/add/add-request';
import { GetOriginRequest } from '../../src/get-origin/get-origin-request';
import { Request } from '../../src/update/request';

export const get_add_request_body = (): AddRequest => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`.toLowerCase(),
        priority: new Chance().integer({ min: 0 }),
        origin: `https://${new Chance().string({ alpha: true })}.${new Chance().string({ alpha: true })}.com`,
    };
};

export const get_update_request_body = (): Request => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`.toLowerCase(),
        priority: new Chance().integer({ min: 0 }),
        origin: `https://${new Chance().string({ alpha: true })}.${new Chance().string({ alpha: true })}.com`,
    };
};

export const get_getOrigin_domain_request_body = (): GetOriginRequest => ({
    url: `http://domain-${new Chance().string({ alpha: true })}.com`.toLowerCase(),
});

export const get_getOrigin_subdomain_request_body = (): GetOriginRequest => ({
    url: `http://sub-${new Chance().string({ alpha: true })}.domain-${new Chance()
        .string({ alpha: true })
        .toLowerCase()}.com`.toLowerCase(),
});

export const key = (): any => {
    return 'Domain';
};

export const value = (): string => {
    return 'domain-origintest.com';
};
