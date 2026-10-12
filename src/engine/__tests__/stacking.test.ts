import { describe, expect, it } from 'vitest'
import { resolve, type Part } from '../stacking'

const p = (sourceId: string, bonusType: Part['bonusType'], value: number, extra: Partial<Part> = {}): Part => ({
  sourceId,
  label: { en: sourceId, fr: sourceId },
  bonusType,
  value,
  ...extra,
})

describe('stacking (docs/rules/bonus-types.md)', () => {
  it('same named type: only the highest bonus counts', () => {
    const s = resolve([p('bulls-strength', 'enhancement', 4), p('belt', 'enhancement', 2)])
    expect(s.total).toBe(4)
    expect(s.parts.find((x) => x.sourceId === 'belt')?.inactiveReason).toBe('notStacking')
  })
  it('dodge, circumstance and untyped bonuses stack', () => {
    expect(resolve([p('a', 'dodge', 1), p('b', 'dodge', 2)]).total).toBe(3)
    expect(resolve([p('a', 'circumstance', 2), p('b', 'circumstance', 2)]).total).toBe(4)
    expect(resolve([p('a', 'untyped', 1), p('b', 'untyped', 1)]).total).toBe(2)
  })
  it('same source never stacks with itself', () => {
    expect(resolve([p('a', 'untyped', 2), p('a', 'untyped', 1)]).total).toBe(2)
  })
  it('typed penalties of the same type: only the worst; untyped penalties stack (R01)', () => {
    expect(resolve([p('a', 'morale', -2), p('b', 'morale', -1)]).total).toBe(-2)
    expect(resolve([p('fatigued', 'untyped', -2), p('shaken', 'untyped', -2)]).total).toBe(-4)
  })
  it('situational parts count only when switched on', () => {
    const off = resolve([p('dodge', 'dodge', 1, { condition: { en: 'x', fr: 'x' } })])
    expect(off.total).toBe(0)
    const on = resolve([p('dodge', 'dodge', 1, { condition: { en: 'x', fr: 'x' }, situationalOn: true })])
    expect(on.total).toBe(1)
  })
})
