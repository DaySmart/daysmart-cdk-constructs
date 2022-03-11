import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { UrlSegment } from '../../../src/shared/url-segment.enum';
import { DomainData, getDomainData, getPathnameSegment } from '../../../src/shared/get-domain-data';
import { Request as AddRequest } from '../../../src/add/request';
import { CloudFrontRequestEvent } from 'aws-lambda';

let addRequest: AddRequest;
let domainData: DomainData;
let url: string;
let originRequest: CloudFrontRequestEvent;
describe('When an entity', () => {
    beforeEach(() => {
        url = given.a_complex_url(true);
        addRequest = given.an_add_request_body();
        domainData = getDomainData(url);
        originRequest = given.a_getOrigin_event();
        originRequest.Records[0].cf.request.origin.custom.domainName = `${domainData.subdomain}${domainData.subdomain ? '.' : ''}${
            domainData.domain
        }`;
        originRequest.Records[0].cf.request.querystring = domainData.queryStrings.join('&');
        originRequest.Records[0].cf.request.uri = domainData.pathname;
    });
    it('calls get-origin with a valid url with a subdomain', async () => {
        addRequest.key = UrlSegment.Subdomain;
        addRequest.value = domainData.subdomain;
        await when.we_invoke_add(addRequest);

        const response = await when.we_invoke_getOrigin(originRequest);

        const success = {
            headers: { host: [{ key: 'host', value: addRequest.origin }] },
            origin: {
                custom: {
                    customHeaders: {},
                    domainName: addRequest.origin,
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 5,
                    sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
            },
            querystring: domainData.queryStrings.join('&'),
            uri: domainData.pathname,
        };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a domain', async () => {
        addRequest.key = UrlSegment.Domain;
        addRequest.value = domainData.domain;
        await when.we_invoke_add(addRequest);

        const response = await when.we_invoke_getOrigin(originRequest);

        const success = {
            headers: { host: [{ key: 'host', value: addRequest.origin }] },
            origin: {
                custom: {
                    customHeaders: {},
                    domainName: addRequest.origin,
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 5,
                    sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
            },
            querystring: domainData.queryStrings.join('&'),
            uri: domainData.pathname,
        };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a first path segment', async () => {
        addRequest.key = UrlSegment.FirstPathSegment;
        addRequest.value = getPathnameSegment(domainData.pathname);
        await when.we_invoke_add(addRequest);

        const response = await when.we_invoke_getOrigin(originRequest);

        const success = {
            headers: { host: [{ key: 'host', value: addRequest.origin }] },
            origin: {
                custom: {
                    customHeaders: {},
                    domainName: addRequest.origin,
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 5,
                    sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
            },
            querystring: domainData.queryStrings.join('&'),
            uri: domainData.pathname,
        };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a query param', async () => {
        addRequest.key = UrlSegment.QueryStringParam;
        addRequest.value = domainData.queryStrings[0];
        await when.we_invoke_add(addRequest);

        const response = await when.we_invoke_getOrigin(originRequest);

        const success = {
            headers: { host: [{ key: 'host', value: addRequest.origin }] },
            origin: {
                custom: {
                    customHeaders: {},
                    domainName: addRequest.origin,
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 5,
                    sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
                },
            },
            querystring: domainData.queryStrings.join('&'),
            uri: domainData.pathname,
        };
        expect(response).toStrictEqual(success);
    });
});
