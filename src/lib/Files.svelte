<script lang="ts">
    import {type FileEntry, readDir} from '@tauri-apps/api/fs'
    import {onMount} from 'svelte';
    import {convertFileSrc} from "@tauri-apps/api/tauri";

    interface ViewFile {
        fileEntry: FileEntry
        imageSource: string
    }

    export let scannerPath: string

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

    function printFile(file: FileEntry, nestLevel: number = 0): string {
        let printString: string = ""
        let nesting = "&nbsp;".repeat(nestLevel * 4)
        printString += `<p>${nesting}${file.name}</p>`
        if (file.children) {
            file.children.forEach((child: FileEntry) => {
                printString += printFile(child, nestLevel + 1)
            })
        }
        return printString
    }

    function changeViewDirectory(fileEntry: FileEntry) {
        viewFiles = []
        if (fileEntry.children) {
            fileEntry.children.forEach((file: FileEntry) => {
                viewFiles.push({
                    fileEntry: file,
                    imageSource: convertFileSrc(file.path)
                })
            })
        } else {
            viewFiles.push({
                fileEntry: fileEntry,
                imageSource: convertFileSrc(fileEntry.path)
            })
        }
        viewFiles = viewFiles
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
                    <!--<p>{file.name}</p>-->
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

</style>