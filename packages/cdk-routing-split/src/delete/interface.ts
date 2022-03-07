export interface DeleteRequest {
    key: string;
    value: string;
}

export enum Key {
    subdomain = 'Subdomain',
    domain = 'Domain',
    queryStringParam = 'QueryStringParam',
    pathStartsWith = 'PathStartsWith',
}
