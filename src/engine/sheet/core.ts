// Stage 3 — ability scores, class table sums, proficiencies, hit points, base attack bonus and saves.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import { type AbilityId, type SaveId, ABILITIES } from '../../data/types'
import type { Character } from '../../model/character'
import { i18n, resolve, type Part, type Stat } from '../stacking'
import { proficiencies } from '../proficiency'
import type { AbilityBlock, ComputeOptions } from './types'
import { src, abilityMod, ABILITY_NAMES, fmt } from './common'
import type { ModifiersOut } from './modifiers'

export function coreStage(rules: Rules, opts: ComputeOptions, c: ModifiersOut) {
  const {
    activeConditions,
    char,
    characterLevel,
    classLevels,
    crusaderLvl,
    feats,
    flags,
    focusPicks,
    levels,
    ownHp,
    paladinGood,
    partsFor,
    race,
    shape,
    sumTarget,
    toggles,
    warbladeLvl,
  } = c
  // ---- ability scores (docs/rules/abilities.md)
  const abilities = {} as Record<AbilityId, AbilityBlock>
  for (const a of ABILITIES) {
    // Wild shape: the form's Str, Dex and Con replace hers; Int, Wis, Cha stay (Alternate Form).
    const formScore = shape && (a === 'str' || a === 'dex' || a === 'con') ? shape.abilities[a] : undefined
    const parts: Part[] =
      formScore !== undefined && formScore !== null
        ? [
            {
              sourceId: 'wild-shape',
              label: i18n(`${shape!.name.en} (wild shape)`, `${shape!.name.fr} (forme animale)`),
              value: formScore,
              bonusType: 'base',
              source: shape!.source,
            },
          ]
        : [
            {
              sourceId: 'base',
              label: i18n('Base score', 'Valeur de base'),
              value: char.baseAbilities[a],
              bonusType: 'base',
            },
          ]
    // Racial adjustments (https://www.d20srd.org/srd/races.htm): part of the score, not a bonus.
    const adj = race.abilityAdjustments[a]
    if (adj && formScore === undefined)
      parts.push({ sourceId: 'race', label: race.name, value: adj, bonusType: 'base', source: race.source })
    levels.forEach((l, i) => {
      if (l.abilityIncrease === a && formScore === undefined)
        parts.push({
          sourceId: `increase:${i + 1}`,
          label: i18n(`Level ${i + 1} increase`, `Augmentation niveau ${i + 1}`),
          value: 1,
          bonusType: 'base',
          source: src('theBasics.htm#abilityScores'),
        })
    })
    parts.push(...partsFor([`ability.${a}`]))
    const damage = (char.abilityDamage[a] ?? 0) + sumTarget(`abilityDamage.${a}`)
    const drain = (char.abilityDrain[a] ?? 0) + sumTarget(`abilityDrain.${a}`)
    if (damage)
      parts.push({
        sourceId: 'damage',
        label: i18n('Ability damage', 'Affaiblissement'),
        value: -damage,
        bonusType: 'base',
        source: src('specialAbilities.htm#abilityScoreLoss'),
      })
    if (drain)
      parts.push({
        sourceId: 'drain',
        label: i18n('Ability drain', 'Diminution permanente'),
        value: -drain,
        bonusType: 'base',
        source: src('specialAbilities.htm#abilityScoreLoss'),
      })
    const score = resolve(parts)
    // Racial minimum (half-orc Int at least 3: https://www.d20srd.org/srd/races.htm#halfOrcs).
    const min = race.minimumScores?.[a]
    if (min !== undefined) {
      const starting = char.baseAbilities[a] + (adj ?? 0)
      if (starting < min) {
        score.parts.push({
          sourceId: 'race-minimum',
          label: i18n(`${race.name.en}: minimum ${min}`, `${race.name.fr} : minimum ${min}`),
          value: min - starting,
          bonusType: 'base',
          active: true,
          source: race.source,
        })
        score.total += min - starting
      }
    }
    score.total = Math.max(0, score.total)
    abilities[a] = { score, mod: abilityMod(score.total), damage, drain }
  }
  // Paralyzed (and similar): Str and Dex are 0 (https://www.d20srd.org/srd/conditionSummary.htm#paralyzed).
  if (flags.includes('strDexZero'))
    for (const a of ['str', 'dex'] as AbilityId[]) {
      const blk = abilities[a]
      blk.score.parts.push({
        sourceId: 'condition-zero',
        label: i18n('Paralyzed: score 0', 'Paralysé : valeur 0'),
        value: -blk.score.total,
        bonusType: 'base',
        active: true,
        source: src('conditionSummary.htm#paralyzed'),
      })
      blk.score.total = 0
      blk.mod = abilityMod(0)
    }
  const mod = (a: AbilityId) => abilities[a].mod
  const abilityPart = (a: AbilityId, value = mod(a)): Part => ({
    sourceId: `ability:${a}`,
    label: ABILITY_NAMES[a],
    value,
    bonusType: 'ability',
    source: src('theBasics.htm#abilityModifiers'),
  })

  // ---- class table sums
  const tableSum = (key: 'bab' | 'fort' | 'ref' | 'will'): Part[] =>
    Object.entries(classLevels).map(([classId, n]) => {
      const cls = rules.classes.get(classId)
      const row = cls?.table.find((r) => r.level === n)
      return {
        sourceId: `class:${classId}`,
        label: { en: `${cls?.name.en ?? classId} ${n}`, fr: `${cls?.name.fr ?? classId} ${n}` },
        value: row?.[key] ?? 0,
        bonusType: 'base' as const,
        source: cls?.source,
      }
    })

  // ---- proficiencies (union of the classes' lists)
  const proficiency = proficiencies(classLevels, feats, race, rules)
  const profArmor = proficiency.armor

  // ---- hit points (house rule #9: max hit die every level; Con retroactive)
  // Maximum hit die at 1st level (https://www.d20srd.org/srd/combat/combatStatistics.htm#hitPoints); later levels:
  // maximum too with house rule #9 (a setting), otherwise the roll entered for that level (average until entered).
  const maxHd = char.settings.maxHitDice !== false
  const hpParts: Part[] = levels.map((l, i) => {
    const cls = rules.classes.get(l.classId)
    const die = cls?.hitDie ?? 0
    const rolled = i > 0 && !maxHd
    const roll = rolled ? Math.min(die, Math.max(1, l.hpRoll ?? Math.ceil((die + 1) / 2))) : die
    const what = !rolled ? 'max' : l.hpRoll ? `${roll}` : `${roll} (avg., not rolled yet)`
    const whatFr = !rolled ? 'max' : l.hpRoll ? `${roll}` : `${roll} (moyenne, pas encore lancé)`
    return {
      sourceId: `hd:${i + 1}`,
      label: {
        en: `Level ${i + 1} (${cls?.name.en}) d${die} ${what}`,
        fr: `Niveau ${i + 1} (${cls?.name.fr}) d${die} ${whatFr}`,
      },
      value: roll,
      bonusType: 'base' as const,
      source: i === 0 || !maxHd ? src('combat/combatStatistics.htm#hitPoints') : { houseRule: 9 },
    }
  })
  hpParts.push({
    ...abilityPart('con', mod('con') * characterLevel),
    label: {
      en: `Constitution ${fmt(mod('con'))} × ${characterLevel}`,
      fr: `Constitution ${fmt(mod('con'))} × ${characterLevel}`,
    },
  })
  // At least 1 hp per Hit Die, level by level (https://www.d20srd.org/srd/combat/combatStatistics.htm#hitPoints).
  const perLevelShort = hpParts
    .filter((p) => p.sourceId.startsWith('hd:'))
    .reduce((n, p) => n + Math.max(0, 1 - (p.value + mod('con'))), 0)
  if (perLevelShort > 0)
    hpParts.push({
      sourceId: 'hp-min',
      label: i18n('Minimum 1 hp per level', 'Minimum 1 pv par niveau'),
      value: perLevelShort,
      bonusType: 'untyped',
      source: src('combat/combatStatistics.htm#hitPoints'),
    })
  hpParts.push(...partsFor(['hp.max']))
  const hpMax = ownHp ?? resolve(hpParts)

  // ---- BAB and iterative attacks
  const bab = resolve(tableSum('bab'))
  const iterativeBab: number[] = []
  for (let b = bab.total; iterativeBab.length === 0 || (b > 0 && iterativeBab.length < 4); b -= 5) iterativeBab.push(b)

  // Trap sense: +1 at barbarian 3 / rogue 3, +1 every 3 levels; levels of both classes stack
  // (https://www.d20srd.org/srd/classes/barbarian.htm#trapSense).
  const trapSense = ['barbarian', 'rogue'].reduce((n, id) => n + Math.floor((classLevels[id] ?? 0) / 3), 0)
  const trapSenseUrl =
    (classLevels['rogue'] ?? 0) >= 3 ? 'classes/rogue.htm#trapSense' : 'classes/barbarian.htm#trapSense'

  // ---- saves
  const saveAbility: Record<SaveId, AbilityId> = { fort: 'con', ref: 'dex', will: 'wis' }
  const saves = {} as Record<SaveId, Stat>
  // Flat-footed proper (the condition or the combat toggle), not every loss of Dex to AC (stunned, blinded…).
  const flatFootedNow = activeConditions.includes('flat-footed') || toggles.situational['flatFooted'] === true
  // A flat-footed character can't make attacks of opportunity (https://www.d20srd.org/srd/conditionSummary.htm#flatFooted).
  if (toggles.situational['flatFooted'] === true && !flags.includes('noAoO')) flags.push('noAoO')
  for (const s of ['fort', 'ref', 'will'] as SaveId[]) {
    const extra: Part[] = []
    // Warblade battle clarity (Tome of Battle p. 22): insight bonus = Int bonus (max warblade level) on Reflex
    // saves, as long as you're not flat-footed.
    if (s === 'ref' && warbladeLvl && mod('int') > 0)
      extra.push({
        sourceId: 'battle-clarity',
        label: i18n('Battle clarity', 'Clarté au combat'),
        value: flatFootedNow ? 0 : Math.min(mod('int'), warbladeLvl),
        bonusType: 'insight',
        source: { book: 'Tome of Battle', page: 22 },
      })
    // Paladin divine grace (2nd): Charisma bonus on all saves (https://www.d20srd.org/srd/classes/paladin.htm#divineGrace).
    if ((classLevels['paladin'] ?? 0) >= 2 && mod('cha') > 0 && paladinGood)
      extra.push({
        sourceId: 'divine-grace',
        label: i18n('Divine grace', 'Grâce divine'),
        value: mod('cha'),
        bonusType: 'untyped',
        source: src('classes/paladin.htm#divineGrace'),
      })
    // Crusader indomitable soul (ToB p. 11): Cha bonus on Will saves; doesn't stack with divine grace (same source id:
    // the better one counts).
    if (s === 'will' && crusaderLvl >= 2 && mod('cha') > 0)
      extra.push({
        sourceId: 'divine-grace',
        label: i18n('Indomitable soul', 'Âme indomptable'),
        value: mod('cha'),
        bonusType: 'untyped',
        source: { book: 'Tome of Battle', page: 11 },
      })
    // Swordsage defensive stance (ToB p. 16): +2 on saves while in a stance of a chosen discipline.
    const stanceNow = char.martial?.stance ? rules.maneuvers.get(char.martial.stance) : undefined
    if (stanceNow && focusPicks.stance.includes(stanceNow.discipline))
      extra.push({
        sourceId: 'defensive-stance',
        label: i18n('Discipline focus: defensive stance', 'Focalisation de discipline : posture défensive'),
        value: 2,
        bonusType: 'untyped',
        source: { book: 'Tome of Battle', page: 16 },
      })
    // Trap sense (barbarian, rogue; stacks between classes): Reflex vs traps.
    if (s === 'ref' && trapSense > 0)
      extra.push({
        sourceId: 'trap-sense',
        label: i18n('Trap sense', 'Sens des pièges'),
        value: trapSense,
        bonusType: 'untyped',
        source: src(trapSenseUrl),
        condition: i18n('vs traps', 'contre les pièges'),
        situationalOn: toggles.situational['trap-sense|ref'] ?? false,
        toggleKey: 'trap-sense|ref',
      })
    // Barbarian indomitable will (14th): +4 Will vs enchantment while raging.
    if (s === 'will' && (classLevels['barbarian'] ?? 0) >= 14 && flags.includes('raging'))
      extra.push({
        sourceId: 'indomitable-will',
        label: i18n('Indomitable will', 'Volonté indomptable'),
        value: 4,
        bonusType: 'untyped',
        source: src('classes/barbarian.htm#indomitableWill'),
        condition: i18n('vs enchantment, while raging', 'contre les enchantements, en rage'),
        situationalOn: toggles.situational['indomitable-will|will'] ?? false,
        toggleKey: 'indomitable-will|will',
      })
    saves[s] = resolve([...tableSum(s), abilityPart(saveAbility[s]), ...extra, ...partsFor([`save.${s}`, 'save.all'])])
  }

  return {
    abilities,
    mod,
    abilityPart,
    tableSum,
    proficiency,
    profArmor,
    hpMax,
    bab,
    iterativeBab,
    trapSense,
    trapSenseUrl,
    saves,
  }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type CoreOut = ModifiersOut & ReturnType<typeof coreStage>
