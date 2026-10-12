// Loads the generated SRD data and hand-written custom data into one indexed registry.
import type {
  ArmorDef,
  CarryingCapacityRow,
  ClassDef,
  ConditionDef,
  FeatDef,
  GearDef,
  MagicItemDef,
  SkillDef,
  SynergyDef,
  WeaponDef,
} from './types'

import skills from './srd/skills.json'
import synergies from './srd/synergies.json'
import feats from './srd/feats.json'
import classes from './srd/classes.json'
import weapons from './srd/weapons.json'
import armor from './srd/armor.json'
import gear from './srd/gear.json'
import magicItems from './srd/magic-items.json'
import carryingCapacity from './srd/carrying-capacity.json'
import weaponMaster from './custom/weapon-master.json'
import homebrewSkills from './custom/homebrew-skills.json'
import conditions from './custom/conditions.json'
import classSkillOverrides from './custom/class-skill-overrides.json'

export interface Rules {
  skills: Map<string, SkillDef>
  synergies: SynergyDef[]
  feats: Map<string, FeatDef>
  classes: Map<string, ClassDef>
  weapons: Map<string, WeaponDef>
  armor: Map<string, ArmorDef>
  gear: Map<string, GearDef>
  magicItems: Map<string, MagicItemDef>
  conditions: Map<string, ConditionDef>
  carryingCapacity: CarryingCapacityRow[]
}

function index<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]))
}

export function buildRules(): Rules {
  const classList = [...(classes as ClassDef[]), weaponMaster as ClassDef].map((c) => {
    // House rule #4: homebrew class skills added to some classes.
    const extra = (classSkillOverrides as Record<string, string[]>)[c.id] ?? []
    return { ...c, classSkills: [...new Set([...c.classSkills, ...extra])] }
  })
  return {
    skills: index([...(skills as SkillDef[]), ...(homebrewSkills as SkillDef[])]),
    synergies: synergies as SynergyDef[],
    feats: index(feats as FeatDef[]),
    classes: index(classList),
    weapons: index(weapons as WeaponDef[]),
    armor: index(armor as ArmorDef[]),
    gear: index(gear as GearDef[]),
    magicItems: index(magicItems as MagicItemDef[]),
    conditions: index(conditions as ConditionDef[]),
    carryingCapacity: carryingCapacity as CarryingCapacityRow[],
  }
}

export const rules: Rules = buildRules()
