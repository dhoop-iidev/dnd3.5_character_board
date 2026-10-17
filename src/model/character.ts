import type { AbilityId, I18n, Lang, ModifierSpec, Slot } from '../data/types'

export const SCHEMA_VERSION = 7

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
  /** Spell Mastery: the spells chosen (as many as the Int modifier, https://www.d20srd.org/srd/feats.htm#spellMasterySpecial). */
  spells?: string[]
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
  /** Spells learned at this level: bard and sorcerer spells known; wizard spells added to the spellbook for free (at
   * the first wizard level, the 1st-level spells of the starting spellbook; 0-level spells are all in it). */
  spellsLearned?: string[]
  /** Sorcerer 4th, 6th, 8th… / bard 5th, 8th, 11th… level: one spell known exchanged for another of the same level
   * (https://www.d20srd.org/srd/classes/sorcerer.htm#sorcererSpells, bard.htm#bardSpells). */
  spellSwap?: { from: string; to: string }
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
  /** Crusader: readied maneuvers granted this encounter (the others are withheld; ToB pp. 9–10). */
  granted?: string[]
  /** Crusader steely resolve: delayed damage pool (ToB p. 10). */
  pool?: number
}

/** One prepared spell slot: the spell, cast today or not, a cleric's spontaneous cure/inflict, metamagic feats. */
export interface PreparedSlot {
  id: string
  cast: boolean
  spontaneous?: string
  /** Metamagic feat ids applied when preparing (https://www.d20srd.org/srd/feats.htm#metamagicFeats). */
  metamagic?: string[]
  /** Heighten Spell: the spell's new level. */
  heighten?: number
}

/** Prepared spells of one casting class (slots by spell level; spontaneous casters only count casts). */
export interface SpellcastingState {
  /** Slot level -> prepared slots. */
  prepared: Record<number, PreparedSlot[]>
  /** Spontaneous casters: spell slots used today per slot level. */
  castCount?: Record<number, number>
  /** Wizard: spells copied into the spellbook from scrolls or other spellbooks (besides the free spells per level). */
  spellbook?: string[]
  /** Wizard without her spellbook today: only read magic and the Spell Mastery spells can be prepared. */
  withoutBook?: boolean
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
  /** "mount": the paladin's special mount (advances with paladin level); "familiar": a sorcerer's or wizard's
   * familiar (advances with their combined level); default: an animal companion. */
  kind?: 'mount' | 'familiar'
  /** Horse or pony trained for war (combat riding): primary hooves (house rule #25). */
  warTrained?: boolean
  /** Tricks taught with Handle Animal (free text ids/names). */
  tricks?: string[]
  /** Familiar: celestial or fiendish template (Improved Familiar, templates.json id). */
  template?: string
}

export interface SummonState extends CreatureState {
  /** Rounds left (1 round per caster level), counted down at the start of your turn. */
  rounds: number
  spellId?: string
  /** Augment Summoning applied (+4 Str and Con). */
  augmented: boolean
  /** Summon Monster: celestial or fiendish template (templates.json id). */
  template?: string
}

/** Druid wild shape in progress (https://www.d20srd.org/srd/classes/druid.htm#wildShape). */
export interface WildShapeState {
  /** Form taken (creatures.json id). */
  creatureId: string
  /** Rounds left (1 hour = 600 rounds per druid level), counted down at the start of your turn. */
  rounds: number
  /** Items kept functional (the rest melds into the form and stops working). */
  keepItems: string[]
  /** Elemental form (separate daily uses from 16th level). */
  elemental?: boolean
}

export type ItemKind = 'weapon' | 'armor' | 'gear' | 'magic' | 'custom'
/**
 * Where an item is (https://www.d20srd.org/srd/combat/actionsInCombat.htm#moveActions): worn = on the body (armor,
 * magic items in their slot, weapons in a sheath or on the belt, a slung shield: drawn or readied without provoking);
 * carried = in the backpack (retrieving it is a move action that provokes an attack of opportunity); stored = left
 * elsewhere (no weight). The weapons and shield in hand are picked among the worn ones in the Combat pane (`Loadout`).
 */
export type ItemLocation = 'worn' | 'carried' | 'stored'

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
  /** Custom items, and custom weapons (then on top of the base weapon `refId`: own weight, price, description,
   * bonuses while wielded, damage dice and critical overrides). */
  custom?: {
    weightLb: number
    costGp: number
    text: I18n
    modifiers?: ModifierSpec[]
    slot?: Slot
    /** Custom weapon: damage dice for a Medium wielder (e.g. "2d6"), critical range (19 = 19–20) and multiplier. */
    damage?: string
    critRange?: number
    critMult?: number
  }
  /** Spell item made with the app (scroll, potion, oil, wand, staff): sets the activation and the price formula. */
  spellItem?: SpellItemType
  /** Spells stored in the item (scroll, wand, staff… or any item: a weapon, a ring). */
  spells?: StoredSpell[]
  /** Charges of the item (wand, staff: 50 when made), spent by its spells. */
  charges?: { left: number; max: number }
  note?: string
}

export type SpellItemType = 'scroll' | 'potion' | 'oil' | 'wand' | 'staff'

/** A spell an item holds (https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm). */
export interface StoredSpell {
  spellId: string
  /** Spell level as stored (the lowest level on a class list by default). */
  level: number
  casterLevel: number
  /** completion: scroll; trigger: wand, staff; use: potion, oil; command: command word (other items). */
  activation: 'completion' | 'trigger' | 'use' | 'command'
  /** single: one use (a scroll's spell, a potion); charges: from the item's charges; perDay: uses per day. */
  uses: 'single' | 'charges' | 'perDay'
  /** Charges spent per use (staff: 1, or 2 for a spell stored at half price). */
  cost?: number
  perDay?: number
  /** perDay: uses spent today; single: 1 once used. */
  used?: number
}

/** A combat setup: which weapons are in hand and whether the shield is strapped. */
export interface Loadout {
  id: string
  name: I18n
  /** Weapon item uids in hand (worn weapons only; first = primary). */
  weapons: string[]
  /** Shield item uid strapped on the arm (a worn shield), if any. */
  shield?: string
  /** One-handed weapons (uids) gripped with two hands: Str ×1.5, Power Attack ×2. */
  twoHanded?: string[]
  /** Fight with two weapons: the first melee weapon is the primary hand, the second the off hand. */
  twoWeapon?: boolean
}

export interface ActiveEffect {
  uid: string
  kind: 'condition' | 'magic' | 'custom' | 'class'
  /** Condition id, magic item id (e.g. a potion) or class ability id ("rage"). */
  refId?: string
  custom?: { name: I18n; modifiers: ModifierSpec[] }
  enabled: boolean
  /** Rounds left (counted down at the start of each of your turns by the turn bar); undefined = no set duration. */
  rounds?: number
  /** Lasts until the end of the encounter (the fatigue after a barbarian's rage). */
  encounter?: boolean
  /** Temporary hit points the effect gave (inspire greatness) and not lost yet; what is left goes when it ends. */
  tempHp?: number
  /** Energy drained: number of negative levels (the condition's modifiers are applied this many times). */
  count?: number
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
  /** Monk flurry of blows (full attack). */
  flurry?: boolean
  /** Paladin smite evil on the next melee attack. */
  smite?: boolean
  /** Crusader smite on the next melee attack (Tome of Battle p. 11). */
  crusaderSmite?: boolean
  /** Mounted: a lance is wielded in one hand. */
  mounted?: boolean
  /** Monk's flurry with a quarterstaff: both ends used this round (Power Attack ×1 / none; house rule #29). */
  staffBothEnds?: boolean
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
    /** Character background (history, origins), free text shown beside the coat of arms. */
    background?: string
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
  /** Wild shape in progress. */
  wildShape?: WildShapeState
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
