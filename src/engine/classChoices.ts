// Class-feature choices to make when taking a level (ranger favored enemy and combat style so far).
// Shared by the rule checks and the level editor.
import type { Rules } from '../data/rules'
import type { ChoiceOption, I18n } from '../data/types'
import type { Character } from '../model/character'
import { classLevelAt } from './progression'

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
  if (cls?.id === 'wizard' && n === 1 && cls.choices?.school)
    return [
      {
        key: 'school',
        label: { en: 'School specialization', fr: 'Spécialisation' },
        options: [{ id: 'universal', name: { en: 'None (universalist)', fr: 'Aucune (universaliste)' } }, ...cls.choices.school],
        srdUrl: 'https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization',
      },
    ]
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
