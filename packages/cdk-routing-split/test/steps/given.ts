import { Chance } from 'chance';
import { AddRequest } from '../../src/add/add-request';
import { GetOriginRequest } from '../../src/get-origin/get-origin-request';

export const get_add_request_body = (): AddRequest => {
    return {
        key: 'Domain',
        value: `domain-${new Chance().string({ alpha: true })}.com`.toLowerCase(),
        priority: 1,
        origin: 'Cloud',
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
