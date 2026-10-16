// Weapon and armor proficiency from classes, race and feats, in one place (attack penalties, rule checks and feat
// prerequisites all use it).
// https://www.d20srd.org/srd/equipment/weapons.htm#weaponCategories, https://www.d20srd.org/srd/races.htm,
// https://www.d20srd.org/srd/feats.htm#martialWeaponProficiency
import type { Rules } from '../data/rules'
import type { RaceDef, WeaponDef } from '../data/types'
import type { FeatPick } from '../model/character'

export interface Proficiencies {
  /** Weapon categories ("simple", "martial") and weapon ids. */
  weapons: Set<string>
  /** Armor categories: light, medium, heavy, shield, tower. */
  armor: Set<string>
}

const ARMOR_FEATS: Record<string, string> = {
  'armor-proficiency-light': 'light',
  'armor-proficiency-medium': 'medium',
  'armor-proficiency-heavy': 'heavy',
  'shield-proficiency': 'shield',
  'tower-shield-proficiency': 'tower',
}

export function proficiencies(classLevels: Record<string, number>, feats: FeatPick[], race: RaceDef, rules: Rules): Proficiencies {
  const weapons = new Set(Object.keys(classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.weapons ?? []))
  const armor = new Set<string>(Object.keys(classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.armor ?? []))
  for (const f of feats) {
    if (f.featId === 'simple-weapon-proficiency') weapons.add('simple')
    // Martial / Exotic Weapon Proficiency: one chosen weapon each time.
    if ((f.featId === 'martial-weapon-proficiency' || f.featId === 'exotic-weapon-proficiency') && f.choice) weapons.add(f.choice)
    if (ARMOR_FEATS[f.featId]) armor.add(ARMOR_FEATS[f.featId])
  }
  // Racial proficiencies (elf: longsword, rapier, bows) and weapon familiarity (dwarven waraxe/urgrosh, gnome hooked
  // hammer count as martial weapons: proficient when proficient with all martial weapons).
  for (const id of race.weaponProficiencies ?? []) weapons.add(id)
  if (weapons.has('martial')) for (const id of race.weaponFamiliarity ?? []) weapons.add(id)
  return { weapons, armor }
}

/** Natural weapons (wild shape, creatures) need no proficiency (https://www.d20srd.org/srd/monsters/intro.htm). */
export const proficientWith = (p: Proficiencies, weapon: WeaponDef) =>
  (weapon.category as string) === 'natural' || p.weapons.has(weapon.category) || p.weapons.has(weapon.id)
