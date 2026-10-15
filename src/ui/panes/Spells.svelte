<script lang="ts">
  // Spells: per casting class, caster level, save DCs, spells per day (bonus spells included), prepared spells and
  // the ones cast today. https://www.d20srd.org/srd/magicOverview/castingSpells.htm
  import { rules } from '../../data/rules'
  import type { SpellDef } from '../../data/types'
  import type { Spellcasting } from '../../engine/spells'
  import { app, tr, view } from '../../state.svelte'
  import { openPopup } from '../popupState.svelte'
  import StatValue from '../StatValue.svelte'

  const s = $derived(view.sheet)
  const ABILITY = {
    str: { en: 'Str', fr: 'For' },
    dex: { en: 'Dex', fr: 'Dex' },
    con: { en: 'Con', fr: 'Con' },
    int: { en: 'Int', fr: 'Int' },
    wis: { en: 'Wis', fr: 'Sag' },
    cha: { en: 'Cha', fr: 'Cha' },
  }

  function spellsOf(sc: Spellcasting, level: number): SpellDef[] {
    return [...rules.spells.values()]
      .filter((sp) => sp.level[sc.def.list] === level)
      .sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  }

  /** Prepared slots of one spell level, padded to the number of spells per day (read only). */
  function slotsFor(sc: Spellcasting, level: number, total: number) {
    const list = app.character.spells?.[sc.classId]?.prepared[level] ?? []
    return Array.from({ length: total }, (_, j) => list[j] ?? { id: '', cast: false })
  }
  function setSlot(sc: Spellcasting, level: number, j: number, patch: Partial<{ id: string; cast: boolean }>) {
    const st = (app.character.spells ??= {})
    const cls = (st[sc.classId] ??= { prepared: {} })
    const list = (cls.prepared[level] ??= [])
    while (list.length <= j) list.push({ id: '', cast: false })
    Object.assign(list[j], patch)
  }

  function spellPopup(sp: SpellDef, sc: Spellcasting) {
    const lvl = sp.level[sc.def.list] ?? 0
    const line = (en: string, fr: string, v?: { en: string; fr: string }) =>
      v && (v.en || v.fr) ? [{ en: `${en}: ${v.en}`, fr: `${fr} : ${v.fr}` }] : []
    openPopup({
      title: sp.name,
      summary: sp.summary,
      lines: [
        { en: `${sp.school.en}, level ${lvl} · save DC ${sc.dc(lvl)}`, fr: `${sp.school.fr}, niveau ${lvl} · DD ${sc.dc(lvl)}` },
        { en: `Components: ${sp.components}`, fr: `Composantes : ${sp.components}` },
        ...line('Casting time', 'Temps d’incantation', sp.castingTime),
        ...line('Range', 'Portée', sp.range),
        ...line('Target', 'Cible', sp.target),
        ...line('Area', 'Zone', sp.area),
        ...line('Effect', 'Effet', sp.effect),
        ...line('Duration', 'Durée', sp.duration),
        ...line('Saving throw', 'Jet de sauvegarde', sp.save),
        ...line('Spell resistance', 'Résistance à la magie', sp.spellResistance),
      ],
      html: sp.text,
      source: sp.source,
      noteKey: `spell:${sp.id}`,
    })
  }

  function newDay(sc: Spellcasting) {
    const cls = app.character.spells?.[sc.classId]
    if (!cls) return
    for (const list of Object.values(cls.prepared)) for (const slot of list) slot.cast = false
  }
</script>

{#each s.spellcasting as sc (sc.classId)}
  <section class="box wide">
    <h3>{tr({ en: 'Spells', fr: 'Sorts' })} — {tr(sc.className)} {sc.classLevel}</h3>
    <div class="caps">
      <div>
        <small>{tr({ en: 'Caster level', fr: 'Niveau de lanceur de sorts' })}</small>
        <StatValue stat={() => view.sheet.spellcasting.find((x) => x.classId === sc.classId)!.casterLevel} title={{ en: 'Caster level', fr: 'Niveau de lanceur de sorts' }} signed={false} />
      </div>
      <div>
        <small>{tr({ en: 'Key ability', fr: 'Caractéristique' })}</small>
        <strong>{tr(ABILITY[sc.ability])} {sc.abilityMod >= 0 ? '+' : ''}{sc.abilityMod}</strong>
      </div>
      <div>
        <small>{tr({ en: 'Kind', fr: 'Type' })}</small>
        <strong>
          {sc.def.kind === 'divine' ? tr({ en: 'divine', fr: 'divin' }) : tr({ en: 'arcane', fr: 'profane' })},
          {sc.def.style === 'prepared' ? tr({ en: 'prepared', fr: 'préparés' }) : tr({ en: 'spontaneous', fr: 'spontanés' })}
        </strong>
      </div>
    </div>

    {#if !sc.slots.some((x) => x.total > 0)}
      <p class="note">
        {tr({
          en: 'No spells per day yet (rangers and paladins cast from class level 4, and need a high enough key ability).',
          fr: 'Pas encore de sorts par jour (rôdeurs et paladins lancent des sorts à partir du niveau 4 de classe, avec une caractéristique suffisante).',
        })}
      </p>
    {/if}

    {#each sc.slots.filter((x) => x.total > 0 || x.blocked) as slot (slot.spellLevel)}
      <div class="level">
        <h4>
          {tr({ en: 'Level', fr: 'Niveau' })} {slot.spellLevel}
          <small>
            · {slot.total} {tr({ en: 'per day', fr: 'par jour' })}
            ({slot.base} + {slot.bonus} {tr({ en: 'bonus', fr: 'bonus' })}) · {tr({ en: 'DC', fr: 'DD' })} {sc.dc(slot.spellLevel)}
          </small>
        </h4>
        {#if slot.blocked}
          <p class="note">
            {tr({
              en: `Key ability score too low (needs ${10 + slot.spellLevel}).`,
              fr: `Valeur de caractéristique trop basse (il faut ${10 + slot.spellLevel}).`,
            })}
          </p>
        {:else}
          {@const options = spellsOf(sc, slot.spellLevel)}
          <ul class="slots">
            {#each slotsFor(sc, slot.spellLevel, slot.total) as prep, j (j)}
              {@const def = rules.spells.get(prep.id)}
              <li class:cast={prep.cast}>
                <select
                  value={prep.id}
                  onchange={(e) => setSlot(sc, slot.spellLevel, j, { id: e.currentTarget.value, cast: false })}
                  aria-label={tr({ en: 'Prepared spell', fr: 'Sort préparé' })}
                >
                  <option value="">— {tr({ en: 'prepare a spell', fr: 'préparer un sort' })} —</option>
                  {#each options as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
                </select>
                {#if def}<button class="link" onclick={() => spellPopup(def, sc)}>ⓘ {tr(def.summary)}</button>{/if}
                <label class="check">
                  <input
                    type="checkbox"
                    checked={prep.cast}
                    disabled={!prep.id}
                    onchange={(e) => setSlot(sc, slot.spellLevel, j, { cast: e.currentTarget.checked })}
                  />
                  {tr({ en: 'cast', fr: 'lancé' })}
                </label>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}

    <div class="actions">
      <button onclick={() => newDay(sc)}>☀ {tr({ en: 'New day (spells available again)', fr: 'Nouveau jour (sorts de nouveau disponibles)' })}</button>
    </div>

    <details>
      <summary>{tr({ en: 'Spell list', fr: 'Liste de sorts' })} ({tr(sc.className)})</summary>
      {#each Array.from({ length: sc.def.maxSpellLevel }, (_, k) => k + 1) as lvl (lvl)}
        <h4>{tr({ en: 'Level', fr: 'Niveau' })} {lvl}</h4>
        <ul class="list">
          {#each spellsOf(sc, lvl) as sp (sp.id)}
            <li><button class="link" onclick={() => spellPopup(sp, sc)}>{tr(sp.name)}</button> <small>{tr(sp.summary)}</small></li>
          {:else}
            <li><small>—</small></li>
          {/each}
        </ul>
      {/each}
    </details>
  </section>
{/each}

<style>
  .caps {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 2rem;
    margin-bottom: 0.8rem;
  }
  .caps div {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .caps small,
  h4 small {
    color: var(--ink-soft);
    font-family: var(--font-body);
    font-weight: 400;
  }
  .level {
    margin-bottom: 0.8rem;
  }
  h4 {
    margin: 0.6rem 0 0.3rem;
    font-family: var(--font-title);
  }
  .slots,
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .slots li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .slots li.cast select,
  .slots li.cast .link {
    text-decoration: line-through;
    opacity: 0.75;
  }
  select {
    min-height: 2.6rem;
    max-width: 100%;
  }
  .list li {
    padding: 0.2rem 0;
  }
  .list small {
    color: var(--ink-soft);
  }
  .link {
    background: none;
    border: none;
    padding: 0.2em 0;
    text-align: left;
    text-decoration: underline dotted var(--accent);
  }
  .check {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    margin-left: auto;
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .actions button {
    min-height: 2.75rem;
    padding: 0 0.9rem;
  }
  details {
    margin-top: 0.8rem;
  }
  summary {
    cursor: pointer;
    font-family: var(--font-title);
  }
</style>
