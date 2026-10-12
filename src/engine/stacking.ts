// Bonus stacking (docs/rules/bonus-types.md, rulings-combat-equipment.md R01).
import type { BonusType, I18n, Source } from '../data/types'

/** One contribution to a computed value, as shown in the breakdown popup. */
export interface Part {
  /** Stable id of what produced it (feat id, item uid, effect uid…). Same-source parts never stack. */
  sourceId: string
  label: I18n
  value: number
  bonusType: BonusType
  source?: Source
  /** Situational text; the part only counts when `situationalOn` is true. */
  condition?: I18n
  situationalOn?: boolean
  /** Key in character.toggles.situational that switches this part on/off. */
  toggleKey?: string
  /** Filled by `resolve`: whether the part counts in the total. */
  active?: boolean
  /** Filled by `resolve`: why it doesn't count. */
  inactiveReason?: 'situational' | 'notStacking' | 'sameSource'
}

export interface Stat {
  total: number
  parts: Part[]
}

/** Types whose bonuses stack with themselves (different sources). Penalties stack only when untyped. */
const ALWAYS_STACK: BonusType[] = ['base', 'ability', 'dodge', 'circumstance', 'untyped']

/**
 * Apply the 3.5 stacking rules:
 * - situational parts count only when switched on;
 * - two parts with the same sourceId: only the larger magnitude counts;
 * - same named type: only the best bonus and the worst penalty count, except dodge, circumstance, untyped
 *   (and the engine's 'base'/'ability' contributions, which are always distinct).
 */
export function resolve(parts: Part[]): Stat {
  const out = parts.map((p) => ({ ...p, active: true, inactiveReason: undefined as Part['inactiveReason'] }))

  for (const p of out) {
    if (p.condition && !p.situationalOn) {
      p.active = false
      p.inactiveReason = 'situational'
    }
  }

  // Same source: keep the largest magnitude per (sourceId, sign).
  const bySource = new Map<string, typeof out>()
  for (const p of out) {
    if (!p.active) continue
    const key = `${p.sourceId}|${Math.sign(p.value)}`
    bySource.set(key, [...(bySource.get(key) ?? []), p])
  }
  for (const group of bySource.values()) {
    if (group.length < 2) continue
    const keep = group.reduce((a, b) => (Math.abs(b.value) > Math.abs(a.value) ? b : a))
    for (const p of group) if (p !== keep) Object.assign(p, { active: false, inactiveReason: 'sameSource' })
  }

  // Same type: best bonus, worst penalty.
  const byType = new Map<string, typeof out>()
  for (const p of out) {
    if (!p.active || p.value === 0) continue
    const stacks = ALWAYS_STACK.includes(p.bonusType) && !(p.value < 0 && p.bonusType !== 'untyped' && p.bonusType !== 'base' && p.bonusType !== 'ability')
    if (stacks) continue
    const key = `${p.bonusType}|${Math.sign(p.value)}`
    byType.set(key, [...(byType.get(key) ?? []), p])
  }
  for (const group of byType.values()) {
    if (group.length < 2) continue
    const keep = group.reduce((a, b) => (Math.abs(b.value) > Math.abs(a.value) ? b : a))
    for (const p of group) if (p !== keep) Object.assign(p, { active: false, inactiveReason: 'notStacking' })
  }

  const total = out.filter((p) => p.active).reduce((s, p) => s + p.value, 0)
  return { total, parts: out }
}

export const i18n = (en: string, fr: string = en): I18n => ({ en, fr })
