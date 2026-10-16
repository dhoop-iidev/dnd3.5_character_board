<script lang="ts">
  // Spells stored in one item: add (any item: a weapon's daylight 3/day, a ring's command word…), edit, remove, and the
  // item's charges. https://www.d20srd.org/srd/magicItems/magicItemBasics.htm
  import { rules } from '../data/rules'
  import type { SpellDef } from '../data/types'
  import { defaultSpellLevel, minCasterLevel } from '../engine/spellItems'
  import type { ItemInstance, StoredSpell } from '../model/character'
  import { tr } from '../state.svelte'
  import SpellPicker from './SpellPicker.svelte'

  let { item }: { item: ItemInstance } = $props()

  const ACTIVATION: Record<StoredSpell['activation'], { en: string; fr: string }> = {
    completion: { en: 'spell completion (scroll)', fr: 'achèvement de sort (parchemin)' },
    trigger: { en: 'spell trigger (wand, staff)', fr: 'potentiel magique (baguette, bâton)' },
    use: { en: 'use-activated (potion, oil)', fr: 'activation par utilisation (potion, huile)' },
    command: { en: 'command word', fr: 'mot de commande' },
  }
  const USES: Record<StoredSpell['uses'], { en: string; fr: string }> = {
    perDay: { en: 'uses per day', fr: 'utilisations par jour' },
    charges: { en: 'charges', fr: 'charges' },
    single: { en: 'single use', fr: 'usage unique' },
  }

  function add(sp: SpellDef) {
    const level = defaultSpellLevel(sp)
    // Assign, then read back through the reactive proxy (the value of `??=` is the raw array).
    if (!item.spells) item.spells = []
    item.spells.push({
      spellId: sp.id,
      level,
      casterLevel: minCasterLevel(level),
      activation: item.spellItem === 'scroll' ? 'completion' : item.spellItem === 'wand' || item.spellItem === 'staff' ? 'trigger' : 'command',
      uses: item.charges ? 'charges' : item.spellItem === 'scroll' ? 'single' : 'perDay',
      perDay: 1,
      cost: 1,
    })
  }
  function remove(i: number) {
    item.spells!.splice(i, 1)
    if (!item.spells!.length) delete item.spells
  }
  function setCharges(on: boolean) {
    if (on) item.charges = { left: 50, max: 50 }
    else delete item.charges
  }
</script>

<div class="itemspells">
  {#each item.spells ?? [] as s, i (i)}
    {@const sp = rules.spells.get(s.spellId)}
    <div class="row school-{sp?.schoolId}">
      <strong>{tr(sp?.name) || s.spellId}</strong>
      <label>{tr({ en: 'level', fr: 'niveau' })}<input type="number" min="0" max="9" bind:value={s.level} /></label>
      <label>{tr({ en: 'caster level', fr: 'NLS' })}<input type="number" min="1" max="30" bind:value={s.casterLevel} /></label>
      <select bind:value={s.activation} aria-label={tr({ en: 'Activation', fr: 'Activation' })}>
        {#each Object.entries(ACTIVATION) as [id, l] (id)}<option value={id}>{tr(l)}</option>{/each}
      </select>
      <select bind:value={s.uses} aria-label={tr({ en: 'Uses', fr: 'Utilisations' })}>
        {#each Object.entries(USES) as [id, l] (id)}<option value={id}>{tr(l)}</option>{/each}
      </select>
      {#if s.uses === 'perDay'}<label>/{tr({ en: 'day', fr: 'jour' })}<input type="number" min="1" bind:value={s.perDay} /></label>{/if}
      {#if s.uses === 'charges'}<label>{tr({ en: 'charges/use', fr: 'charges/util.' })}<input type="number" min="1" bind:value={s.cost} /></label>{/if}
      <button onclick={() => remove(i)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
    </div>
  {/each}
  <div class="row">
    <label class="check"
      ><input type="checkbox" checked={!!item.charges} onchange={(e) => setCharges(e.currentTarget.checked)} />
      {tr({ en: 'Charges', fr: 'Charges' })}</label
    >
    {#if item.charges}
      <input type="number" min="0" bind:value={item.charges.left} aria-label={tr({ en: 'Charges left', fr: 'Charges restantes' })} />
      / <input type="number" min="1" bind:value={item.charges.max} aria-label={tr({ en: 'Max charges', fr: 'Charges max.' })} />
    {/if}
  </div>
  <SpellPicker onpick={add} />
</div>

<style>
  .itemspells {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin: 0.4rem 0;
    padding: 0.5rem;
    border: 1px dashed var(--rule-strong);
    border-radius: 3px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.6rem;
    align-items: center;
  }
  .row[class*='school-'] {
    border-left: 4px solid var(--school, var(--rule-strong));
    padding-left: 0.4rem;
  }
  label {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  input[type='number'] {
    width: 3.8rem;
  }
  input,
  select,
  button {
    font: inherit;
    min-height: 2.2rem;
  }
</style>
