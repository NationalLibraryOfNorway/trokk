interface AuthenticationResponse {
    tokenResponse: TokenResponse;
    expireInfo: ExpireInfo;
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

interface ExpireInfo {
    expiresAt: number;
    refreshExpiresAt: number;
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