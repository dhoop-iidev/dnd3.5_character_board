import type { AbilityId, I18n, Lang, ModifierSpec, Slot } from '../data/types'

export const SCHEMA_VERSION = 6

/**
 * Feat slot that granted the feat (docs/rules/advancement.md): general (1st + every 3 levels), race (human bonus
 * feat), class (class bonus feat: fighter list, warblade list…), deity (house rule #3), granted (given by a class
 * feature without a choice, e.g. ranger Track — computed, never stored).
 */
export type FeatSlot = 'general' | 'race' | 'class' | 'deity' | 'granted'

export interface FeatPick {
  featId: string
  slot: FeatSlot
  /** Chosen weapon/skill for feats like Weapon Focus (e.g. "greatsword"). */
  choice?: string
}

/** Choices made when gaining one character level. Hit points follow house rule #9 (max hit die). */
export interface LevelEntry {
  classId: string
  /** Ranks bought at this level. Keys: skill id, or "<skill>:<subtype>" (e.g. "craft:weaponsmithing"). Cross-class ranks may be halves. */
  skillRanks: Record<string, number>
  feats: FeatPick[]
  abilityIncrease?: AbilityId
  /** Tome of Battle: maneuvers and stances learned at this level (ids). */
  maneuversLearned?: string[]
  /** Warblade 4th, 6th, 8th… level: one known maneuver (not a stance) exchanged for another (ToB p. 21). */
  maneuverSwap?: { from: string; to: string }
  /** Hit points rolled at this level, when maximum hit dice (house rule #9) is switched off. */
  hpRoll?: number
  /**
   * Class feature choices made at this level, e.g. ranger: favoredEnemy (new type), favoredEnemyIncrease (type
   * whose bonus rises by 2), combatStyle ("archery" | "two-weapon").
   */
  classChoices?: Record<string, string>
}

/**
 * Turn stage of a running effect, counted from the turn it started (Tome of Battle p. 45, durations):
 * 0 = your turn, 1 = after your turn ended, 2 = your next turn started, 3 = your next turn ended, …
 */
export type TurnStage = number

/** A maneuver initiated during combat whose effect is still running. */
export interface ActiveManeuver {
  id: string
  /** How far the turn has advanced since it was initiated; each effect ends at its own stage (engine/martial.ts). */
  stage: TurnStage
}

/** Tome of Battle state of a martial adept (warblade). */
export interface MartialState {
  /** Readied maneuvers (stances are never readied: all known stances are available). */
  readied: string[]
  /** Readied maneuvers already used this encounter. */
  expended: string[]
  /** Current stance (one at a time until stance mastery at warblade 20). */
  stance?: string
  /** Maneuvers whose effect is running (applied to the sheet until cleared). */
  active: ActiveManeuver[]
  /** Critical hits scored in the current stance (Blood in the Water, ToB p. 86). */
  crits?: number
}

/** Prepared spells of one casting class (slots by spell level; spontaneous casters only count casts). */
export interface SpellcastingState {
  /** Spell level -> prepared slots (spell id, cast today or not). */
  prepared: Record<number, { id: string; cast: boolean }[]>
  /** Spontaneous casters: spells cast today per spell level. */
  castCount?: Record<number, number>
}

/** A creature with the character: animal companion or summoned creature (stat block from creatures.json). */
export interface CreatureState {
  uid: string
  creatureId: string
  /** Given name (companions). */
  name?: string
  /** Maximum hit points for every hit die; false = `hpManual` (or the stat block average when empty). */
  maxHp: boolean
  hpManual?: number
  damage: number
  nonlethal?: number
  /** Conditions and effects on the creature (same model as the character's). */
  effects?: ActiveEffect[]
  notes?: string
}

export interface CompanionState extends CreatureState {
  /** Tricks taught with Handle Animal (free text ids/names). */
  tricks?: string[]
}

export interface SummonState extends CreatureState {
  /** Rounds left (1 round per caster level), counted down at the start of your turn. */
  rounds: number
  spellId?: string
  /** Augment Summoning applied (+4 Str and Con). */
  augmented: boolean
}

export type ItemKind = 'weapon' | 'armor' | 'gear' | 'magic' | 'custom'
/** worn = equipped on the body; carried = in hand/belt; pack = backpack; stored = not carried (no weight). */
export type ItemLocation = 'worn' | 'carried' | 'pack' | 'stored'

export interface ItemInstance {
  uid: string
  kind: ItemKind
  /** Id in the matching data file (weapons, armor, gear, magic-items). Empty for custom items. */
  refId: string
  /** Display name override (custom items, or "Greatsword +2"). */
  name?: I18n
  quantity: number
  location: ItemLocation
  masterwork?: boolean
  /** Magic enhancement bonus (+1..+5) of a weapon, armor or shield. Implies masterwork. */
  enhancement?: number
  /** Special material id (src/data/custom/materials.json), e.g. "adamantine". */
  material?: string
  /** Magic special abilities ids (src/data/srd/item-properties.json), e.g. ["keen", "flaming"]. */
  properties?: string[]
  /** Custom items only. */
  custom?: { weightLb: number; costGp: number; text: I18n; modifiers?: ModifierSpec[]; slot?: Slot }
  note?: string
}

/** A combat setup: which weapons are in hand and whether the shield is strapped. */
export interface Loadout {
  id: string
  name: I18n
  /** Weapon item uids usable in this loadout (first = primary). */
  weapons: string[]
  /** Shield item uid strapped on the arm, if any. */
  shield?: string
  /** One-handed weapons (uids) gripped with two hands: Str ×1.5, Power Attack ×2. */
  twoHanded?: string[]
  /** Fight with two weapons: the first melee weapon is the primary hand, the second the off hand. */
  twoWeapon?: boolean
}

export interface ActiveEffect {
  uid: string
  kind: 'condition' | 'magic' | 'custom'
  /** Condition id or magic item id (e.g. a potion). */
  refId?: string
  custom?: { name: I18n; modifiers: ModifierSpec[] }
  enabled: boolean
  /** Rounds left (counted down at the end of each of your turns); undefined = no set duration. */
  rounds?: number
  note?: string
}

export interface Note {
  id: string
  date: string
  title: string
  body: string
}

export interface CombatToggles {
  powerAttack: number
  combatExpertise: number
  fightingDefensively: boolean
  totalDefense: boolean
  /** Rapid Shot: one extra ranged attack at the highest bonus, −2 on all ranged attacks this round. */
  rapidShot?: boolean
  /** Situational modifiers switched on by the user (key = modifier key from the engine, e.g. "feat:dodge"). */
  situational: Record<string, boolean>
}

export interface Character {
  schemaVersion: number
  identity: {
    name: string
    player: string
    /** Race id (src/data/srd/races.json). */
    race: string
    deity: string
    alignment: string
    gender: string
    age: number
    height: { m: number }
    weight: { kg: number }
    eyes: string
    hair: string
    homeland: string
    skin?: string
    campaign?: string
    /** Title shown under the name (e.g. "Champion of Scorpio"). */
    title?: string
    /** Motto written under the coat of arms. */
    motto?: string
    languages?: string[]
  }
  /** Experience points; reaching the next threshold offers a level-up (https://www.d20srd.org/srd/xp.htm). */
  xp: number
  baseAbilities: Record<AbilityId, number>
  /** Ability damage / drain points currently suffered (positive numbers). */
  abilityDamage: Partial<Record<AbilityId, number>>
  abilityDrain: Partial<Record<AbilityId, number>>
  levels: LevelEntry[]
  /** Weapon Master weapon of choice (weapon id). */
  weaponOfChoice?: string
  inventory: ItemInstance[]
  loadouts: Loadout[]
  activeLoadout: string
  activeEffects: ActiveEffect[]
  /** Combat round counter (1 = first round of the encounter). */
  round?: number
  /** Animal companions (druid, ranger 4+). */
  companions?: CompanionState[]
  /** Creatures currently summoned. */
  summons?: SummonState[]
  /** Spellcasting state per class id: prepared spells by spell level, with the ones already cast today. */
  spells?: Record<string, SpellcastingState>
  hp: { damage: number; nonlethal: number; temp: number }
  /** Daily uses spent (key = feature id, e.g. "ki-damage"). */
  dailyUsesSpent: Record<string, number>
  toggles: CombatToggles
  notes: Note[]
  /** Coins carried (50 coins = 1 lb) and other wealth (gems, art…) as text. */
  money: { cp: number; sp: number; gp: number; pp: number; other: string }
  /** Defenses the engine doesn't compute yet (damage reduction, spell resistance, energy resistances), as text. */
  defenses: { dr: string; sr: string; resistances: string }
  /** Free-text conditional modifiers (e.g. "+2 vs fear"), as on the official sheet. */
  conditionalModifiers: string
  /** Campaign notes attached to any popup (key: "feat:dodge", "item:<uid>", "stat:AC"…). */
  annotations: Record<string, string>
  /** Coat of arms and face drawing, as resized data URLs (exported with the character). */
  /** doll: paper-doll picture (undefined = built-in knight illustration, null = removed). */
  images: { coatOfArms?: string; face?: string; doll?: string | null }
  /** Tome of Battle: readied/expended maneuvers, stance, active effects. */
  martial: MartialState
  /** maxHitDice: house rule #9 (every level gives the maximum of its hit die); false = rolled hit points entered by
   * hand (level 1 is always the maximum). Undefined = true. */
  settings: { lang: Lang; maxHitDice?: boolean }
}
