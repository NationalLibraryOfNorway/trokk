<script lang="ts">
    import {type FileEntry, readDir} from '@tauri-apps/api/fs'
    import {onDestroy, onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";
    import RegistrationSchema from "./RegistrationSchema.svelte";
    import {invoke} from "@tauri-apps/api";
    import FileTree from "./FileTree.svelte";
    import {watch} from "tauri-plugin-fs-watch-api";
    import {ChevronsUpDown, ChevronsDownUp} from "lucide-svelte";

    interface ViewFile {
        fileEntry: FileTree,
        imageSource: string
    }

    export let scannerPath: string

    let currentPath: string = scannerPath
    let readDirFailed: string | undefined = undefined
    let fileEntries: FileTree[] = []
    let viewFiles: ViewFile[] = []
    let stopWatching = null

    $: readDir(scannerPath, {recursive: true})
        .then(newFiles => {
            fileEntries = fileEntryArrayToFileTreeArray(newFiles)
            readDirFailed = undefined
        }).catch(err => {
            console.error(err)
            readDirFailed = err
            fileEntries = []
        })

    onMount(async () => {
        fileEntries = fileEntryArrayToFileTreeArray(await getFileEntries())
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
                fileEntries = fileEntryArrayToFileTreeArray(await getFileEntries())
                const currentEntry: FileTree | undefined = findCurrentDir(fileEntries)
                if (currentEntry) {
                    changeViewDirectory(currentEntry)
                }
            },
            {recursive: true}
        ).catch((err) => {
            console.error(err);
        });
    }

    function fileEntryArrayToFileTreeArray(fileEntries: FileEntry[]): FileTree[] {
        let fileTreeArray: FileTree[] = []
        fileEntries.forEach((fileEntry: FileEntry, index: number) => {
            fileTreeArray.push(<FileTree>{
                path: fileEntry.path,
                name: fileEntry.name,
                index: index,
                opened: false,
                children: fileEntry.children ? fileEntryArrayToFileTreeArray(fileEntry.children) : undefined
            })
        })
        return fileTreeArray
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

    function findCurrentDir(fileEntries: FileTree[]): FileTree | undefined {
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

    function changeViewDirectory(fileEntry: FileTree): void {
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

    function toggleExpand(expand: boolean): void {
        fileEntries.forEach(entry => {
            entry.opened = expand
            if (entry.children) {
                entry.children.forEach(child => {
                    child.opened = expand
                })
            }
        })
        fileEntries = [...fileEntries]

    }
</script>

{#if !readDirFailed}
    <div class="files-container">
        <div class="file-tree-container">
            <div class="icon-btn-group">
                <span on:click={() => toggleExpand(true)}>
                    <ChevronsUpDown size="14"/>
                </span>
                <span on:click={() => toggleExpand(false)}>
                    <ChevronsDownUp size="14"/>
                </span>
            </div>
            <FileTree fileTree={fileEntries} on:directoryChange={(event) => changeViewDirectory(event.detail)}/>
        </div>
        <div class="images">
            {#each viewFiles as viewFile}
                {#if viewFile.fileEntry.children}
                    <p>directory</p>
                {:else}
                    <div>
                        <img src={viewFile.imageSource} alt={viewFile.fileEntry.name}/>
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
    // Make height fit height of image when width is 150px
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    border: solid 3px gray;
    border-radius: 3px;
    &:hover {
      cursor: pointer;
      border: solid 3px red;
      // overlay transparent red over the image

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
    span:hover {
      cursor: pointer;
      box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.25);
    }
  }

  .registration-schema {
    margin-right: 1em;
    margin-left: auto;
    width: 20vw;
  }

</style>
