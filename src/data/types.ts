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
  /** Cleric: one domain spell slot per spell level from 1st. */
  domainSlots?: boolean
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
  /** Bonus feat list that depends on the class level (monk: 1st, 2nd, 6th). */
  bonusFeatListByLevel?: Record<string, string[]>
  /** Monk: bonus feats taken without meeting their prerequisites. */
  bonusFeatIgnorePrereqs?: boolean
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
  /** Minimum starting scores (half-orc Int 3). */
  minimumScores?: Partial<Record<AbilityId, number>>
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
  /** Spell level per spell list id, e.g. { "ranger": 1, "druid": 1 }; cleric domains as "domain:<id>" (e.g.
   * "domain:healing": 1). */
  level: Record<string, number>
  /** School id in English lowercase ("conjuration"), subschool ("healing", "summoning") and descriptors ("good",
   * "fire", "mind-affecting"), for domain and feat effects (Spell Focus, Good domain…). */
  schoolId?: string
  subschool?: string
  descriptors?: string[]
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

// ---------------------------------------------------------------------------------------------------------------------
// Creatures: animal companions and summoned creatures (SRD monster stat blocks, https://www.d20srd.org/srd/monsters/)

/** One attack of a creature as printed in its stat block. */
export interface CreatureAttack {
  name: I18n
  /** Attack bonus as printed (full attack line). */
  bonus: number
  /** Damage as printed, e.g. "1d6+1" (dice + Str already included). */
  damage: string
  /** Extra text after the damage, e.g. "plus 1d4 fire", "plus poison" (bilingual). */
  extra?: I18n
  kind: 'melee' | 'ranged' | 'touch' | 'rangedTouch'
  /** Natural attack role: primary (full Str) or secondary (−5, ½ Str); weapon = manufactured weapon. */
  role: 'primary' | 'secondary' | 'weapon'
  /** Number of such attacks in the full attack (2 claws → 2). */
  count: number
  /** Ability used for the attack roll (Weapon Finesse → dex). */
  attackAbility: 'str' | 'dex'
  /** Multiplier of the Str bonus on damage: 1.5 (sole natural attack / two-handed), 1, 0.5 (secondary), 0 (none). */
  strDamageFactor: number
  /** Critical as "20/×2"-style text when not the default. */
  critical?: string
  /** Iterative attacks of a weapon after the first, as printed (e.g. [4] for "+9/+4"). */
  iterative?: number[]
}

export interface CreatureDef {
  id: string
  name: I18n
  size: 'fine' | 'diminutive' | 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' | 'colossal'
  /** Creature type id, e.g. "animal", "magical-beast", "elemental", "fey", "outsider", "plant", "vermin". */
  type: string
  /** Type and subtypes as printed, bilingual (e.g. "Large magical beast (cold)"). */
  typeText: I18n
  /** Hit Dice: the main group (count × die + bonus), plus extra groups for creatures with class levels (celestial
   * charger: 8d10 + 7d8 cleric). */
  hitDice: { count: number; die: number; bonus: number; extra?: { count: number; die: number }[] }
  /** Average hp as printed. */
  hp: number
  initiative: number
  /** Speeds in feet: land, and optional fly / swim / climb / burrow (fly maneuverability in `flyManeuver`). */
  speed: { land: number; fly?: number; swim?: number; climb?: number; burrow?: number; flyManeuver?: string }
  ac: { total: number; touch: number; flatFooted: number; natural: number; dexMod: number; sizeMod: number; other: number }
  bab: number
  grapple: number
  /** Four or more legs: quadruped carrying capacity multipliers
   * (https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures). */
  quadruped?: boolean
  /** Full attack (first routine of the stat block). */
  attacks: CreatureAttack[]
  /** Alternative full attacks ("or" in the stat block), e.g. a ray instead of the bite. */
  altAttacks?: CreatureAttack[][]
  space: number
  reach: number
  saves: { fort: number; ref: number; will: number }
  /** null = no score (e.g. Con for undead, Int for vermin). */
  abilities: Record<AbilityId, number | null>
  /** Skills as printed (bilingual text), e.g. "Hide +2, Listen +3*". */
  skills: I18n
  /** Feats as printed (bilingual text, bonus feats included). */
  feats: I18n
  /** Feat ids recognised (for Weapon Finesse, Multiattack…), when they exist in feats.json. */
  featIds: string[]
  specialAttacks: I18n
  specialQualities: I18n
  /** Special abilities descriptions (bilingual HTML). */
  specialAbilities: I18n
  alignment: I18n
  cr: string
  /** Short description / combat text (bilingual HTML). */
  text: I18n
  source: Source
}

/** SRD Table: Animal Companions — advancement by (effective) druid level. */
export interface CompanionAdvancementRow {
  /** Lowest effective druid level of the band (1, 3, 6, 9, 12, 15, 18). */
  minLevel: number
  maxLevel: number
  bonusHD: number
  naturalArmorAdj: number
  strDexAdj: number
  bonusTricks: number
  /** Special abilities gained at this band (link, share spells, evasion, devotion, multiattack, improved evasion). */
  special: { id: string; name: I18n; text: I18n }[]
}

export interface CompanionData {
  advancement: CompanionAdvancementRow[]
  /** Animals available: base list (level 1) and alternative lists with the level adjustment (−3, −6, −9, −12, −15). */
  options: { creatureId: string; minLevel: number; levelAdjustment: number }[]
  source: Source
}

/** Summon Nature's Ally / Summon Monster lists: spell level -> creature ids. */
export interface SummonList {
  spellId: string
  level: number
  creatures: string[]
  /** Summon Monster: templates a creature comes with (celestial and/or fiendish, chosen by the caster's alignment
   * rule) and alignment-subtype notes, e.g. { "dire-rat": ["celestial", "fiendish"] }. */
  templates?: Record<string, ('celestial' | 'fiendish')[]>
  /** Alignment of the entry as printed (e.g. "LG" for a lantern archon, "NG" for a giant eagle), to warn about
   * opposed alignments (both summon families). */
  alignments?: Record<string, string>
  /** Creatures that can be summoned only into an aquatic environment (the table's "¹"). */
  aquatic?: string[]
  /** Variant notes printed in the table (satyr with/without pipes, pixie arrows…), bilingual. */
  notes?: Record<string, I18n>
}

/** A cleric domain (https://www.d20srd.org/srd/divine/domains.htm). */
export interface DomainDef {
  id: string
  name: I18n
  /** Granted power, as printed (bilingual). */
  grantedPower: I18n
  /** Domain spells by spell level 1..9 (spell ids in spells.json). */
  spells: Record<string, string>
  /** Machine-readable parts of the granted power the engine applies. */
  effects?: {
    /** Skills that become cleric class skills (Knowledge: all Knowledge skills; Trickery: Bluff, Disguise, Hide…). */
    classSkills?: string[]
    /** Feats granted (War: Weapon Focus with the deity's weapon → "weapon-focus:$deityWeapon"; Strength? none). */
    grantsFeats?: string[]
    /** Spells with these descriptors (or of this school/subschool) are cast at +N caster level (Good, Evil, Law,
     * Chaos: +1; Healing: healing subschool +1; Knowledge: divination +1). */
    casterLevelBonus?: { descriptor?: string; school?: string; subschool?: string; value: number }
    /** Extra turning abilities, one entry per pool (Air: rebuke/command air creatures AND turn/destroy earth
     * creatures; Plant: rebuke plants; Sun: greater turning). `perDay`: "3+cha" (a turning pool: 3 + Cha modifier,
     * +4 per Extra Turning) or a fixed number ("1"). */
    turning?: { mode: 'turn' | 'rebuke' | 'greater-turning'; creatures: I18n; perDay: '3+cha' | number }[]
    /** Uses per day of an activated granted power, as text (e.g. Luck: "1/day reroll"). */
    usesPerDay?: I18n
  }
  source: Source
}

/** Templates applied to summoned creatures (Summon Monster: celestial, fiendish). */
export interface TemplateDef {
  id: string
  name: I18n
  /** Bilingual description (special attacks/qualities, by Hit Dice). */
  text: I18n
  /** Damage reduction, energy resistance and spell resistance by Hit Dice bands (SRD table). */
  bands: { minHD: number; maxHD: number; dr: string; resistances: I18n; }[]
  /** Spell resistance = HD + this (max 25). */
  srPlusHD: number
  /** Smite (evil for celestial, good for fiendish): 1/day, +Cha bonus to attack (? see text), +HD damage. */
  smite: I18n
  darkvision: number
  source: Source
}
