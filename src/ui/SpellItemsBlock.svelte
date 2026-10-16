<script lang="ts">
  // Items that hold spells (scrolls, potions, wands, staffs, a weapon's daylight 3/day…): use them, see the save DC,
  // the caster level and whether the character can use them (class list, Use Magic Device, caster level check).
  // https://www.d20srd.org/srd/magicItems/magicItemBasics.htm
  import { rules } from '../data/rules'
  import type { SpellDef } from '../data/types'
  import { storedSpellUse } from '../engine/spellItems'
  import type { ItemInstance, StoredSpell } from '../model/character'
  import { app, tr, view } from '../state.svelte'
  import { itemInfo } from './items'
  import { openPopup } from './popupState.svelte'
  import { newDayItemSpells, useStoredSpell } from './spellItemActions'

  const items = $derived(app.character.inventory.filter((i) => i.spells?.length && i.location !== 'stored'))
  const hasPerDay = $derived(items.some((i) => i.spells!.some((s) => s.uses === 'perDay')))

  function popup(item: ItemInstance, s: StoredSpell, sp: SpellDef) {
    const u = storedSpellUse(item, s, view.sheet, rules)
    const line = (en: string, fr: string, v?: { en: string; fr: string }) => (v && (v.en || v.fr) ? [{ en: `${en}: ${v.en}`, fr: `${fr} : ${v.fr}` }] : [])
    openPopup({
      title: sp.name,
      summary: sp.summary,
      lines: [
        { en: `${sp.school.en}, level ${s.level} · caster level ${u.casterLevel} · save DC ${u.dc}`, fr: `${sp.school.fr}, niveau ${s.level} · NLS ${u.casterLevel} · DD ${u.dc}` },
        { en: `From: ${tr(itemInfo(item).name)}`, fr: `Depuis : ${tr(itemInfo(item).name)}` },
        ...u.notes,
        ...line('Range', 'Portée', sp.range),
        ...line('Duration', 'Durée', sp.duration),
        ...line('Saving throw', 'Jet de sauvegarde', sp.save),
        ...line('Spell resistance', 'Résistance à la magie', sp.spellResistance),
      ],
      html: sp.text,
      source: sp.source,
      noteKey: `spell:${sp.id}`,
    })
  }
</script>

{#if items.length}
  <section class="box wide spellitems">
    <h3>{tr({ en: 'Items with spells', fr: 'Objets à sorts' })}</h3>
    {#each items as item (item.uid)}
      <div class="item">
        <h4>
          <span class="arcane">✦</span>
          {tr(itemInfo(item).name)}
          {#if item.charges}<small>· {item.charges.left} / {item.charges.max} {tr({ en: 'charges', fr: 'charges' })}</small>{/if}
          {#if item.spellItem === 'potion' || item.spellItem === 'oil'}<small>× {item.quantity}</small>{/if}
        </h4>
        <ul>
          {#each item.spells ?? [] as s, i (i)}
            {@const sp = rules.spells.get(s.spellId)}
            {@const u = storedSpellUse(item, s, view.sheet, rules)}
            {#if sp}
              <li class="school-row school-{sp.schoolId}" class:spent={!u.left}>
                <button class="link" onclick={() => popup(item, s, sp)}>{tr(sp.name)}</button>
                <small
                  >{tr({ en: `level ${s.level} · CL ${u.casterLevel} · DC ${u.dc}`, fr: `niv. ${s.level} · NLS ${u.casterLevel} · DD ${u.dc}` })}
                  {#if s.uses === 'perDay'}· {u.left}/{s.perDay} {tr({ en: 'today', fr: 'aujourd’hui' })}{/if}
                  {#if s.uses === 'charges' && (s.cost ?? 1) > 1}· {s.cost} {tr({ en: 'charges', fr: 'charges' })}{/if}</small
                >
                <span class="sum">{tr(sp.summary)}</span>
                {#if !u.usable || u.notes.length > 1}<small class="warn">{tr(u.notes[0])}</small>{/if}
                <button class="use" disabled={!u.left} onclick={() => useStoredSpell(app.character, item, i)}
                  >{s.activation === 'use'
                    ? tr({ en: 'Use', fr: 'Utiliser' })
                    : s.activation === 'completion'
                      ? tr({ en: 'Read', fr: 'Lire' })
                      : tr({ en: 'Activate', fr: 'Activer' })}</button
                >
              </li>
            {/if}
          {/each}
        </ul>
      </div>
    {/each}
    {#if hasPerDay}
      <button onclick={() => newDayItemSpells(app.character)}>☀ {tr({ en: 'New day', fr: 'Nouveau jour' })}</button>
    {/if}
  </section>
{/if}

<style>
  .item + .item {
    margin-top: 0.6rem;
  }
  h4 {
    margin: 0 0 0.3rem;
    font-family: var(--font-title);
    font-weight: normal;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.7rem;
    align-items: center;
    padding: 0.25rem 0.5rem;
  }
  li.spent {
    opacity: 0.55;
  }
  .sum {
    color: var(--ink-soft);
    font-size: 0.9rem;
    flex: 1 1 14rem;
  }
  .warn {
    color: var(--accent);
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--school, var(--ink));
    text-decoration: underline dotted;
    cursor: pointer;
  }
  button.use,
  section > button {
    min-height: 2.4rem;
    padding: 0 0.8rem;
  }
  small {
    color: var(--ink-soft);
  }
</style>
