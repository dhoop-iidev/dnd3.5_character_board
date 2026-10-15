// Spellcasting of the character's classes: caster level, spells per day with bonus spells, save DCs.
// https://www.d20srd.org/srd/magicOverview/castingSpells.htm, https://www.d20srd.org/srd/theBasics.htm (Table: Ability
// Modifiers and Bonus Spells).
import type { Rules } from '../data/rules'
import type { AbilityId, I18n, SpellcastingDef } from '../data/types'
import { i18n, resolve, type Stat } from './stacking'

export interface SpellSlots {
  spellLevel: number
  /** From the class table (0 = only bonus spells). */
  base: number
  /** Bonus spells from a high ability score. */
  bonus: number
  total: number
  /** Ability score too low to cast spells of this level (10 + spell level needed). */
  blocked: boolean
}

export interface Spellcasting {
  classId: string
  className: I18n
  def: SpellcastingDef
  classLevel: number
  casterLevel: Stat
  ability: AbilityId
  abilityMod: number
  slots: SpellSlots[]
  /** Save DC = 10 + spell level + ability modifier. */
  dc: (spellLevel: number) => number
}

/** Bonus spells of one spell level for an ability modifier (none for level 0). */
export function bonusSpells(mod: number, spellLevel: number): number {
  if (spellLevel === 0 || mod < spellLevel) return 0
  return Math.floor((mod - spellLevel) / 4) + 1
}

export function spellcastingOf(
  classLevels: Record<string, number>,
  rules: Rules,
  ability: (a: AbilityId) => { score: Stat; mod: number },
): Spellcasting[] {
  const out: Spellcasting[] = []
  for (const [classId, n] of Object.entries(classLevels)) {
    const cls = rules.classes.get(classId)
    const def = cls?.spellcasting
    if (!cls || !def) continue
    const row = cls.table.find((r) => r.level === n)
    const perDay = row?.spellsPerDay ?? []
    // Paladins and rangers: caster level = ½ class level, from the level they get spells (4th).
    const firstSpellLevel = cls.table.find((r) => (r.spellsPerDay ?? []).some((x) => x !== null && x !== undefined))?.level ?? 1
    const cl = n < firstSpellLevel ? 0 : def.casterLevel === 'half' ? Math.floor(n / 2) : n
    const { score, mod } = ability(def.ability)
    const slots: SpellSlots[] = []
    perDay.forEach((base, spellLevel) => {
      if (base === null || base === undefined) return
      const bonus = bonusSpells(mod, spellLevel)
      const blocked = score.total < 10 + spellLevel
      slots.push({ spellLevel, base, bonus, total: blocked ? 0 : base + bonus, blocked })
    })
    out.push({
      classId,
      className: cls.name,
      def,
      classLevel: n,
      casterLevel: resolve([
        {
          sourceId: `class:${classId}`,
          label: def.casterLevel === 'half' ? i18n(`${cls.name.en} ${n} ÷ 2`, `${cls.name.fr} ${n} ÷ 2`) : i18n(`${cls.name.en} ${n}`, `${cls.name.fr} ${n}`),
          value: cl,
          bonusType: 'base',
          source: cls.source,
        },
      ]),
      ability: def.ability,
      abilityMod: mod,
      slots,
      dc: (spellLevel) => 10 + spellLevel + mod,
    })
  }
  return out
}
