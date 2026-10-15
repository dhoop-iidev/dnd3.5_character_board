// Tome of Battle (house rule #15): warblade maneuvers, stances, learning rules.
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import seedJson from './fixtures/chikibidouille.json'
import type { Character } from '../../model/character'
import { compute } from '../compute'
import { validate } from '../validate'
import { advanceManeuvers } from '../martial'

const seed = seedJson as unknown as Character
/** Level 9 = Warblade 1 with 3 maneuvers + 1 stance learned. */
function learned(ids: string[], martial: Partial<Character['martial']> = {}): Character {
  const c = structuredClone(seed)
  c.levels[8].maneuversLearned = ids
  c.martial = { readied: [], expended: [], active: [], ...martial }
  return c
}
const ids = (c: Character) => validate(c, rules).filter((w) => w.area === 'maneuvers').map((w) => w.id)
const gs = (s: ReturnType<typeof compute>) => s.attacks.find((a) => a.itemUid === 'greatsword')!

describe('learning maneuvers at warblade 1 (initiator level 5)', () => {
  it('3 maneuvers + 1 stance, all ≤ 3rd level, prerequisites met: no maneuver warning once readied', () => {
    const c = learned(['steel-wind', 'mountain-hammer', 'steely-strike', 'punishing-stance'], {
      readied: ['steel-wind', 'mountain-hammer', 'steely-strike'],
    })
    expect(ids(c)).toEqual([])
  })
  it('missing picks and empty readied slots are flagged', () => {
    expect(ids(learned(['steel-wind']))).toEqual(['maneuvers-missing-9', 'stances-missing-9', 'maneuvers-readied-missing'])
    expect(ids(learned(['steel-wind', 'mountain-hammer', 'steely-strike', 'punishing-stance']))).toContain('maneuvers-readied-missing')
  })
  it('a 4th-level maneuver is above the initiator-level cap; a prerequisite needs earlier maneuvers of the discipline', () => {
    const fourth = [...rules.maneuvers.values()].find((m) => m.level === 4 && m.type !== 'stance')!
    expect(ids(learned([fourth.id, 'steel-wind', 'steely-strike', 'punishing-stance']))).toContain(`maneuver-illegal-${fourth.id}-9`)
    // Emerald Razor (Diamond Mind 2) needs 1 Diamond Mind maneuver known.
    expect(ids(learned(['emerald-razor', 'steel-wind', 'steely-strike', 'punishing-stance']))).toContain('maneuver-illegal-emerald-razor-9')
  })
  it('maneuvers can only be learned at warblade levels', () => {
    const c = learned(['steel-wind', 'mountain-hammer', 'steely-strike', 'punishing-stance'])
    c.levels[0].maneuversLearned = ['steel-wind']
    expect(ids(c)).toContain('maneuvers-not-warblade-1')
  })
})

describe('stances and running maneuvers', () => {
  const base = ['steel-wind', 'mountain-hammer', 'steely-strike', 'punishing-stance']
  it('Punishing Stance: −2 AC and +1d6 on melee attacks while active', () => {
    const s = compute(learned(base, { stance: 'punishing-stance' }), rules)
    expect(s.ac.total).toBe(19)
    expect(gs(s).extraDamage.map((x) => x.dice)).toContain('1d6')
  })
  it('an unknown stance has no effect', () => {
    expect(compute(learned(['steel-wind'], { stance: 'stonefoot-stance' }), rules).ac.total).toBe(21)
  })
  it('Mountain Hammer running: +2d6 on the strike', () => {
    const s = compute(learned(base, { active: [{ id: 'mountain-hammer', stage: 0 }] }), rules)
    expect(gs(s).extraDamage.map((x) => x.dice)).toContain('2d6')
  })
  it('maneuver bonuses do not stack with each other (ToB p. 40): Steely Strike +4 and Iron Heart Surge +2 → +4', () => {
    const c = learned(base, {
      active: [
        { id: 'steely-strike', stage: 0 },
        { id: 'iron-heart-surge', stage: 0 },
      ],
    })
    expect(gs(compute(c, rules)).attack.total).toBe(16 + 4)
  })
  it('Blood in the Water: +1 attack and damage per critical hit scored (ToB p. 86), nothing at 0', () => {
    const tc = ['wolf-fang-strike', 'steel-wind', 'steely-strike', 'blood-in-the-water']
    const zero = gs(compute(learned(tc, { stance: 'blood-in-the-water' }), rules))
    expect(zero.attack.total).toBe(16)
    const three = gs(compute(learned(tc, { stance: 'blood-in-the-water', crits: 3 }), rules))
    expect(three.attack.total).toBe(19)
    expect(three.damage.total).toBe(zero.damage.total + 3)
  })
  it('Leaping Dragon Stance: +10 enhancement on Jump checks (house rule #18)', () => {
    const tc = ['wolf-fang-strike', 'steel-wind', 'steely-strike', 'leaping-dragon-stance']
    const off = compute(learned(tc), rules).skills.find((k) => k.key === 'jump')!.total.total
    expect(compute(learned(tc, { stance: 'leaping-dragon-stance' }), rules).skills.find((k) => k.key === 'jump')!.total.total).toBe(off + 10)
  })
})

describe('running maneuvers end at their own time (ToB p. 45)', () => {
  const base = ['steel-wind', 'mountain-hammer', 'steely-strike', 'punishing-stance']
  const after = (c: Character, ...events: ('endOfTurn' | 'startOfTurn')[]) => {
    for (const ev of events) advanceManeuvers(c.martial, rules, ev)
    return c
  }
  it('Iron Heart Surge: +2 morale until the end of your NEXT turn', () => {
    const c = learned(base, { active: [{ id: 'iron-heart-surge', stage: 0 }] })
    expect(gs(compute(after(structuredClone(c), 'endOfTurn', 'startOfTurn'), rules)).attack.total).toBe(18)
    expect(gs(compute(after(structuredClone(c), 'endOfTurn', 'startOfTurn', 'endOfTurn'), rules)).attack.total).toBe(16)
  })
  it('Steely Strike: the +4 is for the strike only', () => {
    const c = learned(base, { active: [{ id: 'steely-strike', stage: 0 }] })
    expect(gs(compute(c, rules)).attack.total).toBe(20)
    const later = after(c, 'endOfTurn')
    expect(gs(compute(later, rules)).attack.total).toBe(16)
    expect(later.martial.active).toHaveLength(1) // its −4 AC part still runs until your next turn
  })
  it('Mountain Hammer: extra dice gone once the turn ends', () => {
    const c = after(learned(base, { active: [{ id: 'mountain-hammer', stage: 0 }] }), 'endOfTurn')
    expect(gs(compute(c, rules)).extraDamage.map((x) => x.dice)).not.toContain('2d6')
    expect(c.martial.active).toEqual([])
  })
  it('Stone Bones: DR 5/adamantine through enemy turns, gone at your next turn', () => {
    const c = learned(['stone-bones', 'steel-wind', 'steely-strike', 'punishing-stance'], { active: [{ id: 'stone-bones', stage: 0 }] })
    expect(compute(after(structuredClone(c), 'endOfTurn'), rules).damageReduction.map((d) => d.value)).toContain('5/adamantine')
    expect(compute(after(structuredClone(c), 'endOfTurn', 'startOfTurn'), rules).damageReduction).toEqual([])
  })
  it('situational maneuver bonuses do not stack with other maneuver bonuses either (p. 40)', () => {
    const c = learned(base, { active: [{ id: 'steely-strike', stage: 0 }, { id: 'lightning-recovery', stage: 0 }] })
    const atk = gs(compute(c, rules)).attack
    const key = atk.parts.find((p) => p.toggleKey && p.condition)?.toggleKey
    if (key) c.toggles.situational[key] = true
    expect(gs(compute(c, rules)).attack.total).toBe(20)
  })
})

describe('warblade class features: only the right situations', () => {
  it('battle clarity stays when stunned (not flat-footed), goes when flat-footed', () => {
    const stunned = learned([])
    stunned.activeEffects = [{ uid: 's', kind: 'condition', refId: 'stunned', enabled: true }]
    expect(compute(stunned, rules).saves.ref.total).toBe(9)
    const ff = learned([])
    ff.activeEffects = [{ uid: 'f', kind: 'condition', refId: 'flat-footed', enabled: true }]
    expect(compute(ff, rules).saves.ref.total).toBe(8)
  })
})
