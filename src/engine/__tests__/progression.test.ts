import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import fenrirJson from '../../data/characters/fenrir.json'
import type { Character } from '../../model/character'
import { migrate } from '../../model/migrate'
import { classOptions, featOptions, featSlotsAt, levelForXp, skillBudget, xpForLevel } from '../progression'

const fenrir = fenrirJson as unknown as Character
const clone = (): Character => structuredClone(fenrir)

describe('XP table (https://www.d20srd.org/srd/xp.htm)', () => {
  it('thresholds: level 2 = 1,000, level 9 = 36,000, level 10 = 45,000', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(1000)
    expect(xpForLevel(9)).toBe(36000)
    expect(xpForLevel(10)).toBe(45000)
  })
  it('level for XP', () => {
    expect(levelForXp(36000)).toBe(9)
    expect(levelForXp(44999)).toBe(9)
    expect(levelForXp(45000)).toBe(10)
  })
})

describe('skill budget', () => {
  it('level 1 fighter (Int 13, human): (2+1)×4 + 4 = 16', () => {
    expect(skillBudget(fenrir, rules, 1).available).toBe(16)
  })
  it('level 9 Weapon Master: 2 + 1 + 1 = 4, Spot is a class skill (cost 1), Climb is not (cost 2)', () => {
    const b = skillBudget(fenrir, rules, 9)
    expect(b.available).toBe(4)
    expect(b.costPerRank('spot')).toBe(1)
    expect(b.costPerRank('climb')).toBe(2)
    expect(b.maxRanks('climb')).toBe(12) // class skill of the fighter: level + 3
    expect(b.maxRanks('diplomacy')).toBe(6) // cross-class for both: (9 + 3) / 2
  })
})

describe('feat slots and options', () => {
  it('level 9: one general feat, no fighter bonus feat (Weapon Master level)', () => {
    expect(featSlotsAt(fenrir, rules, 9)).toEqual({ general: 1, human: 0, fighter: 0 })
  })
  it('options exclude feats already owned and flag unmet prerequisites', () => {
    const opts = featOptions(fenrir, rules, 9, 'general')
    expect(opts.some((o) => o.def.id === 'dodge')).toBe(false)
    const ic = opts.find((o) => o.def.id === 'improved-critical')!
    expect(ic.unmet).toEqual([]) // BAB +9 ≥ 8
    const gwf = opts.find((o) => o.def.id === 'greater-weapon-focus')!
    expect(gwf.unmet.some((u) => u.includes('Fighter level 8'))).toBe(true)
  })
  it('fighter slot only offers fighter bonus feats', () => {
    expect(featOptions(fenrir, rules, 2, 'fighter').every((o) => o.def.fighterBonus)).toBe(true)
  })
})

describe('level up', () => {
  it('a 10th level as Weapon Master needs no requirement check; it adds a level', () => {
    const c = clone()
    expect(classOptions(c, rules).find((o) => o.id === 'weapon-master')!.unmet).toEqual([])
    c.levels.push({ classId: 'weapon-master', skillRanks: {}, feats: [] })
    expect(featSlotsAt(c, rules, 10)).toEqual({ general: 0, human: 0, fighter: 0 })
    expect(skillBudget(c, rules, 10).available).toBe(4)
  })
  it('fighter 7 would grant no bonus feat; fighter 8 would', () => {
    const c = clone()
    c.levels.push({ classId: 'fighter', skillRanks: {}, feats: [] })
    expect(featSlotsAt(c, rules, 10).fighter).toBe(0) // fighter level 7
    c.levels.push({ classId: 'fighter', skillRanks: {}, feats: [] })
    expect(featSlotsAt(c, rules, 11).fighter).toBe(1) // fighter level 8
  })
})

describe('save migration', () => {
  it('v1 files get XP set to their level threshold', () => {
    const v1 = { ...clone(), schemaVersion: 1 } as Partial<Character>
    delete v1.xp
    const c = migrate(v1)
    expect(c.schemaVersion).toBe(3)
    expect(c.xp).toBe(36000)
  })
})
