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

/** Name suffix for material and special abilities: "Greatsword +2 (adamantine, keen)". */
function extras(item: ItemInstance): I18n {
  const parts = [
    ...(item.material ? [rules.materials.get(item.material)?.name] : []),
    ...(item.properties ?? []).map((id) => rules.itemProperties.get(id)?.name),
  ].filter((x): x is I18n => !!x)
  return parts.length
    ? { en: ` (${parts.map((p) => p.en).join(', ')})`, fr: ` (${parts.map((p) => p.fr).join(', ')})` }
    : { en: '', fr: '' }
}

/** Enhancement bonus plus the bonus-equivalent of special abilities, and their flat prices. */
function magicBonus(item: ItemInstance): { bonus: number; flat: number } {
  const props = (item.properties ?? []).map((id) => rules.itemProperties.get(id)).filter((p) => !!p)
  return {
    bonus: (item.enhancement ?? 0) + props.reduce((s, p) => s + p.bonusEquivalent, 0),
    flat: props.reduce((s, p) => s + (p.flatPriceGp ?? 0), 0),
  }
}

export function itemInfo(item: ItemInstance): ItemInfo {
  const enh = item.enhancement
  if (item.kind === 'weapon') {
    const d = rules.weapons.get(item.refId)
    if (d) {
      const crit = `${d.critRange < 20 ? `${d.critRange}–20` : '20'}/×${d.critMult}`
      const range = d.rangeIncrement ? ` · ${d.rangeIncrement.ft} ft / ${d.rangeIncrement.m} m` : ''
      const x = extras(item)
      const { bonus, flat } = magicBonus(item)
      const mat = item.material ? rules.materials.get(item.material) : undefined
      const base = d.costGp * (mat?.price.weaponMultiplier ?? 1) + (mat?.price.weapon ?? 0)
      // Magic weapon price: masterwork 300 gp + bonus² × 2,000 gp (https://www.d20srd.org/srd/magicItems/magicWeapons.htm).
      const magic = bonus ? bonus * bonus * 2000 + 300 + flat : item.masterwork || mat?.effects.masterwork ? 300 : 0
      return {
        name: item.name ?? { en: d.name.en + plus(enh) + x.en, fr: d.name.fr + plus(enh) + x.fr },
        weight: d.weight,
        costGp: base + magic,
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
      const acBonus = d.armorBonus + (enh ?? 0)
      const mat = item.material ? rules.materials.get(item.material) : undefined
      const maxDex = d.maxDex === null ? '—' : `+${d.maxDex + (mat?.effects.maxDexBonus ?? 0)}`
      // Masterwork (and every magic armor) reduces the armor check penalty by 1; mithral by 3 in total.
      const mw = item.masterwork || enh || mat?.effects.masterwork
      const acp = Math.min(0, d.acp + (mat?.effects.acpReduction ?? (mw ? 1 : 0)))
      const x = extras(item)
      const { bonus, flat } = magicBonus(item)
      const catPrice = d.category === 'shield' || d.category === 'tower' ? mat?.price.shield : mat?.price[d.category]
      // Magic armor price: masterwork 150 gp + bonus² × 1,000 gp (https://www.d20srd.org/srd/magicItems/magicArmor.htm).
      const magic = bonus ? bonus * bonus * 1000 + 150 + flat : item.masterwork || mat?.effects.masterwork ? 150 : 0
      return {
        name: item.name ?? { en: d.name.en + plus(enh) + x.en, fr: d.name.fr + plus(enh) + x.fr },
        weight: d.weight,
        costGp: d.costGp + (catPrice ?? 0) + magic,
        text: d.text,
        source: d.source,
        stats: {
          en: `+${acBonus} AC · max Dex ${maxDex} · ACP ${acp} · ASF ${d.arcaneFailure - (mat?.effects.arcaneFailureReduction ?? 0)}%`,
          fr: `+${acBonus} CA · Dex max ${maxDex} · malus ${acp} · échec ${d.arcaneFailure - (mat?.effects.arcaneFailureReduction ?? 0)} %`,
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
