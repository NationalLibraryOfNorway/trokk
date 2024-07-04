<script lang="ts">
    import { MaterialType } from './model/registration-enums';
    import { Body, fetch } from '@tauri-apps/api/http';
    import { TextInputDto } from './model/text-input-dto';
    import { invoke } from '@tauri-apps/api/tauri';
    import { settings } from './util/settings';
    import { type Writable } from 'svelte/store';
    import { v4 } from 'uuid';
    import { path } from '@tauri-apps/api';
    import { onDestroy, onMount } from 'svelte';
    import { isLoggedIn } from './Auth.svelte';
    import { appWindow } from '@tauri-apps/api/window';
    import type { Event, UnlistenFn } from '@tauri-apps/api/event';
    import { type AllTransferProgress, calculateProgress, type TransferProgress } from './model/transfer-progress';

    export let currentPath: string | undefined;
    export let useS3: boolean;

    const materialTypes = Object.keys(MaterialType);

    let disabled = false;
    let successMessage: string;
    let errorMessage: string;
    let whereToText: string = '';

    export let allUploadProgress: Writable<AllTransferProgress>;
    let barWidth = 0;

    let unlistenProgress: UnlistenFn;

    let materialType: string | undefined = materialTypes.at(0);
    let fraktur: boolean = false;
    let sami: boolean = false;
    let name: string;
    let papiPath: string;

    $: {
        const newPath = currentPath?.split(path.sep).at(-1);
        if (newPath) {
            name = newPath;
        } else {
            name = '';
        }
        successMessage = '';
        removeErrorMessage();
        allUploadProgress.update((progress) => {
            return progress;
        })
    }

    $: {
        whereToText = useS3 ? 'S3' : 'lokal disk';
    }

    $: disabled = currentPath === undefined;

    onMount(async () => {
        papiPath = (await invoke('get_secret_variables') as SecretVariables).papiPath;
        allUploadProgress.subscribe((progress) => {
            setBarWidthFromProgress(progress)
        });
        unlistenProgress = await appWindow.listen('transfer_progress', (event: Event<TransferProgress>) => {
            allUploadProgress.update((progress) => {
                progress.dir[event.payload.directory] = event.payload;
                return progress;
            });
        });
        disabled = currentPath === undefined;
    });
    
    onDestroy(async () => {
        unlistenProgress();
    })

    function getHostname(): Promise<String> {
        return invoke('get_hostname');
    }

    async function postRegistration(scanner: string): Promise<void> {
        if (!currentPath) return;
        const pushedDir = currentPath
        const auth = await settings.authResponse;
        if (!auth || !await isLoggedIn()) return Promise.reject('Not logged in');

        const id = v4().toString();

        let newPath = '';
        const useS3 = await settings.useS3;

        let transfer: Promise<string>;

        if (useS3) {
            transfer = uploadToS3(id)
                .catch(error => {
                    handleError('Fikk ikke lastet opp filene' + error.toString());
                    return Promise.reject(error);
                });
        } else {
            transfer = copyToDoneDir(id)
                .catch(error => {
                    handleError('Fikk ikke kopiert filene' + error.toString());
                    return Promise.reject(error);
                });
        }

        return transfer.then(async (newPath) => {
            const fileSize = await getTotalFileSize(useS3 ? pushedDir : newPath)
                .catch(error => {
                    if (!useS3 && newPath) {
                        deleteDir(newPath);
                    }
                    handleError('Fikk ikke hentet filstørrelse.');
                    return Promise.reject(error);
                });

            const accessToken = await invoke('get_papi_access_token')
                .catch(error => {
                    if (!useS3  && newPath) {
                        deleteDir(newPath!);
                    }
                    handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.');
                    return Promise.reject(error);
                });

            fetch(`${papiPath}/item`,
                {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + accessToken },
                    body: Body.json(new TextInputDto(
                        materialType ?? '',
                        fraktur ? 'FRAKTUR' : 'ANTIQUA',
                        sami ? 'SME' : 'NOB',
                        auth.userInfo.name,
                        scanner,
                        fileSize,
                        name,
                        id
                    ))
                }
            )
                .then(response => {
                    if (response.ok) {
                        deleteDir(pushedDir);
                        removeErrorMessage();
                        displaySuccessMessage(response.data as TextInputDto);
                    } else {
                        handleError(undefined, response.status);
                    }
                })
                .catch(error => {
                    deleteDir(newPath!);
                    handleError();
                    return Promise.reject(error);
                });
        })
            .catch(error => {
                handleError('Fikk ikke overført filene' + error.toString());
                return Promise.reject(error);
            });
    }

    async function getTotalFileSize(path: string): Promise<BigInt> {
        return invoke('get_total_size_of_files_in_folder', { path: path })
            .then((size) => size as BigInt);
    }

    function onSubmit() {
        getHostname()
            .then(hostname => postRegistration(hostname.toString()))
            .catch(error => console.log(error));
    }

    function materialTypeToDisplayValue(type: string): string {
        return MaterialType[type as keyof typeof MaterialType];
    }

    function displaySuccessMessage(item: TextInputDto) {
        successMessage = `Item "${item.workingTitle}" sendt til produksjonsløypen med id ${item.id}`;
    }

    async function copyToDoneDir(id: string): Promise<string> {
        const donePath = await settings.donePath;
        const filesPath = await settings.scannerPath;
        if (filesPath === currentPath) {
            return Promise.reject('Cannot move files from scanner dir');
        }

        return invoke('copy_dir', {
            oldDir: currentPath,
            newBaseDir: donePath,
            newDirName: id,
            appWindow: appWindow
        });
    }

    async function uploadToS3(id: string): Promise<string> {
        const filesPath = await settings.scannerPath;
        if (filesPath === currentPath) {
            return Promise.reject('Cannot move files from scanner dir');
        }

        return invoke('upload_directory_to_s3', {
            directoryPath: currentPath,
            objectId: id,
            materialType: materialType,
            appWindow: appWindow
        });
    }

    async function deleteDir(path: string): Promise<void> {
        return invoke('delete_dir', { dir: path });
    }

    function handleError(extra_text?: string, code?: string | number) {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.';
        if (extra_text) tmpErrorMessage += ` ${extra_text}`;
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer.';
        if (code) tmpErrorMessage += ` (Feilkode ${code})`;

        errorMessage = tmpErrorMessage;
    }

    function removeErrorMessage(): void {
        errorMessage = '';
    }

    function setBarWidthFromProgress(progress: AllTransferProgress): void {
        if (!currentPath || !progress.dir[currentPath]) {
            barWidth = 0;
            return;
        }
        let currentProgress = progress.dir[currentPath];
        if (currentProgress) {
            barWidth = (currentProgress.pageNr / currentProgress.totalPages) * 100;
        }
        if (barWidth === 100) {
            let usedPath = currentPath;
            setTimeout(() => delete progress.dir[usedPath], 5000);
        }
    }

</script>

<form class="regContainer" on:submit|preventDefault={onSubmit}>
    <div class="regField {disabled ? 'greyOut' : ''}">
        <label for="materialType"> Materialtype </label>
        <select disabled="{disabled}" name="materialType" id="materialType" bind:value={materialType}>
            {#each materialTypes as type}
                <option value={type}>
                    {materialTypeToDisplayValue(type)}
                </option>
            {/each}
        </select>
    </div>

    <div class="regField sideBySide {disabled ? 'greyOut' : ''}">
        <label>
            <input disabled="{disabled}" type="radio" bind:group={fraktur} value={false} /> Antiqua
        </label>
        <label>
            <input disabled="{disabled}" type="radio" bind:group={fraktur} value={true} /> Fraktur
        </label>
    </div>

    <div class="regField sideBySide {disabled ? 'greyOut' : ''}">
        <label>
            <input disabled="{disabled}" type="radio" bind:group={sami} value={false} /> Norsk
        </label>
        <label>
            <input disabled="{disabled}" type="radio" bind:group={sami} value={true} /> Samisk
        </label>
    </div>

    <div class="regField {disabled ? 'greyOut' : ''}">
        <label for="workingTitle"> Arbeidstittel (Blir ikke brukt i produksjon) </label>
        <input disabled="{disabled}" type="text" name="workingTitle" id="workingTitle" bind:value="{name}" />
    </div>

    <p>Trøkkes til {whereToText}</p>

    <div class="trokkButton {disabled ? 'greyOut' : ''}">
        <button disabled="{disabled}" type="submit">TRØKK!</button>
    </div>

    <div class="progressBar">
        <span>{barWidth.toFixed(0)}%</span>
        <div>
            <div style="width: {barWidth}%"></div>
        </div>
    </div>

    {#if successMessage}
        <p class="successMessage message">
            {successMessage}
        </p>
    {/if}

    {#if errorMessage}
        <p class="errorMessage message">
            {errorMessage}
        </p>
    {/if}
</form>


<style lang="scss">
  .regContainer {
    display: flex;
    flex-direction: column;
    width: 20em;
    margin-left: 1em;
  }

  .regField {
    display: flex;
    flex-direction: column;
    margin-bottom: 1em;
  }

  .successMessage {
    color: green;
  }

  .errorMessage {
    color: red;
  }

  .sideBySide {
    display: flex;
    flex-direction: row;
  }

  .progressBar {
    margin-top: 0.5em;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    margin-bottom: 1em; // To fix relative causing overlapping with the success/error message

    > span {
      position: absolute;
      z-index: 2;
      display: flex;
      justify-content: center;
      align-content: center;
      width: 100%;
      height: 1.5em;

    }

    > div {
      position: absolute;
      z-index: 1;
      width: 100%;
      border-radius: 20px;
      background-color: #0f0f0f98;
      height: 1.5em;

      > div {
        background-color: #aa0000;
        height: 1.5em;
        transition: width 0.5s ease-in-out;
        border-radius: 20px;
      }
    }
  }

  .greyOut {
    > label > input, > input, > button {
      cursor: not-allowed;
      background-color: grey;
      opacity: 0.3;

      &:hover {
        border-color: grey;
      }
    }
  }

  .trokkButton {
    > button {
      width: 100%;
    }
  }
</style>

