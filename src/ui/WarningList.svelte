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
    margin: 0.75rem 0 0;
    padding: 0;
    font-size: 0.92em;
  }
  li {
    padding: 0.35em 0.7em;
    border-left: 3px solid var(--rule-strong);
    margin-bottom: 0.3em;
    background: var(--paper-2);
    border-radius: 0 3px 3px 0;
  }
  li > span:first-child {
    margin-right: 0.2em;
  }
  .error {
    border-color: var(--danger);
  }
  .error > span:first-child {
    color: var(--danger);
  }
  .warning {
    border-color: var(--warn);
  }
  .warning > span:first-child {
    color: var(--warn);
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
