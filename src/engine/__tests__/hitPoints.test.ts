// Hit points at the table: https://www.d20srd.org/srd/combat/injuryDeath.htm
import { describe, expect, it } from 'vitest'
import { addNonlethal, heal, hpState, takeDamage } from '../hitPoints'

const hp = (damage = 0, nonlethal = 0, temp = 0) => ({ damage, nonlethal, temp })

describe('hit points', () => {
  it('damage takes temporary hit points first', () => {
    const h = hp(0, 0, 5)
    takeDamage(h, 8)
    expect(h).toEqual(hp(3, 0, 0))
  })
  it('healing removes lethal damage and as much nonlethal damage', () => {
    const h = hp(10, 4)
    heal(h, 6)
    expect(h).toEqual(hp(4, 0))
    addNonlethal(h, -3)
    expect(h.nonlethal).toBe(0)
  })
  it('states: staggered, unconscious, disabled, dying, dead', () => {
    expect(hpState(20, hp(10, 10)).kind).toBe('staggered')
    expect(hpState(20, hp(10, 11)).kind).toBe('unconscious')
    expect(hpState(20, hp(20)).kind).toBe('disabled')
    expect(hpState(20, hp(25)).kind).toBe('dying')
    expect(hpState(20, hp(30)).kind).toBe('dead')
    expect(hpState(20, hp(5, 2)).kind).toBe('ok')
  })
})
