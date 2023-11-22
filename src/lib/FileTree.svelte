<script lang="ts">
    import {type FileEntry} from '@tauri-apps/api/fs'
    import {FileImage, Folder} from 'lucide-svelte';
    import {createEventDispatcher} from "svelte";

    export let fileTree: FileEntry[] = []
    const dispatch = createEventDispatcher()

    function printFile(file: FileEntry, nestLevel: number = 0): string {
        let output = ''
        if (file.children) {
            output += `${' '.repeat(nestLevel)}${file.name}\n`
            file.children.forEach(child => {
                output += printFile(child, nestLevel + 1)
            })
        } else {
            output += `${' '.repeat(nestLevel)}${file.name}\n`
        }
        return output
    }

    function changeViewDirectory(file: FileEntry) {
        dispatch('directoryChange', file)
    }

</script>

<div class="tree-container">
    <div>
        <ul>
            {#each fileTree as file}
                {#if file.children}
                    <li>
                        <span
                            on:click|preventDefault={() => changeViewDirectory(file)}
                            on:keydown|preventDefault={() => changeViewDirectory(file)}
                        >
                            <Folder size="16" color="orange" />
                            <span>{file.name}</span>
                        </span>
                        <ul>
                            <svelte:self fileTree={file.children} on:directoryChange />
                        </ul>
                    </li>
                {:else}
                    <li>
                        <span>
                            <FileImage size="16" color="orange" />
                            <span>{file.name}</span>
                        </span>
                    </li>
                {/if}
            {/each}
        </ul>
    </div>
</div>

<style lang="scss">
  .tree-container {
    background-color: #1e1e1e;
  }

  li > span {
    &:hover {
      cursor: pointer;
      text-decoration: underline;
    }
  }
    li {
        list-style: none;
        white-space: nowrap;
    }
    ul {
        padding: 0;
        margin: auto 10px;
    }
</style>