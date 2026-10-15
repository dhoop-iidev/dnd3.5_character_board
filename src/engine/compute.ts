// Character sheet computation. Every value is a Stat {total, parts} so the UI can show its breakdown.
// Rules references: docs/rules/*.md (formulas cite d20srd URLs there).
import type { Rules } from '../data/rules'
import type {
  AbilityId,
  ArmorDef,
  Distance,
  I18n,
  ModifierSpec,
  SaveId,
  SkillDef,
  Source,
  WeaponDef,
  Weight,
} from '../data/types'
import { ABILITIES } from '../data/types'
import type { Character, FeatPick, ItemInstance } from '../model/character'
import { i18n, resolve, type Part, type Stat } from './stacking'
import { effectLive, knownManeuvers, martialCaps, type MartialCaps } from './martial'
import { raceOf } from './race'
import { spellcastingOf, type Spellcasting } from './spells'
import type { RaceDef } from '../data/types'
import type { ManeuverDef } from '../data/types'

const SRD = 'https://www.d20srd.org/srd/'
const src = (path: string): Source => ({ srdUrl: SRD + path })

export const abilityMod = (score: number) => Math.floor((score - 10) / 2)
export const ftToDistance = (ft: number): Distance => ({ ft, m: (ft / 5) * 1.5 })
const lbToWeight = (lb: number): Weight => ({ lb, kg: lb / 2 })

const ABILITY_NAMES: Record<AbilityId, I18n> = {
  str: i18n('Strength', 'Force'),
  dex: i18n('Dexterity', 'Dextérité'),
  con: i18n('Constitution', 'Constitution'),
  int: i18n('Intelligence', 'Intelligence'),
  wis: i18n('Wisdom', 'Sagesse'),
  cha: i18n('Charisma', 'Charisme'),
}

/** A modifier from a feat, item or effect, before it is matched to a target. */
interface ModSource {
  spec: ModifierSpec
  sourceId: string
  label: I18n
  source?: Source
}

export interface AbilityBlock {
  score: Stat
  mod: number
  damage: number
  drain: number
}

export interface SkillLine {
  key: string
  def: SkillDef
  subtype?: string
  ranks: number
  classSkill: boolean
  usable: boolean
  total: Stat
}

export interface AttackLine {
  itemUid: string
  weapon: WeaponDef
  name: I18n
  attack: Stat
  /** Attack bonus of each iterative attack (full attack). */
  iterative: number[]
  damageDice: string
  damage: Stat
  critRange: number
  critMult: Stat
  /** Weapon Master features usable with this weapon. */
  weaponOfChoice: boolean
  kiDamageMax?: number
  powerAttackAllowed: boolean
  /** Extra damage dice from special abilities (flaming 1d6 fire, holy 2d6 vs evil…). */
  extraDamage: { dice: string; type: I18n; condition?: I18n; source: I18n }[]
  /** Extra dice on a confirmed critical (bursts, thundering), already multiplied. */
  critExtraDamage: { dice: string; type: I18n; source: I18n }[]
  /** Damage reduction types this weapon overcomes (adamantine, cold iron, silver, magic…). */
  bypassDR: string[]
  /** Described-only effects (vorpal, wounding…). */
  notes: { name: I18n; text: I18n }[]
  /** Bonus on rolls to confirm a critical hit (warblade battle ardor). */
  critConfirmBonus: number
  /** Two-weapon fighting: which hand this weapon is in. */
  hand?: 'primary' | 'off'
}

export type LoadBand = 'light' | 'medium' | 'heavy' | 'overloaded'

export interface Sheet {
  characterLevel: number
  classLevels: Record<string, number>
  feats: FeatPick[]
  abilities: Record<AbilityId, AbilityBlock>
  hpMax: Stat
  bab: Stat
  iterativeBab: number[]
  saves: Record<SaveId, Stat>
  ac: Stat
  touchAc: Stat
  flatFootedAc: Stat
  initiative: Stat
  grapple: Stat
  attacksOfOpportunity: Stat
  maxDex: { value: number | null; from: I18n }
  armorCheckPenalty: Stat
  speed: { base: Distance; current: Distance; from: I18n }
  load: { carried: Weight; band: LoadBand; limits: { light: Weight; medium: Weight; heavy: Weight } }
  skills: SkillLine[]
  attacks: AttackLine[]
  /** Flags from conditions (cantRun, loseDexToAc…). */
  flags: string[]
  weaponMaster: { level: number; active: boolean; kiDamagePerDay: number; increasedMultiplierPerDay: number }
  armor?: { item: ItemInstance; def: ArmorDef; category: ArmorDef['category'] }
  shield?: { item: ItemInstance; def: ArmorDef }
  /** Damage reduction from equipment (adamantine armor…) and maneuvers (Stone Bones…). */
  damageReduction: { value: string; source: I18n }[]
  race: RaceDef
  /** Spellcasting classes: caster level, spells per day (with bonus spells), save DCs. */
  spellcasting: Spellcasting[]
  /** Class-feature checks shown as stats (ranger wild empathy…). */
  featureStats: { id: string; name: I18n; stat: Stat }[]
  /** Ranger favored enemies: creature type -> bonus. */
  favoredEnemies: { id: string; name: I18n; bonus: number }[]
  /** Ranger combat style and whether it works now (light or no armor, https://www.d20srd.org/srd/classes/ranger.htm). */
  combatStyle?: { id: string; name: I18n; active: boolean }
  /** Tome of Battle: caps, known maneuvers/stances, current stance and running maneuvers. */
  martial: {
    caps: MartialCaps | null
    known: ManeuverDef[]
    stance?: ManeuverDef
    active: ManeuverDef[]
  }
}

export interface ComputeOptions {
  /** Compute as of this character level (validation of past levels). Default: all levels. */
  level?: number
}

const LOAD_EFFECTS: Record<'medium' | 'heavy', { maxDex: number; acp: number; speed30: number; speed20: number }> = {
  // https://www.d20srd.org/srd/carryingCapacity.htm (Table: Carrying Loads)
  medium: { maxDex: 3, acp: -3, speed30: 20, speed20: 15 },
  heavy: { maxDex: 1, acp: -6, speed30: 20, speed20: 15 },
}

/** Item weight, lb and kg as printed (house rule #5: kg from the French books). Stored items weigh nothing. */
function itemWeight(rules: Rules, item: ItemInstance): Weight {
  if (item.location === 'stored') return { lb: 0, kg: 0 }
  let w: Weight | undefined
  if (item.kind === 'weapon') w = rules.weapons.get(item.refId)?.weight
  else if (item.kind === 'armor') w = rules.armor.get(item.refId)?.weight
  else if (item.kind === 'gear') w = rules.gear.get(item.refId)?.weight
  else if (item.kind === 'magic') w = rules.magicItems.get(item.refId)?.weight
  else if (item.custom) w = lbToWeight(item.custom.weightLb)
  const factor = (item.material && rules.materials.get(item.material)?.effects.weightMultiplier) || 1
  return { lb: (w?.lb ?? 0) * item.quantity * factor, kg: (w?.kg ?? 0) * item.quantity * factor }
}

/** Carrying capacity for any Strength (×4 per +10 above 29). */
export function capacity(rules: Rules, str: number): { light: Weight; medium: Weight; heavy: Weight } {
  if (str <= 0) return { light: lbToWeight(0), medium: lbToWeight(0), heavy: lbToWeight(0) }
  let factor = 1
  let s = str
  while (s > 29) {
    s -= 10
    factor *= 4
  }
  const row = rules.carryingCapacity.find((r) => r.str === s)
  if (!row) throw new Error(`No carrying capacity row for Str ${s}`)
  const scale = (w: Weight): Weight => ({ lb: w.lb * factor, kg: w.kg * factor })
  return { light: scale(row.light), medium: scale(row.medium), heavy: scale(row.heavy) }
}

export function compute(char: Character, rules: Rules, opts: ComputeOptions = {}): Sheet {
  const levels = char.levels.slice(0, opts.level ?? char.levels.length)
  const characterLevel = levels.length
  const toggles = char.toggles

  // ---- class levels and feats
  const classLevels: Record<string, number> = {}
  for (const l of levels) classLevels[l.classId] = (classLevels[l.classId] ?? 0) + 1
  const race = raceOf(char, rules)
  const chosenFeats = levels.flatMap((l) => l.feats)
  // Feats granted by class features (ranger Track at 1st, Endurance at 3rd…).
  const granted: FeatPick[] = []
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n) for (const featId of f.grantsFeats ?? []) granted.push({ featId, slot: 'granted' })
  // Ranger combat style (https://www.d20srd.org/srd/classes/ranger.htm#combatStyle): feats at ranger 2/6/11,
  // usable only in light or no armor.
  const rangerLevel = classLevels['ranger'] ?? 0
  const styleId = levels.map((l) => l.classChoices?.combatStyle).find((x) => !!x)
  const wornArmor = char.inventory.find(
    (i) => i.kind === 'armor' && i.location === 'worn' && !['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
  )
  const wornCat = wornArmor ? rules.armor.get(wornArmor.refId)?.category : undefined
  const wornShift = wornArmor?.material ? (rules.materials.get(wornArmor.material)?.effects.armorCategoryShift ?? 0) : 0
  const wornIdx = ['light', 'medium', 'heavy'].indexOf(wornCat ?? 'light') - wornShift
  const styleActive = !wornArmor || wornIdx <= 0
  const STYLE_FEATS: Record<string, [number, string][]> = {
    archery: [[2, 'rapid-shot'], [6, 'manyshot'], [11, 'improved-precise-shot']],
    'two-weapon': [[2, 'two-weapon-fighting'], [6, 'improved-two-weapon-fighting'], [11, 'greater-two-weapon-fighting']],
  }
  if (rangerLevel >= 2 && styleId && styleActive)
    for (const [lvl, featId] of STYLE_FEATS[styleId] ?? []) if (rangerLevel >= lvl) granted.push({ featId, slot: 'granted' })
  const feats = [...chosenFeats, ...granted.filter((g) => !chosenFeats.some((c) => c.featId === g.featId && !c.choice))]
  const hasFeat = (id: string, choice?: string) =>
    feats.some((f) => f.featId === id && (choice === undefined || f.choice === choice))
  const wmLevel = classLevels['weapon-master'] ?? 0

  // ---- collect modifiers from feats, worn items and active effects
  const mods: ModSource[] = []
  const flags: string[] = []
  for (const f of feats) {
    const def = rules.feats.get(f.featId)
    for (const spec of def?.modifiers ?? []) {
      if (spec.target.endsWith('.choice')) continue // handled per weapon
      mods.push({ spec, sourceId: `feat:${f.featId}`, label: def!.name, source: def!.source })
    }
  }
  for (const item of char.inventory) {
    if (item.location !== 'worn') continue
    const def = item.kind === 'magic' ? rules.magicItems.get(item.refId) : undefined
    for (const spec of def?.modifiers ?? item.custom?.modifiers ?? [])
      mods.push({ spec, sourceId: `item:${item.uid}`, label: item.name ?? def?.name ?? i18n(item.refId), source: def?.source })
  }
  // ---- race: racial bonuses (https://www.d20srd.org/srd/races.htm); Small size handled below
  for (const spec of race.modifiers) mods.push({ spec, sourceId: `race:${race.id}`, label: race.name, source: race.source })
  if (race.size === 'small')
    // Small: +4 size bonus on Hide (https://www.d20srd.org/srd/skills/hide.htm).
    mods.push({ spec: { target: 'skill.hide', bonusType: 'size', value: 4 }, sourceId: 'size', label: i18n('Small size', 'Taille P'), source: { srdUrl: 'https://www.d20srd.org/srd/skills/hide.htm' } })
  // ---- class features with modifiers
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n) for (const spec of f.modifiers ?? []) mods.push({ spec, sourceId: `feature:${f.id}`, label: f.name, source: f.source })
  // ---- ranger favored enemies (https://www.d20srd.org/srd/classes/ranger.htm#favoredEnemy): +2 per type at
  // first, +2 more to one type at ranger 5/10/15/20; Bluff, Listen, Sense Motive, Spot, Survival and weapon damage.
  const ranger = rules.classes.get('ranger')
  const enemyBonus = new Map<string, number>()
  for (const l of levels) {
    const pick = l.classChoices?.favoredEnemy
    if (pick && !enemyBonus.has(pick)) enemyBonus.set(pick, 2)
    const inc = l.classChoices?.favoredEnemyIncrease
    if (inc && enemyBonus.has(inc)) enemyBonus.set(inc, enemyBonus.get(inc)! + 2)
  }
  const favoredEnemies = [...enemyBonus].map(([id, bonus]) => ({
    id,
    bonus,
    name: ranger?.choices?.favoredEnemy?.find((o) => o.id === id)?.name ?? i18n(id, id),
  }))
  const feSource = ranger?.features?.find((f) => f.id === 'favored-enemy')?.source ?? { srdUrl: 'https://www.d20srd.org/srd/classes/ranger.htm#favoredEnemy' }
  for (const fe of favoredEnemies) {
    const vs = i18n(`vs ${fe.name.en}`, `contre ${fe.name.fr}`)
    for (const skill of ['bluff', 'listen', 'sense-motive', 'spot', 'survival'])
      mods.push({ spec: { target: `skill.${skill}`, bonusType: 'untyped', value: fe.bonus, condition: vs }, sourceId: `favored-enemy:${fe.id}`, label: i18n('Favored enemy', 'Ennemi juré'), source: feSource })
    mods.push({
      spec: { target: 'damage.all', bonusType: 'untyped', value: fe.bonus, condition: i18n(`vs ${fe.name.en} (ranged: within 30 ft.)`, `contre ${fe.name.fr} (à distance : à 9 m ou moins)`) },
      sourceId: `favored-enemy:${fe.id}`,
      label: i18n('Favored enemy', 'Ennemi juré'),
      source: feSource,
    })
  }

  // ---- Tome of Battle: stance and running maneuvers (house rule #15)
  const caps = martialCaps(char, rules, characterLevel)
  const known = caps ? knownManeuvers(char, rules, characterLevel) : []
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
      const il = caps?.initiatorLevel ?? 0
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
      mods.push({ spec: { ...eff.spec, value }, sourceId: eff.stacksAs ?? 'martial', label: def.name, source: def.source })
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
      for (const spec of def.modifiers) mods.push({ spec, sourceId: `condition:${def.id}`, label: def.name, source: def.source })
    } else if (eff.kind === 'magic') {
      const def = rules.magicItems.get(eff.refId ?? '')
      for (const spec of def?.modifiers ?? [])
        mods.push({ spec, sourceId: `effect:${eff.refId}`, label: def!.name, source: def!.source })
    } else if (eff.custom) {
      for (const spec of eff.custom.modifiers) mods.push({ spec, sourceId: `effect:${eff.uid}`, label: eff.custom.name })
    }
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

  // ---- ability scores (docs/rules/abilities.md)
  const abilities = {} as Record<AbilityId, AbilityBlock>
  for (const a of ABILITIES) {
    const parts: Part[] = [
      { sourceId: 'base', label: i18n('Base score', 'Valeur de base'), value: char.baseAbilities[a], bonusType: 'base' },
    ]
    // Racial adjustments (https://www.d20srd.org/srd/races.htm): part of the score, not a bonus.
    const adj = race.abilityAdjustments[a]
    if (adj) parts.push({ sourceId: 'race', label: race.name, value: adj, bonusType: 'base', source: race.source })
    levels.forEach((l, i) => {
      if (l.abilityIncrease === a)
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
      parts.push({ sourceId: 'damage', label: i18n('Ability damage', 'Affaiblissement'), value: -damage, bonusType: 'base', source: src('specialAbilities.htm#abilityScoreLoss') })
    if (drain)
      parts.push({ sourceId: 'drain', label: i18n('Ability drain', 'Diminution permanente'), value: -drain, bonusType: 'base', source: src('specialAbilities.htm#abilityScoreLoss') })
    const score = resolve(parts)
    score.total = Math.max(0, score.total)
    abilities[a] = { score, mod: abilityMod(score.total), damage, drain }
  }
  // Paralyzed (and similar): Str and Dex are 0 (https://www.d20srd.org/srd/conditionSummary.htm#paralyzed).
  if (flags.includes('strDexZero'))
    for (const a of ['str', 'dex'] as AbilityId[]) {
      const blk = abilities[a]
      blk.score.parts.push({ sourceId: 'condition-zero', label: i18n('Paralyzed: score 0', 'Paralysé : valeur 0'), value: -blk.score.total, bonusType: 'base', active: true, source: src('conditionSummary.htm#paralyzed') })
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
  const profWeapons = new Set(Object.keys(classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.weapons ?? []))
  // Racial weapon proficiencies (elf) and weapon familiarity: exotic racial weapons count as martial (dwarf, gnome).
  for (const id of race.weaponProficiencies ?? []) profWeapons.add(id)
  if (profWeapons.has('martial')) for (const id of race.weaponFamiliarity ?? []) profWeapons.add(id)
  const profArmor = new Set(Object.keys(classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.armor ?? []))

  // ---- hit points (house rule #9: max hit die every level; Con retroactive)
  const hpParts: Part[] = levels.map((l, i) => {
    const cls = rules.classes.get(l.classId)
    return {
      sourceId: `hd:${i + 1}`,
      label: { en: `Level ${i + 1} (${cls?.name.en}) d${cls?.hitDie} max`, fr: `Niveau ${i + 1} (${cls?.name.fr}) d${cls?.hitDie} max` },
      value: cls?.hitDie ?? 0,
      bonusType: 'base' as const,
      source: { houseRule: 9 },
    }
  })
  hpParts.push({ ...abilityPart('con', mod('con') * characterLevel), label: { en: `Constitution ${fmt(mod('con'))} × ${characterLevel}`, fr: `Constitution ${fmt(mod('con'))} × ${characterLevel}` } })
  hpParts.push(...partsFor(['hp.max']))
  const hpMax = resolve(hpParts)
  hpMax.total = Math.max(characterLevel, hpMax.total) // at least 1 hp per Hit Die

  // ---- BAB and iterative attacks
  const bab = resolve(tableSum('bab'))
  const iterativeBab: number[] = []
  for (let b = bab.total; iterativeBab.length === 0 || (b > 0 && iterativeBab.length < 4); b -= 5) iterativeBab.push(b)

  // ---- saves
  const saveAbility: Record<SaveId, AbilityId> = { fort: 'con', ref: 'dex', will: 'wis' }
  const saves = {} as Record<SaveId, Stat>
  // Flat-footed proper (the condition or the combat toggle), not every loss of Dex to AC (stunned, blinded…).
  const flatFootedNow = activeConditions.includes('flat-footed') || toggles.situational['flatFooted'] === true
  for (const s of ['fort', 'ref', 'will'] as SaveId[]) {
    const extra: Part[] = []
    // Warblade battle clarity (Tome of Battle p. 22): insight bonus = Int bonus (max warblade level) on Reflex
    // saves, as long as you're not flat-footed.
    if (s === 'ref' && caps && mod('int') > 0)
      extra.push({
        sourceId: 'battle-clarity',
        label: i18n('Battle clarity', 'Clarté au combat'),
        value: flatFootedNow ? 0 : Math.min(mod('int'), caps.classLevel),
        bonusType: 'insight',
        source: { book: 'Tome of Battle', page: 22 },
      })
    saves[s] = resolve([...tableSum(s), abilityPart(saveAbility[s]), ...extra, ...partsFor([`save.${s}`, 'save.all'])])
  }

  // ---- armor, shield, load
  const loadout = char.loadouts.find((l) => l.id === char.activeLoadout) ?? char.loadouts[0]
  const armorItem = char.inventory.find(
    (i) => i.kind === 'armor' && i.location === 'worn' && !['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
  )
  const armorDef = armorItem && rules.armor.get(armorItem.refId)
  const armorMat = armorItem?.material ? rules.materials.get(armorItem.material) : undefined
  // Mithral: one category lighter for movement and other limitations (https://www.d20srd.org/srd/specialMaterials.htm#mithral).
  const CATS = ['light', 'medium', 'heavy'] as const
  const shiftCat = (cat: ArmorDef['category']) => {
    const i = CATS.indexOf(cat as (typeof CATS)[number])
    return i < 0 || !armorMat?.effects.armorCategoryShift ? cat : CATS[Math.max(0, i - armorMat.effects.armorCategoryShift)]
  }
  const armor = armorItem && armorDef ? { item: armorItem, def: armorDef, category: shiftCat(armorDef.category) } : undefined
  const shieldItem = loadout?.shield ? char.inventory.find((i) => i.uid === loadout.shield) : undefined
  const shield = shieldItem ? { item: shieldItem, def: rules.armor.get(shieldItem.refId)! } : undefined

  const carried = char.inventory.reduce(
    (s, i) => {
      const w = itemWeight(rules, i)
      return { lb: s.lb + w.lb, kg: s.kg + w.kg }
    },
    { lb: 0, kg: 0 },
  )
  // Coins: 50 coins weigh 1 lb (https://www.d20srd.org/srd/equipment/wealthAndMoney.htm).
  const m = char.money
  const coins = m ? m.cp + m.sp + m.gp + m.pp : 0
  carried.lb += coins / 50
  carried.kg += coins / 100
  const carriedLb = carried.lb
  const capMedium = capacity(rules, abilities.str.score.total)
  // Small creatures carry ×3/4 (https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures).
  const sizeFactor = race.size === 'small' ? 0.75 : 1
  const scaleW = (w: Weight): Weight => ({ lb: round2(w.lb * sizeFactor), kg: round2(w.kg * sizeFactor) })
  const limits = { light: scaleW(capMedium.light), medium: scaleW(capMedium.medium), heavy: scaleW(capMedium.heavy) }
  const band: LoadBand =
    carriedLb <= limits.light.lb ? 'light' : carriedLb <= limits.medium.lb ? 'medium' : carriedLb <= limits.heavy.lb ? 'heavy' : 'overloaded'
  const loadFx = band === 'light' ? undefined : LOAD_EFFECTS[band === 'overloaded' ? 'heavy' : band]

  // Max Dex: the most restrictive of armor, shield, load.
  const dexCaps: { value: number; from: I18n }[] = []
  if (armor && armor.def.maxDex !== null) dexCaps.push({ value: armor.def.maxDex + (armorMat?.effects.maxDexBonus ?? 0), from: armor.def.name })
  if (shield && shield.def.maxDex !== null) dexCaps.push({ value: shield.def.maxDex, from: shield.def.name })
  if (loadFx) dexCaps.push({ value: loadFx.maxDex, from: i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`) })
  const cap = dexCaps.length ? dexCaps.reduce((a, b) => (b.value < a.value ? b : a)) : undefined
  const maxDex = { value: cap?.value ?? null, from: cap?.from ?? i18n('none', 'aucun') }

  // Armor check penalty: (armor + strapped shield) vs load, the worse applies (house rule #13).
  const itemAcp = (x?: { item: ItemInstance; def: ArmorDef }) => {
    if (!x) return 0
    const mat = x.item.material ? rules.materials.get(x.item.material) : undefined
    const mw = x.item.masterwork || (x.item.enhancement ?? 0) > 0 || !!mat?.effects.masterwork
    // Masterwork −1; mithral −3 in total, masterwork included (SRD elven chain: chainmail −5 → −2).
    // A penalty never becomes a bonus (rulings R25).
    return Math.min(0, x.def.acp + (mat?.effects.acpReduction ?? (mw ? 1 : 0)))
  }
  const gearAcp = itemAcp(armor) + itemAcp(shield)
  const acpParts: Part[] = []
  if (loadFx && loadFx.acp < gearAcp) {
    acpParts.push({ sourceId: 'load', label: i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`), value: loadFx.acp, bonusType: 'base', source: src('carryingCapacity.htm') })
  } else {
    if (armor && itemAcp(armor))
      acpParts.push({ sourceId: `item:${armor.item.uid}`, label: armor.item.name ?? armor.def.name, value: itemAcp(armor), bonusType: 'base', source: src('equipment/armor.htm#armorCheckPenalty') })
    if (shield && itemAcp(shield))
      acpParts.push({ sourceId: `item:${shield.item.uid}`, label: shield.item.name ?? shield.def.name, value: itemAcp(shield), bonusType: 'base', source: src('equipment/armor.htm#armorCheckPenalty') })
  }
  const armorCheckPenalty = resolve(acpParts)

  // Speed: racial base (https://www.d20srd.org/srd/races.htm), then the worse of armor and load (30-ft or 20-ft
  // column). Dwarves keep their speed in medium/heavy armor and loads.
  const baseFt = race.speed
  let speedFt = baseFt
  let speedFrom = i18n('base', 'base')
  const slow = baseFt <= 20
  const armorSpeed = armor && (slow ? armor.def.speed20 : armor.def.speed30)
  if (!race.speedNotReducedByArmor && armor && ['medium', 'heavy'].includes(armor.category) && armorSpeed && armorSpeed.ft < speedFt) {
    speedFt = armorSpeed.ft
    speedFrom = armor.def.name
  }
  const loadSpeed = loadFx && (slow ? loadFx.speed20 : loadFx.speed30)
  if (!race.speedNotReducedByArmor && loadSpeed && loadSpeed < speedFt) {
    speedFt = loadSpeed
    speedFrom = i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`)
  }
  // Speed bonuses follow the stacking rules; haste-like enhancement bonuses cap at twice the normal speed
  // (https://www.d20srd.org/srd/spells/haste.htm).
  const speedBonus = resolve(partsFor(['speed'])).total
  speedFt += speedBonus > 0 ? Math.min(speedBonus, speedFt) : speedBonus
  if (sumTarget('speed.half') > 0) speedFt = Math.floor(speedFt / 2 / 5) * 5
  if (band === 'overloaded') speedFt = 5

  // ---- AC
  const loseDex = flags.includes('loseDexToAc') || sumTarget('ac.noDex') > 0 || toggles.situational['flatFooted'] === true
  // Helpless / pinned: treated as Dex 0 (−5) for AC (rulings R14, R15).
  const dexZero = flags.includes('dexZeroForAc') || flags.includes('helpless')
  const dexToAc = dexZero ? abilityMod(0) : maxDex.value === null ? mod('dex') : Math.min(mod('dex'), maxDex.value)
  const acParts: Part[] = [{ sourceId: 'base10', label: i18n('Base', 'Base'), value: 10, bonusType: 'base', source: src('combat/combatStatistics.htm#armorClass') }]
  // Size modifier (https://www.d20srd.org/srd/combat/combatStatistics.htm#sizeModifier): Small +1.
  const sizePart = (value: number): Part => ({ sourceId: 'size', label: i18n('Small size', 'Taille P'), value, bonusType: 'size', source: src('combat/combatStatistics.htm#sizeModifier') })
  if (race.size === 'small') acParts.push(sizePart(1))
  if (armor) {
    const enh = armor.item.enhancement ?? 0
    acParts.push({
      sourceId: `item:${armor.item.uid}`,
      label: { en: `${armor.def.name.en}${enh ? ` +${enh}` : ''}`, fr: `${armor.def.name.fr}${enh ? ` +${enh}` : ''}` },
      value: armor.def.armorBonus + enh,
      bonusType: 'armor',
      source: armor.def.source,
    })
  }
  if (shield) {
    const enh = shield.item.enhancement ?? 0
    acParts.push({
      sourceId: `item:${shield.item.uid}`,
      label: { en: `${shield.def.name.en}${enh ? ` +${enh}` : ''}`, fr: `${shield.def.name.fr}${enh ? ` +${enh}` : ''}` },
      value: shield.def.armorBonus + enh,
      bonusType: 'shield',
      source: shield.def.source,
    })
  }
  acParts.push({
    ...abilityPart('dex', dexToAc),
    label: dexZero
      ? i18n('Dexterity treated as 0 (helpless/pinned)', 'Dextérité considérée comme 0 (sans défense/immobilisé)')
      : maxDex.value !== null && mod('dex') > maxDex.value
      ? { en: `Dexterity (capped at +${maxDex.value} by ${maxDex.from.en})`, fr: `Dextérité (limitée à +${maxDex.value} par ${maxDex.from.fr})` }
      : ABILITY_NAMES.dex,
  })
  // Tumble 5+ ranks: +3 dodge when fighting defensively, +6 in total defense (https://www.d20srd.org/srd/skills/tumble.htm).
  const tumbleRanks = levels.reduce((n, l) => n + (l.skillRanks['tumble'] ?? 0), 0)
  const tumble5 = tumbleRanks >= 5
  if (hasFeat('combat-expertise') && toggles.combatExpertise > 0)
    acParts.push({ sourceId: 'combat-expertise', label: i18n('Combat Expertise', 'Expertise du combat'), value: toggles.combatExpertise, bonusType: 'dodge', source: src('feats.htm#combatExpertise') })
  if (toggles.fightingDefensively)
    acParts.push({ sourceId: 'fighting-defensively', label: tumble5 ? i18n('Fighting defensively (Tumble 5 ranks)', 'Combat sur la défensive (Acrobaties 5 degrés)') : i18n('Fighting defensively', 'Combat sur la défensive'), value: tumble5 ? 3 : 2, bonusType: 'dodge', source: src('combat/actionsInCombat.htm#fightDefensively') })
  if (toggles.totalDefense)
    acParts.push({ sourceId: 'total-defense', label: tumble5 ? i18n('Total defense (Tumble 5 ranks)', 'Défense totale (Acrobaties 5 degrés)') : i18n('Total defense', 'Défense totale'), value: tumble5 ? 6 : 4, bonusType: 'dodge', source: src('combat/actionsInCombat.htm#totalDefense') })
  acParts.push(...partsFor(['ac']))
  // Uncanny dodge (warblade 2, Tome of Battle p. 22): keeps the Dex bonus when caught flat-footed (or by an invisible
  // attacker), not when it is lost for another reason (stunned, blinded, cowering, pinned…).
  const otherDexLoss =
    activeConditions.some((id) => id !== 'flat-footed' && rules.conditions.get(id)?.flags.includes('loseDexToAc')) ||
    sumTarget('ac.noDex') > 0
  const uncannyDodge = !!caps && caps.classLevel >= 2 && !otherDexLoss
  const stripDex = (parts: Part[]) =>
    parts.filter(
      (p) => !(p.sourceId === 'ability:dex' && p.value > 0 && !dexZero && !uncannyDodge) && p.bonusType !== 'dodge',
    )
  const ac = resolve(loseDex ? stripDex(acParts) : acParts)
  const touchAc = resolve((loseDex ? stripDex(acParts) : acParts).filter((p) => !['armor', 'shield', 'naturalArmor'].includes(p.bonusType)))
  const flatFootedAc = resolve(stripDex(acParts))

  // ---- initiative, grapple
  // An initiative check is a Dexterity check: ability-check modifiers apply (https://www.d20srd.org/srd/combat/initiative.htm).
  // Situational Dex-check bonuses (e.g. "to resist a trip") are not initiative bonuses.
  const initiative = resolve([abilityPart('dex'), ...partsFor(['initiative']), ...partsFor(['check.dex']).filter((p) => !p.condition)])
  // Grapple: special size modifier, Small −4 (https://www.d20srd.org/srd/combat/specialAttacks.htm#grapple).
  const grapple = resolve([
    ...tableSum('bab'),
    abilityPart('str'),
    ...(race.size === 'small' ? [{ ...sizePart(-4), source: src('combat/specialAttacks.htm#grapple') }] : []),
    ...partsFor(['grapple']),
  ])

  // ---- Weapon Master features need the class requirements to stay met (Complete Warrior p.16, rulings q6):
  // current ability scores and a masterwork weapon of choice.
  const wmReq = rules.classes.get('weapon-master')?.requirements
  const wmAbilitiesOk = Object.entries(wmReq?.abilities ?? {}).every(([a, min]) => abilities[a as AbilityId].score.total >= (min ?? 0))
  const wmActive = wmLevel > 0 && wmAbilitiesOk

  // ---- attacks of opportunity (Combat Reflexes; Superior Combat Reflexes = better of the two, house rule #12)
  const aooParts: Part[] = [{ sourceId: 'base', label: i18n('Base', 'Base'), value: 1, bonusType: 'base', source: src('combat/attacksOfOpportunity.htm') }]
  let aooBest = 1
  if (hasFeat('combat-reflexes')) aooBest = Math.max(aooBest, 1 + Math.max(0, mod('dex')))
  if (wmActive && wmLevel >= 5) aooBest = Math.max(aooBest, mod('dex') + mod('wis'))
  if (aooBest > 1)
    aooParts.push({
      sourceId: 'combat-reflexes',
      label: wmActive && wmLevel >= 5 && mod('dex') + mod('wis') >= 1 + mod('dex')
        ? i18n('Superior Combat Reflexes (Dex + Wis)', 'Attaques réflexes suprêmes (Dex + Sag)')
        : i18n('Combat Reflexes (Dex)', 'Attaques réflexes (Dex)'),
      value: aooBest - 1,
      bonusType: 'untyped',
      source: wmLevel >= 5 ? { book: 'Sword and Fist', page: 39, houseRule: 12 } : src('feats.htm#combatReflexes'),
    })
  const attacksOfOpportunity = resolve(aooParts)

  // ---- skills (docs/rules/skills.md)
  const ranksByKey: Record<string, number> = {}
  for (const l of levels) for (const [k, v] of Object.entries(l.skillRanks)) ranksByKey[k] = (ranksByKey[k] ?? 0) + v
  const isClassSkill = (skillId: string) =>
    Object.keys(classLevels).some((c) => rules.classes.get(c)?.classSkills.includes(skillId))
  const skillKeys = new Set<string>()
  for (const s of rules.skills.values()) if (!s.hasSubtypes) skillKeys.add(s.id)
  for (const k of Object.keys(ranksByKey)) skillKeys.add(k)
  const skills: SkillLine[] = []
  for (const key of skillKeys) {
    const [id, subtype] = key.split(':')
    const def = rules.skills.get(id)
    if (!def) continue
    const ranks = ranksByKey[key] ?? 0
    const parts: Part[] = []
    if (ranks) parts.push({ sourceId: 'ranks', label: i18n('Ranks', 'Degrés de maîtrise'), value: Math.floor(ranks), bonusType: 'base', source: src('skills/skillsSummary.htm') })
    if (!def.noAbility) parts.push(abilityPart(def.ability))
    // Jump: −6 per 10 ft of speed below 30 ft, +4 per 10 ft above (armor, load and spells count:
    // https://www.d20srd.org/srd/skills/jump.htm). Counted per full 10 ft.
    if (id === 'jump' && speedFt !== 30) {
      const steps = Math.floor(Math.abs(speedFt - 30) / 10)
      const value = speedFt < 30 ? -6 * steps : 4 * steps
      if (value)
        parts.push({ sourceId: 'jump-speed', label: { en: `Speed ${speedFt} ft`, fr: `Vitesse ${(speedFt / 5) * 1.5} m` }, value, bonusType: 'base', source: src('skills/jump.htm') })
    }
    if (def.armorCheck && armorCheckPenalty.total)
      parts.push({ sourceId: 'acp', label: i18n('Armor check penalty', "Malus d'armure aux tests"), value: armorCheckPenalty.total * def.armorCheck, bonusType: 'base', source: src('equipment/armor.htm#armorCheckPenalty') })
    for (const syn of rules.synergies) {
      if (syn.to !== id && syn.to !== key) continue
      const fromRanks = ranksByKey[syn.from] ?? 0
      if (fromRanks < syn.ranks) continue
      const fromDef = rules.skills.get(syn.from.split(':')[0])
      parts.push({
        sourceId: `synergy:${syn.from}`,
        label: { en: `Synergy (${fromDef?.name.en ?? syn.from})`, fr: `Synergie (${fromDef?.name.fr ?? syn.from})` },
        value: syn.value,
        bonusType: 'untyped',
        source: syn.source,
        condition: syn.condition,
        situationalOn: toggles.situational[`synergy:${syn.from}|skill.${id}`] ?? false,
        toggleKey: `synergy:${syn.from}|skill.${id}`,
      })
    }
    const strdex = def.ability === 'str' || def.ability === 'dex' ? ['skill.strdex'] : []
    for (const f of feats) {
      // Skill Focus and similar feats: modifier on the chosen skill.
      const fdef = rules.feats.get(f.featId)
      for (const spec of fdef?.modifiers ?? [])
        if (spec.target === 'skill.choice' && (f.choice === key || f.choice === id))
          parts.push({ sourceId: `feat:${f.featId}:${f.choice}`, label: fdef!.name, value: spec.value, bonusType: spec.bonusType, source: fdef!.source })
    }
    parts.push(...partsFor([`skill.${id}`, `skill.${key}`, 'skill.all', ...strdex]))
    skills.push({ key, def, subtype, ranks, classSkill: isClassSkill(id), usable: !def.trainedOnly || ranks > 0, total: resolve(parts) })
  }
  skills.sort((a, b) => a.def.name.en.localeCompare(b.def.name.en))

  // ---- attacks per weapon in the active loadout (docs/rules/combat.md)
  const attacks: AttackLine[] = []
  // Two-weapon fighting (https://www.d20srd.org/srd/combat/specialAttacks.htm#twoWeaponFighting): the first two melee
  // weapons in hand are the primary and off hand when the loadout says so.
  const meleeInHand = (loadout?.weapons ?? []).filter((uid) => {
    const it = char.inventory.find((i) => i.uid === uid)
    return it && rules.weapons.get(it.refId)?.kind === 'melee'
  })
  const twf = !!loadout?.twoWeapon && meleeInHand.length >= 2
  const [primaryUid, offUid] = twf ? meleeInHand : []
  const offWeapon = offUid ? rules.weapons.get(char.inventory.find((i) => i.uid === offUid)!.refId) : undefined
  const offLight = offWeapon?.handedness === 'light' || offWeapon?.handedness === 'unarmed'
  const twfSource = src('combat/specialAttacks.htm#twoWeaponFighting')
  for (const uid of loadout?.weapons ?? []) {
    const item = char.inventory.find((i) => i.uid === uid)
    const weapon = item && rules.weapons.get(item.refId)
    if (!item || !weapon) continue
    const melee = weapon.kind === 'melee'
    const hand = twf && uid === primaryUid ? 'primary' : twf && uid === offUid ? 'off' : undefined
    // Ranged families (https://www.d20srd.org/srd/combat/combatStatistics.htm#strengthBonus): thrown weapons and slings
    // add Str to damage; bows take only a Str penalty (composite ratings not modeled); crossbows ignore Str.
    const family = /crossbow/.test(weapon.id)
      ? 'crossbow'
      : /bow/.test(weapon.id)
        ? 'bow'
        : weapon.id === 'sling'
          ? 'sling'
          : melee
            ? 'melee'
            : 'thrown'
    const enh = item.enhancement ?? 0
    const mat = item.material ? rules.materials.get(item.material) : undefined
    const props = (item.properties ?? []).map((id) => rules.itemProperties.get(id)).filter((d) => !!d)
    const masterwork = item.masterwork || enh > 0 || !!mat?.effects.masterwork
    const choiceFeat = (id: string) => feats.find((f) => f.featId === id && f.choice === weapon.id)
    const weaponOfChoice = wmActive && char.weaponOfChoice === weapon.id && masterwork
    const name: I18n = item.name ?? { en: `${weapon.name.en}${enh ? ` +${enh}` : ''}`, fr: `${weapon.name.fr}${enh ? ` +${enh}` : ''}` }
    // A one-handed weapon can be gripped two-handed (Str x1.5, Power Attack x2).
    const twoHands = weapon.handedness === 'twoHanded' || (weapon.handedness === 'oneHanded' && (loadout?.twoHanded ?? []).includes(uid))

    const atk: Part[] = [...tableSum('bab'), abilityPart(melee ? 'str' : 'dex')]
    if (race.size === 'small') atk.push(sizePart(1))
    if (hand) {
      // Normal −6/−10; light off-hand weapon −4/−8; Two-Weapon Fighting feat −2/−2 better each.
      let pen = hand === 'primary' ? -6 : -10
      if (offLight) pen += 2
      if (hasFeat('two-weapon-fighting')) pen += hand === 'primary' ? 2 : 6
      atk.push({
        sourceId: 'two-weapon',
        label: hand === 'primary' ? i18n('Two-weapon fighting: primary hand', 'Combat à deux armes : main directrice') : i18n('Two-weapon fighting: off hand', 'Combat à deux armes : main non directrice'),
        value: pen,
        bonusType: 'untyped',
        source: twfSource,
      })
    }
    // Rapid Shot (https://www.d20srd.org/srd/feats.htm#rapidShot): −2 on every ranged attack of the full attack.
    const rapidShot = !melee && toggles.rapidShot === true && hasFeat('rapid-shot')
    if (rapidShot) atk.push({ sourceId: 'rapid-shot', label: i18n('Rapid Shot', 'Tir rapide'), value: -2, bonusType: 'untyped', source: src('feats.htm#rapidShot') })
    if (enh > 0) atk.push({ sourceId: `enh:${uid}`, label: i18n(`Enhancement +${enh}`, `Altération +${enh}`), value: enh, bonusType: 'enhancement', source: src('magicItems/magicWeapons.htm') })
    else if (masterwork) atk.push({ sourceId: `mw:${uid}`, label: i18n('Masterwork', 'De maître'), value: 1, bonusType: 'enhancement', source: src('equipment/weapons.htm#masterworkWeapons') })
    for (const featId of ['weapon-focus', 'greater-weapon-focus']) {
      const f = choiceFeat(featId)
      const def = rules.feats.get(featId)
      if (f && def) atk.push({ sourceId: `feat:${featId}`, label: def.name, value: 1, bonusType: 'untyped', source: def.source })
    }
    if (weaponOfChoice && wmLevel >= 3)
      atk.push({ sourceId: 'wm:superior-weapon-focus', label: i18n('Superior Weapon Focus', 'Arme de prédilection suprême'), value: 1, bonusType: 'untyped', source: { book: 'Sword and Fist', page: 39 } })
    // Nonproficient weapon: -4 (https://www.d20srd.org/srd/combat/combatModifiers.htm).
    if (!profWeapons.has(weapon.category) && !profWeapons.has(weapon.id))
      atk.push({ sourceId: 'nonproficient-weapon', label: i18n('Not proficient with the weapon', 'Arme non maîtrisée'), value: -4, bonusType: 'untyped', source: src('equipment/weapons.htm#weaponCategories') })
    // Nonproficient armor or shield: its armor check penalty applies to attack rolls (rulings R24).
    for (const x of [armor, shield])
      if (x && !profArmor.has(x.def.category) && itemAcp(x))
        atk.push({ sourceId: `nonproficient:${x.item.uid}`, label: { en: `Not proficient: ${x.def.name.en}`, fr: `Non maîtrisé : ${x.def.name.fr}` }, value: itemAcp(x), bonusType: 'untyped', source: src('equipment/armor.htm#armorProficiency') })
    // Tower shield: -2 on attack rolls (https://www.d20srd.org/srd/equipment/armor.htm#towerShield).
    if (shield?.def.category === 'tower')
      atk.push({ sourceId: 'tower-shield', label: i18n('Tower shield', 'Pavois'), value: -2, bonusType: 'untyped', source: src('equipment/armor.htm#towerShield') })
    // Power Attack: the attack penalty applies to every melee attack; the damage bonus doesn't apply to light
    // weapons, except unarmed strikes (https://www.d20srd.org/srd/feats.htm#powerAttack).
    const powerAttackOn = melee && hasFeat('power-attack') && toggles.powerAttack > 0
    const powerAttackAllowed = melee && hasFeat('power-attack') && (weapon.handedness !== 'light' || weapon.id.startsWith('unarmed'))
    if (powerAttackOn)
      atk.push({ sourceId: 'power-attack', label: i18n('Power Attack', 'Attaque en puissance'), value: -toggles.powerAttack, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
    if (melee && hasFeat('combat-expertise') && toggles.combatExpertise > 0)
      atk.push({ sourceId: 'combat-expertise', label: i18n('Combat Expertise', 'Expertise du combat'), value: -toggles.combatExpertise, bonusType: 'untyped', source: src('feats.htm#combatExpertise') })
    // Fighting defensively: -4 on all attacks (https://www.d20srd.org/srd/combat/actionsInCombat.htm#fightDefensively).
    if (toggles.fightingDefensively)
      atk.push({ sourceId: 'fighting-defensively', label: i18n('Fighting defensively', 'Combat sur la défensive'), value: -4, bonusType: 'untyped', source: src('combat/actionsInCombat.htm#fightDefensively') })
    for (const pr of props)
      if (pr.effects.attackBonus)
        atk.push({ sourceId: `prop:${pr.id}`, label: pr.name, value: pr.effects.attackBonus.value, bonusType: 'enhancement', source: pr.source, condition: pr.effects.attackBonus.condition, situationalOn: toggles.situational[`prop:${pr.id}|${uid}`] ?? false, toggleKey: `prop:${pr.id}|${uid}` })
    atk.push(...partsFor([melee ? 'attack.melee' : 'attack.ranged', 'attack.all', 'attack.weapon']))
    const attack = resolve(atk)
    // Full attack: iteratives, plus one extra attack at full BAB from haste or a speed weapon (not cumulative:
    // https://www.d20srd.org/srd/magicItems/magicWeapons.htm#speed).
    const extra = sumTarget('attack.extra') > 0 || props.some((pr) => pr.effects.extraAttack) ? [attack.total] : []
    const rapid = rapidShot ? [attack.total] : []
    // Off hand: one attack, plus one at −5 (Improved TWF) and one at −10 (Greater TWF).
    const offHand = [attack.total, ...(hasFeat('improved-two-weapon-fighting') ? [attack.total - 5] : []), ...(hasFeat('greater-two-weapon-fighting') ? [attack.total - 10] : [])]
    const iterative = hand === 'off' ? offHand : [...extra, ...rapid, ...iterativeBab.map((b) => attack.total - (bab.total - b))]

    const dmg: Part[] = []
    const strMod = mod('str')
    let strDmg = strMod
    if (family === 'melee' && twoHands && strMod > 0) strDmg = Math.floor(strMod * 1.5)
    // Off hand: ½ Str bonus (a penalty applies in full).
    if (hand === 'off' && strMod > 0) strDmg = Math.floor(strMod / 2)
    if (family === 'bow') strDmg = Math.min(0, strMod)
    if (family === 'crossbow') strDmg = 0
    if (strDmg !== 0)
      dmg.push({
        ...abilityPart('str', strDmg),
        label:
          hand === 'off' && strMod > 0
            ? i18n('Strength ×½ (off hand)', 'Force ×½ (main non directrice)')
            : family === 'melee' && twoHands && strMod > 0
              ? i18n('Strength ×1.5 (two hands)', 'Force ×1,5 (à deux mains)')
              : ABILITY_NAMES.str,
      })
    if (enh > 0) dmg.push({ sourceId: `enh:${uid}`, label: i18n(`Enhancement +${enh}`, `Altération +${enh}`), value: enh, bonusType: 'enhancement', source: src('magicItems/magicWeapons.htm') })
    for (const [featId, value] of [['weapon-specialization', 2], ['greater-weapon-specialization', 2]] as const) {
      const def = rules.feats.get(featId)
      if (choiceFeat(featId) && def) dmg.push({ sourceId: `feat:${featId}`, label: def.name, value, bonusType: 'untyped', source: def.source })
    }
    // Alchemical silver: −1 damage (minimum 1 per hit).
    if (mat?.effects.damage)
      dmg.push({ sourceId: `material:${mat.id}`, label: mat.name, value: mat.effects.damage, bonusType: 'untyped', source: mat.source })
    for (const pr of props)
      if (pr.effects.damageBonus)
        dmg.push({ sourceId: `prop:${pr.id}`, label: pr.name, value: pr.effects.damageBonus.value, bonusType: 'enhancement', source: pr.source, condition: pr.effects.damageBonus.condition, situationalOn: toggles.situational[`prop:${pr.id}|${uid}`] ?? false, toggleKey: `prop:${pr.id}|${uid}` })
    const staticBeforePa = resolve(dmg).total
    if (powerAttackOn && powerAttackAllowed) {
      const factor = twoHands ? 2 : 1
      dmg.push({ sourceId: 'power-attack', label: i18n(`Power Attack (×${factor})`, `Attaque en puissance (×${factor})`), value: toggles.powerAttack * factor, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
    }
    if (melee && caps && caps.classLevel >= 7 && mod('int') > 0)
      dmg.push({
        sourceId: 'battle-cunning',
        label: i18n('Battle cunning', 'Ruse au combat'),
        value: mod('int'),
        bonusType: 'insight',
        source: { book: 'Tome of Battle', page: 23 },
        condition: i18n('vs a flat-footed or flanked foe', 'contre un adversaire pris au dépourvu ou pris en tenaille'),
        situationalOn: toggles.situational[`battle-cunning|${uid}`] ?? false,
        toggleKey: `battle-cunning|${uid}`,
      })
    dmg.push(...partsFor([melee ? 'damage.melee' : 'damage.ranged', 'damage.all', 'damage.weapon']))
    const damage = resolve(dmg)

    // Critical: Improved Critical doubles the range; Ki critical adds +2 after it (Sword and Fist p.39).
    let span = 21 - weapon.critRange
    const improvedCrit = !!choiceFeat('improved-critical')
    const keen = props.some((pr) => pr.effects.keen)
    // Keen and Improved Critical don't stack (https://www.d20srd.org/srd/magicItems/magicWeapons.htm#keen).
    if (improvedCrit || keen || (weaponOfChoice && wmLevel >= 7)) span *= 2
    if (weaponOfChoice && wmLevel >= 7 && improvedCrit) span += 2
    const critMult = resolve([{ sourceId: 'weapon', label: weapon.name, value: weapon.critMult, bonusType: 'base', source: weapon.source }])

    attacks.push({
      itemUid: uid,
      weapon,
      name,
      attack,
      iterative,
      // Small characters use Small weapons (https://www.d20srd.org/srd/equipment/weapons.htm#weaponSize).
      damageDice: race.size === 'small' ? weapon.damage.S : weapon.damage.M,
      damage,
      critRange: 21 - span,
      critMult,
      weaponOfChoice,
      kiDamageMax: weaponOfChoice ? maxDice(weapon.damage.M) + staticBeforePa : undefined,
      powerAttackAllowed,
      extraDamage: [
        ...props.flatMap((pr) => (pr.effects.extraDamage ?? []).map((x) => ({ ...x, source: pr.name }))),
        // Strikes/boosts/stances add dice to melee attacks (not multiplied on a critical, Tome of Battle p. 43).
        ...(melee
          ? [...(stance ? [stance] : []), ...strikeDice].flatMap((d) =>
              (d.extraDamage ?? []).map((x) => ({ dice: x.dice, type: x.type ?? i18n('maneuver', 'manœuvre'), condition: x.condition, source: d.name })),
            )
          : []),
      ],
      critExtraDamage: props
        .filter((pr) => pr.effects.critExtraDamage)
        .map((pr) => {
          // Bursts: +1d10 per multiplier step above ×1 (×2 → 1d10, ×3 → 2d10, ×4 → 3d10).
          const [n, die] = pr.effects.critExtraDamage!.dice.split('d')
          return { dice: `${Number(n) * (weapon.critMult - 1)}d${die}`, type: pr.effects.critExtraDamage!.type, source: pr.name }
        }),
      bypassDR: [...(mat?.effects.bypassDR ? [mat.effects.bypassDR] : []), ...(enh > 0 ? ['magic'] : [])],
      notes: props.filter((pr) => pr.effects.notes).map((pr) => ({ name: pr.name, text: pr.effects.notes! })),
      // Battle ardor (warblade 3, Tome of Battle p. 22): insight = Int bonus on critical confirmation rolls.
      critConfirmBonus: caps && caps.classLevel >= 3 ? Math.max(0, mod('int')) : 0,
      hand,
    })
  }

  const wmRow = rules.classes.get('weapon-master')
  // ---- class-feature checks: wild empathy = d20 + druid/ranger level + Cha (https://www.d20srd.org/srd/classes/ranger.htm#wildEmpathy)
  const featureStats: Sheet['featureStats'] = []
  const empathyClasses = Object.entries(classLevels).filter(([id]) =>
    rules.classes.get(id)?.features?.some((f) => f.id === 'wild-empathy'),
  )
  if (empathyClasses.length) {
    const f = rules.classes.get(empathyClasses[0][0])!.features!.find((x) => x.id === 'wild-empathy')!
    featureStats.push({
      id: 'wild-empathy',
      name: f.name,
      stat: resolve([
        ...empathyClasses.map(([id, n]) => ({ sourceId: `class:${id}`, label: { en: `${rules.classes.get(id)!.name.en} ${n}`, fr: `${rules.classes.get(id)!.name.fr} ${n}` }, value: n, bonusType: 'base' as const, source: f.source })),
        abilityPart('cha'),
      ]),
    })
  }
  const rangerStyle = styleId ? ranger?.choices?.combatStyle?.find((o) => o.id === styleId) : undefined

  return {
    characterLevel,
    classLevels,
    feats,
    race,
    spellcasting: spellcastingOf(classLevels, rules, (a) => abilities[a]),
    featureStats,
    favoredEnemies,
    combatStyle: rangerStyle && rangerLevel >= 2 ? { id: rangerStyle.id, name: rangerStyle.name, active: styleActive } : undefined,
    abilities,
    hpMax,
    bab,
    iterativeBab,
    saves,
    ac,
    touchAc,
    flatFootedAc,
    initiative,
    grapple,
    attacksOfOpportunity,
    maxDex,
    armorCheckPenalty,
    speed: { base: ftToDistance(baseFt), current: ftToDistance(Math.max(0, speedFt)), from: speedFrom },
    load: { carried: { lb: round2(carried.lb), kg: round2(carried.kg) }, band, limits },
    skills,
    attacks,
    flags,
    weaponMaster: {
      level: wmLevel,
      active: wmActive,
      kiDamagePerDay: wmActive ? wmLevel : 0,
      increasedMultiplierPerDay: wmActive && wmRow && wmLevel >= 2 ? Math.floor(wmLevel / 2) : 0,
    },
    armor,
    shield,
    martial: { caps, known, stance, active: runningManeuvers },
    damageReduction: [
      ...[...(stance ? [stance] : []), ...maneuverDR]
        .filter((d) => d.damageReduction)
        .map((d) => ({
          value: d.damageReduction!,
          source: d.type === 'stance' ? d.name : i18n(`${d.name.en} (if the strike hit)`, `${d.name.fr} (si la frappe a touché)`),
        })),
      ...(armor && armorMat?.effects.armorDR
        ? [{ value: armorMat.effects.armorDR[armor.def.category as 'light' | 'medium' | 'heavy'] ?? '', source: armorMat.name }].filter((d) => d.value)
        : []),
    ],
  }
}

/** Maximum of a dice expression like "2d6", "1d8", "1d10+1". */
export function maxDice(expr: string): number {
  let total = 0
  for (const term of expr.replace(/\s/g, '').split('+')) {
    const m = term.match(/^(\d*)d(\d+)$/)
    if (m) total += (Number(m[1] || 1)) * Number(m[2])
    else if (/^\d+$/.test(term)) total += Number(term)
  }
  return total
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
