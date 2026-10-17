// Stage 1 — the build: wild shape form, class levels and feats (granted, deity, domain, style), ranger combat style.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { Character, FeatPick } from '../../model/character'
import { i18n } from '../stacking'
import { raceOf } from '../race'
import { domainFeats } from '../cleric'
import { parseAlignment } from '../alignment'
import { compute } from '../compute'
import type { ComputeOptions, Size } from './types'
import { SIZE_NAME } from './common'

export function buildStage(char: Character, rules: Rules, opts: ComputeOptions) {
  // ---- wild shape (https://www.d20srd.org/srd/classes/druid.htm#wildShape, as amended by the PHB errata 2006: works
  // like Alternate Form, MM errata 2006; docs/rules/rulings-classes.md C4). All gear melds and stops working (except
  // armor/shield with the wild property, and what the player chooses to keep): melded items are treated as stored.
  const shape = char.wildShape ? rules.creatures.get(char.wildShape.creatureId) : undefined
  // Hit points of her own form, kept despite the form's Constitution (MM errata 2006, Alternate Form; FAQ p. 16:
  // later Con changes — spells, Con damage — still count, as they apply to her own form too).
  const ownHp = shape ? compute({ ...char, wildShape: undefined }, rules, opts).hpMax : undefined
  if (shape) {
    const keep = new Set(char.wildShape!.keepItems ?? [])
    char = {
      ...char,
      inventory: char.inventory.map((i) =>
        keep.has(i.uid) || i.location === 'stored' ? i : { ...i, location: 'stored' as const },
      ),
    }
  }
  const levels = char.levels.slice(0, opts.level ?? char.levels.length)
  const characterLevel = levels.length
  const toggles = char.toggles

  // ---- class levels and feats
  const classLevels: Record<string, number> = {}
  for (const l of levels) classLevels[l.classId] = (classLevels[l.classId] ?? 0) + 1
  const race = raceOf(char, rules)
  const size: Size = shape?.size ?? race.size
  const sizeLabel = i18n(`${SIZE_NAME[size].en} size`, `Taille ${SIZE_NAME[size].fr}`)
  const chosenFeats = levels.flatMap((l) => l.feats)
  // Feats granted by class features (ranger Track at 1st, Endurance at 3rd…).
  const granted: FeatPick[] = []
  for (const [classId, n] of Object.entries(classLevels))
    for (const f of rules.classes.get(classId)?.features ?? [])
      if (f.level <= n) for (const featId of f.grantsFeats ?? []) granted.push({ featId, slot: 'granted' })
  // Cleric domains (War: Weapon Focus with the deity's favored weapon).
  if (classLevels['cleric']) granted.push(...domainFeats(char, rules))
  // Ranger combat style (https://www.d20srd.org/srd/classes/ranger.htm#combatStyle): feats at ranger 2/6/11,
  // usable only in light or no armor.
  const rangerLevel = classLevels['ranger'] ?? 0
  // Ranger level reached at each character level (class choices only count on the ranger levels where they are due).
  const rangerAt: number[] = []
  levels.reduce((n, l) => (rangerAt.push(l.classId === 'ranger' ? n + 1 : 0), l.classId === 'ranger' ? n + 1 : n), 0)
  const styleId = levels.map((l, i) => (rangerAt[i] === 2 ? l.classChoices?.combatStyle : undefined)).find((x) => !!x)
  const wornArmor = char.inventory.find(
    (i) =>
      i.kind === 'armor' &&
      i.location === 'worn' &&
      !['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
  )
  const wornCat = wornArmor ? rules.armor.get(wornArmor.refId)?.category : undefined
  const wornShift = wornArmor?.material ? (rules.materials.get(wornArmor.material)?.effects.armorCategoryShift ?? 0) : 0
  const wornIdx = ['light', 'medium', 'heavy'].indexOf(wornCat ?? 'light') - wornShift
  const styleActive = !wornArmor || wornIdx <= 0
  const STYLE_FEATS: Record<string, [number, string][]> = {
    archery: [
      [2, 'rapid-shot'],
      [6, 'manyshot'],
      [11, 'improved-precise-shot'],
    ],
    'two-weapon': [
      [2, 'two-weapon-fighting'],
      [6, 'improved-two-weapon-fighting'],
      [11, 'greater-two-weapon-fighting'],
    ],
  }
  // In medium or heavy armor the ranger is no longer treated as having these feats, and a feat that needs one of them
  // as a prerequisite can't be used either (https://www.d20srd.org/srd/feats.htm#prerequisites; 3.5 FAQ p. 87;
  // docs/rules/rulings-classes.md C2). Picking such feats stays legal.
  const styleFeats: FeatPick[] = []
  if (rangerLevel >= 2 && styleId)
    for (const [lvl, featId] of STYLE_FEATS[styleId] ?? [])
      if (rangerLevel >= lvl) styleFeats.push({ featId, slot: 'granted' })
  if (styleActive) granted.push(...styleFeats)
  const ownsChosen = (id: string) => chosenFeats.some((c) => c.featId === id)
  const lostStyle = styleActive ? [] : styleFeats.filter((f) => !ownsChosen(f.featId)).map((f) => f.featId)
  // Chosen feats whose prerequisite is only provided by the (inactive) combat style, followed down the chain.
  const unusableFeats = new Set<string>()
  for (let changed = true; changed;) {
    changed = false
    for (const c of chosenFeats) {
      if (unusableFeats.has(c.featId)) continue
      const needs = (rules.feats.get(c.featId)?.prereq.feats ?? []).map((x) => x.split(':')[0])
      if (needs.some((id) => lostStyle.includes(id) || unusableFeats.has(id))) {
        unusableFeats.add(c.featId)
        changed = true
      }
    }
  }
  const feats = [
    ...chosenFeats.filter((c) => !unusableFeats.has(c.featId)),
    ...granted.filter((g) => !chosenFeats.some((c) => c.featId === g.featId && !c.choice)),
  ]
  // Elemental wild shape: "she also gains the elemental's feats" (https://www.d20srd.org/srd/classes/druid.htm#wildShape;
  // rulings-classes.md C4).
  if (shape && char.wildShape?.elemental)
    for (const featId of shape.featIds)
      if (rules.feats.has(featId) && !feats.some((f) => f.featId === featId)) feats.push({ featId, slot: 'granted' })
  const hasFeat = (id: string, choice?: string) =>
    feats.some((f) => f.featId === id && (choice === undefined || f.choice === choice))
  const wmLevel = classLevels['weapon-master'] ?? 0
  // Tome of Battle crusader and swordsage (house rule #15; docs/rules/tob-classes.md).
  const crusaderLvl = classLevels['crusader'] ?? 0
  const swordsageLvl = classLevels['swordsage'] ?? 0
  // Swordsage discipline focus (p. 16): a discipline chosen at swordsage 1 (Weapon Focus with its weapons), 4 and 12
  // (insightful strike: + Wis to the damage of its strikes), 8 and 16 (defensive stance: +2 saves in its stances).
  const focusPicks = { weapon: [] as string[], strike: [] as string[], stance: [] as string[] }
  {
    let n = 0
    for (const l of levels) {
      if (l.classId !== 'swordsage') continue
      n++
      const d = l.classChoices?.disciplineFocus
      if (!d) continue
      if (n === 1) focusPicks.weapon.push(d)
      else if (n === 4 || n === 12) focusPicks.strike.push(d)
      else if (n === 8 || n === 16) focusPicks.stance.push(d)
    }
  }
  // Alignment-bound class abilities: a paladin who isn't lawful good loses them (ex-paladin), a lawful barbarian can't
  // rage (https://www.d20srd.org/srd/classes/paladin.htm#exPaladins, barbarian.htm#exBarbarians). An unknown alignment
  // keeps them.
  const alignment = parseAlignment(char.identity.alignment)
  const paladinGood = !alignment || (alignment.order === 'lawful' && alignment.moral === 'good')
  // Ex-druid: all druid spells and abilities lost, companion included (https://www.d20srd.org/srd/classes/druid.htm#exDruids).
  const exDruid =
    (classLevels['druid'] ?? 0) > 0 && !!alignment && alignment.order !== 'neutral' && alignment.moral !== 'neutral'

  return {
    char,
    shape,
    ownHp,
    levels,
    characterLevel,
    toggles,
    classLevels,
    race,
    size,
    sizeLabel,
    rangerLevel,
    rangerAt,
    styleId,
    styleActive,
    styleFeats,
    unusableFeats,
    feats,
    hasFeat,
    wmLevel,
    crusaderLvl,
    swordsageLvl,
    focusPicks,
    alignment,
    paladinGood,
    exDruid,
  }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type BuildOut = ReturnType<typeof buildStage>
