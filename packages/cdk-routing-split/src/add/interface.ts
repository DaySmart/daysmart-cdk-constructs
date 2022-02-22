export interface AddRequest {
    key: string;
    value: string;
    priority: number;
    origin: string;
}

export enum Key {
    subdomain = 'Subdomain',
    domain = 'Domain',
    queryStringParam = 'QueryStringParam',
    pathStartsWith = 'PathStartsWith',
}
