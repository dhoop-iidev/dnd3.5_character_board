// Shared data contract between the Python data pipeline (tools/) and the engine.
// JSON files under src/data/srd/ and src/data/custom/ must match these types.

export type Lang = 'en' | 'fr'
export type I18n = { en: string; fr: string }

/** Where a rule or entry comes from. SRD entries carry a d20srd.org URL; non-SRD entries carry book + page. */
export interface Source {
  srdUrl?: string
  book?: string
  page?: number
  /** Reference in the official French SRD, e.g. "DRS 05 (dons)". */
  frRef?: string
  /** DM house rule number in docs/house-rules.md. */
  houseRule?: number
}

export type Weight = { lb: number; kg: number }
export type Distance = { ft: number; m: number }

export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export const ABILITIES: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export type SaveId = 'fort' | 'ref' | 'will'

/** 3.5 bonus types (docs/rules/bonus-types.md) plus 'base' for non-bonus contributions (BAB, ranks, base 10…). */
export type BonusType =
  | 'base'
  | 'ability'
  | 'alchemical'
  | 'armor'
  | 'circumstance'
  | 'competence'
  | 'deflection'
  | 'dodge'
  | 'enhancement'
  | 'inherent'
  | 'insight'
  | 'luck'
  | 'morale'
  | 'naturalArmor'
  | 'profane'
  | 'racial'
  | 'resistance'
  | 'sacred'
  | 'shield'
  | 'size'
  | 'untyped'

/**
 * What a modifier applies to.
 * - ability.<id>: score bonus/penalty; abilityDamage.<id> / abilityDrain.<id>: damage/drain points (positive numbers)
 * - attack.melee | attack.ranged | attack.all ; damage.melee | damage.ranged | damage.all
 * - ac | ac.noDex (lose Dex bonus to AC) ; save.<id> | save.all ; initiative
 * - skill.<id> | skill.all | skill.strdex (all Str- and Dex-based skills) | check.str … (ability checks)
 * - speed (ft, may be negative) | speed.half (value 1 = halve) ; hp.temp ; hp.max
 * - attack.choice | damage.choice | skill.choice: the feat's chosen weapon/skill (Weapon Focus, Skill Focus…)
 * - attack.weapon | damage.weapon | ac.armor | ac.shield: enhancement of that specific weapon/armor/shield
 * - ac.noDex (value 1): loses Dex bonus to AC ; grapple ; attack.extra (extra attack at full BAB, haste)
 */
export type Target = string

export interface ModifierSpec {
  target: Target
  bonusType: BonusType
  value: number
  /** Situational: shown in popups but not added to the total unless the condition is toggled on. */
  condition?: I18n
}

/** Machine-readable prerequisites. `$choice` stands for the feat's chosen weapon/skill. */
export interface Prereq {
  abilities?: Partial<Record<AbilityId, number>>
  bab?: number
  /** Feat ids, optionally with a choice: "weapon-focus:$choice" or "weapon-focus:greatsword". */
  feats?: string[]
  fighterLevel?: number
  characterLevel?: number
  /** Skill id -> minimum ranks. */
  skills?: Record<string, number>
  proficiency?: string
  masterworkWeapon?: boolean
  /** Prerequisites that cannot be checked automatically; shown as text. */
  other?: I18n[]
}

export interface SkillDef {
  id: string
  name: I18n
  ability: AbilityId
  trainedOnly: boolean
  /** 0 = no armor check penalty, 1 = normal, 2 = double (Swim). */
  armorCheck: 0 | 1 | 2
  /** True for skills taken per specialty: Craft, Knowledge, Perform, Profession. */
  hasSubtypes: boolean
  /** No key ability (Speak Language): no ability modifier applies. */
  noAbility?: boolean
  text: I18n
  source: Source
  homebrew?: boolean
}

/** +2 synergy bonus: `ranks` in `from` give +2 on `to`. */
export interface SynergyDef {
  from: string
  to: string
  ranks: number
  value: number
  condition?: I18n
  source: Source
}

export type FeatChoice = 'weapon' | 'skill' | 'school' | 'other'

export interface FeatDef {
  id: string
  name: I18n
  type: 'general' | 'itemCreation' | 'metamagic' | 'special'
  fighterBonus: boolean
  multiple: boolean
  choice?: FeatChoice
  prereq: Prereq
  /** Short benefit summary (popup headline). */
  summary: I18n
  text: I18n
  source: Source
  /** Effects the engine applies automatically; situational ones carry a condition. */
  modifiers?: ModifierSpec[]
}

export type ArmorCategory = 'light' | 'medium' | 'heavy'
export type WeaponCategory = 'simple' | 'martial' | 'exotic'

export interface ClassLevelRow {
  level: number
  bab: number
  fort: number
  ref: number
  will: number
  special: I18n[]
}

export interface ClassDef {
  id: string
  name: I18n
  prestige: boolean
  hitDie: number
  skillPoints: number
  classSkills: string[]
  proficiencies: { weapons: string[]; armor: (ArmorCategory | 'shield' | 'tower')[] }
  table: ClassLevelRow[]
  /** Class levels granting a bonus feat, and the allowed list (fighter). */
  bonusFeatLevels?: number[]
  bonusFeatList?: string[]
  requirements?: Prereq
  text: I18n
  source: Source
}

export interface WeaponDef {
  id: string
  name: I18n
  category: WeaponCategory
  kind: 'melee' | 'ranged'
  handedness: 'unarmed' | 'light' | 'oneHanded' | 'twoHanded' | 'ranged'
  damage: { S: string; M: string }
  /** Lowest natural roll that threatens (20 = 20 only; 19 = 19–20). */
  critRange: number
  critMult: number
  rangeIncrement?: Distance
  damageTypes: string[]
  weight: Weight
  costGp: number
  text: I18n
  source: Source
}

export interface ArmorDef {
  id: string
  name: I18n
  category: ArmorCategory | 'shield' | 'tower'
  armorBonus: number
  maxDex: number | null
  acp: number
  arcaneFailure: number
  speed30: Distance | null
  speed20: Distance | null
  weight: Weight
  costGp: number
  text: I18n
  source: Source
}

export interface GearDef {
  id: string
  name: I18n
  weight: Weight
  costGp: number
  text: I18n
  source: Source
}

export type Slot =
  | 'head'
  | 'eyes'
  | 'neck'
  | 'shoulders'
  | 'body'
  | 'torso'
  | 'arms'
  | 'hands'
  | 'ring'
  | 'waist'
  | 'feet'

export interface MagicItemDef {
  id: string
  name: I18n
  kind: 'wondrous' | 'potion' | 'ring' | 'rod' | 'staff' | 'wand' | 'scroll' | 'weaponProperty' | 'armorProperty'
  slot?: Slot
  priceGp: number
  casterLevel?: number
  weight: Weight
  modifiers?: ModifierSpec[]
  /** Duration of the effect for consumables (e.g. potions), as text. */
  duration?: I18n
  text: I18n
  source: Source
}

export interface ConditionDef {
  id: string
  name: I18n
  modifiers: ModifierSpec[]
  /** Non-numeric effects the UI shows as badges, e.g. "cantRun", "cantAct", "loseDexToAc". */
  flags: string[]
  /** Condition ids this one replaces or implies (e.g. exhausted replaces fatigued). */
  replaces?: string[]
  summary: I18n
  text: I18n
  source: Source
}

/** Load bands for one Strength score (inclusive upper limits). */
export interface CarryingCapacityRow {
  str: number
  light: Weight
  medium: Weight
  heavy: Weight
}

/** Magic weapon / armor special ability (flaming, keen, vorpal, fortification…), from the SRD magic weapons/armor tables. */
export interface ItemPropertyDef {
  id: string
  name: I18n
  appliesTo: ('melee' | 'ranged' | 'ammunition' | 'armor' | 'shield')[]
  /** Price as an enhancement-bonus equivalent (+1…+5); 0 when the price is a flat amount. */
  bonusEquivalent: number
  flatPriceGp?: number
  /** The item must have at least a +1 enhancement bonus (SRD rule for special abilities). */
  requiresEnhancement: boolean
  effects: {
    /** Extra damage dice on every hit (flaming 1d6 fire) or only under a condition (holy vs evil). */
    extraDamage?: { dice: string; type: I18n; condition?: I18n }[]
    /** Burst: extra dice on a confirmed critical, per point of multiplier above ×1 (flaming burst +1d10 fire). */
    critExtraDamage?: { dice: string; type: I18n }
    /** Doubles the threat range (does not stack with Improved Critical). */
    keen?: boolean
    /** One extra attack at full BAB on a full attack (speed). */
    extraAttack?: boolean
    /** Situational attack/damage bonus (bane: +2 vs the chosen type). */
    attackBonus?: { value: number; condition: I18n }
    damageBonus?: { value: number; condition: I18n }
    /** Modifiers applied while the armor/shield is worn (rare). */
    modifiers?: ModifierSpec[]
    /** Effects that are only described (vorpal, defending, spell storing…). */
    notes?: I18n
  }
  text: I18n
  source: Source
}

/** Special material (adamantine, mithral, cold iron, alchemical silver, darkwood…), SRD "Special Materials". */
export interface MaterialDef {
  id: string
  name: I18n
  appliesTo: ('weapon' | 'ammunition' | 'armor' | 'shield')[]
  /** Extra cost in gp; for armor by category. `weaponMultiplier`: base price multiplier (cold iron ×2). */
  price: { weapon?: number; ammunition?: number; light?: number; medium?: number; heavy?: number; shield?: number; weaponMultiplier?: number; perLb?: number }
  effects: {
    /** Weapon damage modifier (alchemical silver −1, minimum 1). */
    damage?: number
    /** Damage reduction this material overcomes, e.g. "adamantine", "cold iron", "silver". */
    bypassDR?: string
    /** Armor: number of categories lighter (mithral: 1) — for movement and other limitations, not proficiency. */
    armorCategoryShift?: number
    maxDexBonus?: number
    /** Armor check penalty reduced by this amount (positive number). */
    acpReduction?: number
    arcaneFailureReduction?: number
    weightMultiplier?: number
    /** Armor gains damage reduction by category (adamantine: 1/—, 2/—, 3/—). */
    armorDR?: { light?: string; medium?: string; heavy?: string }
    /** Always masterwork (adamantine, mithral, darkwood). */
    masterwork?: boolean
    notes?: I18n
  }
  text: I18n
  source: Source
}
