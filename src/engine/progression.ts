// Leveling rules shared by the rule checks and the level editor (docs/rules/advancement.md, skills.md, feats.md).
import type { Rules } from '../data/rules'
import type { FeatDef } from '../data/types'
import type { Character, FeatPick, FeatSlot } from '../model/character'
import { compute } from './compute'
import { unmetPrereqs } from './prereq'

/** XP needed to reach a character level: 1000 × n(n−1)/2 (https://www.d20srd.org/srd/xp.htm). */
export const xpForLevel = (level: number) => (1000 * level * (level - 1)) / 2

/** Highest character level reached with this XP. */
export function levelForXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

/** Feats gained every 3 character levels (1, 3, 6, 9…). */
export const isGeneralFeatLevel = (level: number) => level === 1 || level % 3 === 0
/** +1 ability score at 4, 8, 12… */
export const isAbilityIncreaseLevel = (level: number) => level % 4 === 0

/** Level of `classId` reached at character level `level` (1-based). */
export function classLevelAt(char: Character, level: number): number {
  return char.levels.slice(0, level).filter((l) => l.classId === char.levels[level - 1]?.classId).length
}

/** Feat slots granted at a character level (excluding the deity feat, house rule #3). */
export function featSlotsAt(char: Character, rules: Rules, level: number): Record<Exclude<FeatSlot, 'deity'>, number> {
  const entry = char.levels[level - 1]
  const cls = entry && rules.classes.get(entry.classId)
  return {
    general: isGeneralFeatLevel(level) ? 1 : 0,
    human: level === 1 && char.identity.race === 'human' ? 1 : 0,
    fighter: cls?.bonusFeatLevels?.includes(classLevelAt(char, level)) ? 1 : 0,
  }
}

export interface SkillBudget {
  available: number
  spent: number
  /** Points to buy one more rank (1 for a class skill of the class taken at this level, else 2). */
  costPerRank: (skillId: string) => number
  /** Max total ranks at this character level (level + 3 if a class skill of any class, else half). */
  maxRanks: (skillId: string) => number
}

/** Skill points for one level: (class points + Int) ×4 at level 1, +1 per level for humans (×4 at level 1). */
export function skillBudget(char: Character, rules: Rules, level: number): SkillBudget {
  const entry = char.levels[level - 1]
  const cls = rules.classes.get(entry.classId)
  // Int from permanent scores: temporary effects, ability damage and enhancement bonuses (headband of intellect)
  // never give skill points; inherent bonuses and drain do (rulings q3,
  // https://www.d20srd.org/srd/magicItems/wondrousItems.htm#headbandofIntellect).
  const intEnhancement = (item: Character['inventory'][number]) => {
    const mods = item.kind === 'magic' ? rules.magicItems.get(item.refId)?.modifiers : item.custom?.modifiers
    return (mods ?? []).some((m) => m.target === 'ability.int' && m.bonusType === 'enhancement')
  }
  const base = { ...char, activeEffects: [], abilityDamage: {}, inventory: char.inventory.filter((i) => !intEnhancement(i)) }
  const sheet = compute(base, rules, { level })
  const intMod = sheet.abilities.int.mod
  let available = Math.max(1, (cls?.skillPoints ?? 0) + intMod) * (level === 1 ? 4 : 1)
  if (char.identity.race === 'human') available += level === 1 ? 4 : 1
  const inClass = (skillId: string) => cls?.classSkills.includes(skillId) ?? false
  const anyClass = (skillId: string) =>
    Object.keys(sheet.classLevels).some((c) => rules.classes.get(c)?.classSkills.includes(skillId))
  const spent = Object.entries(entry.skillRanks).reduce(
    (s, [key, ranks]) => s + (inClass(key.split(':')[0]) ? ranks : ranks * 2),
    0,
  )
  return {
    available,
    spent,
    costPerRank: (skillId) => (inClass(skillId) ? 1 : 2),
    maxRanks: (skillId) => (anyClass(skillId) ? level + 3 : (level + 3) / 2),
  }
}

/** Total ranks in a skill after a given level. */
export function ranksAt(char: Character, key: string, level: number): number {
  return char.levels.slice(0, level).reduce((s, l) => s + (l.skillRanks[key] ?? 0), 0)
}

/** Feats owned before a pick (earlier levels, and earlier picks of the same level). */
function featsBefore(char: Character, level: number, pick?: FeatPick): FeatPick[] {
  const earlier = char.levels.slice(0, level - 1).flatMap((l) => l.feats)
  const same = char.levels[level - 1]?.feats ?? []
  const idx = pick ? same.indexOf(pick) : same.length
  return [...earlier, ...same.slice(0, idx < 0 ? same.length : idx)]
}

/** Feats that can be taken at this level in this slot, with their unmet prerequisites (empty = eligible). */
export function featOptions(
  char: Character,
  rules: Rules,
  level: number,
  slot: FeatSlot,
  pick?: FeatPick,
): { def: FeatDef; unmet: string[] }[] {
  const sheet = compute({ ...char, activeEffects: [], abilityDamage: {} }, rules, { level })
  const owned = featsBefore(char, level, pick)
  // Class bonus feats: fighter list for fighters, the class's own list otherwise (warblade, ToB p. 23).
  const cls = rules.classes.get(char.levels[level - 1]?.classId ?? '')
  const bonusOk = (d: FeatDef) => (cls?.id === 'fighter' || !cls?.bonusFeatList ? d.fighterBonus : cls.bonusFeatList.includes(d.id))
  return [...rules.feats.values()]
    .filter((d) => slot !== 'fighter' || bonusOk(d))
    .filter((d) => d.type === 'general' || slot === 'general' || slot === 'human' || slot === 'deity')
    .map((def) => ({
      def,
      unmet: unmetPrereqs(def.prereq, sheet, rules, owned, pick?.featId === def.id ? pick.choice : undefined).map(
        (u) => u.en,
      ),
    }))
    .filter(({ def }) => def.multiple || def.choice || !owned.some((f) => f.featId === def.id))
}

/** Classes the character may take at the next level (base classes always; prestige if requirements are met). */
export function classOptions(char: Character, rules: Rules): { id: string; unmet: string[] }[] {
  const sheet = compute({ ...char, activeEffects: [], abilityDamage: {} }, rules)
  const owned = char.levels.flatMap((l) => l.feats)
  return [...rules.classes.values()].map((cls) => {
    if (!cls.prestige || sheet.classLevels[cls.id]) return { id: cls.id, unmet: [] }
    const unmet = unmetPrereqs(cls.requirements, sheet, rules, owned, char.weaponOfChoice).map((u) => u.en)
    return { id: cls.id, unmet }
  })
}
