# @daysmart/cdk-api-gateway-domain-multi-region

This CDK construct contians two available constructs, the first is the `ApiGatewayDomainMultiRegion`. This
can be deployed with the same alias in multiple regions. The second is the `ApiGatewayDomainRoute53Alias`.
This will be the Route 53 record that can be flipped between deployments in different regions.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests

### Constructs
`ApiGatewayDomainMultiRegion`

Parmas:
```
companyDomainName: string; // domain name for the company ie. example.com
project: string; // name of the project for the application
baseEnv: string; // environment name
dynamicEnv?: string; // dynamic environment name (optional)
certificateArn: string; // ARN of the certificate needed
restApiId: string; // Rest api id of the API gateway rest api
restApiRootResourceId: string; // Root resource id of the API gateway rest api
basePath?: string; // Custom domain base path (optional)
endpointType?: apigw.EndpointType; // Custom domain endpoint type (Defaults to REGIONAL)
```

`ApiGatewayDomainRoute53Alias`

Params:
```
companyDomainName: string; // domain name for the company ie. example.com
project: string; // name of the project for the application
customDomainAlias: string; // The alias of the API gateway custom domain rest api
customDomainHostedZoneId: string; // The hosted zone for the API gateway custom domain
baseEnv: string; // environment name
dynamicEnv?: string; // dynamic environment name (optional)
```