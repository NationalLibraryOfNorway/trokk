const tokenResponseMock: TokenResponse = {
    accessToken: "",
    expiresIn: 0,
    idToken: "",
    notBeforePolicy: 0,
    refreshExpiresIn: 0,
    refreshToken: "",
    scope: "",
    sessionState: "",
    tokenType: ""
}

const expireInfoMock: ExpireInfo = {
    expiresAt: 0,
    refreshExpiresAt: 0
}

const userInfoMock: UserInfo = {
    email: "",
    familyName: "",
    givenName: "",
    groups: [""],
    name: "",
    preferredUsername: "",
    sub: ""
}

export const authenticationResponseMock: AuthenticationResponse = {
    expireInfo: expireInfoMock,
    tokenResponse: tokenResponseMock,
    userInfo: userInfoMock
}
