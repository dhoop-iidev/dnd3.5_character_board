// Display helpers for inventory items (name, weight, price, description) across the data files.
import { rules } from '../data/rules'
import type { I18n, Source, Weight } from '../data/types'
import type { ItemInstance, ItemKind } from '../model/character'

export interface ItemInfo {
  name: I18n
  /** Weight of one unit. */
  weight: Weight
  costGp: number
  text?: I18n
  source?: Source
  slot?: string
  /** Short stat line (damage, armor bonus…). */
  stats?: I18n
  isPotion: boolean
}

const plus = (n?: number) => (n ? ` +${n}` : '')

export function itemInfo(item: ItemInstance): ItemInfo {
  const enh = item.enhancement
  if (item.kind === 'weapon') {
    const d = rules.weapons.get(item.refId)
    if (d) {
      const crit = `${d.critRange < 20 ? `${d.critRange}–20` : '20'}/×${d.critMult}`
      const range = d.rangeIncrement ? ` · ${d.rangeIncrement.ft} ft / ${d.rangeIncrement.m} m` : ''
      return {
        name: item.name ?? { en: d.name.en + plus(enh), fr: d.name.fr + plus(enh) },
        weight: d.weight,
        costGp: d.costGp + (enh ? enh * enh * 2000 + 300 : item.masterwork ? 300 : 0),
        text: d.text,
        source: d.source,
        stats: { en: `${d.damage.M} · ${crit}${range}`, fr: `${d.damage.M} · ${crit}${range}` },
        isPotion: false,
      }
    }
  }
  if (item.kind === 'armor') {
    const d = rules.armor.get(item.refId)
    if (d) {
      const bonus = d.armorBonus + (enh ?? 0)
      const maxDex = d.maxDex === null ? '—' : `+${d.maxDex}`
      // Masterwork (and every magic armor) reduces the armor check penalty by 1.
      const acp = item.masterwork || enh ? Math.min(0, d.acp + 1) : d.acp
      return {
        name: item.name ?? { en: d.name.en + plus(enh), fr: d.name.fr + plus(enh) },
        weight: d.weight,
        costGp: d.costGp + (enh ? enh * enh * 1000 + 150 : item.masterwork ? 150 : 0),
        text: d.text,
        source: d.source,
        stats: {
          en: `+${bonus} AC · max Dex ${maxDex} · ACP ${acp} · ASF ${d.arcaneFailure}%`,
          fr: `+${bonus} CA · Dex max ${maxDex} · malus ${acp} · échec ${d.arcaneFailure} %`,
        },
        isPotion: false,
      }
    }
  }
  if (item.kind === 'gear') {
    const d = rules.gear.get(item.refId)
    if (d) return { name: item.name ?? d.name, weight: d.weight, costGp: d.costGp, text: d.text, source: d.source, isPotion: false }
  }
  if (item.kind === 'magic') {
    const d = rules.magicItems.get(item.refId)
    if (d)
      return {
        name: item.name ?? d.name,
        weight: d.weight,
        costGp: d.priceGp,
        text: d.text,
        source: d.source,
        slot: d.slot,
        stats: d.duration,
        isPotion: d.kind === 'potion',
      }
  }
  const c = item.custom
  return {
    name: item.name ?? { en: item.refId || '?', fr: item.refId || '?' },
    weight: { lb: c?.weightLb ?? 0, kg: (c?.weightLb ?? 0) / 2 },
    costGp: c?.costGp ?? 0,
    text: c?.text,
    isPotion: false,
  }
}

export interface CatalogEntry {
  kind: ItemKind
  id: string
  name: I18n
}

/** Everything that can be added to the inventory. */
export const catalog: CatalogEntry[] = [
  ...[...rules.weapons.values()].map((d) => ({ kind: 'weapon' as const, id: d.id, name: d.name })),
  ...[...rules.armor.values()].map((d) => ({ kind: 'armor' as const, id: d.id, name: d.name })),
  ...[...rules.gear.values()].map((d) => ({ kind: 'gear' as const, id: d.id, name: d.name })),
  ...[...rules.magicItems.values()]
    .filter((d) => d.kind !== 'weaponProperty' && d.kind !== 'armorProperty')
    .map((d) => ({ kind: 'magic' as const, id: d.id, name: d.name })),
]

export function newUid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

/** Strip accents and case for searching. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
