import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { UrlSegment } from '../../../src/shared/url-segment.enum';
import { DomainData, getDomainData } from '../../../src/shared/get-domain-data';
import { Request as AddRequest } from '../../../src/add/request';

let addRequest: AddRequest;
let domainData: DomainData;
let url: string;
describe('When an entity', () => {
    // const chance = new Chance();
    // const subdomain = `www.sub-${chance.string({ alpha: true })}`;
    // const domain = `domain-${chance.string({ alpha: true })}.com`;
    // const queryString = '?asdf=3423&ewrfewrwe=3421';
    // const pathname = 'test/stuff';
    //const testUrl = `https://${subdomain}.${domain}/${pathname}${queryString}`;
    beforeEach(() => {
        addRequest = given.an_add_request_body();
        url = given.a_complex_random_url(true);
        domainData = getDomainData(url);
    });
    it('calls get-origin with a valid url with a subdomain', async () => {
        addRequest.key = UrlSegment.Subdomain;
        addRequest.value = domainData.subdomain;
        await when.we_invoke_add(addRequest);

        const originRequest = given.a_getOrigin_subdomain_request_body();
        originRequest.url = url;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });

    it('calls get-origin with a valid url with a querystring', async () => {
        addRequest.key = UrlSegment.QueryStringParam;
        addRequest.value = domainData.queryStrings[0];
        await when.we_invoke_add(addRequest);

        const originRequest = given.a_getOrigin_subdomain_request_body();
        originRequest.url = url;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a pathname', async () => {
        addRequest.key = UrlSegment.PathStartsWith;
        addRequest.value = domainData.pathname;
        await when.we_invoke_add(addRequest);

        const originRequest = given.a_getOrigin_subdomain_request_body();
        originRequest.url = url;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a domain', async () => {
        addRequest.key = UrlSegment.Domain;
        addRequest.value = domainData.domain;
        await when.we_invoke_add(addRequest);

        const originRequest = given.a_getOrigin_subdomain_request_body();
        originRequest.url = url;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
});
