// Spellcasting of the character's classes: caster level, spells per day with bonus spells, save DCs.
// https://www.d20srd.org/srd/magicOverview/castingSpells.htm, https://www.d20srd.org/srd/theBasics.htm (Table: Ability
// Modifiers and Bonus Spells).
import type { Rules } from '../data/rules'
import type { AbilityId, I18n, SpellcastingDef, SpellDef } from '../data/types'
import type { LevelEntry } from '../model/character'
import { i18n, resolve, type Stat } from './stacking'

/** Level of a spell for a class: its list's level, or a level on the class's own key (the two wizard-only spells of
 * the sorcerer/wizard list, mnemonic enhancer and mage's lucubration, are stored under "wizard"). */
export function classSpellLevel(sp: SpellDef, classId: string, list: string): number | undefined {
  return sp.level[list] ?? sp.level[classId]
}

export interface SpellSlots {
  spellLevel: number
  /** From the class table (0 = only bonus spells). */
  base: number
  /** Bonus spells from a high ability score. */
  bonus: number
  total: number
  /** Cleric domain slot (one per spell level from 1st) / specialist wizard extra slot (every spell level, 0 included). */
  extra: number
  /** Ability score too low to cast spells of this level (10 + spell level needed): the slots stay, for lower-level
   * spells only. */
  blocked: boolean
}

export interface Spellcasting {
  classId: string
  className: I18n
  def: SpellcastingDef
  /** Effective class level for spellcasting: class level + prestige levels that advance it. */
  classLevel: number
  /** Levels added by prestige classes ("+1 level of existing spellcasting class"). */
  advanceLevels: number
  casterLevel: Stat
  ability: AbilityId
  abilityMod: number
  slots: SpellSlots[]
  /** Save DC = 10 + spell level + ability modifier. */
  dc: (spellLevel: number) => number
  /** Arcane spell failure chance (%) for this class's spells with a somatic component (set by compute). */
  spellFailure?: Stat
}

/**
 * Spellcasting levels added by prestige classes, per casting class. Each advancing level of a prestige class goes to
 * the class chosen at its first level (`classChoices.spellcastingClass`), by default the first class of that kind
 * (arcane / divine) taken before it. The added level counts for spells per day, spells known and caster level, not
 * for other class features (Tome of Battle p. 96; https://www.d20srd.org/srd/classes/prestigeClasses.htm).
 */
export function spellcastingAdvance(levels: LevelEntry[], rules: Rules): Record<string, number> {
  const out: Record<string, number> = {}
  const count: Record<string, number> = {}
  const target: Record<string, string | undefined> = {}
  levels.forEach((l, i) => {
    const n = (count[l.classId] = (count[l.classId] ?? 0) + 1)
    const adv = rules.classes.get(l.classId)?.spellcastingAdvance
    if (!adv) return
    if (n === 1) {
      const before = levels.slice(0, i).map((x) => x.classId).filter((id) => rules.classes.get(id)?.spellcasting?.kind === adv.kind)
      const chosen = l.classChoices?.spellcastingClass
      target[l.classId] = chosen && before.includes(chosen) ? chosen : before[0]
    }
    const t = target[l.classId]
    if (t && adv.levels.includes(n)) out[t] = (out[t] ?? 0) + 1
  })
  return out
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
  /** Class choices made so far (wizard school for the specialist's extra slot). */
  choices: Record<string, string> = {},
  /** Spellcasting levels added by prestige classes (spellcastingAdvance). */
  advance: Record<string, number> = {},
): Spellcasting[] {
  const out: Spellcasting[] = []
  for (const [classId, own] of Object.entries(classLevels)) {
    const cls = rules.classes.get(classId)
    const def = cls?.spellcasting
    if (!cls || !def) continue
    const added = advance[classId] ?? 0
    const n = Math.min(20, own + added)
    const row = cls.table.find((r) => r.level === n)
    const perDay = row?.spellsPerDay ?? []
    // Paladins and rangers: caster level = ½ class level, from the level they get spells (4th).
    const firstSpellLevel = cls.table.find((r) => (r.spellsPerDay ?? []).some((x) => x !== null && x !== undefined))?.level ?? 1
    const cl = n < firstSpellLevel ? 0 : def.casterLevel === 'half' ? Math.floor(n / 2) : n
    const { score, mod } = ability(def.ability)
    const slots: SpellSlots[] = []
    // Cleric: +1 domain spell per spell level from 1st (https://www.d20srd.org/srd/classes/cleric.htm#domains);
    // specialist wizard: +1 spell of the specialty school per level (https://www.d20srd.org/srd/classes/wizard.htm).
    const specialist = classId === 'wizard' && !!choices.school && choices.school !== 'universal'
    const extraSlot = def.domainSlots || specialist ? 1 : 0
    // Lowest spell level of the list (paladin, ranger: 1st; no orisons).
    const minLevel = perDay.findIndex((x) => x !== null && x !== undefined)
    perDay.forEach((base, spellLevel) => {
      if (base === null || base === undefined) return
      // Domain slot from 1st level; the specialist's extra spell at every spell level, 0 included (rulings-classes.md C26).
      const extra = spellLevel >= 1 || specialist ? extraSlot : 0
      // Too low a score: the slots stay (to hold lower-level spells), without bonus spells
      // (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots).
      const blocked = score.total < 10 + spellLevel
      const bonus = blocked ? 0 : bonusSpells(mod, spellLevel)
      // A blocked slot with no castable lower level (Wis 10 paladin: no 0-level spells) is useless.
      const usable = !blocked || (spellLevel > minLevel && score.total >= 10 + minLevel)
      slots.push({ spellLevel, base, bonus, extra, total: usable ? base + bonus + extra : 0, blocked })
    })
    out.push({
      classId,
      className: cls.name,
      def,
      classLevel: n,
      advanceLevels: added,
      casterLevel: resolve([
        {
          sourceId: `class:${classId}`,
          label:
            def.casterLevel === 'half'
              ? i18n(`${cls.name.en} ${n} ÷ 2`, `${cls.name.fr} ${n} ÷ 2`)
              : added
                ? i18n(`${cls.name.en} ${own} + ${added} (prestige class)`, `${cls.name.fr} ${own} + ${added} (classe de prestige)`)
                : i18n(`${cls.name.en} ${n}`, `${cls.name.fr} ${n}`),
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
