// Stage 2 — modifiers from feats, worn items, active effects and conditions, race, class features, favored enemies and Tome of Battle stances/maneuvers.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { i18n, type Part } from '../stacking'
import { effectLive, knownManeuvers, martialCapsAll } from '../martial'
import {
  BARD_URL,
  bardicSongs,
  FAMILIAR_URL,
  FAMILIARS,
  familiarLevel,
  isNewFamiliarKind,
  songModifiers,
  SONG_EFFECTS,
} from '../arcane'
import { rageStats } from '../classFeatures'
import type { ManeuverDef } from '../../data/types'
import type { ModSource, ComputeOptions, Size } from './types'
import { src, SIZE_HIDE } from './common'
import type { BuildOut } from './build'

export function modifiersStage(rules: Rules, opts: ComputeOptions, c: BuildOut) {
  const {
    alignment,
    char,
    characterLevel,
    classLevels,
    feats,
    levels,
    race,
    rangerAt,
    shape,
    size,
    sizeLabel,
    toggles,
  } = c
  // ---- collect modifiers from feats, worn items and active effects
  const mods: ModSource[] = []
  const flags: string[] = []
  // A feat taken several times without a choice (Toughness, Extra Turning): each pick is its own source, its effects
  // stack (https://www.d20srd.org/srd/feats.htm#toughness).
  const featPickNo: Record<string, number> = {}
  for (const f of feats) {
    const def = rules.feats.get(f.featId)
    const n = (featPickNo[f.featId] = (featPickNo[f.featId] ?? 0) + 1)
    const sourceId = def?.multiple && !f.choice && n > 1 ? `feat:${f.featId}#${n}` : `feat:${f.featId}`
    for (const spec of def?.modifiers ?? []) {
      if (spec.target.endsWith('.choice')) continue // handled per weapon
      mods.push({ spec, sourceId, label: def!.name, source: def!.source })
    }
  }
  // A custom weapon's bonuses apply while it is wielded (worn and in hand in the active loadout).
  const wieldedNow = new Set(
    (char.loadouts.find((l) => l.id === char.activeLoadout) ?? char.loadouts[0])?.weapons ?? [],
  )
  for (const item of char.inventory) {
    if (
      item.kind === 'weapon' &&
      item.custom?.modifiers &&
      wieldedNow.has(item.uid) &&
      item.location === 'worn' &&
      !shape
    ) {
      for (const spec of item.custom.modifiers)
        mods.push({ spec, sourceId: `item:${item.uid}`, label: item.name ?? i18n(item.refId) })
      continue
    }
    // A weapon gives its bonuses only in hand (above), not merely sheathed.
    if (item.location !== 'worn' || item.kind === 'weapon') continue
    const def = item.kind === 'magic' ? rules.magicItems.get(item.refId) : undefined
    for (const spec of def?.modifiers ?? item.custom?.modifiers ?? [])
      mods.push({
        spec,
        sourceId: `item:${item.uid}`,
        label: item.name ?? def?.name ?? i18n(item.refId),
        source: def?.source,
      })
  }
  // ---- race: racial bonuses (https://www.d20srd.org/srd/races.htm); Small size handled below
  for (const spec of race.modifiers)
    mods.push({ spec, sourceId: `race:${race.id}`, label: race.name, source: race.source })
  if (SIZE_HIDE[size])
    // Size modifier on Hide (https://www.d20srd.org/srd/skills/hide.htm): Small +4, Large −4…
    mods.push({
      spec: { target: 'skill.hide', bonusType: 'size', value: SIZE_HIDE[size] },
      sourceId: 'size',
      label: sizeLabel,
      source: { srdUrl: 'https://www.d20srd.org/srd/skills/hide.htm' },
    })
  // ---- wild shape: the +8 racial bonus that comes with a climb or swim speed (house rule #24: part of the movement
  // mode; https://www.d20srd.org/srd/specialAbilities.htm#movementModes, skills/climb.htm, skills/swim.htm).
  if (shape?.speed.climb)
    mods.push({
      spec: { target: 'skill.climb', bonusType: 'racial', value: 8 },
      sourceId: 'wild-shape-climb',
      label: i18n(
        `Climb speed (${shape.name.en}; can always take 10)`,
        `Vitesse d’escalade (${shape.name.fr} ; peut toujours faire 10)`,
      ),
      source: { srdUrl: 'https://www.d20srd.org/srd/skills/climb.htm', houseRule: 24 },
    })
  if (shape?.speed.swim)
    mods.push({
      spec: {
        target: 'skill.swim',
        bonusType: 'racial',
        value: 8,
        condition: i18n(
          'special action or hazard (can always take 10)',
          'action spéciale ou danger (peut toujours faire 10)',
        ),
      },
      sourceId: 'wild-shape-swim',
      label: i18n(`Swim speed (${shape.name.en})`, `Vitesse de nage (${shape.name.fr})`),
      source: { srdUrl: 'https://www.d20srd.org/srd/skills/swim.htm', houseRule: 24 },
    })
  // ---- class features with modifiers
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n)
        for (const spec of f.modifiers ?? [])
          mods.push({ spec, sourceId: `feature:${f.id}`, label: f.name, source: f.source })
  // ---- ranger favored enemies (https://www.d20srd.org/srd/classes/ranger.htm#favoredEnemy): +2 per type at
  // first, +2 more to one type at ranger 5/10/15/20; Bluff, Listen, Sense Motive, Spot, Survival and weapon damage.
  const ranger = rules.classes.get('ranger')
  const enemyBonus = new Map<string, number>()
  levels.forEach((l, i) => {
    const r = rangerAt[i]
    if (!(r === 1 || (r > 0 && r % 5 === 0))) return
    const pick = l.classChoices?.favoredEnemy
    if (pick && !enemyBonus.has(pick)) enemyBonus.set(pick, 2)
    const inc = r >= 5 ? l.classChoices?.favoredEnemyIncrease : undefined
    if (inc && enemyBonus.has(inc)) enemyBonus.set(inc, enemyBonus.get(inc)! + 2)
  })
  const favoredEnemies = [...enemyBonus].map(([id, bonus]) => ({
    id,
    bonus,
    name: ranger?.choices?.favoredEnemy?.find((o) => o.id === id)?.name ?? i18n(id, id),
  }))
  const feSource = ranger?.features?.find((f) => f.id === 'favored-enemy')?.source ?? {
    srdUrl: 'https://www.d20srd.org/srd/classes/ranger.htm#favoredEnemy',
  }
  for (const fe of favoredEnemies) {
    const vs = i18n(`vs ${fe.name.en}`, `contre ${fe.name.fr}`)
    for (const skill of ['bluff', 'listen', 'sense-motive', 'spot', 'survival'])
      mods.push({
        spec: { target: `skill.${skill}`, bonusType: 'untyped', value: fe.bonus, condition: vs },
        sourceId: `favored-enemy:${fe.id}`,
        label: i18n('Favored enemy', 'Ennemi juré'),
        source: feSource,
      })
    mods.push({
      spec: { target: 'damage.all', bonusType: 'untyped', value: fe.bonus, condition: vs },
      sourceId: `favored-enemy:${fe.id}`,
      label: i18n('Favored enemy', 'Ennemi juré'),
      source: feSource,
    })
  }

  // ---- Tome of Battle: stance and running maneuvers (house rule #15)
  // Every martial progression (crusader, swordsage, warblade; prestige classes add to one). Warblade features below use
  // the warblade level itself.
  const allCaps = martialCapsAll(char, rules, characterLevel)
  const caps = allCaps[0] ?? null
  const warbladeLvl = classLevels['warblade'] ?? 0
  const known = knownManeuvers(char, rules, characterLevel)
  const stance = known.find((k) => k.type === 'stance' && k.id === char.martial?.stance)
  // Each running maneuver has a turn stage; each of its effects ends at its own stage (engine/martial.ts).
  const running = (char.martial?.active ?? [])
    .map((a) => ({ def: rules.maneuvers.get(a.id), stage: a.stage ?? 0 }))
    .filter((r): r is { def: ManeuverDef; stage: number } => !!r.def)
  const runningManeuvers = running.map((r) => r.def)
  // Strike dice apply to the strike only (your turn); DR "for 1 round" lasts until your next turn (p. 84).
  const strikeDice = running.filter((r) => r.stage < 1).map((r) => r.def)
  const maneuverDR = running.filter((r) => r.stage < 2 && r.def.damageReduction).map((r) => r.def)
  for (const { def, stage } of [...(stance ? [{ def: stance, stage: 0 }] : []), ...running]) {
    for (const eff of def.effects ?? []) {
      if (eff.appliesTo === 'allies' || eff.appliesTo === 'target') continue
      if (!effectLive(eff, stage)) continue
      const il = Math.max(0, ...allCaps.map((c) => c.initiatorLevel))
      const value =
        eff.valueFrom === 'initiatorLevel'
          ? il
          : eff.valueFrom === 'halfInitiatorLevel'
            ? Math.floor(il / 2)
            : eff.valueFrom === 'critCount' // Blood in the Water: +1 per critical hit scored (ToB p. 86)
              ? (char.martial?.crits ?? 0) * eff.spec.value
              : eff.spec.value
      if (value === 0) continue
      // Maneuver and stance bonuses don't stack with each other (Tome of Battle p. 40): one shared source id
      // (unless the bonus comes from elsewhere, e.g. the normal charge bonus of Pouncing Charge).
      mods.push({
        spec: { ...eff.spec, value },
        sourceId: eff.stacksAs ?? 'martial',
        label: def.name,
        source: def.source,
      })
    }
  }

  // A condition replaced by a stronger active one (e.g. fatigued by exhausted) is ignored.
  const replaced = new Set(
    char.activeEffects
      .filter((e) => e.enabled && e.kind === 'condition')
      .flatMap((e) => rules.conditions.get(e.refId ?? '')?.replaces ?? []),
  )
  const activeConditions: string[] = []
  for (const eff of char.activeEffects) {
    if (!eff.enabled) continue
    if (eff.kind === 'condition') {
      const def = rules.conditions.get(eff.refId ?? '')
      if (!def || replaced.has(def.id)) continue
      activeConditions.push(def.id)
      flags.push(...def.flags)
      // Energy drained: the modifiers apply once per negative level (https://www.d20srd.org/srd/conditionSummary.htm#energyDrained).
      const times = def.flags.includes('perNegativeLevel') ? Math.max(1, Math.floor(eff.count ?? 1)) : 1
      const label = times > 1 ? i18n(`${def.name.en} ×${times}`, `${def.name.fr} ×${times}`) : def.name
      for (const spec of def.modifiers)
        mods.push({
          spec: { ...spec, value: spec.value * times },
          sourceId: `condition:${def.id}`,
          label,
          source: def.source,
        })
      // A condition that makes you helpless brings the helpless condition's own modifiers (−4 AC vs melee…)
      // (https://www.d20srd.org/srd/conditionSummary.htm#helpless).
      const helpless = rules.conditions.get('helpless')
      if (def.id !== 'helpless' && def.flags.includes('helpless') && helpless && !activeConditions.includes('helpless'))
        for (const spec of helpless.modifiers)
          mods.push({
            spec,
            sourceId: 'condition:helpless',
            label: { en: `${def.name.en} (helpless)`, fr: `${def.name.fr} (sans défense)` },
            source: helpless.source,
          })
    } else if (eff.kind === 'magic') {
      const def = rules.magicItems.get(eff.refId ?? '')
      for (const spec of def?.modifiers ?? [])
        mods.push({ spec, sourceId: `effect:${eff.refId}`, label: def!.name, source: def!.source })
    } else if (
      eff.kind === 'class' &&
      eff.refId === 'rage' &&
      (classLevels['barbarian'] ?? 0) > 0 &&
      alignment?.order !== 'lawful'
    ) {
      // Rage: +4 Str and Con (+6 greater, +8 mighty), +2 morale on Will (+3, +4), −2 AC
      // (https://www.d20srd.org/srd/classes/barbarian.htm#rage).
      const r = rageStats(classLevels['barbarian'])
      const source = src('classes/barbarian.htm#rage')
      for (const spec of [
        { target: 'ability.str', bonusType: 'untyped' as const, value: r.strCon },
        { target: 'ability.con', bonusType: 'untyped' as const, value: r.strCon },
        { target: 'save.will', bonusType: 'morale' as const, value: r.will },
        { target: 'ac', bonusType: 'untyped' as const, value: -2 },
      ])
        mods.push({ spec, sourceId: 'rage', label: r.name, source })
      flags.push('raging')
    } else if (eff.kind === 'class' && SONG_EFFECTS.includes(eff.refId ?? '') && (classLevels['bard'] ?? 0) > 0) {
      // Bardic music on the bard (https://www.d20srd.org/srd/classes/bard.htm#bardicMusic). While singing (no rounds
      // counted down yet) the bard can't cast spells or use spell-completion / command-word items.
      const song = bardicSongs(classLevels['bard'], 0).find((x) => x.id === eff.refId)
      if (song) {
        for (const spec of songModifiers(song.id, classLevels['bard']))
          mods.push({ spec, sourceId: `song:${song.id}`, label: song.name, source: { srdUrl: BARD_URL } })
        if (eff.rounds === undefined) flags.push('bardic-music')
      }
    } else if (eff.custom) {
      for (const spec of eff.custom.modifiers)
        mods.push({ spec, sourceId: `effect:${eff.uid}`, label: eff.custom.name })
    }
  }
  // Familiar: the master's benefit while within 1 mile, and Alertness while it is within arm's reach (a situational
  // toggle; nothing more if the master already has the feat). https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars
  const familiar =
    familiarLevel(classLevels) > 0 ? (char.companions ?? []).find((c) => c.kind === 'familiar') : undefined
  // An improved familiar (Improved Familiar feat) gives Alertness but no other master's benefit.
  const familiarDef =
    familiar &&
    (FAMILIARS.find((f) => f.id === familiar.creatureId) ??
      (isNewFamiliarKind(familiar.creatureId) ? { master: [] } : undefined))
  if (familiar && familiarDef) {
    const name = rules.creatures.get(familiar.creatureId)?.name ?? i18n(familiar.creatureId, familiar.creatureId)
    const label = i18n(`Familiar (${familiar.name || name.en})`, `Familier (${familiar.name || name.fr})`)
    for (const spec of familiarDef.master)
      mods.push({ spec, sourceId: 'familiar', label, source: { srdUrl: FAMILIAR_URL } })
    if (!feats.some((f) => f.featId === 'alertness'))
      for (const target of ['skill.listen', 'skill.spot'])
        mods.push({
          spec: {
            target,
            bonusType: 'untyped',
            value: 2,
            condition: i18n('familiar within arm’s reach (Alertness)', 'familier à portée de main (Vigilance)'),
          },
          sourceId: 'familiar-alertness',
          label,
          source: { srdUrl: FAMILIAR_URL },
        })
  }
  // Situational toggle key: source + target (+ condition text, e.g. prone vs melee / vs ranged).
  const keyOf = (m: ModSource) =>
    `${m.sourceId}|${m.spec.target}${m.spec.condition && !m.sourceId.startsWith('feat:') ? `|${m.spec.condition.en}` : ''}`
  const partsFor = (targets: string[]): Part[] =>
    mods
      .filter((m) => targets.includes(m.spec.target))
      .map((m) => ({
        // Situational parts get their own source (prone vs melee / vs ranged…), except maneuver bonuses, which
        // never stack with each other whatever the situation (Tome of Battle p. 40).
        sourceId: m.spec.condition && m.sourceId !== 'martial' ? `${m.sourceId}|${m.spec.condition.en}` : m.sourceId,
        label: m.label,
        value: m.spec.value,
        bonusType: m.spec.bonusType,
        source: m.source,
        condition: m.spec.condition,
        situationalOn: toggles.situational[keyOf(m)] ?? false,
        toggleKey: keyOf(m),
      }))
  const sumTarget = (target: string) =>
    mods.filter((m) => m.spec.target === target).reduce((s, m) => s + m.spec.value, 0)

  return {
    mods,
    flags,
    ranger,
    favoredEnemies,
    allCaps,
    caps,
    warbladeLvl,
    known,
    stance,
    runningManeuvers,
    strikeDice,
    maneuverDR,
    activeConditions,
    partsFor,
    sumTarget,
  }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type ModifiersOut = BuildOut & ReturnType<typeof modifiersStage>
