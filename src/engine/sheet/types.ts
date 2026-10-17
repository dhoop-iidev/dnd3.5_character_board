// Types of the computed character sheet (engine/compute.ts and its stages in engine/sheet/).
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
  CreatureDef,
  DomainDef,
  RaceDef,
  ManeuverDef,
} from '../../data/types'
import type { FeatPick, ItemInstance } from '../../model/character'
import { resolve, type Stat } from '../stacking'
import type { MartialCaps } from '../martial'
import { proficiencies, type Proficiencies } from '../proficiency'
import type { Spellcasting } from '../spells'
import type { BardicSong } from '../arcane'

export type Size = CreatureDef['size']

/** A modifier from a feat, item or effect, before it is matched to a target. */
export interface ModSource {
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

/** A class ability with limited uses: per day or per week, or a pool of points (lay on hands, wholeness of body). */
export interface ClassAbility {
  id: string
  name: I18n
  max: number
  period: 'day' | 'week'
  /** The uses are points (hit points healed, rounds) rather than activations. */
  pool?: boolean
  lines: I18n[]
  source: Source
}

export interface ClassFeatures {
  rage?: {
    name: I18n
    perDay: number
    strCon: number
    will: number
    tireless: boolean
    /** Duration if started now (or the running rage's total): 3 + the raged Con modifier. */
    rounds: number
    active: boolean
    /** False for a lawful barbarian (ex-barbarian: no rage). */
    available: boolean
  }
  flurry?: { penalty: number; extra: number; available: boolean; on: boolean }
  /** Sneak attack dice, e.g. "3d6". */
  sneakAttack?: string
  abilities: ClassAbility[]
  immunities: I18n[]
  /** Described-only features worth having at hand (auras, evasion, slow fall…). */
  notes: { name: I18n; text: I18n; source: Source }[]
  spellResistance?: number
  /** Bard: bardic music uses per day, best Perform ranks and the songs (available or not for lack of ranks). */
  bardicMusic?: {
    perDay: number
    performRanks: number
    songs: (BardicSong & { available: boolean })[]
    performing: string[]
  }
  /** Crusader steely resolve: delayed damage pool (cap, current) and the furious counterstrike bonus. */
  steelyResolve?: { cap: number; pool: number; furious: number }
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
  /** Proficient with the weapon as gripped (a bastard sword or dwarven waraxe held two-handed is a martial weapon). */
  proficient: boolean
  /** Gripped two-handed. */
  twoHands: boolean
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
    extra: { name: I18n; uses: { mode: string; creatures: I18n }[]; perDay: number }[]
  }
  /** Cleric domains chosen. */
  domains: DomainDef[]
  /** Classes whose abilities are lost by alignment (ex-paladin, ex-druid). */
  lostClasses: string[]
  /** Barbarian, monk, paladin and rogue features: rage, flurry, sneak attack, tracked uses, immunities, notes. */
  classFeatures: ClassFeatures
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
    /** Every martial progression (one per martial adept class). */
    all: MartialCaps[]
    known: ManeuverDef[]
    stance?: ManeuverDef
    active: ManeuverDef[]
  }
}

export interface ComputeOptions {
  /** Compute as of this character level (validation of past levels). Default: all levels. */
  level?: number
}
