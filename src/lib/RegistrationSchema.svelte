<script lang="ts">
    import {Font, Language, MaterialType} from "./model/registration-enums";
    import {Body, fetch} from "@tauri-apps/api/http";
    import {TextInputDto} from "./model/text-input-dto";

    export let workingTitle: string

    const materialTypes = Object.keys(MaterialType)
    const languages = Object.keys(Language)
    const fonts = Object.keys(Font)

    let successMessage: string
    let form = {
        materialType: '',
        font: '',
        language: '',
        workingTitle: '',
    }

    $: {
        const newPath = workingTitle.split('/').at(-1)
        if (newPath) form.workingTitle = newPath
        successMessage = ''
    }

    function onSubmit() {
        fetch("http://localhost:8087/papi/item/",
            {
                method: 'POST',
                body: Body.json(new TextInputDto(
                    form.materialType,
                    form.font,
                    form.language,
                    "aUsernameOrSomething",
                    "scanner123",
                    form.workingTitle
                ))
            }
        )
            .then(response => response.data)
            .then(obj => displaySuccessMessage((obj as TextInputDto)))
    }

    function materialTypeToDisplayValue(type: string): string {
        return MaterialType[type as keyof typeof MaterialType]
    }

    function fontToDisplayValue(font: string): string {
        return Font[font as keyof typeof Font]
    }

    function languageToDisplayValue(language: string): string {
        return Language[language as keyof typeof Language]
    }

    function displaySuccessMessage(item: TextInputDto) {
        successMessage = `Item "${item.workingTitle}" sendt til produksjonsløypen med id ${item.id}`
    }

</script>


<form class="regContainer" on:submit|preventDefault={onSubmit}>
    <div class="regField">
        <label for="materialType"> Materialtype </label>
        <select name="materialType" id="materialType" bind:value={form.materialType} >
            {#each materialTypes as type}
                <option value={type}>
                    {materialTypeToDisplayValue(type)}
                </option>
            {/each}
        </select>
    </div>

    <div class="regField">
        <label for="font"> Font </label>
        <select name="font" id="font" bind:value={form.font}>
            {#each fonts as font}
                <option value={font}>
                    {fontToDisplayValue(font)}
                </option>
            {/each}
        </select>
    </div>

    <div class="regField">
        <label for="language"> Språk </label>
        <select name="language" id="language" bind:value={form.language} >
            {#each languages as language}
                <option value={language}>
                    {languageToDisplayValue(language)}
                </option>
            {/each}
        </select>
    </div>

    <div class="regField">
        <label for="workingTitle"> Arbeidstittel (Blir ikke brukt i produksjon) </label>
        <input type="text" name="workingTitle" id="workingTitle" value="{form.workingTitle}" />
    </div>

    <button type="submit">Send til produksjonsløypen</button>

    {#if successMessage}
        <p class="successMessage">
            {successMessage}
        </p>
    {/if}
</form>


<style lang="scss">
  .regContainer {
    display: flex;
    flex-direction: column;
    max-width: 25em;
  }

  .regField {
    display: flex;
    flex-direction: column;
    margin-bottom: 1em;
  }

  .successMessage {
    color: green;
  }

</style>

