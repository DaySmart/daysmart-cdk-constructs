import { Chance } from 'chance';
import { DeleteRequest } from '../../src/delete/request';
import { Request as AddRequest } from '../../src/add/request';
import { Request as GetOriginRequest } from '../../src/get-origin/request';
import { UrlSegment } from '../../src/shared/url-segment.enum';

const chance = new Chance();
export const an_add_request_body = (): AddRequest => {
    return {
        key: 'Domain',
        value: a_random_hostname(),
        priority: chance.integer({ min: 0 }),
        origin: a_simple_random_url(),
    };
};

export const get_delete_request_body = (): DeleteRequest => {
    return {
        key: UrlSegment.Domain,
        value: a_random_hostname(),
    };
};

export const a_getOrigin_domain_request_body = (): GetOriginRequest => ({
    url: a_complex_random_url(),
});

export const a_getOrigin_subdomain_request_body = (): GetOriginRequest => ({
    url: a_complex_random_url(true),
});
export const a_random_hostname = (hasSubdomain = false) => {
    return `${hasSubdomain ? chance.string({ alpha: true }) : ''}${chance.string({ alpha: true })}.${chance.string({ alpha: true })}.com`;
};
export const a_simple_random_url = (hasSubdomain = false) => {
    return `https://${a_random_hostname(hasSubdomain)}`;
};
export const a_complex_random_url = (hasSubdomain = false) => {
    return `https://${a_random_hostname(hasSubdomain)}/${chance.string({ alpha: true })}/${chance.string({ alpha: true })}/${chance.string({
        alpha: true,
    })}?${chance.string({ alpha: true })}=${chance.string({ alpha: true })}&${chance.string({ alpha: true })}=${chance.string({
        alpha: true,
    })}`;
};
