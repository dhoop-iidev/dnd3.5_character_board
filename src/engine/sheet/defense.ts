// Stage 4 — armor, shield, load, speed, armor class, initiative, grapple and attacks of opportunity.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { AbilityId, ArmorDef, I18n, Weight } from '../../data/types'
import type { Character, ItemInstance } from '../../model/character'
import { i18n, resolve, type Part } from '../stacking'
import type { LoadBand, ComputeOptions, Size } from './types'
import {
  SRD,
  src,
  abilityMod,
  ABILITY_NAMES,
  LOAD_EFFECTS,
  itemWeight,
  capacity,
  SIZE_MOD,
  SIZE_GRAPPLE,
  SIZE_CARRY_QUADRUPED,
  SIZE_CARRY,
  round2,
} from './common'
import type { CoreOut } from './core'

export function defenseStage(rules: Rules, opts: ComputeOptions, c: CoreOut) {
  const {
    abilities,
    abilityPart,
    activeConditions,
    char,
    classLevels,
    flags,
    hasFeat,
    levels,
    mod,
    mods,
    partsFor,
    race,
    shape,
    size,
    sizeLabel,
    sumTarget,
    swordsageLvl,
    tableSum,
    toggles,
    trapSense,
    trapSenseUrl,
    warbladeLvl,
    wmLevel,
  } = c
  // ---- armor, shield, load
  const loadout = char.loadouts.find((l) => l.id === char.activeLoadout) ?? char.loadouts[0]
  const armorItem = char.inventory.find(
    (i) =>
      i.kind === 'armor' &&
      i.location === 'worn' &&
      !['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
  )
  const armorDef = armorItem && rules.armor.get(armorItem.refId)
  const armorMat = armorItem?.material ? rules.materials.get(armorItem.material) : undefined
  // Mithral: one category lighter for movement and other limitations (https://www.d20srd.org/srd/specialMaterials.htm#mithral).
  const CATS = ['light', 'medium', 'heavy'] as const
  const shiftCat = (cat: ArmorDef['category']) => {
    const i = CATS.indexOf(cat as (typeof CATS)[number])
    return i < 0 || !armorMat?.effects.armorCategoryShift
      ? cat
      : CATS[Math.max(0, i - armorMat.effects.armorCategoryShift)]
  }
  const armor =
    armorItem && armorDef ? { item: armorItem, def: armorDef, category: shiftCat(armorDef.category) } : undefined
  // Only a worn shield can be on her arm (not one in the backpack, stored or melded).
  const shieldItem = loadout?.shield
    ? char.inventory.find((i) => i.uid === loadout.shield && i.location === 'worn')
    : undefined
  const shield = shieldItem ? { item: shieldItem, def: rules.armor.get(shieldItem.refId)! } : undefined

  const carried = char.inventory.reduce(
    (s, i) => {
      const w = itemWeight(rules, i, race.size)
      return { lb: s.lb + w.lb, kg: s.kg + w.kg }
    },
    { lb: 0, kg: 0 },
  )
  // Coins: 50 coins weigh 1 lb (https://www.d20srd.org/srd/equipment/wealthAndMoney.htm).
  const m = char.money
  // In wild shape the purse melds into the form with the rest of the gear.
  const coins = m && !shape ? m.cp + m.sp + m.gp + m.pp : 0
  carried.lb += coins / 50
  carried.kg += coins / 100
  const carriedLb = carried.lb
  const capMedium = capacity(rules, abilities.str.score.total)
  // Size multiplier, bipeds (https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures): Small ×3/4, Large ×2…
  const sizeFactor = shape?.quadruped ? SIZE_CARRY_QUADRUPED[size] : SIZE_CARRY[size]
  const scaleW = (w: Weight): Weight => ({ lb: round2(w.lb * sizeFactor), kg: round2(w.kg * sizeFactor) })
  const limits = { light: scaleW(capMedium.light), medium: scaleW(capMedium.medium), heavy: scaleW(capMedium.heavy) }
  const band: LoadBand =
    carriedLb <= limits.light.lb
      ? 'light'
      : carriedLb <= limits.medium.lb
        ? 'medium'
        : carriedLb <= limits.heavy.lb
          ? 'heavy'
          : 'overloaded'
  const loadFx = band === 'light' ? undefined : LOAD_EFFECTS[band === 'overloaded' ? 'heavy' : band]

  // Max Dex: the most restrictive of armor, shield, load.
  const dexCaps: { value: number; from: I18n }[] = []
  if (armor && armor.def.maxDex !== null)
    dexCaps.push({ value: armor.def.maxDex + (armorMat?.effects.maxDexBonus ?? 0), from: armor.def.name })
  if (shield && shield.def.maxDex !== null) dexCaps.push({ value: shield.def.maxDex, from: shield.def.name })
  if (loadFx)
    dexCaps.push({
      value: loadFx.maxDex,
      from: i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`),
    })
  const cap = dexCaps.length ? dexCaps.reduce((a, b) => (b.value < a.value ? b : a)) : undefined
  const maxDex = { value: cap?.value ?? null, from: cap?.from ?? i18n('none', 'aucun') }

  // Armor check penalty: (armor + strapped shield) vs load, the worse applies (house rule #13).
  const itemAcp = (x?: { item: ItemInstance; def: ArmorDef }) => {
    if (!x) return 0
    const mat = x.item.material ? rules.materials.get(x.item.material) : undefined
    const mw = x.item.masterwork || (x.item.enhancement ?? 0) > 0 || !!mat?.effects.masterwork
    // Masterwork −1; mithral −3 in total, masterwork included (SRD elven chain: chainmail −5 → −2).
    // A penalty never becomes a bonus (rulings R25).
    return Math.min(0, x.def.acp + (mat?.effects.acpReduction ?? (mw ? 1 : 0)))
  }
  const gearAcp = itemAcp(armor) + itemAcp(shield)
  const acpParts: Part[] = []
  if (loadFx && loadFx.acp < gearAcp) {
    acpParts.push({
      sourceId: 'load',
      label: i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`),
      value: loadFx.acp,
      bonusType: 'base',
      source: src('carryingCapacity.htm'),
    })
  } else {
    if (armor && itemAcp(armor))
      acpParts.push({
        sourceId: `item:${armor.item.uid}`,
        label: armor.item.name ?? armor.def.name,
        value: itemAcp(armor),
        bonusType: 'base',
        source: src('equipment/armor.htm#armorCheckPenalty'),
      })
    if (shield && itemAcp(shield))
      acpParts.push({
        sourceId: `item:${shield.item.uid}`,
        label: shield.item.name ?? shield.def.name,
        value: itemAcp(shield),
        bonusType: 'base',
        source: src('equipment/armor.htm#armorCheckPenalty'),
      })
  }
  const armorCheckPenalty = resolve(acpParts)

  // Speed: racial base (https://www.d20srd.org/srd/races.htm), then the worse of armor and load (30-ft or 20-ft
  // column). Dwarves keep their speed in medium/heavy armor and loads.
  // Fast movement is added before armor and load (https://www.d20srd.org/srd/classes/barbarian.htm#barbarianFastMovement):
  // barbarian +10 ft. unless in heavy armor or heavy load; monk +10 ft. per 3 levels, unarmored and light load.
  const barbarianFast =
    (classLevels['barbarian'] ?? 0) >= 1 && armor?.category !== 'heavy' && band !== 'heavy' && band !== 'overloaded'
  const monkLevel = classLevels['monk'] ?? 0
  const monkUnencumbered = !armor && band === 'light'
  const monkFast = monkLevel >= 3 && monkUnencumbered && !shield ? Math.floor(monkLevel / 3) * 10 : 0
  // Wild shape: the form's land speed (its other movement modes are shown with the form).
  const baseFt = (shape ? shape.speed.land : race.speed) + (barbarianFast ? 10 : 0) + monkFast
  let speedFt = baseFt
  let speedFrom =
    barbarianFast || monkFast ? i18n('base + fast movement', 'base + déplacement accéléré') : i18n('base', 'base')
  const slow = baseFt <= 20
  // Armor and load tables give 20 and 30 ft. columns; other base speeds use the SRD table "Armor and Encumbrance for
  // Other Base Speeds" (50 → 35, 60 → 40…, rounded down to its 10-ft. rows;
  // https://www.d20srd.org/srd/carryingCapacity.htm).
  const REDUCED: Record<number, number> = { 30: 20, 40: 30, 50: 35, 60: 40, 70: 50, 80: 55, 90: 60, 100: 70 }
  const reducedOf = (ft: number) =>
    ft <= 100 ? (REDUCED[Math.floor(ft / 10) * 10] ?? 20) : Math.floor((ft * 0.7) / 5) * 5
  const reduced = (d?: { ft: number } | null) =>
    d ? (slow ? d.ft : d.ft >= 30 ? baseFt : reducedOf(baseFt)) : undefined
  const armorSpeed = armor && (slow ? armor.def.speed20 : armor.def.speed30)
  const armorFt = reduced(armorSpeed)
  if (
    !race.speedNotReducedByArmor &&
    armor &&
    ['medium', 'heavy'].includes(armor.category) &&
    armorFt !== undefined &&
    armorFt < speedFt
  ) {
    speedFt = armorFt
    speedFrom = armor.def.name
  }
  const loadSpeed = loadFx && reduced({ ft: slow ? loadFx.speed20 : loadFx.speed30 })
  if (!race.speedNotReducedByArmor && loadSpeed && loadSpeed < speedFt) {
    speedFt = loadSpeed
    speedFrom = i18n(`${band} load`, `charge ${band === 'medium' ? 'intermédiaire' : 'lourde'}`)
  }
  // Speed bonuses follow the stacking rules; haste-like enhancement bonuses cap at twice the normal speed
  // (https://www.d20srd.org/srd/spells/haste.htm).
  // Monk fast movement is an enhancement bonus (https://www.d20srd.org/srd/classes/monk.htm#fastMovement): another
  // enhancement bonus to speed (boots, haste) only counts for what exceeds it.
  const speedParts = partsFor(['speed'])
  const otherEnh = Math.max(
    0,
    ...speedParts.filter((p) => p.bonusType === 'enhancement' && (!p.condition || p.situationalOn)).map((p) => p.value),
  )
  if (monkFast && otherEnh)
    speedParts.push({
      sourceId: 'monk-fast-overlap',
      label: i18n(
        'Monk fast movement (enhancement, doesn’t stack)',
        'Déplacement accéléré du moine (altération, non cumulable)',
      ),
      value: -Math.min(monkFast, otherEnh),
      bonusType: 'untyped',
      source: src('classes/monk.htm#monkFastMovement'),
    })
  const speedBonus = resolve(speedParts).total
  speedFt += speedBonus > 0 ? Math.min(speedBonus, speedFt) : speedBonus
  if (sumTarget('speed.half') > 0) speedFt = Math.floor(speedFt / 2 / 5) * 5
  if (band === 'overloaded') speedFt = 5

  // ---- AC
  // Overloaded: "loses any Dexterity bonus to AC" (https://www.d20srd.org/srd/carryingCapacity.htm).
  const loseDex =
    flags.includes('loseDexToAc') ||
    sumTarget('ac.noDex') > 0 ||
    toggles.situational['flatFooted'] === true ||
    band === 'overloaded'
  // Helpless / pinned: treated as Dex 0 (−5) for AC (rulings R14, R15).
  const dexZero = flags.includes('dexZeroForAc') || flags.includes('helpless')
  const dexToAc = dexZero ? abilityMod(0) : maxDex.value === null ? mod('dex') : Math.min(mod('dex'), maxDex.value)
  const acParts: Part[] = [
    {
      sourceId: 'base10',
      label: i18n('Base', 'Base'),
      value: 10,
      bonusType: 'base',
      source: src('combat/combatStatistics.htm#armorClass'),
    },
  ]
  // Size modifier (https://www.d20srd.org/srd/combat/combatStatistics.htm#sizeModifier): Small +1.
  const sizePart = (value: number): Part => ({
    sourceId: 'size',
    label: sizeLabel,
    value,
    bonusType: 'size',
    source: src('combat/combatStatistics.htm#sizeModifier'),
  })
  if (SIZE_MOD[size]) acParts.push(sizePart(SIZE_MOD[size]))
  // Wild shape: the form's natural armor bonus.
  if (shape?.ac.natural)
    acParts.push({
      sourceId: 'wild-shape-natural',
      label: i18n(`Natural armor (${shape.name.en})`, `Armure naturelle (${shape.name.fr})`),
      value: shape.ac.natural,
      bonusType: 'naturalArmor',
      source: shape.source,
    })
  if (armor) {
    const enh = armor.item.enhancement ?? 0
    acParts.push({
      sourceId: `item:${armor.item.uid}`,
      label: { en: `${armor.def.name.en}${enh ? ` +${enh}` : ''}`, fr: `${armor.def.name.fr}${enh ? ` +${enh}` : ''}` },
      value: armor.def.armorBonus + enh,
      bonusType: 'armor',
      source: armor.def.source,
    })
  }
  if (shield) {
    const enh = shield.item.enhancement ?? 0
    acParts.push({
      sourceId: `item:${shield.item.uid}`,
      label: {
        en: `${shield.def.name.en}${enh ? ` +${enh}` : ''}`,
        fr: `${shield.def.name.fr}${enh ? ` +${enh}` : ''}`,
      },
      value: shield.def.armorBonus + enh,
      bonusType: 'shield',
      source: shield.def.source,
    })
  }
  acParts.push({
    ...abilityPart('dex', dexToAc),
    label: dexZero
      ? i18n('Dexterity treated as 0 (helpless/pinned)', 'Dextérité considérée comme 0 (sans défense/immobilisé)')
      : maxDex.value !== null && mod('dex') > maxDex.value
        ? {
            en: `Dexterity (capped at +${maxDex.value} by ${maxDex.from.en})`,
            fr: `Dextérité (limitée à +${maxDex.value} par ${maxDex.from.fr})`,
          }
        : ABILITY_NAMES.dex,
  })
  // Tumble 5+ ranks: +3 dodge when fighting defensively, +6 in total defense (https://www.d20srd.org/srd/skills/tumble.htm).
  const tumbleRanks = levels.reduce((n, l) => n + (l.skillRanks['tumble'] ?? 0), 0)
  const tumble5 = tumbleRanks >= 5
  // Combat Expertise: not during total defense (ruling R16) nor while raging.
  const expertiseOn = hasFeat('combat-expertise') && toggles.combatExpertise > 0 && !flags.includes('raging')
  if (expertiseOn && !toggles.totalDefense)
    acParts.push({
      sourceId: 'combat-expertise',
      label: i18n('Combat Expertise', 'Expertise du combat'),
      value: toggles.combatExpertise,
      bonusType: 'dodge',
      source: src('feats.htm#combatExpertise'),
    })
  if (toggles.fightingDefensively)
    acParts.push({
      sourceId: 'fighting-defensively',
      label: tumble5
        ? i18n('Fighting defensively (Tumble 5 ranks)', 'Combat sur la défensive (Acrobaties 5 degrés)')
        : i18n('Fighting defensively', 'Combat sur la défensive'),
      value: tumble5 ? 3 : 2,
      bonusType: 'dodge',
      source: src('combat/actionsInCombat.htm#fightDefensively'),
    })
  if (toggles.totalDefense)
    acParts.push({
      sourceId: 'total-defense',
      label: tumble5
        ? i18n('Total defense (Tumble 5 ranks)', 'Défense totale (Acrobaties 5 degrés)')
        : i18n('Total defense', 'Défense totale'),
      value: tumble5 ? 6 : 4,
      bonusType: 'dodge',
      source: src('combat/actionsInCombat.htm#totalDefense'),
    })
  // Monk AC bonus: Wis bonus + 1 per 5 monk levels, unarmored, no shield, light load; kept when flat-footed and vs
  // touch, lost when immobilized or helpless (https://www.d20srd.org/srd/classes/monk.htm#aCBonus).
  // Swordsage AC bonus (ToB p. 16): Wis modifier to AC in light or no armor, light load, no shield; kept vs touch and when
  // flat-footed, lost when immobilized or helpless (common reading of "light armor": no armor counts too).
  if (
    swordsageLvl >= 2 &&
    (!armor || armor.category === 'light') &&
    band === 'light' &&
    !shield &&
    !flags.some((f) => ['immobile', 'helpless'].includes(f)) &&
    mod('wis') !== 0
  )
    acParts.push({
      sourceId: 'swordsage-ac',
      label: i18n('Swordsage AC bonus (Wis)', 'Bonus à la CA du maître des lames (Sag)'),
      value: mod('wis'),
      bonusType: 'untyped',
      source: { book: 'Tome of Battle', page: 16 },
    })
  if (monkLevel >= 1 && monkUnencumbered && !shield && !flags.some((f) => ['immobile', 'helpless'].includes(f))) {
    const v = Math.max(0, mod('wis')) + Math.floor(monkLevel / 5)
    if (v)
      acParts.push({
        sourceId: 'monk-ac',
        label: i18n('Monk AC bonus', 'Bonus à la CA du moine'),
        value: v,
        bonusType: 'untyped',
        source: src('classes/monk.htm#aCBonus'),
      })
  }
  if (trapSense > 0)
    acParts.push({
      sourceId: 'trap-sense',
      label: i18n('Trap sense', 'Sens des pièges'),
      value: trapSense,
      bonusType: 'dodge',
      source: src(trapSenseUrl),
      condition: i18n('vs traps', 'contre les pièges'),
      situationalOn: toggles.situational['trap-sense|ac'] ?? false,
      toggleKey: 'trap-sense|ac',
    })
  acParts.push(...partsFor(['ac']))
  // Uncanny dodge (warblade 2, Tome of Battle p. 22): keeps the Dex bonus when caught flat-footed (or by an invisible
  // attacker), not when it is lost for another reason (stunned, blinded, cowering, pinned…).
  const otherDexLoss =
    activeConditions.some((id) => id !== 'flat-footed' && rules.conditions.get(id)?.flags.includes('loseDexToAc')) ||
    mods.some((m) => m.spec.target === 'ac.noDex' && m.spec.value > 0 && m.sourceId !== 'condition:flat-footed')
  const uncannyDodge =
    (warbladeLvl >= 2 || (classLevels['barbarian'] ?? 0) >= 2 || (classLevels['rogue'] ?? 0) >= 4) && !otherDexLoss
  // Uncanny dodge keeps the whole "Dex bonus to AC", dodge bonuses included (rulings R14).
  const keepDex = uncannyDodge && !dexZero
  const stripDex = (parts: Part[]) =>
    keepDex
      ? parts
      : parts.filter((p) => !(p.sourceId === 'ability:dex' && p.value > 0 && !dexZero) && p.bonusType !== 'dodge')
  const ac = resolve(loseDex ? stripDex(acParts) : acParts)
  const touchAc = resolve(
    (loseDex ? stripDex(acParts) : acParts).filter((p) => !['armor', 'shield', 'naturalArmor'].includes(p.bonusType)),
  )
  const flatFootedAc = resolve(stripDex(acParts))

  // ---- initiative, grapple
  // An initiative check is a Dexterity check: ability-check modifiers apply (https://www.d20srd.org/srd/combat/initiative.htm).
  // Situational Dex-check bonuses (e.g. "to resist a trip") are not initiative bonuses.
  // Swordsage quick to act (ToB p. 16): +1 initiative at 1st, +1 at 5th, 10th, 15th, 20th.
  const quickToAct = swordsageLvl ? 1 + Math.floor(swordsageLvl / 5) : 0
  const initiative = resolve([
    abilityPart('dex'),
    ...(quickToAct
      ? [
          {
            sourceId: 'quick-to-act',
            label: i18n('Quick to act', 'Prompt à agir'),
            value: quickToAct,
            bonusType: 'untyped' as const,
            source: { book: 'Tome of Battle', page: 16 },
          },
        ]
      : []),
    ...partsFor(['initiative']),
    ...partsFor(['check.dex']).filter((p) => !p.condition),
  ])
  // Grapple: special size modifier, Small −4 (https://www.d20srd.org/srd/combat/specialAttacks.htm#grapple).
  const grapple = resolve([
    ...tableSum('bab'),
    abilityPart('str'),
    ...(SIZE_GRAPPLE[size]
      ? [{ ...sizePart(SIZE_GRAPPLE[size]), source: src('combat/specialAttacks.htm#grapple') }]
      : []),
    ...partsFor(['grapple']),
  ])

  // ---- Weapon Master features need the class requirements to stay met (Complete Warrior p.16, rulings q6):
  // current ability scores and a masterwork weapon of choice.
  const wmReq = rules.classes.get('weapon-master')?.requirements
  const wmAbilitiesOk = Object.entries(wmReq?.abilities ?? {}).every(
    ([a, min]) => abilities[a as AbilityId].score.total >= (min ?? 0),
  )
  const wmActive = wmLevel > 0 && wmAbilitiesOk

  // ---- attacks of opportunity (Combat Reflexes; Superior Combat Reflexes = better of the two, house rule #12)
  const aooParts: Part[] = [
    {
      sourceId: 'base',
      label: i18n('Base', 'Base'),
      value: 1,
      bonusType: 'base',
      source: src('combat/attacksOfOpportunity.htm'),
    },
  ]
  let aooBest = 1
  if (hasFeat('combat-reflexes')) aooBest = Math.max(aooBest, 1 + Math.max(0, mod('dex')))
  if (wmActive && wmLevel >= 5) aooBest = Math.max(aooBest, mod('dex') + mod('wis'))
  if (aooBest > 1)
    aooParts.push({
      sourceId: 'combat-reflexes',
      label:
        wmActive && wmLevel >= 5 && mod('dex') + mod('wis') >= 1 + mod('dex')
          ? i18n('Superior Combat Reflexes (Dex + Wis)', 'Attaques réflexes suprêmes (Dex + Sag)')
          : i18n('Combat Reflexes (Dex)', 'Attaques réflexes (Dex)'),
      value: aooBest - 1,
      bonusType: 'untyped',
      source:
        wmActive && wmLevel >= 5 && mod('dex') + mod('wis') >= 1 + mod('dex')
          ? { book: 'Sword and Fist', page: 39, houseRule: 12 }
          : src('feats.htm#combatReflexes'),
    })
  const attacksOfOpportunity = resolve(aooParts)

  return {
    loadout,
    armorMat,
    armor,
    shield,
    carried,
    limits,
    band,
    maxDex,
    itemAcp,
    armorCheckPenalty,
    monkLevel,
    monkUnencumbered,
    baseFt,
    speedFt,
    speedFrom,
    sizePart,
    expertiseOn,
    ac,
    touchAc,
    flatFootedAc,
    initiative,
    grapple,
    wmActive,
    attacksOfOpportunity,
  }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type DefenseOut = CoreOut & ReturnType<typeof defenseStage>
