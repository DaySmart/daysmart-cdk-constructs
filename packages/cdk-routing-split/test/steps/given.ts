import { Chance } from 'chance';
import { Request as DeleteRequest } from '../../src/delete/request';
import { Request as AddRequest } from '../../src/add/request';
import { Request as UpdateRequest } from '../../src/update/request';
import { UrlSegment } from '../../src/shared/url-segment.enum';
import { CloudFrontRequest, CloudFrontRequestEvent } from 'aws-lambda';

const chance = new Chance();
export const an_add_request_body = (): AddRequest => {
    return {
        key: 'Domain',
        value: a_hostname(),
        priority: chance.integer({ min: 0 }),
        origin: a_simple_url(),
    };
};

export const an_update_request_body = (): UpdateRequest => {
    return {
        key: 'Domain',
        value: a_hostname(),
        priority: new Chance().integer({ min: 0 }),
        origin: a_simple_url(),
    };
};

export const get_delete_request_body = (): DeleteRequest => {
    return {
        key: UrlSegment.Domain,
        value: a_hostname(),
    };
};

export const a_getOrigin_cloudfront_request = (): CloudFrontRequest =>
    ({
        headers: {},
        querystring: a_querystring(),
        origin: {
            custom: {
                domainName: a_hostname(true),
            },
        },
        uri: a_pathname(),
    } as any);
export const a_getOrigin_event = (): CloudFrontRequestEvent =>
    ({
        Records: [
            {
                cf: {
                    request: a_getOrigin_cloudfront_request(),
                },
            },
        ],
    } as any);
export const a_hostname = (hasSubdomain = false) => {
    return `${hasSubdomain ? chance.string({ alpha: true }) : ''}${chance.string({ alpha: true })}.${chance.string({ alpha: true })}.com`;
};
export const a_simple_url = (hasSubdomain = false) => {
    return `https://${a_hostname(hasSubdomain)}`;
};
export const a_complex_url = (hasSubdomain = false) => {
    return `https://${a_hostname(hasSubdomain)}/${a_pathname()}?${a_querystring()}`;
};
export const a_pathname = () =>
    `${chance.string({ alpha: true })}/${chance.string({ alpha: true })}/${chance.string({
        alpha: true,
    })}`;

export const a_querystring = () =>
    `${chance.string({ alpha: true })}=${chance.string({ alpha: true })}&${chance.string({ alpha: true })}=${chance.string({
        alpha: true,
    })}`;
