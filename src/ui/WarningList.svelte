<script lang="ts">
  import type { WarningArea } from '../engine/validate'
  import { tr, view } from '../state.svelte'

  let { areas }: { areas: WarningArea[] } = $props()

  const list = $derived(view.warnings.filter((w) => areas.includes(w.area)))
  const icon = { error: '⛔', warning: '⚠', info: 'ℹ' }
</script>

{#if list.length}
  <ul class="warnings">
    {#each list as w (w.id)}
      <li class={w.severity}>
        <span aria-hidden="true">{icon[w.severity]}</span>
        {tr(w.message)}
        {#if w.srdUrl}<a href={w.srdUrl} target="_blank" rel="noopener">d20srd</a>{/if}
        {#if w.book}<span class="book">{w.book}</span>{/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .warnings {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    font-size: 0.9em;
  }
  li {
    padding: 0.3em 0.5em;
    border-left: 4px solid var(--rule);
    margin-bottom: 0.25em;
    background: var(--box);
  }
  .error {
    border-color: var(--danger);
  }
  .warning {
    border-color: var(--warn);
  }
  .info {
    border-color: var(--ink-soft);
  }
  a {
    color: var(--accent);
    margin-left: 0.3em;
  }
  .book {
    font-style: italic;
    color: var(--ink-soft);
    margin-left: 0.3em;
  }
</style>
