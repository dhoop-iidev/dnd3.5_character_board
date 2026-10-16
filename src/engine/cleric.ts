// Cleric: domains, turn or rebuke undead, spontaneous casting (https://www.d20srd.org/srd/classes/cleric.htm).
import type { Rules } from '../data/rules'
import type { DomainDef, SpellDef } from '../data/types'
import type { Character, FeatPick } from '../model/character'

/** Class choices made at the first cleric level (domain1, domain2, channel, deityWeapon). */
export function clericChoices(char: Pick<Character, 'levels'>): Record<string, string> {
  const first = char.levels.find((l) => l.classId === 'cleric')
  return first?.classChoices ?? {}
}

/** The two domains chosen at cleric 1 (https://www.d20srd.org/srd/classes/cleric.htm#domains). */
export function domainsOf(char: Pick<Character, 'levels'>, rules: Rules): DomainDef[] {
  const ch = clericChoices(char)
  return [ch.domain1, ch.domain2].map((id) => (id ? rules.domains.get(id) : undefined)).filter((d): d is DomainDef => !!d)
}

/** Class skills of a class for this character: the class list, plus the cleric's domain skills (Knowledge, Trickery…). */
export function classSkillsOf(char: Pick<Character, 'levels'>, rules: Rules, classId: string): string[] {
  const base = rules.classes.get(classId)?.classSkills ?? []
  if (classId !== 'cleric') return base
  return [...base, ...domainsOf(char, rules).flatMap((d) => d.effects?.classSkills ?? [])]
}

/** Feats granted by domains (War: Weapon Focus with the deity's favored weapon). */
export function domainFeats(char: Pick<Character, 'levels'>, rules: Rules): FeatPick[] {
  const weapon = clericChoices(char).deityWeapon
  return domainsOf(char, rules).flatMap((d) =>
    (d.effects?.grantsFeats ?? []).map((f) => {
      const [featId, choice] = f.split(':')
      return { featId, slot: 'granted' as const, ...(choice ? { choice: choice === '$deityWeapon' ? weapon : choice } : {}) }
    }),
  )
}

/** Caster level bonus for a spell from the domains (Good/Evil/Law/Chaos descriptors, Healing, Knowledge). */
export function domainCasterLevelBonus(spell: SpellDef, domains: DomainDef[]): { value: number; domain?: DomainDef } {
  let best = { value: 0 } as { value: number; domain?: DomainDef }
  for (const d of domains) {
    const b = d.effects?.casterLevelBonus
    if (!b) continue
    const hit =
      (b.descriptor && spell.descriptors?.includes(b.descriptor)) ||
      (b.school && spell.schoolId === b.school) ||
      (b.subschool && spell.subschool === b.subschool)
    if (hit && b.value > best.value) best = { value: b.value, domain: d }
  }
  return best
}

/** SRD Table: Turning Undead — turning check result → most powerful undead affected (relative to turning level). */
export const TURNING_TABLE: { max: number; delta: number }[] = [
  { max: 0, delta: -4 },
  { max: 3, delta: -3 },
  { max: 6, delta: -2 },
  { max: 9, delta: -1 },
  { max: 12, delta: 0 },
  { max: 15, delta: 1 },
  { max: 18, delta: 2 },
  { max: 21, delta: 3 },
  { max: Infinity, delta: 4 },
]
