import type {TextInputDto} from "../lib/model/text-input-dto";
import {MaterialType} from "../lib/model/registration-enums";
import {Response} from "@tauri-apps/api/http";
import {FileTree} from "../lib/model/file-tree";
import type {FileEntry} from "@tauri-apps/api/fs";


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
    name: "trokk-navnet",
    preferredUsername: "",
    sub: ""
}

export const authenticationResponseMock: AuthenticationResponse = {
    expireInfo: expireInfoMock,
    tokenResponse: tokenResponseMock,
    userInfo: userInfoMock
}

export const textInputDtoMockNewspaper: TextInputDto = {
    id: "bef9c2e7-2c4e-4568-ac71-9ff697924a55",
    materialType: MaterialType.NEWSPAPER,
    font: "FRAKTUR",
    language: "NOB",
    createdBy: "trokk",
    scanner: "test",
    fileSize: BigInt(123),
    workingTitle: "testavisen"
}

export const textInputDtoResponseMockNewspaper: Response<string> = new Response({
    url: "asd",
    status: 200,
    headers: {},
    rawHeaders: {},
    data: JSON.stringify(textInputDtoMockNewspaper, (_, v) => typeof v === 'bigint' ? v.toString() : v)
})

export const response400Mock: Response<string> = new Response({
    url: "papi",
    status: 400,
    headers: {},
    rawHeaders: {},
    data: "Bad request"
})

export const fileTreeListMock: FileTree[] = [
    new FileTree('e', 'e', false),
    new FileTree('b', 'b', false),
    new FileTree('d', 'd', false),
    new FileTree('c', 'c', false),
    new FileTree('a', 'a', false),
]

export const fileEntryListMock: FileEntry[] = [
    {path: 'e', name: 'e'},
    {path: 'b', name: 'b'}
]
