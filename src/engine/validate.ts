// Rule checks. They only produce warnings; nothing is ever blocked (CLAUDE.md).
import type { Rules } from '../data/rules'
import type { I18n } from '../data/types'
import type { Character } from '../model/character'
import { compute } from './compute'
import { unmetPrereqs } from './prereq'
import { featSlotsAt, isAbilityIncreaseLevel, skillBudget } from './progression'

export { unmetPrereqs }

export type Severity = 'error' | 'warning' | 'info'
export type WarningArea = 'abilities' | 'skills' | 'feats' | 'levels' | 'inventory' | 'combat'

export interface RuleWarning {
  id: string
  severity: Severity
  area: WarningArea
  level?: number
  message: I18n
  srdUrl?: string
  book?: string
}

const SRD = 'https://www.d20srd.org/srd/'
const w = (
  id: string,
  severity: Severity,
  area: WarningArea,
  en: string,
  fr: string,
  extra: Partial<RuleWarning> = {},
): RuleWarning => ({ id, severity, area, message: { en, fr }, ...extra })

/** The character without temporary state: used to check build legality (prerequisites, skill points). */
function permanent(char: Character): Character {
  return {
    ...char,
    activeEffects: [],
    abilityDamage: {},
    toggles: { ...char.toggles, powerAttack: 0, combatExpertise: 0, fightingDefensively: false, totalDefense: false },
    inventory: char.inventory.filter((i) => i.kind !== 'magic'),
  }
}


export function validate(char: Character, rules: Rules): RuleWarning[] {
  const out: RuleWarning[] = []
  const perm = permanent(char)
  const classCount: Record<string, number> = {}
  const rankTotals: Record<string, number> = {}
  const feats: { featId: string; choice?: string }[] = []
  let deityFeats = 0

  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const cls = rules.classes.get(lvl.classId)
    if (!cls) {
      out.push(w(`unknown-class-${L}`, 'error', 'levels', `Level ${L}: unknown class "${lvl.classId}"`, `Niveau ${L} : classe inconnue « ${lvl.classId} »`, { level: L }))
      return
    }
    const before = compute(perm, rules, { level: L - 1 })
    classCount[cls.id] = (classCount[cls.id] ?? 0) + 1
    const classLevel = classCount[cls.id]
    const after = compute(perm, rules, { level: L })

    // Prestige class entry requirements, checked on the state before its first level.
    if (cls.prestige && classLevel === 1) {
      const unmet = unmetPrereqs(cls.requirements, before, rules, feats, perm.weaponOfChoice)
      if (cls.requirements?.masterworkWeapon) {
        const hasMw = char.inventory.some(
          (it) => it.kind === 'weapon' && it.refId === perm.weaponOfChoice && (it.masterwork || (it.enhancement ?? 0) > 0),
        )
        if (!hasMw) unmet.push({ en: 'masterwork weapon of choice', fr: 'arme de prédilection de maître' })
      }
      if (unmet.length)
        out.push(w(`prestige-${cls.id}`, 'error', 'levels',
          `Level ${L}: requirements for ${cls.name.en} not met: ${unmet.map((u) => u.en).join(', ')}`,
          `Niveau ${L} : conditions de ${cls.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
          { level: L, book: cls.source.book, srdUrl: cls.source.srdUrl ?? `${SRD}prestigeClasses.htm` }))
    }

    // Skill points and max ranks (docs/rules/skills.md; rulings-character.md q3, q4).
    const budget = skillBudget(perm, rules, L)
    const { available, spent } = budget
    for (const [key, ranks] of Object.entries(lvl.skillRanks)) {
      const skillId = key.split(':')[0]
      rankTotals[key] = (rankTotals[key] ?? 0) + ranks
      const max = budget.maxRanks(skillId)
      if (rankTotals[key] > max) {
        const name = rules.skills.get(skillId)?.name ?? { en: key, fr: key }
        const kind = budget.costPerRank(skillId) === 1 || max === L + 3
        out.push(w(`max-ranks-${key}-${L}`, 'error', 'skills',
          `Level ${L}: ${name.en} has ${rankTotals[key]} ranks, max ${max} (${kind ? 'class' : 'cross-class'} skill)`,
          `Niveau ${L} : ${name.fr} a ${rankTotals[key]} degrés, max ${max} (compétence ${kind ? 'de classe' : 'hors classe'})`,
          { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` }))
      }
      if (!rules.skills.has(skillId))
        out.push(w(`unknown-skill-${key}`, 'error', 'skills', `Unknown skill "${key}"`, `Compétence inconnue « ${key} »`, { level: L }))
    }
    if (spent !== available)
      out.push(w(`skill-points-${L}`, spent < available ? 'warning' : 'error', 'skills',
        spent < available
          ? `Level ${L} (${cls.name.en}): ${available - spent} skill point(s) unspent (${spent}/${available})`
          : `Level ${L} (${cls.name.en}): ${spent - available} skill point(s) too many (${spent}/${available})`,
        spent < available
          ? `Niveau ${L} (${cls.name.fr}) : ${available - spent} point(s) de compétence non dépensé(s) (${spent}/${available})`
          : `Niveau ${L} (${cls.name.fr}) : ${spent - available} point(s) de compétence en trop (${spent}/${available})`,
        { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` }))

    // Feat slots (docs/rules/feats.md; house rule #3 for the deity feat).
    const expected = featSlotsAt(perm, rules, L)
    for (const slot of ['general', 'human', 'fighter'] as const) {
      const n = lvl.feats.filter((f) => f.slot === slot).length
      if (n < expected[slot])
        out.push(w(`feat-missing-${slot}-${L}`, 'warning', 'feats',
          `Level ${L}: ${slot} feat not chosen yet`, `Niveau ${L} : don ${slot === 'general' ? 'général' : slot === 'human' ? "d'humain" : 'de guerrier'} pas encore choisi`,
          { level: L, srdUrl: `${SRD}feats.htm` }))
      if (n > expected[slot])
        out.push(w(`feat-extra-${slot}-${L}`, 'error', 'feats',
          `Level ${L}: too many ${slot} feats (${n}, allowed ${expected[slot]})`, `Niveau ${L} : trop de dons (${slot}) : ${n}, autorisé ${expected[slot]}`,
          { level: L, srdUrl: `${SRD}feats.htm` }))
    }
    deityFeats += lvl.feats.filter((f) => f.slot === 'deity').length

    // Prerequisites at the level the feat is taken (feats taken earlier in the same level count).
    for (const pick of lvl.feats) {
      const def = rules.feats.get(pick.featId)
      if (!def) {
        out.push(w(`unknown-feat-${pick.featId}`, 'error', 'feats', `Unknown feat "${pick.featId}"`, `Don inconnu « ${pick.featId} »`, { level: L }))
        continue
      }
      if (pick.slot === 'fighter' && !def.fighterBonus)
        out.push(w(`feat-not-fighter-${pick.featId}`, 'error', 'feats',
          `Level ${L}: ${def.name.en} is not a fighter bonus feat`, `Niveau ${L} : ${def.name.fr} n'est pas un don supplémentaire de guerrier`,
          { level: L, srdUrl: `${SRD}classes/fighter.htm` }))
      const unmet = unmetPrereqs(def.prereq, after, rules, feats, pick.choice)
      if (unmet.length)
        out.push(w(`prereq-${pick.featId}-${L}`, 'error', 'feats',
          `Level ${L}: ${def.name.en} prerequisites not met: ${unmet.map((u) => u.en).join(', ')}`,
          `Niveau ${L} : conditions de ${def.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
          { level: L, srdUrl: def.source.srdUrl }))
      if (!def.multiple && feats.some((f) => f.featId === pick.featId && f.choice === pick.choice))
        out.push(w(`feat-dup-${pick.featId}-${L}`, 'error', 'feats', `Level ${L}: ${def.name.en} taken twice`, `Niveau ${L} : ${def.name.fr} pris deux fois`, { level: L }))
      feats.push(pick)
    }

    // Ability increases every 4 levels.
    if (isAbilityIncreaseLevel(L) && !lvl.abilityIncrease)
      out.push(w(`ability-increase-missing-${L}`, 'warning', 'abilities', `Level ${L}: ability increase not chosen`, `Niveau ${L} : augmentation de caractéristique non choisie`, { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` }))
    if (!isAbilityIncreaseLevel(L) && lvl.abilityIncrease)
      out.push(w(`ability-increase-extra-${L}`, 'error', 'abilities', `Level ${L}: no ability increase at this level`, `Niveau ${L} : pas d'augmentation de caractéristique à ce niveau`, { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` }))
  })

  if (deityFeats > 1)
    out.push(w('deity-feats', 'error', 'feats', `Only one deity bonus feat (house rule #3), found ${deityFeats}`, `Un seul don accordé par le dieu (règle maison n°3), trouvé ${deityFeats}`))

  // Current state checks (with temporary effects).
  const now = compute(char, rules)
  const loseFeat = (id: string, why: I18n) => {
    const def = rules.feats.get(id)
    out.push(w(`unusable-${id}`, 'warning', 'feats', `${def?.name.en ?? id} can't be used: ${why.en}`, `${def?.name.fr ?? id} inutilisable : ${why.fr}`, { srdUrl: def?.source.srdUrl }))
  }
  if (now.feats.some((f) => f.featId === 'spring-attack') && now.armor?.def.category === 'heavy')
    loseFeat('spring-attack', { en: 'wearing heavy armor (still counts as a prerequisite)', fr: 'armure lourde portée (compte toujours comme condition)' })
  for (const f of now.feats) {
    const def = rules.feats.get(f.featId)
    if (!def?.prereq.abilities) continue
    const unmet = unmetPrereqs({ abilities: def.prereq.abilities }, now, rules, [], f.choice)
    if (unmet.length) loseFeat(f.featId, { en: `prerequisite lost (${unmet.map((u) => u.en).join(', ')})`, fr: `condition perdue (${unmet.map((u) => u.fr).join(', ')})` })
  }
  if (now.weaponMaster.level > 0) {
    const req = rules.classes.get('weapon-master')?.requirements
    const unmet = unmetPrereqs({ ...req, skills: undefined, bab: undefined }, now, rules, now.feats, char.weaponOfChoice)
    if (unmet.length)
      out.push(w('weapon-master-lost', 'warning', 'levels',
        `Weapon Master class features lost while requirements are unmet: ${unmet.map((u) => u.en).join(', ')}`,
        `Pouvoirs de maître d'armes perdus tant que les conditions ne sont pas remplies : ${unmet.map((u) => u.fr).join(', ')}`,
        { book: 'Complete Warrior p.16 / 3.5 FAQ' }))
    const focus = now.feats.find((f) => f.featId === 'weapon-focus' && f.choice === char.weaponOfChoice)
    if (!focus)
      out.push(w('weapon-of-choice', 'error', 'combat', 'Weapon of choice must be a Weapon Focus weapon', "L'arme de prédilection doit être celle du don Arme de prédilection", { book: 'Sword and Fist p.38' }))
  }

  // Equipment: proficiency, load, max Dex, slots.
  const profArmor = new Set(Object.keys(now.classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.armor ?? []))
  const profWeapons = new Set(Object.keys(now.classLevels).flatMap((c) => rules.classes.get(c)?.proficiencies.weapons ?? []))
  for (const x of [now.armor, now.shield]) {
    if (x && !profArmor.has(x.def.category))
      out.push(w(`armor-prof-${x.item.uid}`, 'error', 'inventory', `Not proficient with ${x.def.name.en}`, `Pas de maniement de ${x.def.name.fr}`, { srdUrl: `${SRD}equipment/armor.htm` }))
  }
  for (const a of now.attacks)
    if (!profWeapons.has(a.weapon.category) && !profWeapons.has(a.weapon.id))
      out.push(w(`weapon-prof-${a.itemUid}`, 'error', 'combat', `Not proficient with ${a.weapon.name.en} (−4 attack)`, `Pas de maniement de ${a.weapon.name.fr} (−4 à l'attaque)`, { srdUrl: `${SRD}equipment/weapons.htm` }))
  if (now.load.band !== 'light')
    out.push(w('load', now.load.band === 'overloaded' ? 'error' : 'warning', 'inventory',
      `Load: ${now.load.band} (${now.load.carried.lb} lb)`, `Charge : ${now.load.band === 'medium' ? 'intermédiaire' : now.load.band === 'heavy' ? 'lourde' : 'excessive'} (${now.load.carried.kg} kg)`,
      { srdUrl: `${SRD}carryingCapacity.htm` }))
  if (now.maxDex.value !== null && now.abilities.dex.mod > now.maxDex.value)
    out.push(w('max-dex', 'info', 'combat',
      `Dex bonus to AC capped at +${now.maxDex.value} by ${now.maxDex.from.en} (Dex mod +${now.abilities.dex.mod})`,
      `Bonus de Dex à la CA limité à +${now.maxDex.value} par ${now.maxDex.from.fr} (mod. Dex +${now.abilities.dex.mod})`,
      { srdUrl: `${SRD}equipment/armor.htm#maximumDexBonus` }))
  const slots: Record<string, number> = {}
  for (const it of char.inventory) {
    if (it.location !== 'worn') continue
    const armorCat = it.kind === 'armor' ? rules.armor.get(it.refId)?.category : undefined
    const slot =
      it.kind === 'magic'
        ? rules.magicItems.get(it.refId)?.slot
        : armorCat && armorCat !== 'shield' && armorCat !== 'tower'
          ? 'body' // a suit of armor occupies the body slot
          : undefined
    if (slot) slots[slot] = (slots[slot] ?? 0) + it.quantity
  }
  for (const [slot, n] of Object.entries(slots))
    if (n > (slot === 'ring' ? 2 : 1))
      out.push(w(`slot-${slot}`, 'error', 'inventory', `Too many items worn on slot "${slot}": only the first works`, `Trop d'objets sur l'emplacement « ${slot} » : seul le premier fonctionne`, { srdUrl: `${SRD}magicItems/magicItemBasics.htm` }))

  return out
}
