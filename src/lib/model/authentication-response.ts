interface AuthenticationResponse {
    tokenResponse: TokenResponse;
    userInfo: UserInfo;
}

interface TokenResponse {
    accessToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
    refreshToken: string;
    tokenType: string;
    idToken: string;
    notBeforePolicy: number;
    sessionState: string;
    scope: string;
}

interface UserInfo {
    sub: string,
    name: string,
    groups: Array<string>,
    preferredUsername: string,
    givenName: string,
    familyName: string,
    email: string,
}