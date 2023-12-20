<script lang="ts">
    import {readDir} from '@tauri-apps/api/fs'
    import {beforeUpdate, onDestroy, onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";
    import FileTree from "./FileTree.svelte";
    import {watch} from "tauri-plugin-fs-watch-api";
    import {ChevronsDownUp, ChevronsUpDown, File, Folder} from "lucide-svelte";
    import {FileTree as FileTreeType} from "./model/file-tree";
    import {type UnlistenFn} from "@tauri-apps/api/event";
    import {type ViewFile} from "./model/view-file";
    import {formatFileNames} from "./util/file-utils";

    export let scannerPath: string

    let currentPath: string = scannerPath
    let readDirFailed: string | undefined = undefined
    let fileTree: FileTreeType[] = []
    let viewFiles: ViewFile[] = []
    let stopWatching: UnlistenFn | void | null = null
    const supportedFileTypes = ["jpeg", "jpg", "png", "gif", "webp"]

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

    beforeUpdate(() => {
        viewFiles = sortViewFiles()
    })

    onDestroy(() => {
        unwatchFiles()
    })

    function sortViewFiles(): ViewFile[] {
        return viewFiles.sort((a, b) => {
            if (a.fileTree.name < b.fileTree.name) return -1
            if (a.fileTree.name > b.fileTree.name) return 1
            return 0
        });
    }

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

    function addViewFile(fileEntry: FileTreeType) {
        fileEntry?.children?.forEach((file: FileTreeType) => {
            // Show all files except the .thumbnail directory and tif files
            if (!file.name.startsWith(".thumbnails") && !file.name.endsWith(".tif")) {
                viewFiles.push({
                    fileTree: file,
                    imageSource: convertFileSrc(file.path)
                })
            }
            else if (file.name.endsWith(".tif")) {
                createThumbnail(file.path)
            }
            // If the current file is the .thumbnail directory, add all files in it
            else if (file.children && file.path.endsWith(".thumbnails")) {
                addViewFile(file)
            }
        })
    }

    function changeViewDirectory(fileEntry: FileTreeType): void {
        currentPath = fileEntry.path
        viewFiles = []
        if (fileEntry.children) {
            addViewFile(fileEntry);
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

    function getFileExtension(path: string): string {
        return path?.split('.')?.pop() || ""
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
            <FileTree fileTree={fileTree} selectedDir={currentPath} on:directoryChange={(event) => changeViewDirectory(event.detail)}/>
        </div>
        <div class="images">
            {#each viewFiles as viewFile}
                {#if viewFile.fileTree.children}
                    <button class="directory" on:click={() => changeViewDirectory(viewFile.fileTree)}>
                        <Folder size="96"/>
                        <i>{viewFile.imageSource.split('%2F').pop()}</i>
                    </button>
                {:else if supportedFileTypes.includes(getFileExtension(viewFile.imageSource))}
                    <div>
                        <img src={viewFile.imageSource} alt={viewFile.fileTree.name}/>
                        <i>{formatFileNames(viewFile.imageSource.split('%2F').pop())}</i>
                    </div>
                {:else}
                    <div class="file">
                        <File size="96" color="gray"/>
                        <i>{viewFile.imageSource.split('%2F').pop()}</i>
                    </div>
                {/if}
            {/each}
        </div>
        {#if currentPath}
            <div class="registration-schema">
                <RegistrationSchema bind:currentPath="{currentPath}" />
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
    position: sticky;
    top: 0;
    width: 20vw;
    height: 98vh;
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

  .directory {
    width: 150px;
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    border: solid 3px transparent;
    border-radius: 3px;
    text-align: center;
    background: none;
    padding: 0;
    outline: none;
    box-shadow: none;

    &:hover {
      cursor: pointer;
      border: solid 3px deepskyblue;
    }
  }

  .file {
    width: 150px;
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    text-align: center;
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
    position: sticky;
    top: 0;
    margin-right: 1em;
    margin-left: auto;
    width: 20vw;
    height: 98vh;
  }

  .expand-btn {
    border-radius: 3px;
    background: none;
    padding: 0;
    margin: 0;
    box-shadow: none;
  }

</style>
