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
import { classSkillsOf, clericChoices, domainFeats, domainsOf, TURNING_TABLE } from './cleric'
import { proficiencies, proficientWith, type Proficiencies } from './proficiency'
import { spellcastingOf, type Spellcasting } from './spells'
import type { CreatureDef, DomainDef, RaceDef } from '../data/types'
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
  /** Wild shape natural attacks: full-attack routine (0 = main, 1+ = "or" alternatives). */
  routine?: number
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
  /** Current size (race, or wild shape form). */
  size: Size
  /** Wild shape in progress: the form. */
  wildShape?: { def: CreatureDef; rounds: number }
  /** Cleric turn or rebuke undead (https://www.d20srd.org/srd/combat/specialAttacks.htm#turnOrRebukeUndead). */
  turning?: {
    mode: 'turn' | 'rebuke'
    /** Turning level (cleric level). */
    level: number
    usesPerDay: Stat
    /** Turning check: 1d20 + this. */
    check: Stat
    /** Turning damage: 2d6 + this (total Hit Dice affected). */
    damage: Stat
    /** Check result bands → highest Hit Dice affected. */
    table: { max: number; hd: number }[]
    /** Domains' extra turning (elementals, plants, Sun's greater turning). */
    extra: { name: I18n; mode: string; creatures: I18n; perDay?: string }[]
  }
  /** Cleric domains chosen. */
  domains: DomainDef[]
  /** Weapon and armor proficiencies (classes, race, feats). */
  proficiency: Proficiencies
  /** Spellcasting classes: caster level, spells per day (with bonus spells), save DCs. */
  spellcasting: Spellcasting[]
  /** Class-feature checks shown as stats (ranger wild empathy…). */
  featureStats: { id: string; name: I18n; stat: Stat }[]
  /** Ranger favored enemies: creature type -> bonus. */
  favoredEnemies: { id: string; name: I18n; bonus: number }[]
  /** Combat-style feats the ranger still has for feat selection while the style is inactive (medium/heavy armor). */
  inactiveStyleFeats: FeatPick[]
  /** Chosen feats unusable now because a prerequisite only came from the inactive combat style. */
  unusableFeats: string[]
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

// Size modifiers (https://www.d20srd.org/srd/combat/combatStatistics.htm#sizeModifier; grapple:
// specialAttacks.htm#grapple; Hide: skills/hide.htm; carrying capacity, bipeds: carryingCapacity.htm).
type Size = CreatureDef['size']
const SIZE_MOD: Record<Size, number> = { fine: 8, diminutive: 4, tiny: 2, small: 1, medium: 0, large: -1, huge: -2, gargantuan: -4, colossal: -8 }
const SIZE_GRAPPLE: Record<Size, number> = { fine: -16, diminutive: -12, tiny: -8, small: -4, medium: 0, large: 4, huge: 8, gargantuan: 12, colossal: 16 }
const SIZE_HIDE: Record<Size, number> = { fine: 16, diminutive: 12, tiny: 8, small: 4, medium: 0, large: -4, huge: -8, gargantuan: -12, colossal: -16 }
const SIZE_CARRY: Record<Size, number> = { fine: 0.125, diminutive: 0.25, tiny: 0.5, small: 0.75, medium: 1, large: 2, huge: 4, gargantuan: 8, colossal: 16 }
const SIZE_NAME: Record<Size, I18n> = {
  fine: { en: 'Fine', fr: 'I' },
  diminutive: { en: 'Diminutive', fr: 'Min' },
  tiny: { en: 'Tiny', fr: 'TP' },
  small: { en: 'Small', fr: 'P' },
  medium: { en: 'Medium', fr: 'M' },
  large: { en: 'Large', fr: 'G' },
  huge: { en: 'Huge', fr: 'TG' },
  gargantuan: { en: 'Gargantuan', fr: 'Gig' },
  colossal: { en: 'Colossal', fr: 'C' },
}

/** Wild shape uses per day by druid level (Table: The Druid): 1 at 5th, 2 at 6th, 3 at 7th, 4 at 10th, 5 at 14th, 6 at 18th. */
export function wildShapeUses(druidLevel: number): { animal: number; elemental: number } {
  const animal = druidLevel >= 18 ? 6 : druidLevel >= 14 ? 5 : druidLevel >= 10 ? 4 : druidLevel >= 7 ? 3 : druidLevel >= 6 ? 2 : druidLevel >= 5 ? 1 : 0
  const elemental = druidLevel >= 20 ? 3 : druidLevel >= 18 ? 2 : druidLevel >= 16 ? 1 : 0
  return { animal, elemental }
}

/** Sizes a druid can take: Small/Medium at 5th, Large at 8th, Tiny at 11th, Huge at 15th (elementals: S/M/L, Huge at 20th). */
export function wildShapeSizes(druidLevel: number, elemental = false): Size[] {
  if (elemental) return ['small', 'medium', 'large', ...(druidLevel >= 20 ? (['huge'] as Size[]) : [])]
  return [
    ...(druidLevel >= 11 ? (['tiny'] as Size[]) : []),
    'small',
    'medium',
    ...(druidLevel >= 8 ? (['large'] as Size[]) : []),
    ...(druidLevel >= 15 ? (['huge'] as Size[]) : []),
  ]
}

export function compute(char: Character, rules: Rules, opts: ComputeOptions = {}): Sheet {
  // ---- wild shape (https://www.d20srd.org/srd/classes/druid.htm#wildShape, as amended by the PHB errata 2006: works
  // like Alternate Form, MM errata 2006; docs/rules/rulings-classes.md C4). All gear melds and stops working (except
  // armor/shield with the wild property, and what the player chooses to keep): melded items are treated as stored.
  const shape = char.wildShape ? rules.creatures.get(char.wildShape.creatureId) : undefined
  // Hit points of her own form, kept despite the form's Constitution (MM errata 2006, Alternate Form; FAQ p. 16:
  // later Con changes — spells, Con damage — still count, as they apply to her own form too).
  const ownHp = shape ? compute({ ...char, wildShape: undefined }, rules, opts).hpMax : undefined
  if (shape) {
    const keep = new Set(char.wildShape!.keepItems ?? [])
    char = {
      ...char,
      inventory: char.inventory.map((i) => (keep.has(i.uid) || i.location === 'stored' ? i : { ...i, location: 'stored' as const })),
    }
  }
  const levels = char.levels.slice(0, opts.level ?? char.levels.length)
  const characterLevel = levels.length
  const toggles = char.toggles

  // ---- class levels and feats
  const classLevels: Record<string, number> = {}
  for (const l of levels) classLevels[l.classId] = (classLevels[l.classId] ?? 0) + 1
  const race = raceOf(char, rules)
  const size: Size = shape?.size ?? race.size
  const sizeLabel = i18n(`${SIZE_NAME[size].en} size`, `Taille ${SIZE_NAME[size].fr}`)
  const chosenFeats = levels.flatMap((l) => l.feats)
  // Feats granted by class features (ranger Track at 1st, Endurance at 3rd…).
  const granted: FeatPick[] = []
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n) for (const featId of f.grantsFeats ?? []) granted.push({ featId, slot: 'granted' })
  // Cleric domains (War: Weapon Focus with the deity's favored weapon).
  if (classLevels['cleric']) granted.push(...domainFeats(char, rules))
  // Ranger combat style (https://www.d20srd.org/srd/classes/ranger.htm#combatStyle): feats at ranger 2/6/11,
  // usable only in light or no armor.
  const rangerLevel = classLevels['ranger'] ?? 0
  // Ranger level reached at each character level (class choices only count on the ranger levels where they are due).
  const rangerAt: number[] = []
  levels.reduce((n, l) => (rangerAt.push(l.classId === 'ranger' ? n + 1 : 0), l.classId === 'ranger' ? n + 1 : n), 0)
  const styleId = levels.map((l, i) => (rangerAt[i] === 2 ? l.classChoices?.combatStyle : undefined)).find((x) => !!x)
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
  // In medium or heavy armor the ranger is no longer treated as having these feats, and a feat that needs one of them
  // as a prerequisite can't be used either (https://www.d20srd.org/srd/feats.htm#prerequisites; 3.5 FAQ p. 87;
  // docs/rules/rulings-classes.md C2). Picking such feats stays legal.
  const styleFeats: FeatPick[] = []
  if (rangerLevel >= 2 && styleId)
    for (const [lvl, featId] of STYLE_FEATS[styleId] ?? []) if (rangerLevel >= lvl) styleFeats.push({ featId, slot: 'granted' })
  if (styleActive) granted.push(...styleFeats)
  const ownsChosen = (id: string) => chosenFeats.some((c) => c.featId === id)
  const lostStyle = styleActive ? [] : styleFeats.filter((f) => !ownsChosen(f.featId)).map((f) => f.featId)
  // Chosen feats whose prerequisite is only provided by the (inactive) combat style, followed down the chain.
  const unusableFeats = new Set<string>()
  for (let changed = true; changed; ) {
    changed = false
    for (const c of chosenFeats) {
      if (unusableFeats.has(c.featId)) continue
      const needs = (rules.feats.get(c.featId)?.prereq.feats ?? []).map((x) => x.split(':')[0])
      if (needs.some((id) => lostStyle.includes(id) || unusableFeats.has(id))) {
        unusableFeats.add(c.featId)
        changed = true
      }
    }
  }
  const feats = [
    ...chosenFeats.filter((c) => !unusableFeats.has(c.featId)),
    ...granted.filter((g) => !chosenFeats.some((c) => c.featId === g.featId && !c.choice)),
  ]
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
  if (SIZE_HIDE[size])
    // Size modifier on Hide (https://www.d20srd.org/srd/skills/hide.htm): Small +4, Large −4…
    mods.push({ spec: { target: 'skill.hide', bonusType: 'size', value: SIZE_HIDE[size] }, sourceId: 'size', label: sizeLabel, source: { srdUrl: 'https://www.d20srd.org/srd/skills/hide.htm' } })
  // ---- wild shape: the +8 racial bonus that comes with a climb or swim speed (house rule #24: part of the movement
  // mode; https://www.d20srd.org/srd/specialAbilities.htm#movementModes, skills/climb.htm, skills/swim.htm).
  if (shape?.speed.climb)
    mods.push({ spec: { target: 'skill.climb', bonusType: 'racial', value: 8 }, sourceId: 'wild-shape-climb', label: i18n(`Climb speed (${shape.name.en})`, `Vitesse d’escalade (${shape.name.fr})`), source: { srdUrl: 'https://www.d20srd.org/srd/skills/climb.htm', houseRule: 24 } })
  if (shape?.speed.swim)
    mods.push({
      spec: { target: 'skill.swim', bonusType: 'racial', value: 8, condition: i18n('special action or hazard (can always take 10)', 'action spéciale ou danger (peut toujours faire 10)') },
      sourceId: 'wild-shape-swim',
      label: i18n(`Swim speed (${shape.name.en})`, `Vitesse de nage (${shape.name.fr})`),
      source: { srdUrl: 'https://www.d20srd.org/srd/skills/swim.htm', houseRule: 24 },
    })
  // ---- class features with modifiers
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n) for (const spec of f.modifiers ?? []) mods.push({ spec, sourceId: `feature:${f.id}`, label: f.name, source: f.source })
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
  const feSource = ranger?.features?.find((f) => f.id === 'favored-enemy')?.source ?? { srdUrl: 'https://www.d20srd.org/srd/classes/ranger.htm#favoredEnemy' }
  for (const fe of favoredEnemies) {
    const vs = i18n(`vs ${fe.name.en}`, `contre ${fe.name.fr}`)
    for (const skill of ['bluff', 'listen', 'sense-motive', 'spot', 'survival'])
      mods.push({ spec: { target: `skill.${skill}`, bonusType: 'untyped', value: fe.bonus, condition: vs }, sourceId: `favored-enemy:${fe.id}`, label: i18n('Favored enemy', 'Ennemi juré'), source: feSource })
    mods.push({
      spec: { target: 'damage.all', bonusType: 'untyped', value: fe.bonus, condition: vs },
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
    // Wild shape: the form's Str, Dex and Con replace hers; Int, Wis, Cha stay (Alternate Form).
    const formScore = shape && (a === 'str' || a === 'dex' || a === 'con') ? shape.abilities[a] : undefined
    const parts: Part[] =
      formScore !== undefined && formScore !== null
        ? [{ sourceId: 'wild-shape', label: i18n(`${shape!.name.en} (wild shape)`, `${shape!.name.fr} (forme animale)`), value: formScore, bonusType: 'base', source: shape!.source }]
        : [{ sourceId: 'base', label: i18n('Base score', 'Valeur de base'), value: char.baseAbilities[a], bonusType: 'base' }]
    // Racial adjustments (https://www.d20srd.org/srd/races.htm): part of the score, not a bonus.
    const adj = race.abilityAdjustments[a]
    if (adj && formScore === undefined) parts.push({ sourceId: 'race', label: race.name, value: adj, bonusType: 'base', source: race.source })
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
      parts.push({ sourceId: 'damage', label: i18n('Ability damage', 'Affaiblissement'), value: -damage, bonusType: 'base', source: src('specialAbilities.htm#abilityScoreLoss') })
    if (drain)
      parts.push({ sourceId: 'drain', label: i18n('Ability drain', 'Diminution permanente'), value: -drain, bonusType: 'base', source: src('specialAbilities.htm#abilityScoreLoss') })
    const score = resolve(parts)
    // Racial minimum (half-orc Int at least 3: https://www.d20srd.org/srd/races.htm#halfOrcs).
    const min = race.minimumScores?.[a]
    if (min !== undefined) {
      const starting = char.baseAbilities[a] + (adj ?? 0)
      if (starting < min) {
        score.parts.push({ sourceId: 'race-minimum', label: i18n(`${race.name.en}: minimum ${min}`, `${race.name.fr} : minimum ${min}`), value: min - starting, bonusType: 'base', active: true, source: race.source })
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
      label: { en: `Level ${i + 1} (${cls?.name.en}) d${die} ${what}`, fr: `Niveau ${i + 1} (${cls?.name.fr}) d${die} ${whatFr}` },
      value: roll,
      bonusType: 'base' as const,
      source: i === 0 || !maxHd ? src('combat/combatStatistics.htm#hitPoints') : { houseRule: 9 },
    }
  })
  hpParts.push({ ...abilityPart('con', mod('con') * characterLevel), label: { en: `Constitution ${fmt(mod('con'))} × ${characterLevel}`, fr: `Constitution ${fmt(mod('con'))} × ${characterLevel}` } })
  hpParts.push(...partsFor(['hp.max']))
  const hpMax = ownHp ?? resolve(hpParts)
  hpMax.total = Math.max(characterLevel, hpMax.total) // at least 1 hp per Hit Die

  // ---- BAB and iterative attacks
  const bab = resolve(tableSum('bab'))
  const iterativeBab: number[] = []
  for (let b = bab.total; iterativeBab.length === 0 || (b > 0 && iterativeBab.length < 4); b -= 5) iterativeBab.push(b)

  // Trap sense: +1 at barbarian 3 / rogue 3, +1 every 3 levels; levels of both classes stack
  // (https://www.d20srd.org/srd/classes/barbarian.htm#trapSense).
  const trapSense = ['barbarian', 'rogue'].reduce((n, id) => n + Math.floor((classLevels[id] ?? 0) / 3), 0)

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
    // Paladin divine grace (2nd): Charisma bonus on all saves (https://www.d20srd.org/srd/classes/paladin.htm#divineGrace).
    if ((classLevels['paladin'] ?? 0) >= 2 && mod('cha') > 0)
      extra.push({ sourceId: 'divine-grace', label: i18n('Divine grace', 'Grâce divine'), value: mod('cha'), bonusType: 'untyped', source: src('classes/paladin.htm#divineGrace') })
    // Trap sense (barbarian, rogue; stacks between classes): Reflex vs traps.
    if (s === 'ref' && trapSense > 0)
      extra.push({ sourceId: 'trap-sense', label: i18n('Trap sense', 'Sens des pièges'), value: trapSense, bonusType: 'untyped', source: src('classes/rogue.htm#trapSense'), condition: i18n('vs traps', 'contre les pièges'), situationalOn: toggles.situational['trap-sense|ref'] ?? false, toggleKey: 'trap-sense|ref' })
    // Barbarian indomitable will (14th): +4 Will vs enchantment while raging.
    if (s === 'will' && (classLevels['barbarian'] ?? 0) >= 14)
      extra.push({ sourceId: 'indomitable-will', label: i18n('Indomitable will', 'Volonté indomptable'), value: 4, bonusType: 'untyped', source: src('classes/barbarian.htm#indomitableWill'), condition: i18n('vs enchantment, while raging', 'contre les enchantements, en rage'), situationalOn: toggles.situational['indomitable-will|will'] ?? false, toggleKey: 'indomitable-will|will' })
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
  // A stored (or melded) shield is not on her arm.
  const shieldItem = loadout?.shield ? char.inventory.find((i) => i.uid === loadout.shield && i.location !== 'stored') : undefined
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
  // Size multiplier, bipeds (https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures): Small ×3/4, Large ×2…
  const sizeFactor = SIZE_CARRY[size]
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
  // Fast movement is added before armor and load (https://www.d20srd.org/srd/classes/barbarian.htm#fastMovement):
  // barbarian +10 ft. unless in heavy armor or heavy load; monk +10 ft. per 3 levels, unarmored and light load.
  const barbarianFast = (classLevels['barbarian'] ?? 0) >= 1 && armor?.category !== 'heavy' && band !== 'heavy' && band !== 'overloaded'
  const monkLevel = classLevels['monk'] ?? 0
  const monkUnencumbered = !armor && band === 'light'
  const monkFast = monkLevel >= 3 && monkUnencumbered ? Math.floor(monkLevel / 3) * 10 : 0
  // Wild shape: the form's land speed (its other movement modes are shown with the form).
  const baseFt = (shape ? shape.speed.land : race.speed) + (barbarianFast ? 10 : 0) + monkFast
  let speedFt = baseFt
  let speedFrom = barbarianFast || monkFast ? i18n('base + fast movement', 'base + déplacement accéléré') : i18n('base', 'base')
  const slow = baseFt <= 20
  // Armor and load tables give 20 and 30 ft. columns; a faster base loses the same as 30 ft. (40 → 30).
  const reduced = (d?: { ft: number } | null) => (d ? (slow ? d.ft : d.ft + Math.max(0, baseFt - 30)) : undefined)
  const armorSpeed = armor && (slow ? armor.def.speed20 : armor.def.speed30)
  const armorFt = reduced(armorSpeed)
  if (!race.speedNotReducedByArmor && armor && ['medium', 'heavy'].includes(armor.category) && armorFt !== undefined && armorFt < speedFt) {
    speedFt = armorFt
    speedFrom = armor.def.name
  }
  const loadSpeed = loadFx && reduced({ ft: slow ? loadFx.speed20 : loadFx.speed30 })
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
  const sizePart = (value: number): Part => ({ sourceId: 'size', label: sizeLabel, value, bonusType: 'size', source: src('combat/combatStatistics.htm#sizeModifier') })
  if (SIZE_MOD[size]) acParts.push(sizePart(SIZE_MOD[size]))
  // Wild shape: the form's natural armor bonus.
  if (shape?.ac.natural)
    acParts.push({ sourceId: 'wild-shape-natural', label: i18n(`Natural armor (${shape.name.en})`, `Armure naturelle (${shape.name.fr})`), value: shape.ac.natural, bonusType: 'naturalArmor', source: shape.source })
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
  // Monk AC bonus: Wis bonus + 1 per 5 monk levels, unarmored, no shield, light load; kept when flat-footed and vs
  // touch, lost when immobilized or helpless (https://www.d20srd.org/srd/classes/monk.htm#acBonus).
  if (monkLevel >= 1 && monkUnencumbered && !shield && !flags.some((f) => ['immobile', 'helpless'].includes(f))) {
    const v = Math.max(0, mod('wis')) + Math.floor(monkLevel / 5)
    if (v) acParts.push({ sourceId: 'monk-ac', label: i18n('Monk AC bonus', 'Bonus à la CA du moine'), value: v, bonusType: 'untyped', source: src('classes/monk.htm#acBonus') })
  }
  if (trapSense > 0)
    acParts.push({ sourceId: 'trap-sense', label: i18n('Trap sense', 'Sens des pièges'), value: trapSense, bonusType: 'dodge', source: src('classes/rogue.htm#trapSense'), condition: i18n('vs traps', 'contre les pièges'), situationalOn: toggles.situational['trap-sense|ac'] ?? false, toggleKey: 'trap-sense|ac' })
  acParts.push(...partsFor(['ac']))
  // Uncanny dodge (warblade 2, Tome of Battle p. 22): keeps the Dex bonus when caught flat-footed (or by an invisible
  // attacker), not when it is lost for another reason (stunned, blinded, cowering, pinned…).
  const otherDexLoss =
    activeConditions.some((id) => id !== 'flat-footed' && rules.conditions.get(id)?.flags.includes('loseDexToAc')) ||
    sumTarget('ac.noDex') > 0
  const uncannyDodge =
    ((caps?.classLevel ?? 0) >= 2 || (classLevels['barbarian'] ?? 0) >= 2 || (classLevels['rogue'] ?? 0) >= 4) && !otherDexLoss
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
    ...(SIZE_GRAPPLE[size] ? [{ ...sizePart(SIZE_GRAPPLE[size]), source: src('combat/specialAttacks.htm#grapple') }] : []),
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
  // Class skills of every class taken (cleric: plus the domain skills).
  const isClassSkill = (skillId: string) => Object.keys(classLevels).some((c) => classSkillsOf(char, rules, c).includes(skillId))
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
  // Wild shape: no manufactured weapons (they meld); the form's natural attacks are added below.
  const wielded = shape ? [] : (loadout?.weapons ?? [])
  const meleeInHand = wielded.filter((uid) => {
    const it = char.inventory.find((i) => i.uid === uid)
    return it && rules.weapons.get(it.refId)?.kind === 'melee'
  })
  const twf = !!loadout?.twoWeapon && meleeInHand.length >= 2
  const [primaryUid, offUid] = twf ? meleeInHand : []
  const offWeapon = offUid ? rules.weapons.get(char.inventory.find((i) => i.uid === offUid)!.refId) : undefined
  const offLight = offWeapon?.handedness === 'light' || offWeapon?.handedness === 'unarmed'
  const twfSource = src('combat/specialAttacks.htm#twoWeaponFighting')
  for (const uid of wielded) {
    const item = char.inventory.find((i) => i.uid === uid)
    const weapon = item && rules.weapons.get(item.refId)
    if (!item || !weapon) continue
    const melee = weapon.kind === 'melee'
    const hand: 'primary' | 'off' | undefined = twf && uid === primaryUid ? 'primary' : twf && uid === offUid ? 'off' : undefined
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
    const twoHands =
      !hand && (weapon.handedness === 'twoHanded' || (weapon.handedness === 'oneHanded' && (loadout?.twoHanded ?? []).includes(uid)))

    const atk: Part[] = [...tableSum('bab'), abilityPart(melee ? 'str' : 'dex')]
    if (SIZE_MOD[size]) atk.push(sizePart(SIZE_MOD[size]))
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
    if (!proficientWith(proficiency, weapon))
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
    atk.push(
      ...partsFor([
        melee ? 'attack.melee' : 'attack.ranged',
        'attack.all',
        'attack.weapon',
        ...(family === 'thrown' || family === 'sling' ? ['attack.thrown'] : []),
      ]),
    )
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
      damageDice: size === 'small' ? weapon.damage.S : weapon.damage.M,
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
  // ---- wild shape: the form's natural attacks with the druid's BAB and new Str/Dex (Alternate Form, MM errata 2006:
  // she keeps her BAB and feats, not the form's). Secondary natural attacks −5 (−2 with her own Multiattack)
  // and ½ Str; a sole natural attack 1½ Str (https://www.d20srd.org/srd/monsters/intro.htm). The form's feats are
  // not gained (her own Weapon Finesse applies to natural weapons).
  if (shape) {
    const routines = [shape.attacks, ...(shape.altAttacks ?? [])]
    routines.forEach((routine, r) => {
      const naturals = routine.filter((a) => a.role !== 'weapon')
      const sole = naturals.length === 1 && naturals[0].count === 1
      naturals.forEach((a, n) => {
        const ranged = a.kind === 'ranged' || a.kind === 'rangedTouch'
        const useDex = ranged || (hasFeat('weapon-finesse') && mod('dex') > mod('str'))
        const atk: Part[] = [...tableSum('bab'), abilityPart(useDex ? 'dex' : 'str')]
        if (SIZE_MOD[size]) atk.push(sizePart(SIZE_MOD[size]))
        if (a.role === 'secondary') {
          const multi = hasFeat('multiattack')
          atk.push({ sourceId: 'secondary', label: multi ? i18n('Secondary attack (Multiattack)', 'Attaque secondaire (Attaques multiples)') : i18n('Secondary natural attack', 'Attaque naturelle secondaire'), value: multi ? -2 : -5, bonusType: 'untyped', source: { srdUrl: 'https://www.d20srd.org/srd/monsters/intro.htm' } })
        }
        if (toggles.fightingDefensively)
          atk.push({ sourceId: 'fighting-defensively', label: i18n('Fighting defensively', 'Combat sur la défensive'), value: -4, bonusType: 'untyped', source: src('combat/actionsInCombat.htm#fightDefensively') })
        const pa = !ranged && hasFeat('power-attack') && toggles.powerAttack > 0
        if (pa) atk.push({ sourceId: 'power-attack', label: i18n('Power Attack', 'Attaque en puissance'), value: -toggles.powerAttack, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
        atk.push(...partsFor([ranged ? 'attack.ranged' : 'attack.melee', 'attack.all']))
        const attack = resolve(atk)
        const factor = ranged ? 0 : a.role === 'secondary' ? 0.5 : sole ? 1.5 : 1
        const strMod = mod('str')
        const strDmg = strMod < 0 ? (factor ? strMod : 0) : Math.floor(strMod * factor)
        const dmg: Part[] = []
        if (strDmg)
          dmg.push({ ...abilityPart('str', strDmg), label: factor === 1 ? ABILITY_NAMES.str : i18n(`Strength ×${factor}`, `Force ×${factor === 0.5 ? '½' : '1,5'}`) })
        if (pa) dmg.push({ sourceId: 'power-attack', label: i18n('Power Attack', 'Attaque en puissance'), value: toggles.powerAttack, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
        dmg.push(...partsFor([ranged ? 'damage.ranged' : 'damage.melee', 'damage.all']))
        const damage = resolve(dmg)
        const crit = a.critical?.match(/^(?:(\d+)-20\/)?×(\d)$/)
        const critRange = crit?.[1] ? Number(crit[1]) : 20
        const mult = crit?.[2] ? Number(crit[2]) : 2
        const dice = a.damage.match(/^\d+d\d+/)?.[0] ?? a.damage
        const weapon: WeaponDef = {
          id: `natural:${a.name.en.toLowerCase()}`,
          name: a.name,
          category: 'natural' as WeaponDef['category'],
          kind: ranged ? 'ranged' : 'melee',
          handedness: 'light',
          damage: { S: dice, M: dice },
          critRange,
          critMult: mult,
          damageTypes: [],
          weight: { lb: 0, kg: 0 },
          costGp: 0,
          text: shape.specialAttacks,
          source: shape.source,
        }
        attacks.push({
          itemUid: `wild-shape:${r}:${n}`,
          weapon,
          name: { en: `${a.name.en} (${shape.name.en})`, fr: `${a.name.fr} (${shape.name.fr})` },
          attack,
          iterative: Array.from({ length: a.count }, () => attack.total),
          damageDice: dice,
          damage,
          critRange,
          critMult: resolve([{ sourceId: 'form', label: shape.name, value: mult, bonusType: 'base', source: shape.source }]),
          weaponOfChoice: false,
          powerAttackAllowed: !ranged && hasFeat('power-attack'),
          extraDamage: a.extra ? [{ dice: '', type: a.extra, source: shape.name }] : [],
          critExtraDamage: [],
          bypassDR: [],
          notes: [],
          critConfirmBonus: 0,
          routine: r,
        })
      })
    })
  }

  // ---- class-feature checks: wild empathy = d20 + druid/ranger level + Cha (https://www.d20srd.org/srd/classes/ranger.htm#wildEmpathy)
  const featureStats: Sheet['featureStats'] = []
  const empathyClasses = Object.entries(classLevels).filter(([id]) =>
    rules.classes.get(id)?.features?.some((f) => f.id === 'wild-empathy'),
  )
  if (empathyClasses.length) {
    // Druid and ranger wild empathy don't stack: two abilities of the same name, use the better one (no stacking
    // clause, unlike the animal companion; 3.5 FAQ pp. 9-10; docs/rules/rulings-classes.md C1).
    empathyClasses.sort((a, b) => b[1] - a[1])
    empathyClasses.splice(1)
    const f = rules.classes.get(empathyClasses[0][0])!.features!.find((x) => x.id === 'wild-empathy')!
    featureStats.push({
      id: 'wild-empathy',
      name: f.name,
      stat: resolve([
        ...empathyClasses.map(([id, n]) => ({ sourceId: `class:${id}`, label: { en: `${rules.classes.get(id)!.name.en} ${n}`, fr: `${rules.classes.get(id)!.name.fr} ${n}` }, value: n, bonusType: 'base' as const, source: f.source })),
        abilityPart('cha'),
        // Synergy: 5 ranks of Handle Animal (https://www.d20srd.org/srd/skills/handleAnimal.htm).
        ...(levels.reduce((n, l) => n + (l.skillRanks['handle-animal'] ?? 0), 0) >= 5
          ? [{ sourceId: 'synergy:handle-animal', label: i18n('Handle Animal 5 ranks', 'Dressage 5 degrés'), value: 2, bonusType: 'circumstance' as const, source: src('skills/handleAnimal.htm') }]
          : []),
      ]),
    })
  }
  const rangerStyle = styleId ? ranger?.choices?.combatStyle?.find((o) => o.id === styleId) : undefined

  // ---- cleric: turn (positive energy) or rebuke (negative energy) undead, 3 + Cha mod per day (+4 per Extra
  // Turning); check 1d20 + Cha mod (+2 with 5 ranks of Knowledge (religion)); damage 2d6 + cleric level + Cha mod.
  const clericLevel = classLevels['cleric'] ?? 0
  const domains = clericLevel ? domainsOf(char, rules) : []
  // Paladins turn undead from 4th level as a cleric of 3 levels lower; a cleric/paladin adds both
  // (https://www.d20srd.org/srd/classes/multiclass.htm#classFeatures).
  const paladinLevel = classLevels['paladin'] ?? 0
  const paladinTurning = paladinLevel >= 4 ? paladinLevel - 3 : 0
  const turningLevel = clericLevel + paladinTurning
  let turning: Sheet['turning']
  if (turningLevel) {
    const tsrc = src('combat/specialAttacks.htm#turnOrRebukeUndead')
    const extraTurning = feats.filter((f) => f.featId === 'extra-turning').length
    const religion = levels.reduce((n, l) => n + (l.skillRanks['knowledge-religion'] ?? 0), 0)
    turning = {
      mode: clericLevel && clericChoices(char).channel === 'negative' ? 'rebuke' : 'turn',
      level: turningLevel,
      usesPerDay: resolve([
        { sourceId: 'base', label: i18n('Base', 'Base'), value: 3, bonusType: 'base', source: tsrc },
        abilityPart('cha'),
        ...(extraTurning ? [{ sourceId: 'feat:extra-turning', label: i18n(`Extra Turning ×${extraTurning}`, `Renvoi supplémentaire ×${extraTurning}`), value: 4 * extraTurning, bonusType: 'untyped' as const, source: src('feats.htm#extraTurning') }] : []),
      ]),
      check: resolve([
        abilityPart('cha'),
        ...(religion >= 5 ? [{ sourceId: 'synergy:knowledge-religion', label: i18n('Knowledge (religion) 5 ranks', 'Connaissances (religion) 5 degrés'), value: 2, bonusType: 'circumstance' as const, source: src('skills/knowledge.htm') }] : []),
      ]),
      damage: resolve([
        ...(clericLevel ? [{ sourceId: 'class:cleric', label: i18n(`Cleric ${clericLevel}`, `Prêtre ${clericLevel}`), value: clericLevel, bonusType: 'base' as const, source: tsrc }] : []),
        ...(paladinTurning ? [{ sourceId: 'class:paladin', label: i18n(`Paladin ${paladinLevel} − 3`, `Paladin ${paladinLevel} − 3`), value: paladinTurning, bonusType: 'base' as const, source: src('classes/paladin.htm#turnUndead') }] : []),
        abilityPart('cha'),
      ]),
      table: TURNING_TABLE.map((r) => ({ max: r.max, hd: turningLevel + r.delta })),
      extra: domains
        .filter((d) => d.effects?.turning)
        .map((d) => ({ name: d.name, mode: d.effects!.turning!.mode, creatures: d.effects!.turning!.creatures, perDay: d.effects!.turning!.perDay })),
    }
  }

  return {
    characterLevel,
    classLevels,
    feats,
    race,
    size,
    wildShape: shape ? { def: shape, rounds: char.wildShape!.rounds } : undefined,
    proficiency,
    spellcasting: spellcastingOf(classLevels, rules, (a) => abilities[a], Object.assign({}, ...levels.map((l) => l.classChoices ?? {}))),
    featureStats,
    turning,
    domains,
    favoredEnemies,
    inactiveStyleFeats: styleActive ? [] : styleFeats,
    unusableFeats: [...unusableFeats],
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
