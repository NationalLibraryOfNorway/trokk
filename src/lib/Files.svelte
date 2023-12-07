<script lang="ts">
    import {readDir} from '@tauri-apps/api/fs'
    import {onDestroy, onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";
    import FileTree from "./FileTree.svelte";
    import {watch} from "tauri-plugin-fs-watch-api";
    import {ChevronsDownUp, ChevronsUpDown} from "lucide-svelte";
    import {FileTree as FileTreeType} from "./model/file-tree";
    import {type UnlistenFn} from "@tauri-apps/api/event";
    import {type ViewFile} from "./model/view-file";

    export let scannerPath: string

    let currentPath: string = scannerPath
    let readDirFailed: string | undefined = undefined
    let fileTree: FileTreeType[] = []
    let viewFiles: ViewFile[] = []
    let stopWatching: UnlistenFn | void | null = null

    $: readDir(scannerPath, {recursive: true})
        .then(newFiles => {
            fileTree = FileTreeType.fromFileEntry(newFiles)
            readDirFailed = undefined
        }).catch(err => {
            console.error(err)
            readDirFailed = err
            fileTree = []
        })

    onMount(async () => {
        fileTree = await getFileEntries()
        await watchFiles()
    })

    onDestroy(() => {
        unwatchFiles()
    })

    async function watchFiles() {
        if (stopWatching) {
            stopWatching = null
        }
        stopWatching = await watch(
            scannerPath,
            async () => {
                fileTree = await getFileEntries()
                const currentEntry: FileTreeType | undefined = findCurrentDir(fileTree)
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
            stopWatching = null
        }
    }

    async function getFileEntries(): Promise<FileTreeType[]> {
        return await readDir(scannerPath, {recursive: true})
            .then(newFiles => {
                const newFileEntries = FileTreeType.fromFileEntry(newFiles)
                let firstDir = newFileEntries.find((file: FileTreeType): boolean => {
                    return !!file.children;
                })
                if (firstDir?.children) {
                    firstDir.children.forEach((file: FileTreeType) => {
                        viewFiles.push({
                            fileTree: file,
                            imageSource: convertFileSrc(file.path)
                        })
                    })
                }

                readDirFailed = undefined
                return newFileEntries
            })
            .catch(err => {
                console.error(`An error occurred when reading directory \'${scannerPath}\': ${err}`)
                readDirFailed = err
                return []
            });
    }

    function findCurrentDir(fileEntries: FileTreeType[]): FileTreeType | undefined {
        for (const fileEntry of fileEntries) {
            if (fileEntry.path === currentPath)  return fileEntry
            else if (fileEntry.children) {
                const result = findCurrentDir(fileEntry.children)
                if (result) return result
            }
        }
    }

    function createThumbnail(path: string) {
        invoke("convert_to_webp", {filePath: path}).catch((err) => {
            console.error(err)
        })
    }

    function changeViewDirectory(fileEntry: FileTreeType): void {
        currentPath = fileEntry.path
        viewFiles = []
        if (fileEntry.children) {
            fileEntry.children.forEach((file: FileTreeType) => {
                viewFiles.push({
                    fileTree: file,
                    imageSource: convertFileSrc(file.path)
                })
                if (file.path.endsWith(".tif")) {
                    createThumbnail(file.path)
                }
            })
        } else {
            viewFiles.push({
                fileTree: fileEntry,
                imageSource: convertFileSrc(fileEntry.path)
            })
        }
    }

    function toggleExpand(expand: boolean): void {
        fileTree.forEach(entry => {
            entry.opened = expand
            if (entry.children) {
                entry.children.forEach(child => {
                    child.opened = expand
                })
            }
        })
        fileTree = [...fileTree]

    }
</script>

{#if !readDirFailed}
    <div class="files-container">
        <div class="file-tree-container">
            <div class="icon-btn-group">
                <button class="expand-btn" on:click={() => toggleExpand(true)}>
                    <ChevronsUpDown size="14"/>
                </button>
                <button class="expand-btn" on:click={() => toggleExpand(false)}>
                    <ChevronsDownUp size="14"/>
                </button>
            </div>
            <FileTree fileTree={fileTree} on:directoryChange={(event) => changeViewDirectory(event.detail)}/>
        </div>
        <div class="images">
            {#each viewFiles as viewFile}
                {#if viewFile.fileTree.children}
                    <p>directory</p>
                {:else}
                    <div>
                        <img src={viewFile.imageSource} alt={viewFile.fileTree.name}/>
                        <i>{viewFile.imageSource.split('%2F').pop()}</i>
                    </div>
                {/if}
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

  .file-tree-container {
    width: 20vw;
    overflow: scroll;
  }

  .images {
    margin: 0 1em;
    display: flex;
    width: 60vw;
    flex-flow: row wrap;
    justify-content: flex-start;
    align-content: flex-start;
  }

  img {
    width: 150px;
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    border: solid 3px gray;
    border-radius: 3px;
    &:hover {
      cursor: pointer;
      border: solid 3px red;
    }
  }

  i {
    width: 150px;
    height: fit-content;
    display: block;
    text-align: center;
    overflow: visible;
    word-wrap: break-word;
  }

  .icon-btn-group {
    display: flex;
    width: 60px;
    justify-content: space-evenly;
    margin: 6px 0;
  }

  .registration-schema {
    margin-right: 1em;
    margin-left: auto;
    width: 20vw;
  }

  .expand-btn {
    border-radius: 3px;
    background: none;
    padding: 0;
    margin: 0;
    box-shadow: none;
  }

</style>
