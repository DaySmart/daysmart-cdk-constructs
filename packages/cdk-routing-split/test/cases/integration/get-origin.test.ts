import * as when from '../../steps/when';
import * as given from '../../steps/given';
import { UrlKey } from '../../../src/shared/url-key.enum';
import { Chance } from 'chance';
import { getDomainData } from '../../../src/shared/get-domain-data';

describe('When an entity', () => {
    const chance = new Chance();
    const subdomain = `www.sub-${chance.string({ alpha: true })}`;
    const domain = `domain-${chance.string({ alpha: true })}.com`;
    const queryString = '?asdf=3423&ewrfewrwe=3421';
    const pathname = 'test/stuff';
    const testUrl = `https://${subdomain}.${domain}/${pathname}${queryString}`;
    const domainData = getDomainData(testUrl);
    it('calls get-origin with a valid url with a subdomain', async () => {
        const addRequest = given.get_add_request_body();
        addRequest.key = UrlKey.Subdomain;
        addRequest.value = domainData.subdomain;
        await when.we_invoke_add(addRequest);

        const originRequest = given.get_getOrigin_subdomain_request_body();
        originRequest.url = testUrl;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a querystring', async () => {
        const addRequest = given.get_add_request_body();
        addRequest.key = UrlKey.QueryStringParam;
        addRequest.value = domainData.queryStrings[0];
        await when.we_invoke_add(addRequest);

        const originRequest = given.get_getOrigin_subdomain_request_body();
        originRequest.url = testUrl;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a pathname', async () => {
        const addRequest = given.get_add_request_body();
        addRequest.key = UrlKey.PathStartsWith;
        addRequest.value = domainData.pathname;
        await when.we_invoke_add(addRequest);

        const originRequest = given.get_getOrigin_subdomain_request_body();
        originRequest.url = testUrl;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
    it('calls get-origin with a valid url with a domain', async () => {
        const addRequest = given.get_add_request_body();
        addRequest.key = UrlKey.Domain;
        addRequest.value = domainData.domain;
        await when.we_invoke_add(addRequest);

        const originRequest = given.get_getOrigin_subdomain_request_body();
        originRequest.url = testUrl;
        const response = await when.we_invoke_getOrigin(originRequest);

        const success = { statusCode: 200, body: { origin: addRequest.origin } };
        expect(response).toStrictEqual(success);
    });
});
