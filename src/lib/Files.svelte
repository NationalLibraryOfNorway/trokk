<script lang="ts">
    import {type FileEntry, readDir} from '@tauri-apps/api/fs'
    import {onDestroy, onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";
    import FileTree from "./FileTree.svelte";
    import {watch} from "tauri-plugin-fs-watch-api";

    interface ViewFile {
        fileEntry: FileEntry
        imageSource: string
    }

    export let scannerPath: string

    let currentPath: string = scannerPath
    let readDirFailed: string | undefined = undefined
    let fileEntries: FileEntry[] = []
    let viewFiles: ViewFile[] = []
    let stopWatching = null

    $: readDir(scannerPath, {recursive: true})
        .then(newFiles => {
            fileEntries = newFiles
            readDirFailed = undefined
        }).catch(err => {
            console.error(err)
            readDirFailed = err
            fileEntries = []
        })

    onMount(async () => {
        fileEntries = await getFileEntries()
        await watchFiles()
    })

    onDestroy(() => {
        unwatchFiles()
    })

    async function watchFiles() {
        if (stopWatching) {
            await stopWatching()
            stopWatching = null
        }
        stopWatching = await watch(
            scannerPath,
            async () => {
                fileEntries = await getFileEntries()
                const currentEntry: FileEntry | undefined = findCurrentDir(fileEntries)
                if (currentEntry) {
                    changeViewDirectory(currentEntry)
                }
            },
            {recursive: true}
        ).catch((err) => {
            console.error(err);
        });
    }

    async function unwatchFiles() {
        if (stopWatching) {
            await stopWatching()
            stopWatching = null
        }
    }

    async function getFileEntries(): Promise<FileEntry[]> {
        return await readDir(scannerPath, {recursive: true})
            .then(newFiles => {
                let firstDir = newFiles.find((file: FileEntry): boolean => {
                    return !!file.children;
                })
                if (firstDir?.children) {
                    firstDir.children.forEach((file: FileEntry) => {
                        viewFiles.push({
                            fileEntry: file,
                            imageSource: convertFileSrc(file.path)
                        })
                    })
                    // currentPath = firstDir.path
                }

                readDirFailed = undefined
                return newFiles
            })
            .catch(err => {
                console.error(`An error occurred when reading directory \'${scannerPath}\': ${err}`)
                readDirFailed = err
                return []
            });
    }

    function findCurrentDir(fileEntries: FileEntry[]): FileEntry | undefined {
        for (const fileEntry of fileEntries) {
            if (fileEntry.path === currentPath)  return fileEntry
            else if (fileEntry.children) {
                const result = findCurrentDir(fileEntry.children)
                if (result) return result
            }
        }
    }

    function createThumbnail(path) {
        invoke("convert_to_webp", {filePath: path}).catch((err) => {
            console.error(err)
        })
    }

    function changeViewDirectory(fileEntry: FileEntry): void {
        currentPath = fileEntry.path
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
    }
</script>

{#if !readDirFailed}
    <div class="files-container">
        <FileTree fileTree={fileEntries} on:directoryChange={(event) => changeViewDirectory(event.detail)}/>
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
            <div class="registration-schema">
                <RegistrationSchema bind:workingTitle="{currentPath}"/>
            </div>
        {/if}
    </div>
{:else}
    <p>Failed to read directory, {readDirFailed}</p>
{/if}


<style lang="scss">
  .files-container {
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

  .registration-schema {
    margin-right: 1em;
    margin-left: auto;
  }

</style>
