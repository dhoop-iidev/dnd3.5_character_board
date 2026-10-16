// Tome of Battle crusader, swordsage and prestige classes (house rule #15, docs/rules/tob-classes.md, tob-prestige.md).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character, MartialState } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { crusaderDraw, crusaderEndTurn, crusaderGranted, martialCaps, martialCapsAll } from '../martial'
import { unmetPrereqs } from '../prereq'
import { validate } from '../validate'

const make = (classes: string[], race = 'human'): Character => {
  const c = newCharacter({ name: 'T', race, classId: classes[0], abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 14 }, lang: 'en', alignment: 'LG' })
  c.levels = classes.map((classId) => ({ classId, skillRanks: {}, feats: [] }))
  c.martial = { readied: [], expended: [], active: [] }
  return c
}
const times = (id: string, n: number) => Array.from({ length: n }, () => id)

describe('initiator level with two martial classes (ToB p. 39 example)', () => {
  it('crusader 7 / swordsage 5: IL 9 as crusader, 8 as swordsage', () => {
    const c = make([...times('crusader', 7), ...times('swordsage', 5)])
    const all = martialCapsAll(c, rules)
    expect(all.find((x) => x.classId === 'crusader')!.initiatorLevel).toBe(9)
    expect(all.find((x) => x.classId === 'swordsage')!.initiatorLevel).toBe(8)
  })
})

describe('crusader', () => {
  it('1st level: 5 known, 5 readied, 1 stance, 2 granted at a time; d10 and full BAB', () => {
    const c = make(['crusader'])
    const caps = martialCaps(c, rules)!
    expect([caps.maneuversKnown, caps.maneuversReadied, caps.stancesKnown]).toEqual([5, 5, 1])
    expect(crusaderGranted(rules, 1)).toBe(2)
    expect(crusaderGranted(rules, 10)).toBe(3)
    expect(compute(c, rules).bab.total).toBe(1)
  })
  it('granting: 2 drawn, one more each turn, then recovery and a new draw (pp. 9–10)', () => {
    const readied = ['a', 'b', 'c', 'd', 'e']
    const st: MartialState = { readied, expended: [], active: [] }
    crusaderDraw(st, readied, 2, () => 0)
    expect(st.granted).toEqual(['a', 'b'])
    st.expended = ['a', 'b']
    for (const want of ['granted', 'granted', 'granted'] as const) expect(crusaderEndTurn(st, readied, 2, () => 0)).toBe(want)
    expect(st.granted!.length).toBe(5)
    // The turn the last withheld one is granted doesn't count: recovery at the end of the next turn.
    expect(crusaderEndTurn(st, readied, 2, () => 0)).toBe('recovered')
    expect(st.expended).toEqual([])
    expect(st.granted!.length).toBe(2)
  })
  it('furious counterstrike: + pool ÷ 5 (min +1, max +6) on attack; empty pool nothing', () => {
    const c = make(['crusader'])
    c.inventory.push({ uid: 'ls', kind: 'weapon', refId: 'longsword', location: 'worn', quantity: 1 })
    c.loadouts[0].weapons = ['ls']
    const atk = (pool: number) => {
      c.martial!.pool = pool
      return compute(c, rules).attacks.find((a) => a.itemUid === 'ls')?.attack.total ?? NaN
    }
    const base = atk(0)
    expect(atk(3) - base).toBe(1)
    expect(atk(12) - base).toBe(2)
    expect(compute(c, rules).classFeatures.steelyResolve?.cap).toBe(5)
  })
  it('indomitable soul (Cha on Will) does not stack with divine grace', () => {
    const c = make([...times('paladin', 2), ...times('crusader', 2)])
    // Will: base 0 + Wis +2 + Cha +2 once (not twice).
    expect(compute(c, rules).saves.will.total).toBe(4)
  })
  it('learning at crusader 1: Devoted Spirit strikes and a stance are legal', () => {
    const c = make(['crusader'])
    c.levels[0].maneuversLearned = ['crusaders-strike', 'vanguard-strike', 'douse-the-flames', 'leading-the-attack', 'stone-bones', 'iron-guards-glare']
    c.martial!.readied = ['crusaders-strike', 'vanguard-strike', 'douse-the-flames', 'leading-the-attack', 'stone-bones']
    const ws = validate(c, rules).filter((w) => w.area === 'maneuvers')
    expect(ws.map((w) => w.id)).toEqual([])
  })
  it('a Shadow Hand maneuver is not open to the crusader', () => {
    const c = make(['crusader'])
    c.levels[0].maneuversLearned = ['shadow-blade-technique']
    expect(validate(c, rules).map((w) => w.id)).toContain('maneuver-illegal-shadow-blade-technique-1')
  })
})

describe('swordsage', () => {
  it('1st level: 6 known, 4 readied, 1 stance; quick to act +1 initiative; 3/4 BAB', () => {
    const c = make(['swordsage'])
    const caps = martialCaps(c, rules)!
    expect([caps.maneuversKnown, caps.maneuversReadied, caps.stancesKnown]).toEqual([6, 4, 1])
    const s = compute(c, rules)
    expect(s.initiative.parts.some((p) => p.sourceId === 'quick-to-act' && p.value === 1)).toBe(true)
    expect(s.bab.total).toBe(0)
  })
  it('AC bonus (2nd level): + Wis modifier with no armor and a light load', () => {
    const one = compute(make(['swordsage']), rules).ac.total
    const two = compute(make(['swordsage', 'swordsage']), rules).ac.total
    expect(two - one).toBe(2)
  })
})

describe('prestige classes', () => {
  it('the eight ToB prestige classes are loaded', () => {
    for (const id of ['bloodclaw-master', 'bloodstorm-blade', 'deepstone-sentinel', 'eternal-blade', 'jade-phoenix-mage', 'master-of-nine', 'ruby-knight-vindicator', 'shadow-sun-ninja'])
      expect(rules.classes.get(id)?.prestige).toBe(true)
  })
  it('requirements count maneuvers by discipline, not stances (p. 44)', () => {
    const c = make(times('warblade', 5))
    const req = rules.classes.get('bloodclaw-master')!.requirements
    const unmet = () => unmetPrereqs(req, compute(c, rules), rules, []).map((u) => u.en)
    expect(unmet().some((u) => /Tiger Claw/.test(u))).toBe(true)
    c.levels[0].maneuversLearned = ['wolf-fang-strike', 'sudden-leap', 'blood-in-the-water']
    expect(unmet().some((u) => /Tiger Claw/.test(u))).toBe(true) // a stance doesn't count (p. 44)
    c.levels[4].maneuversLearned = ['claw-at-the-moon']
    expect(unmet().some((u) => /Tiger Claw/.test(u))).toBe(false)
  })
  it('race requirement: a half-elf counts as an elf (Eternal Blade)', () => {
    const req = rules.classes.get('eternal-blade')!.requirements
    const race = (r: string) => unmetPrereqs(req, compute(make(['warblade'], r), rules), rules, []).some((u) => /^Race/.test(u.en))
    expect(race('human')).toBe(true)
    expect(race('elf')).toBe(false)
    expect(race('half-elf')).toBe(false)
  })
  it('a prestige level advances the martial class: initiator level, known and readied grow', () => {
    const c = make([...times('warblade', 6), 'bloodclaw-master'])
    const before = martialCaps(c, rules, 6, 'warblade')!
    const after = martialCaps(c, rules, 7, 'warblade')!
    expect(after.initiatorLevel).toBe(before.initiatorLevel + 1)
    expect(after.maneuversKnown).toBe(before.maneuversKnown + 1)
    expect(after.advanceLevels).toBe(1)
  })
  it('Bloodstorm Blade levels count for weapon aptitude (fighter level − 2, combined)', () => {
    const c = make([...times('warblade', 2), ...times('bloodstorm-blade', 2)])
    const unmet = unmetPrereqs({ fighterLevel: 2 }, compute(c, rules), rules, [])
    expect(unmet).toEqual([])
  })
})
