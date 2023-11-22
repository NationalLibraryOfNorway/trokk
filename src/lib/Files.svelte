<script lang="ts">
    import {type FileEntry, readDir} from '@tauri-apps/api/fs'
    import {onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";
    import FileTree from "./FileTree.svelte";

    interface ViewFile {
        fileEntry: FileEntry
        imageSource: string
    }

    export let scannerPath: string

    let currentPath: string
    let readDirFailed: string | undefined = undefined


    let files: FileEntry[] = []
    let viewFiles: ViewFile[] = []


    $: readDir(scannerPath, {recursive: true})
        .then(newFiles => {
            files = newFiles
            readDirFailed = undefined
        }).catch(err => {
            console.error(err)
            readDirFailed = err
            files = []
        })



    onMount(async () => {
        files = await readDir(scannerPath, {recursive: true})
            .then(newFiles => {
                let firstDir = newFiles.find((file: FileEntry): boolean => {
                    return !!file.children;
                })
                viewFiles = []
                if (firstDir?.children) {
                    firstDir.children.forEach((file: FileEntry) => {
                        viewFiles.push({
                            fileEntry: file,
                            imageSource: convertFileSrc(file.path)
                        })
                    })
                    viewFiles = viewFiles
                    currentPath = firstDir.path
                }
                readDirFailed = undefined
                return newFiles
            })
            .catch(err => {
                console.error(err)
                readDirFailed = err
                return []
            })
    })

    function createThumbnail(path) {
        invoke("convert_to_webp", {filePath: path}).catch((err) => {
            console.error(err)
        })
    }

    function changeViewDirectory(event: CustomEvent<FileEntry>) {
        const fileEntry = event.detail
        viewFiles = []
        if (fileEntry.children) {
            fileEntry.children.forEach((file: FileEntry) => {
                viewFiles.push({
                    fileEntry: file,
                    imageSource: convertFileSrc(file.path)
                })
                if (file.path.endsWith(".tif")) {
                    createThumbnail(file.path)
                }
            })
        } else {
            viewFiles.push({
                fileEntry: fileEntry,
                imageSource: convertFileSrc(fileEntry.path)
            })
        }
        viewFiles = viewFiles
        currentPath = fileEntry.path
    }
</script>

{#if !readDirFailed}
    <div class="filesContainer">
        <FileTree fileTree={files} on:directoryChange={changeViewDirectory}/>
<!--        <div>-->
<!--            {#if scannerPath}-->
<!--                <h3>Scanner path: {scannerPath}</h3>-->
<!--            {/if}-->
<!--            {#if files.length === 0}-->
<!--                <p>Ingen filer funnet i mappen {scannerPath}</p>-->
<!--            {/if}-->
<!--            <div class="filelist">-->
<!--                {#each files as file}-->
<!--                    <div-->
<!--                            role="button"-->
<!--                            tabindex="0"-->
<!--                            on:click={() => changeViewDirectory(file)}-->
<!--                            on:keydown={() => changeViewDirectory(file)}-->
<!--                    >-->
<!--                        {@html printFile(file)}-->
<!--                    </div>-->
<!--                {/each}-->
<!--            </div>-->
<!--        </div>-->
        <div class="images">
            {#each viewFiles as viewFile}
                <div>
                    {#if viewFile.fileEntry.children}
                        <p>directory</p>
                    {:else}
                        <img src={viewFile.imageSource} alt={viewFile.fileEntry.name}/>
                    {/if}
                </div>
            {/each}
        </div>
        {#if currentPath}
            <div class="registrationSchema" >
                <RegistrationSchema bind:workingTitle="{currentPath}" />
            </div>
        {/if}
    </div>
    {:else}
    <p>Failed to read directory, {readDirFailed}</p>
{/if}


<style lang="scss">
  .filesContainer {
    display: flex;
    flex-direction: row;
  }

  .images {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    div:hover, div:focus {
      outline: none;
      border: solid 1px red;
      border-radius: 5px;
      cursor: pointer;
    }

    div {
      width: 200px;
      height: 400px;
      border: solid 1px black;
      border-radius: 5px;
      margin: 5px;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .registrationSchema {
    margin-right: 1em;
    margin-left: auto;
  }

</style>
