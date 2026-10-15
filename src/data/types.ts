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
  /** Spells per day by spell level (index 0 = level 0); null = none at that level, 0 = only bonus spells. */
  spellsPerDay?: (number | null)[]
  /** Spontaneous casters (bard, sorcerer): spells known by spell level. */
  spellsKnown?: (number | null)[]
}

/** A class feature gained at a class level. Mechanics the engine applies are in `modifiers` / `grantsFeats`. */
export interface ClassFeatureDef {
  id: string
  /** Class level at which it is gained. */
  level: number
  name: I18n
  /** Short summary in our own words (SRD is OGL: SRD wording is allowed too). */
  text: I18n
  source: Source
  /** Always-on modifiers (situational ones carry a `condition`). */
  modifiers?: ModifierSpec[]
  /** Feats granted for free (ids), e.g. ranger Track (1st), Endurance (3rd). */
  grantsFeats?: string[]
  /** true when the engine computes it; false/absent = described only (shown as text). */
  computed?: boolean
}

/** Spellcasting of a class (https://www.d20srd.org/srd/magicOverview/castingSpells.htm). */
export interface SpellcastingDef {
  ability: AbilityId
  kind: 'arcane' | 'divine'
  /** prepared (cleric, druid, paladin, ranger, wizard) or spontaneous (bard, sorcerer). */
  style: 'prepared' | 'spontaneous'
  /** Spell list id used in SpellDef.level (e.g. "ranger", "sorcerer-wizard"). */
  list: string
  /** Caster level: full class level, or half (paladin, ranger: ½ class level from 4th). */
  casterLevel: 'full' | 'half'
  /** Highest spell level of the class (ranger 4). */
  maxSpellLevel: number
}

/** Ranger favored enemy types and similar choice lists. */
export interface ChoiceOption {
  id: string
  name: I18n
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
  /** Class features by level (generic class model; mechanics flagged with `computed`). */
  features?: ClassFeatureDef[]
  spellcasting?: SpellcastingDef
  /** Choice lists used by features (e.g. ranger "favoredEnemy" creature types, "combatStyle"). */
  choices?: Record<string, ChoiceOption[]>
  text: I18n
  source: Source
}

/** A playable race (https://www.d20srd.org/srd/races.htm). */
export interface RaceDef {
  id: string
  name: I18n
  size: 'small' | 'medium'
  /** Base land speed in feet. */
  speed: number
  /** Dwarf: speed not reduced by medium/heavy armor or load. */
  speedNotReducedByArmor?: boolean
  abilityAdjustments: Partial<Record<AbilityId, number>>
  /** Human: 1 extra feat at 1st level. */
  bonusFeat?: boolean
  /** Human: extra skill points per level (×4 at 1st level). */
  extraSkillPoints?: number
  /** Class id, or "any" (human, half-elf: highest class). */
  favoredClass: string
  vision: 'normal' | 'lowLight' | 'darkvision'
  /** Darkvision range in feet. */
  darkvision?: number
  automaticLanguages: I18n[]
  bonusLanguages: I18n[]
  /** Racial bonuses the engine applies (situational ones carry a `condition`). */
  modifiers: ModifierSpec[]
  /** Weapons the race is proficient with for free (elf: longsword, rapier, bows). */
  weaponProficiencies?: string[]
  /** Exotic weapons treated as martial (weapon familiarity: dwarven waraxe, gnome hooked hammer…). */
  weaponFamiliarity?: string[]
  /** Other traits, described. */
  traits: { name: I18n; text: I18n }[]
  text: I18n
  source: Source
}

/** A spell (SRD, OGL). */
export interface SpellDef {
  id: string
  name: I18n
  school: I18n
  /** Spell level per spell list id, e.g. { "ranger": 1, "druid": 1 }. */
  level: Record<string, number>
  components: string
  castingTime: I18n
  range: I18n
  target?: I18n
  area?: I18n
  effect?: I18n
  duration: I18n
  save: I18n
  spellResistance: I18n
  summary: I18n
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

// ---------------------------------------------------------------------------------------------------------------
// Tome of Battle (non-SRD, allowed by house rules): martial disciplines, maneuvers and stances.
// Only numbers and short summaries in our own words, with book page references (never the book text).

export type DisciplineId = 'diamond-mind' | 'iron-heart' | 'stone-dragon' | 'tiger-claw' | 'white-raven'
export type ManeuverType = 'boost' | 'counter' | 'strike' | 'stance' | 'other'
export type InitiationAction = 'swift' | 'immediate' | 'move' | 'standard' | 'fullRound' | 'other'

export interface DisciplineDef {
  id: DisciplineId
  name: I18n
  /** Key skill of the discipline (skill id), e.g. Iron Heart → balance. */
  keySkill: string
  associatedWeapons: string[]
  summary: I18n
  source: Source
}

/** A modifier a maneuver applies, with how long it lasts. */
export interface ManeuverEffect {
  spec: ModifierSpec
  /** endOfTurn (boosts), round (until your next turn), encounter, while the stance is active, or the attack itself. */
  duration: 'attack' | 'endOfTurn' | 'round' | 'rounds' | 'minute' | 'encounter' | 'stance'
  /** For 'rounds': number of rounds (may reference initiator level in `roundsText`). */
  rounds?: number
  roundsText?: I18n
  /** Applies only to the attack of the strike / to the next attack, etc. */
  appliesTo?: 'self' | 'strikeAttack' | 'allies' | 'target'
  /** Value computed from the initiator level instead of spec.value (e.g. Diamond Defense). */
  valueFrom?: 'initiatorLevel' | 'halfInitiatorLevel' | 'critCount'
  /** Stacking source when the bonus doesn't come from the maneuver itself (e.g. 'charge'); default: shared 'martial'. */
  stacksAs?: string
}

export interface ManeuverDef {
  id: string
  name: I18n
  discipline: DisciplineId
  type: ManeuverType
  /** Descriptors such as fear, mind-affecting, sonic. */
  descriptors: string[]
  level: number
  /** Number of maneuvers (stances count) of the same discipline required to learn it. */
  prereqCount: number
  action: InitiationAction
  /** Book wording kept short, e.g. "Melee attack", "Personal", "30 ft." */
  range: I18n
  target: I18n
  duration: I18n
  /** e.g. "Fortitude partial", with the DC formula (e.g. "DC 13 + Str mod"), or "" if none. */
  save: I18n
  /** Supernatural instead of extraordinary. */
  supernatural: boolean
  /** Area of effect (bursts, emanations) when the book gives one instead of a target. */
  area?: I18n
  /** Damage reduction gained while the effect runs, e.g. "5/adamantine" (Stone Bones). */
  damageReduction?: string
  /** One-line headline for lists. */
  summary: I18n
  /** Rules summary in our own words (HTML, ≤ 900 chars). */
  text: I18n
  /** Machine-readable effects the app can apply automatically (bonuses to attack, damage, AC, saves, skills…). */
  effects?: ManeuverEffect[]
  /** Extra damage dice of a strike/boost (not multiplied on a critical), e.g. "4d6". */
  extraDamage?: { dice: string; type?: I18n; condition?: I18n }[]
  /** Martial skill check involved (skill id) and what it does, e.g. concentration for Moment of Perfect Mind. */
  skillCheck?: { skill: string; note: I18n }
  /** Things the app cannot compute (conditions inflicted on foes, movement…), shown in the popup. */
  notes?: I18n
  source: Source
}

/** Per-level progression of a martial adept class (Tome of Battle Table 1–3) and Table 3–1. */
export interface MartialProgression {
  classId: string
  levels: { level: number; maneuversKnown: number; maneuversReadied: number; stancesKnown: number; highestManeuverLevel: number; maneuverSwap: boolean }[]
  highestManeuverLevelByInitiatorLevel: { minInitiatorLevel: number; maxInitiatorLevel: number; maneuverLevel: number }[]
  initiatorLevel: I18n
  source: Source
  sourceInitiatorTable: Source
}
