import { getDomainData } from './get-domain-data';
import { DomainSegment } from './url-key.enum';

export const transformHostnameSegment = (key: string, value: string) => {
    let possibleDomain = value;
    if (key === DomainSegment.Domain) {
        const domainData = getDomainData(possibleDomain);
        possibleDomain = domainData.domain;
    } else if (key === DomainSegment.Subdomain) {
        const domainData = getDomainData(`http://${value}.domain.com`); // can't pass just a subdomain down
        possibleDomain = domainData.subdomain;
    }
    return possibleDomain;
};
