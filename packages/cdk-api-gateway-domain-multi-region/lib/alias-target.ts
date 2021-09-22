interface GetAliasTargetProps {
    companyDomainName: string;
    project: string;
    baseEnv: string;
    dynamicEnv?: string;
}
export function getAliasTarget(props: GetAliasTargetProps) {
    return  props.dynamicEnv ? `${props.dynamicEnv}-api.${props.baseEnv}.${props.project}.${props.companyDomainName}` :
        (props.baseEnv == "prod") ? `api.${props.project}.${props.companyDomainName}` : 
            `api.${props.baseEnv}.${props.project}.${props.companyDomainName}`;
}