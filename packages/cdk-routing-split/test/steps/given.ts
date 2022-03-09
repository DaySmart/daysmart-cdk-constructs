import { Chance } from 'chance';
<<<<<<< ATLAS-2786
import { DeleteRequest } from '../../src/delete/delete-request';
import { AddRequest } from '../../src/add/add-request';
import { GetOriginRequest } from '../../src/get-origin/get-origin-request';
import { UrlSegment } from '../../src/shared/url-segment.enum';

export const get_add_request_body = (): AddRequest => {
=======
import { Request as AddRequest } from '../../src/add/request';
import { Request as GetOriginRequest } from '../../src/get-origin/request';
const chance = new Chance();
export const an_add_request_body = (): AddRequest => {
>>>>>>> ATLAS-2787
    return {
        key: 'Domain',
        value: a_random_hostname(),
        priority: chance.integer({ min: 0 }),
        origin: a_simple_random_url(),
    };
};

<<<<<<< ATLAS-2786
export const get_delete_request_body = (): DeleteRequest => {
    return {
        key: UrlSegment.Domain,
        value: `domain-${new Chance().string({ alpha: true })}.com`,
    };
};

export const get_getOrigin_domain_request_body = (): GetOriginRequest => ({
    url: `http://domain-${new Chance().string({ alpha: true })}.com`.toLowerCase(),
=======
export const a_getOrigin_domain_request_body = (): GetOriginRequest => ({
    url: a_complex_random_url(),
>>>>>>> ATLAS-2787
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
