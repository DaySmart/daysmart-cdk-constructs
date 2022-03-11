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
    const queryStrings = getQueryStrings(url.search);
    const pathname = getPathnameSegment(url.pathname);

    return {
        domain,
        subdomain,
        queryStrings,
        pathname,
    } as DomainData;
};

export const getQueryStrings = (query: string) => {
    if (query.indexOf('?') === 0) {
        query = query.substring(1, query.length - 1);
    }
    return query.split('&');
};

export const getPathnameSegment = (pathname: string) => {
    if (pathname.indexOf('/') === 0) {
        pathname = pathname.substring(1, pathname.length - 1);
    }

    return pathname.split('/')?.[0];
};
