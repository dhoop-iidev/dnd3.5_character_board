import type { AbilityId, I18n, Lang, ModifierSpec, Slot } from '../data/types'

export const SCHEMA_VERSION = 3

/** Feat slot that granted the feat (docs/rules/advancement.md, house rule #3 for 'deity'). */
export type FeatSlot = 'general' | 'human' | 'fighter' | 'deity'

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
}

export interface ActiveEffect {
  uid: string
  kind: 'condition' | 'magic' | 'custom'
  /** Condition id or magic item id (e.g. a potion). */
  refId?: string
  custom?: { name: I18n; modifiers: ModifierSpec[] }
  enabled: boolean
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
  /** Situational modifiers switched on by the user (key = modifier key from the engine, e.g. "feat:dodge"). */
  situational: Record<string, boolean>
}

export interface Character {
  schemaVersion: number
  identity: {
    name: string
    player: string
    race: 'human'
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
  settings: { lang: Lang }
}
