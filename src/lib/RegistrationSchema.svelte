<script lang="ts">
    import { MaterialType } from './model/registration-enums';
    import { Body, fetch } from '@tauri-apps/api/http';
    import { TextInputDto } from './model/text-input-dto';
    import { invoke } from '@tauri-apps/api/tauri';
    import { settings } from './util/settings';
    import { v4 } from 'uuid';
    import { path } from '@tauri-apps/api';
    import { onMount } from 'svelte';
    import { isLoggedIn } from './Auth.svelte';

    export let currentPath: string

    const materialTypes = Object.keys(MaterialType)

    let successMessage: string
    let errorMessage: string

    let materialType: string | undefined = materialTypes.at(0)
    let fraktur: boolean = false
    let sami: boolean = false
    let name: string
    let papiPath: string

    $: {
        const newPath = currentPath.split(path.sep).at(-1)
        if (newPath) name = newPath
        successMessage = ''
        removeErrorMessage()
    }

    onMount(async () => {
        papiPath = (await invoke('get_required_env_variables') as SecretVariables).papiPath
    })

    function getHostname(): Promise<String> {
        return invoke('get_hostname')
    }

    async function postRegistration(scanner: string): Promise<void> {
        const auth = await settings.authResponse
        if (!auth || !await isLoggedIn()) return Promise.reject('Not logged in')

        const id = v4().toString()
        const newPath = await copyToDoneDir(id)
            .catch(error => {
                handleError('Fikk ikke flyttet filene, sjekk at mappeinnstillinger er korrekt.')
                return Promise.reject(error)
            })

        const fileSize = await getTotalFileSize(newPath!)
            .catch(error => {
                deleteDir(newPath!)
                handleError('Fikk ikke hentet filstørrelse.')
                return Promise.reject(error)
            })

        const accessToken = await invoke('get_papi_access_token')
            .catch(error => {
                deleteDir(newPath!)
                handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.')
                return Promise.reject(error)
            })

        return fetch(`${papiPath}/item`,
            {
                method: 'POST',
                headers: {'Authorization' : 'Bearer ' + accessToken},
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
                    deleteDir(currentPath)
                    removeErrorMessage()
                    displaySuccessMessage(response.data as TextInputDto)
                } else {
                    handleError(undefined, response.status)
                }
            })
            .catch(error => {
                deleteDir(newPath!)
                handleError()
                return Promise.reject(error)
            })
    }

    function getTotalFileSize(path: string): Promise<BigInt> {
        return invoke('get_total_size_of_files_in_folder', {path: path})
            .then((size: BigInt) => size)
    }

    function onSubmit() {
        getHostname()
            .then(hostname => postRegistration(hostname.toString()))
            .catch(error => console.log(error))
    }

    function materialTypeToDisplayValue(type: string): string {
        return MaterialType[type as keyof typeof MaterialType]
    }

    function displaySuccessMessage(item: TextInputDto) {
        successMessage = `Item "${item.workingTitle}" sendt til produksjonsløypen med id ${item.id}`
    }

    async function copyToDoneDir(id: string): Promise<string> {
        const donePath = await settings.donePath
        const filesPath = await settings.scannerPath
        if (filesPath === currentPath) {
            return Promise.reject('Cannot move files from scanner dir')
        }

        return invoke('copy_dir', {oldDir: currentPath, newBaseDir: donePath, newDirName: id})
    }

    async function deleteDir(path: string): Promise<void> {
        return invoke('delete_dir', {dir: path})
    }

    function handleError(extra_text?: string, code?: string | number) {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.'
        if (extra_text) tmpErrorMessage += ` ${extra_text}`
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer.'
        if (code) tmpErrorMessage += ` (Feilkode ${code})`

        errorMessage = tmpErrorMessage
    }

    function removeErrorMessage(): void {
        errorMessage = ''
    }

</script>


<form class="regContainer" on:submit|preventDefault={onSubmit}>
    <div class="regField">
        <label for="materialType"> Materialtype </label>
        <select name="materialType" id="materialType" bind:value={materialType} >
            {#each materialTypes as type}
                <option value={type}>
                    {materialTypeToDisplayValue(type)}
                </option>
            {/each}
        </select>
    </div>

    <div class="regField sideBySide">
        <label>
            <input type="radio" bind:group={fraktur} value={false} /> Antiqua
        </label>
        <label>
            <input type="radio" bind:group={fraktur} value={true} /> Fraktur
        </label>
    </div>

    <div class="regField sideBySide">
        <label>
            <input type="radio" bind:group={sami} value={false} /> Norsk
        </label>
        <label>
            <input type="radio" bind:group={sami} value={true} /> Samisk
        </label>
    </div>

    <div class="regField">
        <label for="workingTitle"> Arbeidstittel (Blir ikke brukt i produksjon) </label>
        <input type="text" name="workingTitle" id="workingTitle" bind:value="{name}" />
    </div>

    <button type="submit">TRØKK!</button>

    {#if successMessage}
        <p class="successMessage">
            {successMessage}
        </p>
    {/if}

    {#if errorMessage}
        <p class="errorMessage">
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
</style>

