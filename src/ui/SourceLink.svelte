<script lang="ts">
  import type { Source } from '../data/types'
  import { tr } from '../state.svelte'
  import { UI } from '../i18n/ui'

  let { source }: { source?: Source } = $props()
</script>

{#if source}
  <span class="source">
    {#if source.srdUrl}
      <a href={source.srdUrl} target="_blank" rel="noopener">d20srd</a>
    {/if}
    {#if source.book}
      <span>{source.book}{source.page ? ` ${tr(UI.page)} ${source.page}` : ''}</span>
    {/if}
    {#if source.houseRule}
      <span class="house">{tr(UI.houseRule)} #{source.houseRule}</span>
    {/if}
  </span>
{/if}

<style>
  .source {
    display: inline-flex;
    gap: 0.4em;
    font-size: 0.8em;
    color: var(--ink-soft);
  }
  a {
    color: var(--accent);
  }
  .house {
    font-style: italic;
  }
</style>
