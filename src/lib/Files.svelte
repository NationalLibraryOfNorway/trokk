<script lang="ts">
  import { readDir, BaseDirectory, type FileEntry } from '@tauri-apps/api/fs'
  import { onMount } from 'svelte';

  let files: FileEntry[] = []

  onMount(async () => {
    files = await readDir('trokk/files', {dir: BaseDirectory.Document})
  })

</script>

<div class="files">
  {#each files as file}
    <p>{file.name}</p>
  {/each}
</div>

<style lang="scss">
  .files {
    display: flex;
    flex-direction: column;
  }
</style>