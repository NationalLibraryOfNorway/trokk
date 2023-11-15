<script lang="ts">
    import {MaterialType} from "./model/registration-enums";
    import {Body, fetch} from "@tauri-apps/api/http";
    import {TextInputDto} from "./model/text-input-dto";
    import {invoke} from "@tauri-apps/api/tauri";

    export let workingTitle: string

    const materialTypes = Object.keys(MaterialType)

    let successMessage: string
    let errorMessage: string

    let materialType: string = materialTypes.at(0)
    let fraktur: boolean = false
    let sami: boolean = false
    let name: string

    $: {
        const newPath = workingTitle.split('/').at(-1)
        if (newPath) name = newPath
        successMessage = ''
        errorMessage = ''
    }

    function getHostname(): Promise<String> {
        return invoke("get_hostname")
    }

    function postRegistration(scanner: string): Promise<Response> {
        return fetch("http://localhost:8087/papi/item/",
            {
                method: 'POST',
                body: Body.json(new TextInputDto(
                    materialType,
                    fraktur ? "FRAKTUR" : "ANTIQUA",
                    sami ? "SME" : "NOB",
                    "aUsernameOrSomething",     // TODO: add real username when auth is in place
                    scanner,
                    name
                ))
            }
        )
    }

    function onSubmit() {
        getHostname()
            .then(hostname => postRegistration(hostname))
            .then(response => {
                if (response.ok) {
                    errorMessage = ''
                    displaySuccessMessage(response.data as TextInputDto)
                } else {
                    errorMessage = `Kunne ikke TRØKKE dette videre (Feilkode ${response.status}).`
                }
            })
    }

    function materialTypeToDisplayValue(type: string): string {
        return MaterialType[type as keyof typeof MaterialType]
    }

    function displaySuccessMessage(item: TextInputDto) {
        successMessage = `Item "${item.workingTitle}" sendt til produksjonsløypen med id ${item.id}`
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

