<script lang="ts">
  // Search a spell by name (English or French) and pick it.
  import { rules } from '../data/rules'
  import type { SpellDef } from '../data/types'
  import { tr } from '../state.svelte'
  import { norm } from './items'

  let { onpick, maxLevel = 9 }: { onpick: (sp: SpellDef) => void; maxLevel?: number } = $props()
  let query = $state('')
  const lowest = (sp: SpellDef) => Math.min(...Object.values(sp.level))
  const results = $derived(
    query.trim().length < 2
      ? []
      : [...rules.spells.values()]
          .filter((sp) => lowest(sp) <= maxLevel && (norm(sp.name.en).includes(norm(query)) || norm(sp.name.fr).includes(norm(query))))
          .slice(0, 10),
  )
</script>

<div class="picker">
  <input type="search" bind:value={query} placeholder={tr({ en: 'Search a spell…', fr: 'Chercher un sort…' })} />
  {#if results.length}
    <ul>
      {#each results as sp (sp.id)}
        <li>
          <button
            class="school-row school-{sp.schoolId}"
            onclick={() => {
              onpick(sp)
              query = ''
            }}
            >＋ {tr(sp.name)} <small>{tr(sp.school)}</small></button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  input {
    font: inherit;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  button {
    width: 100%;
    text-align: left;
    font: inherit;
    min-height: 2.4rem;
    padding: 0 0.6rem;
    border: none;
    border-radius: 3px;
    color: var(--ink);
    cursor: pointer;
  }
  small {
    color: var(--school, var(--ink-soft));
  }
</style>
