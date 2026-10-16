// Wild shape actions shared by the Combat block, the banner and the turn bar.
// https://www.d20srd.org/srd/classes/druid.htm#wildShape, amended by the PHB errata 2006 (works like Alternate Form,
// MM errata 2006): docs/rules/rulings-classes.md C4.
import { rules } from '../data/rules'
import type { CreatureDef } from '../data/types'
import { wildShapeSizes, wildShapeUses } from '../engine/compute'
import type { Character } from '../model/character'

export const WILD_SHAPE_KEY = 'wild-shape'
export const ELEMENTAL_KEY = 'wild-shape-elemental'

export const druidLevel = (c: Character) => c.levels.filter((l) => l.classId === 'druid').length

/** Forms the druid can take now: animals (plants from 12th) within her size and Hit Dice limits; elementals apart. */
export function legalForms(c: Character, elemental = false): CreatureDef[] {
  const lvl = druidLevel(c)
  const sizes = wildShapeSizes(lvl, elemental)
  return [...rules.creatures.values()]
    // Elementals: only the Small to Huge air, earth, fire and water elementals (not other creatures of the type).
    .filter((d) =>
      elemental
        ? /^elemental-(small|medium|large|huge)-(air|earth|fire|water)$/.test(d.id)
        : d.type === 'animal' || (lvl >= 12 && d.type === 'plant'),
    )
    .filter((d) => sizes.includes(d.size) && d.hitDice.count <= lvl)
}

export function usesLeft(c: Character, elemental = false): { left: number; max: number } {
  const u = wildShapeUses(druidLevel(c))
  const max = elemental ? u.elemental : u.animal
  return { left: max - (c.dailyUsesSpent[elemental ? ELEMENTAL_KEY : WILD_SHAPE_KEY] ?? 0), max }
}

/** Take a form: one daily use, 1 hour per druid level, heals as after a night's rest (PHB errata), all gear melds
 * (armor and shields with the "wild" property keep their armor bonus). */
export function startWildShape(c: Character, creatureId: string, elemental = false) {
  const key = elemental ? ELEMENTAL_KEY : WILD_SHAPE_KEY
  c.dailyUsesSpent[key] = (c.dailyUsesSpent[key] ?? 0) + 1
  // Natural healing for a night: 1 hp per character level (https://www.d20srd.org/srd/combat/injuryDeath.htm#naturalHealing).
  c.hp.damage = Math.max(0, c.hp.damage - c.levels.length)
  c.wildShape = {
    creatureId,
    rounds: druidLevel(c) * 600,
    keepItems: c.inventory.filter((i) => (i.properties ?? []).includes('wild')).map((i) => i.uid),
    ...(elemental ? { elemental: true } : {}),
  }
}

export function endWildShape(c: Character) {
  delete c.wildShape
}

/** "9 h 58 min" / "4 rd" from a number of rounds (1 round = 6 seconds). */
export function fmtRounds(rounds: number, lang: 'en' | 'fr'): string {
  if (rounds < 10) return `${rounds} ${lang === 'fr' ? 'rd' : 'rd'}`
  const min = Math.floor(rounds / 10)
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}
