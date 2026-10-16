<script lang="ts">
  // Spells: per casting class, caster level, save DCs, spells per day (bonus spells included), prepared spells and
  // the ones cast today. https://www.d20srd.org/srd/magicOverview/castingSpells.htm
  import { rules } from '../../data/rules'
  import type { DomainDef, SpellDef } from '../../data/types'
  import { clericChoices, domainCasterLevelBonus } from '../../engine/cleric'
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
  /** A slot can hold a spell of its level or lower (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots);
   * if the key ability is too low for that level, only lower-level spells it can cast. */
  function slotOptions(sc: Spellcasting, slotLevel: number, blocked: boolean): { level: number; spells: SpellDef[] }[] {
    const usable = sc.slots.filter((x) => !x.blocked).map((x) => x.spellLevel)
    const out: { level: number; spells: SpellDef[] }[] = []
    // Only levels the caster can cast (a blocked level stays blocked in a higher slot too).
    for (let l = blocked ? slotLevel - 1 : slotLevel; l >= 0; l--)
      if (usable.includes(l)) out.push({ level: l, spells: spellsOf(sc, l) })
    return out.filter((g) => g.spells.length)
  }
  const SCHOOL_NAME: Record<string, { en: string; fr: string }> = {
    abjuration: { en: 'Abjuration', fr: 'Abjuration' },
    conjuration: { en: 'Conjuration', fr: 'Invocation' },
    divination: { en: 'Divination', fr: 'Divination' },
    enchantment: { en: 'Enchantment', fr: 'Enchantement' },
    evocation: { en: 'Evocation', fr: 'Évocation' },
    illusion: { en: 'Illusion', fr: 'Illusion' },
    necromancy: { en: 'Necromancy', fr: 'Nécromancie' },
    transmutation: { en: 'Transmutation', fr: 'Transmutation' },
  }
  const hasSave = (sp: SpellDef) => !/^(none|aucun)/i.test(sp.save.en.trim())

  // ---- extra slots: cleric domain slot (one of the two domains' spells), specialist wizard (specialty school)
  // https://www.d20srd.org/srd/classes/cleric.htm#domains, https://www.d20srd.org/srd/classes/wizard.htm
  const isExtraSlot = (slot: { total: number; extra: number }, j: number) =>
    slot.extra > 0 && j >= slot.total - slot.extra
  function extraOptions(
    sc: Spellcasting,
    slotLevel: number,
    blocked: boolean,
  ): { level: number; spells: SpellDef[] }[] {
    const out: { level: number; spells: SpellDef[] }[] = []
    const choices = Object.assign({}, ...app.character.levels.map((l) => l.classChoices ?? {})) as Record<
      string,
      string
    >
    for (let l = blocked ? slotLevel - 1 : slotLevel; l >= 1; l--) {
      if (sc.slots.some((x) => x.spellLevel === l && x.blocked)) continue
      const spells = [...rules.spells.values()]
        .filter((sp) =>
          sc.classId === 'cleric'
            ? s.domains.some((d) => sp.level[`domain:${d.id}`] === l)
            : sp.level[sc.def.list] === l && sp.schoolId === choices.school,
        )
        .sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
      if (spells.length) out.push({ level: l, spells })
    }
    return out
  }
  const domainOf = (sp: SpellDef) => s.domains.find((d) => sp.level[`domain:${d.id}`] !== undefined)

  // ---- spontaneous casting (cleric): a prepared spell (not a domain spell) can be lost to cast a cure (positive
  // energy) or inflict (negative) spell of the same level or lower
  // (https://www.d20srd.org/srd/classes/cleric.htm#spontaneousCasting).
  const spontaneousKind = $derived(clericChoices(app.character).channel === 'negative' ? 'inflict' : 'cure')
  // The cure/inflict spell's level is at most the prepared spell's level (not the slot's: a lower spell in a higher
  // slot only gives a spell of its own level).
  function spontaneousOptions(preparedId: string, slotLevel: number): SpellDef[] {
    const lvl = rules.spells.get(preparedId)?.level['cleric'] ?? slotLevel
    return [...rules.spells.values()]
      .filter((sp) => sp.id.startsWith(`${spontaneousKind}-`) && (sp.level['cleric'] ?? 99) <= Math.min(lvl, slotLevel))
      .sort((a, b) => (b.level['cleric'] ?? 0) - (a.level['cleric'] ?? 0))
  }

  function domainPopup(d: DomainDef) {
    openPopup({
      title: d.name,
      summary: { en: 'Cleric domain', fr: 'Domaine de prêtre' },
      html: d.grantedPower,
      lines: Object.entries(d.spells).map(([lvl, id]) => {
        const sp = rules.spells.get(id)
        return { en: `${lvl}: ${sp?.name.en ?? id}`, fr: `${lvl} : ${sp?.name.fr ?? id}` }
      }),
      source: d.source,
      noteKey: `domain:${d.id}`,
    })
  }

  /** Prepared slots of one spell level, padded to the number of spells per day (read only). */
  function slotsFor(sc: Spellcasting, level: number, total: number) {
    const list = app.character.spells?.[sc.classId]?.prepared[level] ?? []
    return Array.from({ length: total }, (_, j) => list[j] ?? { id: '', cast: false })
  }
  function setSlot(sc: Spellcasting, level: number, j: number, patch: Partial<{ id: string; cast: boolean; spontaneous: string }>) {
    const st = (app.character.spells ??= {})
    const cls = (st[sc.classId] ??= { prepared: {} })
    if (!cls.prepared[level]) cls.prepared[level] = []
    const list = cls.prepared[level]
    while (list.length <= j) list.push({ id: '', cast: false })
    Object.assign(list[j], patch)
  }

  function spellPopup(sp: SpellDef, sc: Spellcasting, domainSlot = false) {
    const dom = domainOf(sp)
    // In a domain slot the spell is cast at its domain level (fire storm: Fire 7, cleric 8).
    const domainLevel = Math.min(...s.domains.map((d) => sp.level[`domain:${d.id}`] ?? 99))
    const lvl = (domainSlot && domainLevel < 99 ? domainLevel : undefined) ?? sp.level[sc.def.list] ?? (dom ? sp.level[`domain:${dom.id}`] : 0) ?? 0
    // Caster level for this spell: the class's, + domain bonus (Good, Evil, Law, Chaos, Healing, Knowledge).
    const clBonus = sc.classId === 'cleric' ? domainCasterLevelBonus(sp, s.domains) : { value: 0, domain: undefined }
    const cl = sc.casterLevel.total + clBonus.value
    const line = (en: string, fr: string, v?: { en: string; fr: string }) =>
      v && (v.en || v.fr) ? [{ en: `${en}: ${v.en}`, fr: `${fr} : ${v.fr}` }] : []
    openPopup({
      title: sp.name,
      summary: sp.summary,
      lines: [
        {
          en: `${sp.school.en}, level ${lvl}${hasSave(sp) ? ` · save DC ${sc.dc(lvl)}` : ''}`,
          fr: `${sp.school.fr}, niveau ${lvl}${hasSave(sp) ? ` · DD ${sc.dc(lvl)}` : ''}`,
        },
        {
          en: `Caster level ${cl}${clBonus.value ? ` (+${clBonus.value} ${clBonus.domain?.name.en} domain)` : ''}`,
          fr: `Niveau de lanceur ${cl}${clBonus.value ? ` (+${clBonus.value} domaine ${clBonus.domain?.name.fr})` : ''}`,
        },
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
    for (const list of Object.values(cls.prepared))
      for (const slot of list) {
        slot.cast = false
        delete slot.spontaneous
      }
  }
</script>

{#if s.flags.includes('raging')}
  <p class="rage-warn">
    {tr({ en: 'Raging: no spellcasting (barbarian rage).', fr: 'En rage : aucun sort ne peut être lancé (rage de berserker).' })}
    <a href="https://www.d20srd.org/srd/classes/barbarian.htm#rage" target="_blank" rel="noopener">d20srd</a>
  </p>
{/if}

{#if s.spellcasting.length}
  <p class="legend">
    {#each ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'] as sc (sc)}
      <span class="school-{sc}">{tr(SCHOOL_NAME[sc])}</span>
    {/each}
  </p>
{/if}

{#if s.spellcasting.length > 1}
  <section class="box wide">
    <h3>{tr({ en: 'Several spellcasting classes', fr: 'Plusieurs classes de lanceur de sorts' })}</h3>
    <p class="note">
      {tr({
        en: 'Each class keeps its own spell list, spells per day, caster level, key ability and save DCs; spells are prepared for each class separately. A spell on two lists is cast at the level and caster level of the class it was prepared with.',
        fr: 'Chaque classe garde sa propre liste de sorts, ses sorts par jour, son niveau de lanceur, sa caractéristique et ses DD ; les sorts se préparent séparément pour chaque classe. Un sort présent sur deux listes est lancé au niveau et au niveau de lanceur de la classe qui l’a préparé.',
      })}
      <a href="https://www.d20srd.org/srd/classes/multiclass.htm" target="_blank" rel="noopener">d20srd</a>
    </p>
  </section>
{/if}

{#each s.spellcasting as sc (sc.classId)}
  <section class="box wide">
    <h3>{tr({ en: 'Spells', fr: 'Sorts' })} — {tr(sc.className)} {sc.classLevel}</h3>
    <div class="caps">
      <div>
        <small>{tr({ en: 'Caster level', fr: 'Niveau de lanceur de sorts' })}</small>
        <StatValue
          stat={() => view.sheet.spellcasting.find((x) => x.classId === sc.classId)!.casterLevel}
          title={{ en: 'Caster level', fr: 'Niveau de lanceur de sorts' }}
          signed={false}
        />
      </div>
      <div>
        <small>{tr({ en: 'Key ability', fr: 'Caractéristique' })}</small>
        <strong>{tr(ABILITY[sc.ability])} {sc.abilityMod >= 0 ? '+' : ''}{sc.abilityMod}</strong>
      </div>
      <div>
        <small>{tr({ en: 'Kind', fr: 'Type' })}</small>
        <strong>
          {sc.def.kind === 'divine' ? tr({ en: 'divine', fr: 'divin' }) : tr({ en: 'arcane', fr: 'profane' })},
          {sc.def.style === 'prepared'
            ? tr({ en: 'prepared', fr: 'préparés' })
            : tr({ en: 'spontaneous', fr: 'spontanés' })}
        </strong>
      </div>
    </div>

    {#if sc.classId === 'cleric'}
      <p class="domains">
        <strong>{tr({ en: 'Domains', fr: 'Domaines' })} :</strong>
        {#each s.domains as d (d.id)}<button class="link" onclick={() => domainPopup(d)}>{tr(d.name)}</button>{:else}
          <span class="note"
            >{tr({
              en: 'choose two domains at cleric 1 (Progression)',
              fr: 'choisissez deux domaines au niveau 1 de prêtre (Progression)',
            })}</span
          >
        {/each}
        · {spontaneousKind === 'cure'
          ? tr({ en: 'spontaneous cure spells', fr: 'sorts de soins spontanés' })
          : tr({ en: 'spontaneous inflict spells', fr: 'sorts de blessure spontanés' })}
      </p>
    {/if}

    {#if !sc.slots.some((x) => x.total > 0)}
      <p class="note">
        {tr({
          en: 'No spells per day yet (rangers and paladins cast from class level 4, and need a high enough key ability).',
          fr: 'Pas encore de sorts par jour (rôdeurs et paladins lancent des sorts à partir du niveau 4 de classe, avec une caractéristique suffisante).',
        })}
      </p>
    {/if}

    {#each sc.slots.filter((x) => x.total > 0) as slot (slot.spellLevel)}
      <div class="level">
        <h4>
          {tr({ en: 'Level', fr: 'Niveau' })}
          {slot.spellLevel}
          <small>
            · {slot.total}
            {tr({ en: 'per day', fr: 'par jour' })}
            ({slot.base} + {slot.bonus}
            {tr({ en: 'bonus', fr: 'bonus' })}{#if slot.extra}
              + {slot.extra}
              {sc.classId === 'cleric'
                ? tr({ en: 'domain', fr: 'domaine' })
                : tr({ en: 'specialty', fr: 'spécialité' })}{/if}) · {tr({
              en: 'DC',
              fr: 'DD',
            })}
            {sc.dc(slot.spellLevel)}
          </small>
        </h4>
        {#if slot.blocked}
          <p class="note">
            {tr({
              en: `Key ability score too low for level ${slot.spellLevel} spells (needs ${10 + slot.spellLevel}): these slots hold lower-level spells.`,
              fr: `Caractéristique trop basse pour les sorts de niveau ${slot.spellLevel} (il faut ${10 + slot.spellLevel}) : ces emplacements reçoivent des sorts de niveau inférieur.`,
            })}
          </p>
        {/if}
        <ul class="slots">
          {#each slotsFor(sc, slot.spellLevel, slot.total) as prep, j (j)}
            {@const def = rules.spells.get(prep.id)}
            {@const extra = isExtraSlot(slot, j)}
            <li class:cast={prep.cast} class:extra class="school-{def?.schoolId ?? 'none'}" title={def ? tr(def.school) : undefined}>
              {#if extra}<span class="tag"
                  >{sc.classId === 'cleric'
                    ? tr({ en: 'domain', fr: 'domaine' })
                    : tr({ en: 'specialty', fr: 'spécialité' })}</span
                >{/if}
              <select
                value={prep.id}
                onchange={(e) => setSlot(sc, slot.spellLevel, j, { id: e.currentTarget.value, cast: false, spontaneous: undefined })}
                aria-label={tr({ en: 'Prepared spell', fr: 'Sort préparé' })}
              >
                <option value="">— {tr({ en: 'prepare a spell', fr: 'préparer un sort' })} —</option>
                {#each extra ? extraOptions(sc, slot.spellLevel, slot.blocked) : slotOptions(sc, slot.spellLevel, slot.blocked) as g (g.level)}
                  <optgroup label={`${tr({ en: 'Level', fr: 'Niveau' })} ${g.level}`}>
                    {#each g.spells as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
                  </optgroup>
                {/each}
              </select>
              {#if def}<button class="link" onclick={() => spellPopup(def, sc, extra && sc.classId === 'cleric')}
                  >ⓘ {tr(def.summary)}</button
                >{/if}
              <label class="check">
                <input
                  type="checkbox"
                  checked={prep.cast}
                  disabled={!prep.id}
                  onchange={(e) => setSlot(sc, slot.spellLevel, j, { cast: e.currentTarget.checked })}
                />
                {tr({ en: 'cast', fr: 'lancé' })}
              </label>
              {#if sc.classId === 'cleric' && !extra && prep.id && !prep.cast}
                <select
                  class="spont"
                  value=""
                  onchange={(e) => setSlot(sc, slot.spellLevel, j, { cast: true, spontaneous: e.currentTarget.value })}
                  aria-label={tr({ en: 'Cast spontaneously', fr: 'Lancer spontanément' })}
                >
                  <option value=""
                    >{spontaneousKind === 'cure'
                      ? tr({ en: 'cure instead', fr: 'soins à la place' })
                      : tr({ en: 'inflict instead', fr: 'blessure à la place' })}</option
                  >
                  {#each spontaneousOptions(prep.id, slot.spellLevel) as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option
                    >{/each}
                </select>
              {/if}
              {#if prep.spontaneous}
                <small class="note"
                  >{tr({ en: 'cast as', fr: 'lancé comme' })} {tr(rules.spells.get(prep.spontaneous)?.name)}</small
                >
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}

    <div class="actions">
      <button onclick={() => newDay(sc)}
        >☀ {tr({ en: 'New day (spells available again)', fr: 'Nouveau jour (sorts de nouveau disponibles)' })}</button
      >
    </div>

    <details>
      <summary>{tr({ en: 'Spell list', fr: 'Liste de sorts' })} ({tr(sc.className)})</summary>
      {#each Array.from({ length: sc.def.maxSpellLevel + 1 }, (_, k) => k).filter((l) => spellsOf(sc, l).length) as lvl (lvl)}
        <h4>{tr({ en: 'Level', fr: 'Niveau' })} {lvl}</h4>
        <ul class="list">
          {#each spellsOf(sc, lvl) as sp (sp.id)}
            <li class="school-{sp.schoolId}" title={tr(sp.school)}>
              <button class="link" onclick={() => spellPopup(sp, sc)}>{tr(sp.name)}</button>
              <small>{tr(sp.summary)}</small>
            </li>
          {:else}
            <li><small>—</small></li>
          {/each}
        </ul>
      {/each}
    </details>
  </section>
{/each}

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
  }
  .legend span {
    border-left: 4px solid var(--school);
    padding-left: 0.35rem;
    color: var(--ink-soft);
  }
  .rage-warn {
    color: var(--accent);
    font-weight: 600;
  }
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
  /* School of magic: a coloured edge on each spell (muted palette, app.css). */
  .slots li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.3rem 0 0.3rem 0.5rem;
    border-bottom: 1px solid var(--rule);
    border-left: 4px solid var(--school, transparent);
  }
  .slots li.extra {
    background: var(--paper-2);
  }
  .list li {
    border-left: 4px solid var(--school, transparent);
    padding-left: 0.5rem;
  }
  .list li .link {
    color: var(--school, var(--ink));
  }
  .tag {
    font-size: 0.8rem;
    font-family: var(--font-title);
    color: var(--accent);
  }
  .spont {
    min-height: 2.4rem;
    font-size: 0.9rem;
  }
  .domains {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
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
