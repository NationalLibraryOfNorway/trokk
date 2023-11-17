<script lang="ts">
    import {type FileEntry, readDir} from '@tauri-apps/api/fs'
    import {onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";

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

    function printFile(fileEntry: FileEntry, nestLevel: number = 0): string {
        let printString: string = ""
        let nesting = "&nbsp;".repeat(nestLevel * 4)
        printString += `<p>${nesting}${fileEntry.name}</p>`

        fileEntry.children?.forEach((subDirectory: FileEntry) => {
            if (subDirectory.name === ".thumbnails" && subDirectory.children) {
                subDirectory.children.forEach((thumbnail: FileEntry) => {
                    printString += printFile(thumbnail, nestLevel + 1)
                })
            }
        })

        return printString
    }

    function changeViewDirectory(fileEntry: FileEntry) {
        viewFiles = []
        if (fileEntry.children) {
            fileEntry.children.forEach((file: FileEntry) => {
                if (file.name === '.thumbnails') {
                    file.children?.forEach((subDirectory: FileEntry) => {
                        viewFiles.push({
                            fileEntry: subDirectory,
                            imageSource: convertFileSrc(subDirectory.path)
                        })
                    })
                }
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
        <div>
            {#if scannerPath}
                <h3>Scanner path: {scannerPath}</h3>
            {/if}
            {#if files.length === 0}
                <p>Ingen filer funnet i mappen {scannerPath}</p>
            {/if}
            <div class="filelist">
                {#each files as file}
                    <div
                            role="button"
                            tabindex="0"
                            on:click={() => changeViewDirectory(file)}
                            on:keydown={() => changeViewDirectory(file)}
                    >
                        {@html printFile(file)}
                    </div>
                {/each}
            </div>
        </div>
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

  .filelist {
    display: flex;
    flex-direction: column;
    margin: 10px;

    div {
      border: solid 1px transparent;
    }

    div:hover, div:focus {
      outline: none;
      border: solid 1px red;
      border-radius: 5px;
      cursor: pointer;
    }


    :global(p) {
      margin: 0;
    }
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
