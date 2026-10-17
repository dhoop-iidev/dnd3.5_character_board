// Helpers and rule tables shared by the sheet stages (engine/sheet/*) and the UI: units, sizes, load, weights.
import type { Rules } from '../../data/rules'
import type { AbilityId, Distance, I18n, Source, Weight } from '../../data/types'
import type { ItemInstance } from '../../model/character'
import { i18n } from '../stacking'
import type { Size } from './types'

export const SRD = 'https://www.d20srd.org/srd/'
export const src = (path: string): Source => ({ srdUrl: SRD + path })

export const abilityMod = (score: number) => Math.floor((score - 10) / 2)
export const ftToDistance = (ft: number): Distance => ({ ft, m: (ft / 5) * 1.5 })
export const lbToWeight = (lb: number): Weight => ({ lb, kg: lb / 2 })

export const ABILITY_NAMES: Record<AbilityId, I18n> = {
  str: i18n('Strength', 'Force'),
  dex: i18n('Dexterity', 'Dextérité'),
  con: i18n('Constitution', 'Constitution'),
  int: i18n('Intelligence', 'Intelligence'),
  wis: i18n('Wisdom', 'Sagesse'),
  cha: i18n('Charisma', 'Charisme'),
}

export const LOAD_EFFECTS: Record<
  'medium' | 'heavy',
  { maxDex: number; acp: number; speed30: number; speed20: number }
> = {
  // https://www.d20srd.org/srd/carryingCapacity.htm (Table: Carrying Loads)
  medium: { maxDex: 3, acp: -3, speed30: 20, speed20: 15 },
  heavy: { maxDex: 1, acp: -6, speed30: 20, speed20: 15 },
}

export const SMALL_QUARTER =
  /^(backpack|bedroll|winter-blanket|belt-pouch|trail-rations|sack|tent|waterskin|climbers-kit|disguise-kit|.*-outfit|.*musical-instrument)$/
/** Item weight, lb and kg as printed (house rule #5: kg from the French books). Stored items weigh nothing. Weapons
 * and armor made for a Small character weigh half (https://www.d20srd.org/srd/equipment/weapons.htm#weaponSize,
 * https://www.d20srd.org/srd/equipment/armor.htm#armorforUnusualCreatures). */
export function itemWeight(rules: Rules, item: ItemInstance, size: Size = 'medium'): Weight {
  if (item.location === 'stored') return { lb: 0, kg: 0 }
  let w: Weight | undefined
  if (item.kind === 'weapon') w = item.custom ? lbToWeight(item.custom.weightLb) : rules.weapons.get(item.refId)?.weight
  else if (item.kind === 'armor') w = rules.armor.get(item.refId)?.weight
  else if (item.kind === 'gear') w = rules.gear.get(item.refId)?.weight
  else if (item.kind === 'magic') w = rules.magicItems.get(item.refId)?.weight
  else if (item.custom) w = lbToWeight(item.custom.weightLb)
  let factor = (item.material && rules.materials.get(item.material)?.effects.weightMultiplier) || 1
  if (size === 'small' && (item.kind === 'weapon' || item.kind === 'armor')) factor /= 2
  // Gear made for Small characters: a quarter (backpack, bedroll, rations, outfits…), ammunition half
  // (https://www.d20srd.org/srd/equipment/goodsAndServices.htm, Table: Goods and Services, note 1).
  if (size === 'small' && item.kind === 'gear') {
    if (SMALL_QUARTER.test(item.refId)) factor /= 4
    else if (/^(arrows|crossbow-bolts|sling-bullets)/.test(item.refId)) factor /= 2
  }
  return { lb: (w?.lb ?? 0) * item.quantity * factor, kg: (w?.kg ?? 0) * item.quantity * factor }
}

/** Carrying capacity for any Strength (×4 per +10 above 29). */
export function capacity(rules: Rules, str: number): { light: Weight; medium: Weight; heavy: Weight } {
  if (str <= 0) return { light: lbToWeight(0), medium: lbToWeight(0), heavy: lbToWeight(0) }
  let factor = 1
  let s = str
  while (s > 29) {
    s -= 10
    factor *= 4
  }
  const row = rules.carryingCapacity.find((r) => r.str === s)
  if (!row) throw new Error(`No carrying capacity row for Str ${s}`)
  const scale = (w: Weight): Weight => ({ lb: w.lb * factor, kg: w.kg * factor })
  return { light: scale(row.light), medium: scale(row.medium), heavy: scale(row.heavy) }
}

// Size modifiers (https://www.d20srd.org/srd/combat/combatStatistics.htm#sizeModifier; grapple:
// specialAttacks.htm#grapple; Hide: skills/hide.htm; carrying capacity, bipeds: carryingCapacity.htm).
export const SIZE_MOD: Record<Size, number> = {
  fine: 8,
  diminutive: 4,
  tiny: 2,
  small: 1,
  medium: 0,
  large: -1,
  huge: -2,
  gargantuan: -4,
  colossal: -8,
}
export const SIZE_GRAPPLE: Record<Size, number> = {
  fine: -16,
  diminutive: -12,
  tiny: -8,
  small: -4,
  medium: 0,
  large: 4,
  huge: 8,
  gargantuan: 12,
  colossal: 16,
}
export const SIZE_HIDE: Record<Size, number> = {
  fine: 16,
  diminutive: 12,
  tiny: 8,
  small: 4,
  medium: 0,
  large: -4,
  huge: -8,
  gargantuan: -12,
  colossal: -16,
}
// Quadrupeds (https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures).
export const SIZE_CARRY_QUADRUPED: Record<Size, number> = {
  fine: 0.25,
  diminutive: 0.5,
  tiny: 0.75,
  small: 1,
  medium: 1.5,
  large: 3,
  huge: 6,
  gargantuan: 12,
  colossal: 24,
}
export const SIZE_CARRY: Record<Size, number> = {
  fine: 0.125,
  diminutive: 0.25,
  tiny: 0.5,
  small: 0.75,
  medium: 1,
  large: 2,
  huge: 4,
  gargantuan: 8,
  colossal: 16,
}
export const SIZE_NAME: Record<Size, I18n> = {
  fine: { en: 'Fine', fr: 'I' },
  diminutive: { en: 'Diminutive', fr: 'Min' },
  tiny: { en: 'Tiny', fr: 'TP' },
  small: { en: 'Small', fr: 'P' },
  medium: { en: 'Medium', fr: 'M' },
  large: { en: 'Large', fr: 'G' },
  huge: { en: 'Huge', fr: 'TG' },
  gargantuan: { en: 'Gargantuan', fr: 'Gig' },
  colossal: { en: 'Colossal', fr: 'C' },
}

/** Wild shape uses per day by druid level (Table: The Druid): 1 at 5th, 2 at 6th, 3 at 7th, 4 at 10th, 5 at 14th, 6 at 18th. */
export function wildShapeUses(druidLevel: number): { animal: number; elemental: number } {
  const animal =
    druidLevel >= 18
      ? 6
      : druidLevel >= 14
        ? 5
        : druidLevel >= 10
          ? 4
          : druidLevel >= 7
            ? 3
            : druidLevel >= 6
              ? 2
              : druidLevel >= 5
                ? 1
                : 0
  const elemental = druidLevel >= 20 ? 3 : druidLevel >= 18 ? 2 : druidLevel >= 16 ? 1 : 0
  return { animal, elemental }
}

/** Sizes a druid can take: Small/Medium at 5th, Large at 8th, Tiny at 11th, Huge at 15th (elementals: S/M/L, Huge at 20th). */
export function wildShapeSizes(druidLevel: number, elemental = false): Size[] {
  if (elemental) return ['small', 'medium', 'large', ...(druidLevel >= 20 ? (['huge'] as Size[]) : [])]
  return [
    ...(druidLevel >= 11 ? (['tiny'] as Size[]) : []),
    'small',
    'medium',
    ...(druidLevel >= 8 ? (['large'] as Size[]) : []),
    ...(druidLevel >= 15 ? (['huge'] as Size[]) : []),
  ]
}

/** Maximum of a dice expression like "2d6", "1d8", "1d10+1". */
export function maxDice(expr: string): number {
  let total = 0
  for (const term of expr.replace(/\s/g, '').split('+')) {
    const m = term.match(/^(\d*)d(\d+)$/)
    if (m) total += Number(m[1] || 1) * Number(m[2])
    else if (/^\d+$/.test(term)) total += Number(term)
  }
  return total
}

export const round2 = (n: number) => Math.round(n * 100) / 100

export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
