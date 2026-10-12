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
  weaponMaster: { level: number; kiDamagePerDay: number; increasedMultiplierPerDay: number }
  armor?: { item: ItemInstance; def: ArmorDef }
  shield?: { item: ItemInstance; def: ArmorDef }
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
  return { lb: (w?.lb ?? 0) * item.quantity, kg: (w?.kg ?? 0) * item.quantity }
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
  const feats = levels.flatMap((l) => l.feats)
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
  // A condition replaced by a stronger active one (e.g. fatigued by exhausted) is ignored.
  const replaced = new Set(
    char.activeEffects
      .filter((e) => e.enabled && e.kind === 'condition')
      .flatMap((e) => rules.conditions.get(e.refId ?? '')?.replaces ?? []),
  )
  for (const eff of char.activeEffects) {
    if (!eff.enabled) continue
    if (eff.kind === 'condition') {
      const def = rules.conditions.get(eff.refId ?? '')
      if (!def || replaced.has(def.id)) continue
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
        sourceId: m.spec.condition ? `${m.sourceId}|${m.spec.condition.en}` : m.sourceId,
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
  for (const s of ['fort', 'ref', 'will'] as SaveId[])
    saves[s] = resolve([...tableSum(s), abilityPart(saveAbility[s]), ...partsFor([`save.${s}`, 'save.all'])])

  // ---- armor, shield, load
  const loadout = char.loadouts.find((l) => l.id === char.activeLoadout) ?? char.loadouts[0]
  const armorItem = char.inventory.find(
    (i) => i.kind === 'armor' && i.location === 'worn' && !['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
  )
  const armor = armorItem ? { item: armorItem, def: rules.armor.get(armorItem.refId)! } : undefined
  const shieldItem = loadout?.shield ? char.inventory.find((i) => i.uid === loadout.shield) : undefined
  const shield = shieldItem ? { item: shieldItem, def: rules.armor.get(shieldItem.refId)! } : undefined

  const carried = char.inventory.reduce(
    (s, i) => {
      const w = itemWeight(rules, i)
      return { lb: s.lb + w.lb, kg: s.kg + w.kg }
    },
    { lb: 0, kg: 0 },
  )
  const carriedLb = carried.lb
  const limits = capacity(rules, abilities.str.score.total)
  const band: LoadBand =
    carriedLb <= limits.light.lb ? 'light' : carriedLb <= limits.medium.lb ? 'medium' : carriedLb <= limits.heavy.lb ? 'heavy' : 'overloaded'
  const loadFx = band === 'light' ? undefined : LOAD_EFFECTS[band === 'overloaded' ? 'heavy' : band]

  // Max Dex: the most restrictive of armor, shield, load.
  const dexCaps: { value: number; from: I18n }[] = []
  if (armor && armor.def.maxDex !== null) dexCaps.push({ value: armor.def.maxDex, from: armor.def.name })
  if (shield && shield.def.maxDex !== null) dexCaps.push({ value: shield.def.maxDex, from: shield.def.name })
  if (loadFx) dexCaps.push({ value: loadFx.maxDex, from: i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`) })
  const cap = dexCaps.length ? dexCaps.reduce((a, b) => (b.value < a.value ? b : a)) : undefined
  const maxDex = { value: cap?.value ?? null, from: cap?.from ?? i18n('none', 'aucun') }

  // Armor check penalty: (armor + strapped shield) vs load, the worse applies (house rule #13).
  const itemAcp = (x?: { item: ItemInstance; def: ArmorDef }) => {
    if (!x) return 0
    const mw = x.item.masterwork || (x.item.enhancement ?? 0) > 0
    return mw ? Math.min(0, x.def.acp + 1) : x.def.acp
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

  // Speed: worse of armor and load (human base 30 ft).
  const baseFt = 30
  let speedFt = baseFt
  let speedFrom = i18n('base', 'base')
  if (armor && ['medium', 'heavy'].includes(armor.def.category) && armor.def.speed30) {
    speedFt = armor.def.speed30.ft
    speedFrom = armor.def.name
  }
  if (loadFx && loadFx.speed30 < speedFt) {
    speedFt = loadFx.speed30
    speedFrom = i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`)
  }
  speedFt += sumTarget('speed')
  if (sumTarget('speed.half') > 0) speedFt = Math.floor(speedFt / 2 / 5) * 5
  if (band === 'overloaded') speedFt = 5

  // ---- AC
  const loseDex = flags.includes('loseDexToAc') || sumTarget('ac.noDex') > 0 || toggles.situational['flatFooted'] === true
  const dexToAc = maxDex.value === null ? mod('dex') : Math.min(mod('dex'), maxDex.value)
  const acParts: Part[] = [{ sourceId: 'base10', label: i18n('Base', 'Base'), value: 10, bonusType: 'base', source: src('combat/combatStatistics.htm#armorClass') }]
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
    label: maxDex.value !== null && mod('dex') > maxDex.value
      ? { en: `Dexterity (capped at +${maxDex.value} by ${maxDex.from.en})`, fr: `Dextérité (limitée à +${maxDex.value} par ${maxDex.from.fr})` }
      : ABILITY_NAMES.dex,
  })
  if (toggles.combatExpertise > 0)
    acParts.push({ sourceId: 'combat-expertise', label: i18n('Combat Expertise', 'Expertise du combat'), value: toggles.combatExpertise, bonusType: 'dodge', source: src('feats.htm#combatExpertise') })
  if (toggles.fightingDefensively)
    acParts.push({ sourceId: 'fighting-defensively', label: i18n('Fighting defensively', 'Combat sur la défensive'), value: 2, bonusType: 'dodge', source: src('combat/actionsInCombat.htm#fightDefensively') })
  if (toggles.totalDefense)
    acParts.push({ sourceId: 'total-defense', label: i18n('Total defense', 'Défense totale'), value: 4, bonusType: 'dodge', source: src('combat/actionsInCombat.htm#totalDefense') })
  acParts.push(...partsFor(['ac']))
  const stripDex = (parts: Part[]) =>
    parts.filter((p) => !(p.sourceId === 'ability:dex' && p.value > 0) && p.bonusType !== 'dodge')
  const ac = resolve(loseDex ? stripDex(acParts) : acParts)
  const touchAc = resolve((loseDex ? stripDex(acParts) : acParts).filter((p) => !['armor', 'shield', 'naturalArmor'].includes(p.bonusType)))
  const flatFootedAc = resolve(stripDex(acParts))

  // ---- initiative, grapple
  const initiative = resolve([abilityPart('dex'), ...partsFor(['initiative'])])
  const grapple = resolve([...tableSum('bab'), abilityPart('str'), ...partsFor(['grapple'])])

  // ---- attacks of opportunity (Combat Reflexes; Superior Combat Reflexes = better of the two, house rule #12)
  const aooParts: Part[] = [{ sourceId: 'base', label: i18n('Base', 'Base'), value: 1, bonusType: 'base', source: src('combat/attacksOfOpportunity.htm') }]
  let aooBest = 1
  if (hasFeat('combat-reflexes')) aooBest = Math.max(aooBest, 1 + Math.max(0, mod('dex')))
  if (wmLevel >= 5) aooBest = Math.max(aooBest, mod('dex') + mod('wis'))
  if (aooBest > 1)
    aooParts.push({
      sourceId: 'combat-reflexes',
      label: wmLevel >= 5 && mod('dex') + mod('wis') >= 1 + mod('dex')
        ? i18n('Superior Combat Reflexes (Dex + Wis)', 'Attaques réflexes supérieures (Dex + Sag)')
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
    parts.push(abilityPart(def.ability))
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
  for (const uid of loadout?.weapons ?? []) {
    const item = char.inventory.find((i) => i.uid === uid)
    const weapon = item && rules.weapons.get(item.refId)
    if (!item || !weapon) continue
    const melee = weapon.kind === 'melee'
    const enh = item.enhancement ?? 0
    const masterwork = item.masterwork || enh > 0
    const choiceFeat = (id: string) => feats.find((f) => f.featId === id && f.choice === weapon.id)
    const weaponOfChoice = wmLevel > 0 && char.weaponOfChoice === weapon.id && masterwork
    const name: I18n = item.name ?? { en: `${weapon.name.en}${enh ? ` +${enh}` : ''}`, fr: `${weapon.name.fr}${enh ? ` +${enh}` : ''}` }

    const atk: Part[] = [...tableSum('bab'), abilityPart(melee ? 'str' : 'dex')]
    if (enh > 0) atk.push({ sourceId: `enh:${uid}`, label: i18n(`Enhancement +${enh}`, `Altération +${enh}`), value: enh, bonusType: 'enhancement', source: src('magicItems/magicWeapons.htm') })
    else if (masterwork) atk.push({ sourceId: `mw:${uid}`, label: i18n('Masterwork', 'De maître'), value: 1, bonusType: 'enhancement', source: src('equipment/weapons.htm#masterworkWeapons') })
    for (const featId of ['weapon-focus', 'greater-weapon-focus']) {
      const f = choiceFeat(featId)
      const def = rules.feats.get(featId)
      if (f && def) atk.push({ sourceId: `feat:${featId}`, label: def.name, value: 1, bonusType: 'untyped', source: def.source })
    }
    if (weaponOfChoice && wmLevel >= 3)
      atk.push({ sourceId: 'wm:superior-weapon-focus', label: i18n('Superior Weapon Focus', 'Arme de prédilection supérieure'), value: 1, bonusType: 'untyped', source: { book: 'Sword and Fist', page: 39 } })
    const powerAttackAllowed = melee && weapon.handedness !== 'light' && weapon.handedness !== 'unarmed' && hasFeat('power-attack')
    if (powerAttackAllowed && toggles.powerAttack > 0)
      atk.push({ sourceId: 'power-attack', label: i18n('Power Attack', 'Attaque en puissance'), value: -toggles.powerAttack, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
    if (melee && toggles.combatExpertise > 0)
      atk.push({ sourceId: 'combat-expertise', label: i18n('Combat Expertise', 'Expertise du combat'), value: -toggles.combatExpertise, bonusType: 'untyped', source: src('feats.htm#combatExpertise') })
    if (melee && toggles.fightingDefensively)
      atk.push({ sourceId: 'fighting-defensively', label: i18n('Fighting defensively', 'Combat sur la défensive'), value: -4, bonusType: 'untyped', source: src('combat/actionsInCombat.htm#fightDefensively') })
    atk.push(...partsFor([melee ? 'attack.melee' : 'attack.ranged', 'attack.all']))
    const attack = resolve(atk)
    const iterative = iterativeBab.map((b) => attack.total - (bab.total - b))

    // Damage: Str ×1.5 two-handed (bonus only), full Str penalty; bows: penalty only.
    const dmg: Part[] = []
    const strMod = mod('str')
    let strDmg = strMod
    if (melee && weapon.handedness === 'twoHanded' && strMod > 0) strDmg = Math.floor(strMod * 1.5)
    if (!melee && strMod > 0) strDmg = 0
    if (strDmg !== 0)
      dmg.push({ ...abilityPart('str', strDmg), label: weapon.handedness === 'twoHanded' && strMod > 0 ? i18n('Strength ×1.5 (two-handed)', 'Force ×1,5 (à deux mains)') : ABILITY_NAMES.str })
    if (enh > 0) dmg.push({ sourceId: `enh:${uid}`, label: i18n(`Enhancement +${enh}`, `Altération +${enh}`), value: enh, bonusType: 'enhancement', source: src('magicItems/magicWeapons.htm') })
    for (const [featId, value] of [['weapon-specialization', 2], ['greater-weapon-specialization', 2]] as const) {
      const def = rules.feats.get(featId)
      if (choiceFeat(featId) && def) dmg.push({ sourceId: `feat:${featId}`, label: def.name, value, bonusType: 'untyped', source: def.source })
    }
    const staticBeforePa = resolve(dmg).total
    if (powerAttackAllowed && toggles.powerAttack > 0) {
      const factor = weapon.handedness === 'twoHanded' ? 2 : 1
      dmg.push({ sourceId: 'power-attack', label: i18n(`Power Attack (×${factor})`, `Attaque en puissance (×${factor})`), value: toggles.powerAttack * factor, bonusType: 'untyped', source: src('feats.htm#powerAttack') })
    }
    dmg.push(...partsFor([melee ? 'damage.melee' : 'damage.ranged', 'damage.all']))
    const damage = resolve(dmg)

    // Critical: Improved Critical doubles the range; Ki critical adds +2 after it (Sword and Fist p.39).
    let span = 21 - weapon.critRange
    const improvedCrit = !!choiceFeat('improved-critical')
    if (improvedCrit || (weaponOfChoice && wmLevel >= 7)) span *= 2
    if (weaponOfChoice && wmLevel >= 7 && improvedCrit) span += 2
    const critMult = resolve([{ sourceId: 'weapon', label: weapon.name, value: weapon.critMult, bonusType: 'base', source: weapon.source }])

    attacks.push({
      itemUid: uid,
      weapon,
      name,
      attack,
      iterative,
      damageDice: weapon.damage.M,
      damage,
      critRange: 21 - span,
      critMult,
      weaponOfChoice,
      kiDamageMax: weaponOfChoice ? maxDice(weapon.damage.M) + staticBeforePa : undefined,
      powerAttackAllowed,
    })
  }

  const wmRow = rules.classes.get('weapon-master')
  return {
    characterLevel,
    classLevels,
    feats,
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
      kiDamagePerDay: wmLevel,
      increasedMultiplierPerDay: wmRow && wmLevel >= 2 ? Math.floor(wmLevel / 2) : 0,
    },
    armor,
    shield,
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
