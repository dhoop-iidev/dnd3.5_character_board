// Race of a character (https://www.d20srd.org/srd/races.htm): data from src/data/srd/races.json.
import type { Rules } from '../data/rules'
import type { RaceDef } from '../data/types'
import type { Character } from '../model/character'

/** Human, used when the race data is missing (https://www.d20srd.org/srd/races.htm#humans). */
const HUMAN_FALLBACK: RaceDef = {
  id: 'human',
  name: { en: 'Human', fr: 'Humain' },
  size: 'medium',
  speed: 30,
  abilityAdjustments: {},
  bonusFeat: true,
  extraSkillPoints: 1,
  favoredClass: 'any',
  vision: 'normal',
  automaticLanguages: [{ en: 'Common', fr: 'Commun' }],
  bonusLanguages: [],
  modifiers: [],
  traits: [],
  text: { en: '', fr: '' },
  source: { srdUrl: 'https://www.d20srd.org/srd/races.htm#humans' },
}

export function raceOf(char: Pick<Character, 'identity'>, rules: Rules): RaceDef {
  return rules.races.get(char.identity.race) ?? (char.identity.race === 'human' ? HUMAN_FALLBACK : HUMAN_FALLBACK)
}
