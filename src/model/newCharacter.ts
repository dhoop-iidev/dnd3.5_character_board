// A new, empty 1st-level character (any race, any base class). Skills, feats and gear are then chosen in the app.
import type { AbilityId, Lang } from '../data/types'
import { SCHEMA_VERSION, type Character } from './character'

export interface NewCharacterOptions {
  name: string
  race: string
  classId: string
  /** Scores before racial adjustments (the engine applies them). */
  abilities: Record<AbilityId, number>
  alignment?: string
  lang: Lang
}

export function newCharacter(o: NewCharacterOptions): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    identity: {
      name: o.name.trim() || (o.lang === 'fr' ? 'Nouveau personnage' : 'New character'),
      player: '',
      race: o.race,
      deity: '',
      alignment: o.alignment ?? '',
      gender: '',
      age: 0,
      height: { m: 0 },
      weight: { kg: 0 },
      eyes: '',
      hair: '',
      homeland: '',
      title: '',
      motto: '',
      languages: [o.lang === 'fr' ? 'Commun' : 'Common'],
    },
    xp: 0,
    baseAbilities: { ...o.abilities },
    abilityDamage: {},
    abilityDrain: {},
    levels: [{ classId: o.classId, skillRanks: {}, feats: [] }],
    inventory: [],
    loadouts: [{ id: 'main', name: { en: 'Main', fr: 'Principal' }, weapons: [] }],
    activeLoadout: 'main',
    activeEffects: [],
    hp: { damage: 0, nonlethal: 0, temp: 0 },
    dailyUsesSpent: {},
    toggles: { powerAttack: 0, combatExpertise: 0, fightingDefensively: false, totalDefense: false, situational: {} },
    notes: [],
    money: { cp: 0, sp: 0, gp: 0, pp: 0, other: '' },
    defenses: { dr: '', sr: '', resistances: '' },
    conditionalModifiers: '',
    annotations: {},
    // No built-in paper-doll picture for a new character (the knight illustration belongs to Chikibidouille).
    images: { doll: null },
    martial: { readied: [], expended: [], active: [] },
    settings: { lang: o.lang },
  }
}
