// Loads the generated SRD data and hand-written custom data into one indexed registry.
import type {
  I18n,
  ArmorDef,
  CarryingCapacityRow,
  ClassDef,
  ConditionDef,
  FeatDef,
  GearDef,
  ItemPropertyDef,
  MagicItemDef,
  MaterialDef,
  DisciplineDef,
  ManeuverDef,
  MartialProgression,
  RaceDef,
  CompanionData,
  CreatureDef,
  SummonList,
  DomainDef,
  TemplateDef,
  SkillDef,
  SpellDef,
  SynergyDef,
  WeaponDef,
} from './types'

import skills from './srd/skills.json'
import synergies from './srd/synergies.json'
import feats from './srd/feats.json'
import classes from './srd/classes.json'
import races from './srd/races.json'
import spells from './srd/spells.json'

import creatures from './srd/creatures.json'
import companions from './srd/companions.json'
import summonLists from './srd/summon-lists.json'

import domains from './srd/domains.json'
import templates from './srd/templates.json'
import weapons from './srd/weapons.json'
import armor from './srd/armor.json'
import gear from './srd/gear.json'
import magicItems from './srd/magic-items.json'
import carryingCapacity from './srd/carrying-capacity.json'
import weaponMaster from './custom/weapon-master.json'
import homebrewSkills from './custom/homebrew-skills.json'
import conditions from './custom/conditions.json'
import classSkillOverrides from './custom/class-skill-overrides.json'
import itemProperties from './srd/item-properties.json'
import materials from './custom/materials.json'
import warblade from './custom/tob/warblade.json'
import crusader from './custom/tob/crusader.json'
import swordsage from './custom/tob/swordsage.json'
import crusaderProgression from './custom/tob/crusader-progression.json'
import swordsageProgression from './custom/tob/swordsage-progression.json'
import tobClassSummaries from './custom/tob/summaries-classes.json'
import tobPrestige from './custom/tob/prestige-classes.json'
import tobPrestigeSummaries from './custom/tob/summaries-prestige.json'
import summaries from './custom/summaries.json'
import warbladeProgression from './custom/tob/warblade-progression.json'
import disciplines from './custom/tob/disciplines.json'
import tobSkills from './custom/tob/skills.json'
import diamondMind from './custom/tob/maneuvers-diamond-mind.json'
import ironHeart from './custom/tob/maneuvers-iron-heart.json'
import desertWind from './custom/tob/maneuvers-desert-wind.json'
import devotedSpirit from './custom/tob/maneuvers-devoted-spirit.json'
import settingSun from './custom/tob/maneuvers-setting-sun.json'
import shadowHand from './custom/tob/maneuvers-shadow-hand.json'
import stoneDragon from './custom/tob/maneuvers-stone-dragon.json'
import tigerClaw from './custom/tob/maneuvers-tiger-claw.json'
import whiteRaven from './custom/tob/maneuvers-white-raven.json'

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
  itemProperties: Map<string, ItemPropertyDef>
  materials: Map<string, MaterialDef>
  /** Tome of Battle (house rule #15). */
  disciplines: Map<string, DisciplineDef>
  maneuvers: Map<string, ManeuverDef>
  martialProgression: Map<string, MartialProgression>
  races: Map<string, RaceDef>
  spells: Map<string, SpellDef>
  creatures: Map<string, CreatureDef>
  companions?: CompanionData
  summonLists: SummonList[]
  domains: Map<string, DomainDef>
  templates: Map<string, TemplateDef>
  /** One-line summaries shown in the lists (class:<class>:<feature>, classSpecial:<class>:<name>, race:<race>:<trait>). */
  summaries: Map<string, I18n>
}

function index<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]))
}

export function buildRules(): Rules {
  // Tome of Battle classes (house rule #15). A fixed bonus feat ("grantedFeats": crusader Die Hard) becomes a class
  // feature that grants it.
  const tobClasses = [warblade, crusader, swordsage].map((c) => {
    const x = c as unknown as ClassDef & { grantedFeats?: { level: number; feat: string }[] }
    const granted = (x.grantedFeats ?? []).map((g) => ({
      id: `granted-${g.feat}`,
      level: g.level,
      name: (feats as FeatDef[]).find((f) => f.id === g.feat)?.name ?? { en: g.feat, fr: g.feat },
      text: { en: '', fr: '' },
      source: x.source,
      grantsFeats: [g.feat],
    }))
    return granted.length ? ({ ...x, features: [...(x.features ?? []), ...granted] } as ClassDef) : (x as ClassDef)
  })
  const classList = [...(classes as unknown as ClassDef[]), weaponMaster as ClassDef, ...tobClasses, ...(tobPrestige as unknown as ClassDef[])].map((c) => {
    // House rule #4: homebrew class skills added to some classes.
    const extra = (classSkillOverrides as Record<string, string[]>)[c.id] ?? []
    return { ...c, classSkills: [...new Set([...c.classSkills, ...extra])] }
  })
  return {
    skills: index([...(skills as SkillDef[]), ...(homebrewSkills as SkillDef[]), ...(tobSkills as SkillDef[])]),
    synergies: synergies as SynergyDef[],
    feats: index(feats as FeatDef[]),
    classes: index(classList),
    weapons: index(weapons as WeaponDef[]),
    armor: index(armor as ArmorDef[]),
    gear: index(gear as GearDef[]),
    magicItems: index(magicItems as MagicItemDef[]),
    conditions: index(conditions as ConditionDef[]),
    carryingCapacity: carryingCapacity as CarryingCapacityRow[],
    itemProperties: index(itemProperties as ItemPropertyDef[]),
    materials: index(materials as MaterialDef[]),
    disciplines: index(disciplines as DisciplineDef[]),
    maneuvers: index(
      [
        ...desertWind,
        ...devotedSpirit,
        ...diamondMind,
        ...ironHeart,
        ...settingSun,
        ...shadowHand,
        ...stoneDragon,
        ...tigerClaw,
        ...whiteRaven,
      ] as unknown as ManeuverDef[],
    ),
    martialProgression: new Map(
      [warbladeProgression, crusaderProgression, swordsageProgression].map((p) => [p.classId, p as unknown as MartialProgression]),
    ),
    races: index(races as unknown as RaceDef[]),
    spells: index(spells as unknown as SpellDef[]),
    creatures: index(creatures as unknown as CreatureDef[]),
    companions: companions as unknown as CompanionData,
    summonLists: summonLists as unknown as SummonList[],
    domains: index(domains as unknown as DomainDef[]),
    templates: index(templates as unknown as TemplateDef[]),
    summaries: new Map(Object.entries({ ...(summaries as Record<string, I18n>), ...(tobClassSummaries as Record<string, I18n>), ...(tobPrestigeSummaries as Record<string, I18n>) })),
  }
}

export const rules: Rules = buildRules()
