import { parse } from 'tldts';
export interface DomainData {
    subdomain: string; // https://www.subdomain.domain.com/some/path/in/url?guid=1234&name=bob => www.subdomain
    domain: string; // https://subdomain.domain.com/some/path/in/url?guid=1234&name=bob => domain.com
    queryStrings: string[]; // https://www.subdomain.domain.com/some/path/in/url?guid=1234&name=bob => ['guid=1234','name=bob']
    pathname: string; // https://subdomain.domain.com/some/path/in/url?guid=1234&name=bob => some/path/in/url
}

export const getDomainData = (rawUrl: string): DomainData => {
    if (rawUrl.indexOf('http') !== 0) {
        rawUrl = `http://${rawUrl}`;
    }
    const url = new URL(rawUrl);
    const parseResult = parse(url.hostname);
    const subdomain = parseResult?.subdomain;
    const domain = parseResult?.domain;
    const queryStrings = url?.search?.substring(1, url.search.length - 2)?.split('&');
    const pathname = url?.pathname?.substring(1, url.pathname.length - 2);

    return {
        domain,
        subdomain,
        queryStrings,
        pathname,
    } as DomainData;
};
