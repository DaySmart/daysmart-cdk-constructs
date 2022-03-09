import { getDomainData } from './get-domain-data';
import { UrlSegment } from './url-segment.enum';

export const transformHostnameSegment = (key: string, value: string) => {
    let possibleDomain = value;
    if (key === UrlSegment.Domain) {
        const domainData = getDomainData(possibleDomain);
        possibleDomain = domainData.domain;
    } else if (key === UrlSegment.Subdomain) {
        const domainData = getDomainData(`http://${value}.domain.com`); // can't pass just a subdomain down
        possibleDomain = domainData.subdomain;
    }
    return possibleDomain;
};
