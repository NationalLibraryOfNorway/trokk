import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, type RenderResult } from '@testing-library/svelte';
import RegistrationSchema from '../lib/RegistrationSchema.svelte';
import { mockIPC } from '@tauri-apps/api/mocks';
import { authenticationResponseMock, response400Mock, textInputDtoResponseMockNewspaper } from './mock-data.mock';
import { settings } from '../lib/util/settings';
import type { AllTransferProgress } from '../lib/model/transfer-progress';
import { writable } from 'svelte/store';


describe('RegistrationSchema.svelte', () => {
    let container: RenderResult<RegistrationSchema>;

    beforeEach(() => {
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authenticationResponseMock));
        vi.spyOn(settings, 'donePath', 'get').mockReturnValue(Promise.resolve('/done'));
        vi.spyOn(settings, 'scannerPath', 'get').mockReturnValue(Promise.resolve('/scanner'));
        vi.spyOn(settings, 'useS3', 'get').mockReturnValue(Promise.resolve(false));

        mockIPC((cmd, args) => {
            switch (cmd) {
                case 'get_secret_variables':
                    return Promise.resolve({ papiPath: 'test.papi', useS3: false });
                case 'get_hostname':
                    return Promise.resolve('testHost');
                case 'get_total_size_of_files_in_folder':
                    return Promise.resolve(BigInt(123));
                case 'copy_dir':
                    return Promise.resolve('/scanner/123abc');
                case 'delete_dir':
                    return Promise.resolve();
                case 'get_papi_access_token':
                    return Promise.resolve('token');
                case 'tauri': {
                    if (args['__tauriModule'] === 'Http') { // fetch requests has cmd=tauri and args.__tauriModule=Http
                        return Promise.resolve(textInputDtoResponseMockNewspaper);
                    } else if (args['__tauriModule'] === 'Event' && args['message.cmd'] === 'unlisten' && args['message.event'] === 'transfer_progress') {
                        return Promise.resolve(undefined);
                    }
                    console.log(`unknown args for cmd "tauri": ${args}`);
                    return '';
                }
                default: {
                    console.log(`unknown cmd: ${cmd}`);
                    return '';
                }
            }
        });

        container = render(RegistrationSchema, {
            props: {
                currentPath: 'path',
                useS3: false,
                allUploadProgress: writable<AllTransferProgress>({ dir: {} })
            }
        });
    });

    afterEach(() => {
        cleanup();
    });

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });

    test('should render trøkk button', () => {
        const button = container.getByText('TRØKK!');
        expect(button).toBeTruthy();
    });

    test('should render material type dropdown', () => {
        const select = container.getByLabelText('Materialtype');
        expect(select).toBeTruthy();
    });

    test('should render font radio choices', () => {
        const frakturRadio = container.getByLabelText('Fraktur');
        expect(frakturRadio).toBeTruthy();

        const antiquaRadio = container.getByLabelText('Antiqua');
        expect(antiquaRadio).toBeTruthy();
    });

    test('should render sami radio choices', () => {
        const samiFalse = container.getByLabelText('Norsk');
        expect(samiFalse).toBeTruthy();

        const samiTrue = container.getByLabelText('Samisk');
        expect(samiTrue).toBeTruthy();
    });

    test('registration should get hostname from backend', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        expect(hostNameSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'get_hostname' }));
    });

    test('registration should move files to done directory', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(hostNameSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'copy_dir' }));
    });

    test('registration should get size of files for new directory', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(hostNameSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'get_total_size_of_files_in_folder' }));
    });

    test('registration should get access token for PAPI', async () => {
        const tokenSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(tokenSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(tokenSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'get_papi_access_token' }));
    });

    test('registration should post to papi with correct params', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(hostNameSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                cmd: 'tauri',
                __tauriModule: 'Http',
                message: expect.objectContaining({
                    options: expect.objectContaining({
                        body: expect.objectContaining({
                            payload: expect.objectContaining({
                                'createdBy': authenticationResponseMock.userInfo.name,
                                'fileSize': 123n,
                                'font': 'ANTIQUA',
                                'id': expect.any(String),
                                'language': 'NOB',
                                'materialType': 'NEWSPAPER',
                                'scanner': 'testHost',
                                'workingTitle': 'path'
                            })
                        })
                    })
                })
            })
        );
    });

    test('registration should delete old files after successful registration', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(hostNameSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'delete_dir' }));
    });

    test('registration should show success message', async () => {
        const hostNameSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(hostNameSpy).not.toHaveBeenCalled();

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('sendt til produksjonsløypen', { exact: false });
        expect(res).toBeTruthy();
    });

    test('registration should show error message if file copy failed', async () => {
        mockIPC((cmd) => {
            if (cmd === 'copy_dir') return Promise.reject('copying failed');
            else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Fikk ikke kopiert filene', { exact: false });
        expect(res).toBeTruthy();
    });

    test('registration should show error message if s3 transfer failed', async () => {
        vi.spyOn(settings, 'useS3', 'get').mockReturnValue(Promise.resolve(true));
        mockIPC((cmd) => {
            if (cmd === 'upload_directory_to_s3') return Promise.reject('s3 failed');
            else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Fikk ikke lastet opp filene', { exact: false });
        expect(res).toBeTruthy();
    });

    test('registration should show error message if file size retrieval copy failed', async () => {
        mockIPC((cmd) => {
            if (cmd === 'get_total_size_of_files_in_folder') return Promise.reject('file size failed');
            else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Fikk ikke hentet filstørrelse', { exact: false });
        expect(res).toBeTruthy();
    });

    test('registration should show error message if get token for papi failed', async () => {
        mockIPC((cmd) => {
            if (cmd === 'get_papi_access_token') return Promise.reject('token failed');
            else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen', { exact: false });
        expect(res).toBeTruthy();
    });

    test('registration should show error message if papi returned non-ok status', async () => {
        mockIPC((cmd, args) => {
            if (cmd === 'tauri') {
                if (args['__tauriModule'] === 'Http' && args['message.options.url'] === 'test.papi/item') {
                    return Promise.resolve(response400Mock);
                }
            } else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Kunne ikke TRØKKE dette videre', { exact: false });
        expect(res).toBeTruthy();
    });


    test('registration should show error message if papi post failed', async () => {
        mockIPC((cmd, args) => {
            if (cmd === 'tauri') {
                if (args['__tauriModule'] === 'Http' && args['message.options.url'] === 'test.papi/item') {
                    return Promise.reject('cannot post to papi');
                }
            } else return '';
        });

        container.getByText('TRØKK!').click();

        await new Promise(resolve => setTimeout(resolve, 0));
        const res = container.getByText('Kunne ikke TRØKKE dette videre', { exact: false });
        expect(res).toBeTruthy();
    });
});
