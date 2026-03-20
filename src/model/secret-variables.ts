export type StartupVersionStatus =
    | 'UP_TO_DATE'
    | 'PATCH_AVAILABLE'
    | 'MINOR_BLOCKING'
    | 'MAJOR_BLOCKING';

export interface SecretVariables {
    papiPath: string;
    oidcBaseUrl: string;
    oidcClientId: string;
    oidcClientSecret: string;
}
