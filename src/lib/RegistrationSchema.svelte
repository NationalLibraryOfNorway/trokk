<script lang="ts">
    import {MaterialType} from "./model/registration-enums";
    import {Body, fetch} from "@tauri-apps/api/http";
    import {TextInputDto} from "./model/text-input-dto";
    import {invoke} from "@tauri-apps/api/tauri";
    import {settings} from "./util/settings";
    import {v4} from "uuid";
    import {onMount} from "svelte";

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
        const newPath = currentPath.split('/').at(-1)
        if (newPath) name = newPath
        successMessage = ''
        removeErrorMessage()
    }

    onMount(async () => {
        papiPath = (await invoke("get_required_env_variables") as RequiredEnvVariables).papiPath
    })

    function getHostname(): Promise<String> {
        return invoke("get_hostname")
    }

    async function postRegistration(scanner: string): Promise<void> {
        const auth = await settings.authResponse

        // TODO: Actually log in instead
        if (!auth) return Promise.reject("Not logged in")

        const id = v4().toString()
        const newPath = await moveToDoneDir(id)
            .catch(error => { handleError(error, 'Fikk ikke flyttet filene, sjekk at mappeinnstillinger er korrekt.') })

        const fileSize = await getTotalFileSize(newPath)
            .catch(error => { handleError(error, 'Fikk ikke hentet filstørrelse.') })

        return fetch(`${papiPath}item/`,
            {
                method: 'POST',
                headers: {"Authorization" : "Bearer " + auth.tokenResponse.accessToken},
                body: Body.json(new TextInputDto(
                    materialType ?? "",
                    fraktur ? "FRAKTUR" : "ANTIQUA",
                    sami ? "SME" : "NOB",
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
                    removeErrorMessage()
                    displaySuccessMessage(response.data as TextInputDto)
                } else {
                    handleError(undefined, undefined, response.status)
                }
            })
            .catch(error => {
                handleError(error)
                throw error
            })
    }

    function getTotalFileSize(path: string): Promise<BigInt> {
        return invoke("get_total_size_of_files_in_folder", {path: path})
            .then((size: BigInt) => size)
            .catch(error => console.error(error))
    }

    function onSubmit() {
        getHostname()
            .then(hostname => postRegistration(hostname.toString()))
    }

    function materialTypeToDisplayValue(type: string): string {
        return MaterialType[type as keyof typeof MaterialType]
    }

    function displaySuccessMessage(item: TextInputDto) {
        successMessage = `Item "${item.workingTitle}" sendt til produksjonsløypen med id ${item.id}`
    }

    async function moveToDoneDir(id: string): Promise<String> {
        const donePath = await settings.donePath
        const filesPath = await settings.scannerPath
        if (filesPath === currentPath) {
            return Promise.reject("Cannot move files from scanner dir")
        }

        return invoke("move_completed_dir", {dirPath: currentPath, donePath: donePath, id: id})
    }

    function handleError(error?: any, extra_text?: string, code?: string | number) {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.'
        if (extra_text) tmpErrorMessage += ` ${extra_text}`
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer.'
        if (code) tmpErrorMessage += ` (Feilkode ${code})`

        errorMessage = tmpErrorMessage

        if (error) {
            console.error(error)
            throw error
        }
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

