<script lang="ts">
  // Spells: per casting class, caster level, save DCs, spells per day (bonus spells included), prepared spells and
  // the ones cast today. https://www.d20srd.org/srd/magicOverview/castingSpells.htm
  import { rules } from '../../data/rules'
  import type { DomainDef, SpellDef } from '../../data/types'
  import { clericChoices, domainCasterLevelBonus } from '../../engine/cleric'
  import { classSpellLevel, spellLevelFor, type Spellcasting } from '../../engine/spells'
  import { hasSomatic, LEARNING_CLASSES, preparable, wizardSchools } from '../../engine/arcane'
  import { knownUpTo, masteredSpells } from '../../engine/spellLearning'
  import {
    actualLevel,
    metamagicDef,
    metamagicLabel,
    metamagicName,
    metamagicProblems,
    ownedMetamagic,
    slotLevel,
    somaticAfter,
    spontaneousCastingTime,
    type MetamagicChoice,
  } from '../../engine/metamagic'
  import type { PreparedSlot } from '../../model/character'
  import SpellLearning from '../SpellLearning.svelte'
  import WarningList from '../WarningList.svelte'
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

  const lvlIn = (sp: SpellDef, sc: Spellcasting) => classSpellLevel(sp, sc.classId, sc.def.list)
  // A wizard never uses spells of her prohibited schools (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization).
  const prohibited = $derived(wizardSchools(app.character).prohibited)
  function spellsOf(sc: Spellcasting, level: number): SpellDef[] {
    return [...rules.spells.values()]
      .filter((sp) => lvlIn(sp, sc) === level && !(sc.classId === 'wizard' && prohibited.includes(sp.schoolId ?? '')))
      .sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  }
  // Wizard: only spells in the spellbook can be prepared (read magic from memory); without the spellbook, only read
  // magic and the Spell Mastery spells (https://www.d20srd.org/srd/feats.htm#spellMasterySpecial). Bard and sorcerer:
  // spells known.
  const withoutBook = $derived(!!app.character.spells?.['wizard']?.withoutBook)
  const mastered = $derived(masteredSpells(app.character))
  const book = $derived.by(() => {
    const all = preparable(app.character, rules, knownUpTo(app.character, rules, 'wizard'))
    return withoutBook ? new Set([...all].filter((id) => id === 'read-magic' || mastered.has(id))) : all
  })
  function setWithoutBook(on: boolean) {
    const st = ((app.character.spells ??= {})['wizard'] ??= { prepared: {} })
    if (on) st.withoutBook = true
    else delete st.withoutBook
  }
  const knownOf = (sc: Spellcasting) => knownUpTo(app.character, rules, sc.classId)
  const prepList = (sc: Spellcasting, level: number) =>
    spellsOf(sc, level).filter((sp) => sc.classId !== 'wizard' || book.has(sp.id))
  /** A slot can hold a spell of its level or lower (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots);
   * if the key ability is too low for that level, only lower-level spells it can cast. */
  function slotOptions(sc: Spellcasting, slotLevel: number, blocked: boolean): { level: number; spells: SpellDef[] }[] {
    const usable = sc.slots.filter((x) => !x.blocked).map((x) => x.spellLevel)
    const out: { level: number; spells: SpellDef[] }[] = []
    // Only levels the caster can cast (a blocked level stays blocked in a higher slot too).
    for (let l = blocked ? slotLevel - 1 : slotLevel; l >= 0; l--)
      if (usable.includes(l)) out.push({ level: l, spells: prepList(sc, l) })
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
    // Cleric domain slots from 1st level; the specialist's extra spell at every level, 0 included (rulings-classes.md C26).
    for (let l = blocked ? slotLevel - 1 : slotLevel; l >= (sc.classId === 'cleric' ? 1 : 0); l--) {
      if (sc.slots.some((x) => x.spellLevel === l && x.blocked)) continue
      const spells = [...rules.spells.values()]
        .filter((sp) =>
          sc.classId === 'cleric'
            ? s.domains.some((d) => sp.level[`domain:${d.id}`] === l)
            : lvlIn(sp, sc) === l && sp.schoolId === choices.school && (sc.classId !== 'wizard' || book.has(sp.id)),
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
  function setSlot(sc: Spellcasting, level: number, j: number, patch: Partial<PreparedSlot>) {
    const st = (app.character.spells ??= {})
    const cls = (st[sc.classId] ??= { prepared: {} })
    if (!cls.prepared[level]) cls.prepared[level] = []
    const list = cls.prepared[level]
    while (list.length <= j) list.push({ id: '', cast: false })
    Object.assign(list[j], patch)
    for (const k of ['spontaneous', 'metamagic', 'heighten'] as const) if (list[j][k] === undefined) delete list[j][k]
  }

  // ---- metamagic (https://www.d20srd.org/srd/feats.htm#metamagicFeats): prepared in a slot of the spell's level +
  // the feats' adjustments or higher; a bard or sorcerer applies them when casting (full-round action, no Quicken).
  const owned = $derived(ownedMetamagic(s.feats))
  /** Spell level in this class (a cleric domain slot: the domain level). */
  const baseLevel = (sp: SpellDef, sc: Spellcasting, domainSlot = false): number =>
    spellLevelFor(sp, sc.classId, sc.def.list, s.domains.map((d) => d.id), domainSlot) ?? 0
  const isBlocked = (sc: Spellcasting, l: number) => !!sc.slots.find((x) => x.spellLevel === l)?.blocked
  const mmOpts = (sc: Spellcasting, spontaneous: boolean) => ({ owned, spontaneous, bard: sc.classId === 'bard', maxLevel: sc.def.maxSpellLevel })
  const illegal = (sp: SpellDef, sc: Spellcasting, base: number, c: MetamagicChoice, spontaneous: boolean) =>
    metamagicProblems(sp, base, c, mmOpts(sc, spontaneous)).filter((p) => p.kind === 'illegal')
  /** Heighten Spell: the levels a spell can be raised to in a slot of this level. */
  function heightenLevels(sc: Spellcasting, base: number, c: MetamagicChoice, maxSlot: number): number[] {
    const others = slotLevel(base, { ...c, metamagic: (c.metamagic ?? []).filter((x) => x !== 'heighten-spell') }) - base
    const out: number[] = []
    for (let l = base + 1; l <= Math.min(9, sc.def.maxSpellLevel, maxSlot - others); l++) if (!isBlocked(sc, l)) out.push(l)
    return out
  }
  /** Adding (or removing) a feat on a prepared spell, if the spell still fits its slot. */
  function withFeat(sc: Spellcasting, base: number, c: MetamagicChoice, id: string, on: boolean, maxSlot: number): MetamagicChoice | undefined {
    // Never in a slot of a level the key ability is too low for (house rule #40).
    if (on && isBlocked(sc, maxSlot)) return undefined
    const ids = on ? [...(c.metamagic ?? []), id] : (c.metamagic ?? []).filter((x) => x !== id)
    const next: MetamagicChoice = { metamagic: ids.length ? ids : undefined, heighten: ids.includes('heighten-spell') ? c.heighten : undefined }
    if (on && id === 'heighten-spell') next.heighten = heightenLevels(sc, base, next, maxSlot)[0]
    if (next.metamagic?.includes('heighten-spell') && next.heighten === undefined) return undefined
    return slotLevel(base, next) <= maxSlot ? next : undefined
  }
  function toggleFeat(sc: Spellcasting, level: number, j: number, prep: PreparedSlot, base: number, id: string, on: boolean) {
    const next = withFeat(sc, base, prep, id, on, level)
    if (next) setSlot(sc, level, j, { metamagic: next.metamagic, heighten: next.heighten })
  }

  // Spontaneous casters: the metamagic chosen for the next spell, per class (not saved).
  let nextMm = $state<Record<string, MetamagicChoice>>({})
  // Prepared slots whose metamagic options are open (`class:level:slot`; not saved).
  let mmOpen = $state<Record<string, boolean>>({})
  const mmOf = (sc: Spellcasting): MetamagicChoice => nextMm[sc.classId] ?? {}
  function toggleNext(sc: Spellcasting, id: string, on: boolean) {
    const c = mmOf(sc)
    const ids = on ? [...(c.metamagic ?? []), id] : (c.metamagic ?? []).filter((x) => x !== id)
    nextMm[sc.classId] = { metamagic: ids.length ? ids : undefined, heighten: ids.includes('heighten-spell') ? (c.heighten ?? 1) : undefined }
  }

  function spellPopup(sp: SpellDef, sc: Spellcasting, domainSlot = false, mm: MetamagicChoice = {}, spontaneous = false) {
    const lvl = baseLevel(sp, sc, domainSlot)
    const asf = sc.spellFailure?.total ?? 0
    const withMm = !!mm.metamagic?.length
    // Heighten Spell raises the actual level (save DC); the other feats only the slot.
    const dcLevel = actualLevel(lvl, mm)
    const castTime = mm.metamagic?.includes('quicken-spell')
      ? { en: '1 free action (quickened)', fr: '1 action libre (incantation rapide)' }
      : spontaneous && withMm
        ? spontaneousCastingTime(sp)
        : sp.castingTime
    // Caster level for this spell: the class's, + domain bonus (Good, Evil, Law, Chaos, Healing, Knowledge).
    // Domain caster level bonus (Good, Healing…): every spell the cleric casts, whatever the class (3.5 FAQ 6/30/2008).
    const clBonus = domainCasterLevelBonus(sp, s.domains)
    const cl = sc.casterLevel.total + clBonus.value
    const line = (en: string, fr: string, v?: { en: string; fr: string }) =>
      v && (v.en || v.fr) ? [{ en: `${en}: ${v.en}`, fr: `${fr} : ${v.fr}` }] : []
    openPopup({
      title: sp.name,
      summary: sp.summary,
      lines: [
        {
          en: `${sp.school.en}, level ${dcLevel}${hasSave(sp) ? ` · save DC ${sc.dc(dcLevel, sp.schoolId)}` : ''}`,
          fr: `${sp.school.fr}, niveau ${dcLevel}${hasSave(sp) ? ` · DD ${sc.dc(dcLevel, sp.schoolId)}` : ''}`,
        },
        ...(withMm
          ? [
              {
                en: `Metamagic: ${metamagicLabel(rules, mm).en} · level ${slotLevel(lvl, mm)} slot (spell level ${lvl})`,
                fr: `Métamagie : ${metamagicLabel(rules, mm).fr} · emplacement de niveau ${slotLevel(lvl, mm)} (sort de niveau ${lvl})`,
              },
            ]
          : []),
        {
          en: `Caster level ${cl}${clBonus.value ? ` (+${clBonus.value} ${clBonus.domain?.name.en} domain)` : ''}`,
          fr: `Niveau de lanceur ${cl}${clBonus.value ? ` (+${clBonus.value} domaine ${clBonus.domain?.name.fr})` : ''}`,
        },
        { en: `Components: ${sp.components}`, fr: `Composantes : ${sp.components}` },
        ...(sc.def.kind === 'arcane' && asf
          ? [somaticAfter(sp, mm)
              ? { en: `Arcane spell failure ${asf}% (somatic component)`, fr: `Échec des sorts profanes ${asf} % (composante gestuelle)` }
              : hasSomatic(sp)
                ? { en: 'Stilled: no somatic component, no arcane spell failure', fr: 'Incantation statique : pas de composante gestuelle, pas d’échec des sorts profanes' }
                : { en: 'No somatic component: no arcane spell failure', fr: 'Pas de composante gestuelle : pas d’échec des sorts profanes' }]
          : []),
        ...line('Casting time', 'Temps d’incantation', castTime),
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

  // ---- spontaneous casters (bard, sorcerer): slots used per slot level; a known spell can use a slot of its level or
  // higher (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots; rulings-classes.md C27).
  const usedAt = (sc: Spellcasting, lvl: number) => app.character.spells?.[sc.classId]?.castCount?.[lvl] ?? 0
  function setUsed(sc: Spellcasting, lvl: number, n: number) {
    const st = ((app.character.spells ??= {})[sc.classId] ??= { prepared: {} })
    const total = sc.slots.find((x) => x.spellLevel === lvl)?.total ?? 0
    ;(st.castCount ??= {})[lvl] = Math.max(0, Math.min(total, n))
  }
  /** Lowest slot level with a slot left for a spell of this level. */
  const slotFor = (sc: Spellcasting, spellLevel: number, metamagic = false) =>
    sc.slots.find((x) => x.spellLevel >= spellLevel && x.total - usedAt(sc, x.spellLevel) > 0 && !(metamagic && x.blocked))?.spellLevel
  const knownByLevel = (sc: Spellcasting) => {
    const ids = knownOf(sc)
    const out: { level: number; spells: SpellDef[] }[] = []
    for (const id of ids) {
      const sp = rules.spells.get(id)
      const l = sp && lvlIn(sp, sc)
      if (!sp || l === undefined) continue
      ;(out.find((g) => g.level === l) ?? out[out.push({ level: l, spells: [] }) - 1]).spells.push(sp)
    }
    return out.sort((a, b) => a.level - b.level)
  }

  function newDay(sc: Spellcasting) {
    const cls = app.character.spells?.[sc.classId]
    if (!cls) return
    cls.castCount = {}
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

{#if s.flags.includes('bardic-music')}
  <p class="rage-warn">
    {tr({ en: 'Singing (bardic music): no spellcasting, no scrolls or wands until you stop.', fr: 'En train de chanter (musique de barde) : pas de sort, ni parchemin ni baguette tant que vous chantez.' })}
    <a href="https://www.d20srd.org/srd/classes/bard.htm#bardicMusic" target="_blank" rel="noopener">d20srd</a>
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
      {#if sc.spellFailure?.parts.length}
        <div>
          <small>{tr({ en: 'Arcane spell failure', fr: 'Échec des sorts profanes' })}</small>
          <StatValue
            stat={() => view.sheet.spellcasting.find((x) => x.classId === sc.classId)!.spellFailure!}
            title={{ en: 'Arcane spell failure (%)', fr: 'Échec des sorts profanes (%)' }}
            signed={false}
          />
        </div>
      {/if}
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

    {#if sc.def.style === 'spontaneous'}
      <div class="spont-slots">
        {#each sc.slots.filter((x) => x.total > 0) as slot (slot.spellLevel)}
          <div class="slotcount" class:spent={usedAt(sc, slot.spellLevel) >= slot.total}>
            <strong>{tr({ en: 'Level', fr: 'Niveau' })} {slot.spellLevel}</strong>
            <span>{slot.total - usedAt(sc, slot.spellLevel)} / {slot.total}</span>
            <small>({slot.base} + {slot.bonus} {tr({ en: 'bonus', fr: 'bonus' })}) · {tr({ en: 'DC', fr: 'DD' })} {sc.dc(slot.spellLevel)}</small>
            <button onclick={() => setUsed(sc, slot.spellLevel, usedAt(sc, slot.spellLevel) - 1)} aria-label={tr({ en: 'Give back a slot', fr: 'Rendre un emplacement' })}>−</button>
            <button onclick={() => setUsed(sc, slot.spellLevel, usedAt(sc, slot.spellLevel) + 1)} aria-label={tr({ en: 'Use a slot', fr: 'Utiliser un emplacement' })}>＋</button>
          </div>
        {/each}
      </div>
      {#if owned.length}
        {@const c = mmOf(sc)}
        <div class="mmbar">
          <strong>{tr({ en: 'Metamagic for the next spell', fr: 'Métamagie pour le prochain sort' })} :</strong>
          {#each owned as id (id)}
            {@const no = id === 'quicken-spell' ? { en: 'not on a spontaneous spell', fr: 'pas sur un sort spontané' } : id === 'silent-spell' && sc.classId === 'bard' ? { en: 'not on bard spells', fr: 'pas sur les sorts de barde' } : undefined}
            <label class="mmchip" class:on={c.metamagic?.includes(id)} title={no ? tr(no) : undefined}>
              <input type="checkbox" checked={!!c.metamagic?.includes(id)} disabled={!!no} onchange={(e) => toggleNext(sc, id, e.currentTarget.checked)} />
              {tr(metamagicName(rules, id))}{id === 'heighten-spell' ? '' : ` +${metamagicDef(id)?.adj}`}
            </label>
          {/each}
          {#if c.metamagic?.includes('heighten-spell')}
            <label class="mmchip on"
              >{tr({ en: 'to level', fr: 'au niveau' })}
              <select value={c.heighten} onchange={(e) => (nextMm[sc.classId] = { ...c, heighten: Number(e.currentTarget.value) })}>
                {#each sc.slots.filter((x) => x.total > 0 && x.spellLevel > 0) as x (x.spellLevel)}<option value={x.spellLevel}>{x.spellLevel}</option>{/each}
              </select></label
            >
          {/if}
          {#if c.metamagic?.length}
            <span class="note">{tr({ en: '1 full-round action to cast', fr: '1 action complexe pour lancer' })}</span>
            <button onclick={() => delete nextMm[sc.classId]}>{tr({ en: 'Clear', fr: 'Effacer' })}</button>
          {/if}
        </div>
      {/if}
      {#each knownByLevel(sc) as g (g.level)}
        <div class="level">
          <h4>{tr({ en: 'Known, level', fr: 'Connus, niveau' })} {g.level}</h4>
          <ul class="slots">
            {#each g.spells as sp (sp.id)}
              {@const c = mmOf(sc)}
              {@const bad = c.metamagic?.length ? illegal(sp, sc, g.level, c, true) : []}
              {@const need = slotLevel(g.level, c)}
              {@const slotLvl = bad.length ? undefined : slotFor(sc, need, !!c.metamagic?.length)}
              <li class="school-row school-{sp.schoolId ?? 'none'}" title={tr(sp.school)}>
                <button class="link sum" title={tr(sp.summary)} onclick={() => spellPopup(sp, sc, false, c, true)}><strong>{tr(sp.name)}</strong> ⓘ {tr(sp.summary)}</button>
                <button
                  class="castbtn"
                  disabled={slotLvl === undefined}
                  title={bad.length ? bad.map((p) => tr(p.text)).join(' · ') : undefined}
                  onclick={() => slotLvl !== undefined && setUsed(sc, slotLvl, usedAt(sc, slotLvl) + 1)}
                  >{tr({ en: 'Cast', fr: 'Lancer' })}{c.metamagic?.length ? ' ✦' : ''}{slotLvl !== undefined && slotLvl > g.level
                    ? ` (${tr({ en: 'level', fr: 'niv.' })} ${slotLvl})`
                    : ''}</button
                >
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <p class="note">{tr({ en: 'No spells known yet: learn them below.', fr: 'Aucun sort connu : apprenez-les ci-dessous.' })}</p>
      {/each}
    {/if}

    {#if sc.classId === 'wizard'}
      <label class="check book">
        <input type="checkbox" checked={withoutBook} onchange={(e) => setWithoutBook(e.currentTarget.checked)} />
        {tr({ en: 'Without my spellbook today: only read magic and the Spell Mastery spells', fr: 'Sans mon grimoire aujourd’hui : seulement lecture de la magie et les sorts de Maîtrise des sorts' })}
        ({mastered.size})
      </label>
    {/if}

    {#each sc.def.style === 'prepared' ? sc.slots.filter((x) => x.total > 0) : [] as slot (slot.spellLevel)}
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
            <li class:cast={prep.cast} class:extra class="school-row school-{def?.schoolId ?? 'none'}" title={def ? tr(def.school) : undefined}>
              {#if extra}<span class="tag"
                  >{sc.classId === 'cleric'
                    ? tr({ en: 'domain', fr: 'domaine' })
                    : tr({ en: 'specialty', fr: 'spécialité' })}</span
                >{/if}
              <select
                value={prep.id}
                onchange={(e) => setSlot(sc, slot.spellLevel, j, { id: e.currentTarget.value, cast: false, spontaneous: undefined, metamagic: undefined, heighten: undefined })}
                aria-label={tr({ en: 'Prepared spell', fr: 'Sort préparé' })}
              >
                <option value="">— {tr({ en: 'prepare a spell', fr: 'préparer un sort' })} —</option>
                {#each extra ? extraOptions(sc, slot.spellLevel, slot.blocked) : slotOptions(sc, slot.spellLevel, slot.blocked) as g (g.level)}
                  <optgroup label={`${tr({ en: 'Level', fr: 'Niveau' })} ${g.level}`}>
                    {#each g.spells as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
                  </optgroup>
                {/each}
              </select>
              {#if def}<button class="link sum" title={tr(def.summary)} onclick={() => spellPopup(def, sc, extra && sc.classId === 'cleric', prep)}
                  >ⓘ <span class="sumtext">{tr(def.summary)}</span></button
                >{:else}<span class="sum"></span>{/if}
              {#if prep.spontaneous}
                <small class="note"
                  >{tr({ en: 'as', fr: 'comme' })} {tr(rules.spells.get(prep.spontaneous)?.name)}</small
                >
              {/if}
              {#if def && (owned.length || prep.metamagic?.length)}
                {@const base = baseLevel(def, sc, extra && sc.classId === 'cleric')}
                {@const key = `${sc.classId}:${slot.spellLevel}:${j}`}
                <button
                  class="mmbtn"
                  class:on={!!prep.metamagic?.length}
                  aria-expanded={!!mmOpen[key]}
                  title={tr({ en: 'Metamagic', fr: 'Métamagie' })}
                  onclick={() => (mmOpen[key] = !mmOpen[key])}
                  >✦{#if prep.metamagic?.length}
                    {tr(metamagicLabel(rules, prep))} ({tr({ en: 'lvl', fr: 'niv.' })} {slotLevel(base, prep)}){/if}</button
                >
                {#if mmOpen[key]}
                  <div class="mmrow">
                    {#each owned as id (id)}
                      {@const on = !!prep.metamagic?.includes(id)}
                      {@const next = withFeat(sc, base, prep, id, !on, slot.spellLevel)}
                      {@const ok = on || (!!next && !illegal(def, sc, base, next, false).length)}
                      <label class="mmchip" class:on>
                        <input type="checkbox" checked={on} disabled={prep.cast || !ok} onchange={(e) => toggleFeat(sc, slot.spellLevel, j, prep, base, id, e.currentTarget.checked)} />
                        {tr(metamagicName(rules, id))}{id === 'heighten-spell' ? '' : ` +${metamagicDef(id)?.adj}`}
                      </label>
                    {/each}
                    {#if prep.metamagic?.includes('heighten-spell')}
                      <label class="mmchip on"
                        >{tr({ en: 'to level', fr: 'au niveau' })}
                        <select value={prep.heighten} disabled={prep.cast} onchange={(e) => setSlot(sc, slot.spellLevel, j, { heighten: Number(e.currentTarget.value) })}>
                          {#each heightenLevels(sc, base, prep, slot.spellLevel) as l (l)}<option value={l}>{l}</option>{/each}
                        </select></label
                      >
                    {/if}
                  </div>
                {/if}
              {/if}
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
              <button
                class="castbtn"
                class:done={prep.cast}
                disabled={!prep.id}
                aria-pressed={prep.cast}
                title={prep.cast ? tr({ en: 'Click to undo', fr: 'Cliquer pour annuler' }) : undefined}
                onclick={() => setSlot(sc, slot.spellLevel, j, prep.cast ? { cast: false, spontaneous: undefined } : { cast: true })}
                >{prep.cast ? tr({ en: 'Cast ✓', fr: 'Lancé ✓' }) : tr({ en: 'Cast', fr: 'Lancer' })}</button
              >
            </li>
          {/each}
        </ul>
      </div>
    {/each}

    {#if LEARNING_CLASSES.includes(sc.classId)}
      <SpellLearning {sc} onspell={(sp) => spellPopup(sp, sc)} />
    {/if}

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
            <li class="school-row school-{sp.schoolId}" title={tr(sp.school)}>
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

<WarningList areas={['spells']} />

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
  }
  .legend span {
    background: color-mix(in srgb, var(--school) 18%, transparent);
    border-left: 6px solid var(--school);
    padding: 0.1rem 0.5rem;
    border-radius: 2px;
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
  /* One line per spell: spell, summary (cut with an ellipsis), metamagic ✦, cast button; the metamagic options
     open on a second line only when asked. */
  .slots li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    padding: 0.15rem 0.3rem 0.15rem 0.6rem;
    margin-bottom: 2px;
    border-radius: 2px;
  }
  .slots li.extra {
    outline: 1px dashed var(--accent);
    outline-offset: -1px;
  }
  .list li {
    padding: 0.15rem 0.4rem 0.15rem 0.6rem;
    margin-bottom: 2px;
    border-radius: 2px;
  }
  .tag {
    font-size: 0.8rem;
    font-family: var(--font-title);
    color: var(--accent);
  }
  .spont {
    min-height: 2.2rem;
    max-width: 11rem;
    font-size: 0.85rem;
  }
  .mmbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
    align-items: center;
    margin-bottom: 0.6rem;
    font-size: 0.9rem;
  }
  .sum {
    flex: 1 1 8rem;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  /* Phones: the summary shrinks to its ⓘ (the popup has it), so a spell still fits on one line. */
  @media (max-width: 40rem) {
    .slots li > .sum:has(.sumtext) {
      flex: 0 0 auto;
    }
    .sumtext {
      display: none;
    }
    .slots li > select:not(.spont) {
      flex: 1 1 9rem;
    }
  }
  .mmbtn {
    min-height: 2.2rem;
    padding: 0 0.5rem;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .mmbtn.on,
  .mmbtn[aria-expanded='true'] {
    color: var(--accent);
    border-color: var(--accent);
  }
  .mmrow {
    order: 1; /* under the line, after the cast button */
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.2rem;
    font-size: 0.9rem;
  }
  .mmchip {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    margin-right: 0.6rem;
    min-height: 2.2rem;
  }
  .mmchip.on {
    font-weight: 600;
  }
  .mmchip select {
    min-height: 2rem;
  }
  .book {
    margin: 0.2rem 0 0.6rem;
  }
  .spont-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.2rem;
    margin-bottom: 0.6rem;
  }
  .slotcount {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .slotcount.spent span {
    color: var(--accent);
    text-decoration: line-through;
  }
  .slotcount small {
    color: var(--ink-soft);
  }
  .slotcount button,
  .castbtn {
    min-height: 2.2rem;
    min-width: 2.4rem;
    padding: 0 0.6rem;
  }
  .castbtn {
    min-width: 5.5rem;
  }
  .castbtn.done {
    color: var(--ink-soft);
    background: var(--paper-2);
    border-color: var(--rule);
  }
  .domains {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .slots li.cast select,
  .slots li.cast .sum {
    text-decoration: line-through;
    opacity: 0.75;
  }
  select {
    min-height: 2.2rem;
    max-width: 100%;
  }
  .slots li > select:not(.spont) {
    flex: 0 1 14rem;
    min-width: 9rem;
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
