// Class-feature choices to make when taking a level (ranger favored enemy and combat style so far).
// Shared by the rule checks and the level editor.
import type { Rules } from '../data/rules'
import type { ChoiceOption, I18n } from '../data/types'
import type { Character } from '../model/character'
import { classLevelAt } from './progression'
import { ROGUE_REPEATABLE, ROGUE_SPECIAL_LEVELS } from './classFeatures'

export interface ClassChoice {
  /** Key in LevelEntry.classChoices. */
  key: string
  label: I18n
  options: ChoiceOption[]
  srdUrl: string
}

const RANGER = 'https://www.d20srd.org/srd/classes/ranger.htm'

/** Choices due at character level L (1-based), given the class taken at that level. */
export function choicesAt(char: Character, rules: Rules, L: number): ClassChoice[] {
  const entry = char.levels[L - 1]
  if (!entry) return []
  const cls = rules.classes.get(entry.classId)
  const n = classLevelAt(char, L)
  // Wizard school specialization at 1st level (optional: "universal" = no specialty).
  // https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization
  // A specialist gives up two other schools (a diviner one); divination can never be given up.
  if (cls?.id === 'wizard' && n === 1 && cls.choices?.school) {
    const url = 'https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization'
    const ch = entry.classChoices ?? {}
    const out: ClassChoice[] = [
      {
        key: 'school',
        label: { en: 'School specialization', fr: 'Spécialisation' },
        options: [{ id: 'universal', name: { en: 'None (universalist)', fr: 'Aucune (universaliste)' } }, ...cls.choices.school],
        srdUrl: url,
      },
    ]
    const specialty = ch.school && ch.school !== 'universal' ? ch.school : undefined
    const others = (exclude?: string) =>
      cls.choices!.school.filter((o) => o.id !== specialty && o.id !== 'divination' && o.id !== exclude)
    if (specialty) {
      out.push({ key: 'prohibited1', label: { en: 'Prohibited school', fr: 'École interdite' }, options: others(ch.prohibited2), srdUrl: url })
      if (specialty !== 'divination')
        out.push({ key: 'prohibited2', label: { en: 'Prohibited school (2nd)', fr: 'École interdite (2e)' }, options: others(ch.prohibited1), srdUrl: url })
    }
    return out
  }
  // Prestige class advancing a martial progression: which martial adept class it advances (Tome of Battle p. 96), when
  // the character has more than one.
  // Prestige class adding spellcasting levels ("+1 level of existing arcane/divine spellcasting class"): which class it
  // advances, when the character has more than one of that kind (Jade Phoenix Mage advances both).
  if ((cls?.martialAdvance || cls?.spellcastingAdvance) && n === 1) {
    const taken = [...new Set(char.levels.slice(0, L - 1).map((l) => l.classId))]
    const out: ClassChoice[] = []
    const martial = taken.filter((id) => ['crusader', 'swordsage', 'warblade'].includes(id))
    if (cls.martialAdvance && martial.length > 1)
      out.push({
        key: 'martialClass',
        label: { en: 'Martial progression advanced', fr: 'Progression martiale améliorée' },
        options: martial.map((id) => ({ id, name: rules.classes.get(id)?.name ?? { en: id, fr: id } })),
        srdUrl: '',
      })
    const kind = cls.spellcastingAdvance?.kind
    const casters = taken.filter((id) => kind && rules.classes.get(id)?.spellcasting?.kind === kind)
    if (casters.length > 1)
      out.push({
        key: 'spellcastingClass',
        label: { en: 'Spellcasting advanced', fr: 'Classe de lanceur améliorée' },
        options: casters.map((id) => ({ id, name: rules.classes.get(id)?.name ?? { en: id, fr: id } })),
        srdUrl: 'https://www.d20srd.org/srd/classes/prestigeClasses.htm',
      })
    return out
  }
  // Rogue special ability at 10th, 13th, 16th and 19th; skill mastery and the bonus feat can be taken again
  // (https://www.d20srd.org/srd/classes/rogue.htm#specialAbilities).
  if (cls?.id === 'rogue') {
    if (!ROGUE_SPECIAL_LEVELS.includes(n)) return []
    const before = new Set(
      char.levels
        .slice(0, L - 1)
        .filter((l) => l.classId === 'rogue')
        .map((l) => l.classChoices?.specialAbility)
        .filter((x): x is string => !!x && !ROGUE_REPEATABLE.includes(x)),
    )
    return [
      {
        key: 'specialAbility',
        label: { en: 'Rogue special ability', fr: 'Aptitude spéciale du roublard' },
        options: (cls.choices?.specialAbility ?? []).filter((o) => !before.has(o.id)),
        srdUrl: 'https://www.d20srd.org/srd/classes/rogue.htm#specialAbilities',
      },
    ]
  }
  if (!cls || cls.id !== 'ranger') return []
  const out: ClassChoice[] = []
  const enemies = cls.choices?.favoredEnemy ?? []
  // Favored enemy: a new type at ranger 1, 5, 10, 15, 20; from 5th, +2 more on one type (the new one allowed).
  if (n === 1 || n % 5 === 0) {
    const before = new Set(char.levels.slice(0, L - 1).map((l) => l.classChoices?.favoredEnemy).filter((x): x is string => !!x))
    out.push({
      key: 'favoredEnemy',
      label: { en: 'Favored enemy (new)', fr: 'Ennemi juré (nouveau)' },
      options: enemies.filter((o) => !before.has(o.id) || o.id === entry.classChoices?.favoredEnemy),
      srdUrl: `${RANGER}#favoredEnemy`,
    })
    if (n >= 5) {
      const chosen = new Set([...before, entry.classChoices?.favoredEnemy].filter((x): x is string => !!x))
      out.push({
        key: 'favoredEnemyIncrease',
        label: { en: 'Favored enemy bonus +2', fr: 'Ennemi juré : bonus +2' },
        options: enemies.filter((o) => chosen.has(o.id)),
        srdUrl: `${RANGER}#favoredEnemy`,
      })
    }
  }
  // Combat style: archery or two-weapon combat at ranger 2.
  if (n === 2)
    out.push({
      key: 'combatStyle',
      label: { en: 'Combat style', fr: 'Style de combat' },
      options: cls.choices?.combatStyle ?? [],
      srdUrl: `${RANGER}#combatStyle`,
    })
  return out
}
