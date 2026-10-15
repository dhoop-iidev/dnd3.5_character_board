// Generic character model: new characters, two-weapon fighting, races, ranger (SRD 3.5).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character, ItemInstance } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { validate } from '../validate'

const ABIL = { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 10 }
const fresh = (race = 'human', classId = 'fighter', abilities = ABIL) => newCharacter({ name: 'Test', race, classId, abilities, lang: 'en' })
const weapon = (uid: string, refId: string): ItemInstance => ({ uid, kind: 'weapon', refId, quantity: 1, location: 'carried' })
function wield(c: Character, uids: string[], twoWeapon = false) {
  c.loadouts[0].weapons = uids
  c.loadouts[0].twoWeapon = twoWeapon
  return c
}
const atk = (c: Character, uid: string) => compute(c, rules).attacks.find((a) => a.itemUid === uid)!

describe('new character', () => {
  it('a 1st-level human fighter computes and asks for its choices', () => {
    const c = fresh()
    const s = compute(c, rules)
    expect(s.hpMax.total).toBe(11) // d10 max + Con 1 (house rule #9)
    expect(s.bab.total).toBe(1)
    const ids = validate(c, rules).map((w) => w.id)
    expect(ids).toContain('feat-missing-general-1')
    expect(ids).toContain('feat-missing-race-1')
    expect(ids).toContain('feat-missing-class-1')
  })
})

describe('two-weapon fighting (https://www.d20srd.org/srd/combat/specialAttacks.htm#twoWeaponFighting)', () => {
  const base = () => {
    const c = fresh()
    c.inventory = [weapon('a', 'longsword'), weapon('b', 'short-sword')]
    return c
  }
  it('light off-hand weapon, no feat: −4 / −8; off hand ½ Str', () => {
    const c = wield(base(), ['a', 'b'], true)
    expect(atk(c, 'a').attack.total).toBe(1 + 2 - 4)
    expect(atk(c, 'b').attack.total).toBe(1 + 2 - 8)
    expect(atk(c, 'b').damage.total).toBe(1) // Str +2 × ½
    expect(atk(c, 'b').hand).toBe('off')
  })
  it('with Two-Weapon Fighting: −2 / −2', () => {
    const c = wield(base(), ['a', 'b'], true)
    c.levels[0].feats = [{ featId: 'two-weapon-fighting', slot: 'general' }]
    expect(atk(c, 'a').attack.total).toBe(1)
    expect(atk(c, 'b').attack.total).toBe(1)
  })
  it('without the two-weapon toggle each weapon is a separate choice (no penalty)', () => {
    const c = wield(base(), ['a', 'b'], false)
    expect(atk(c, 'b').attack.total).toBe(3)
  })
})

describe('races (https://www.d20srd.org/srd/races.htm)', () => {
  it('elf: +2 Dex −2 Con, racial +2 Listen/Search/Spot, longbow proficiency', () => {
    const c = fresh('elf', 'wizard')
    const s = compute(c, rules)
    expect(s.abilities.dex.score.total).toBe(16)
    expect(s.abilities.con.score.total).toBe(10)
    expect(s.skills.find((k) => k.key === 'spot')!.total.total).toBe(1 + 2) // Wis 12 + racial 2
    c.inventory = [weapon('bow', 'longbow')]
    wield(c, ['bow'])
    expect(atk(c, 'bow').attack.parts.some((p) => p.sourceId === 'nonproficient-weapon')).toBe(false)
  })
  it('halfling: Small (+1 AC and attack, −4 grapple, +4 Hide, Small weapon dice, ¾ load), speed 20, no extra feat', () => {
    const c = fresh('halfling', 'fighter')
    c.inventory = [weapon('a', 'longsword')]
    wield(c, ['a'])
    const s = compute(c, rules)
    expect(s.ac.total).toBe(10 + 3 + 1) // Dex 14+2 → +3, size +1
    expect(s.grapple.total).toBe(1 + 1 - 4) // BAB 1, Str 14−2 = 12 → +1, size −4
    expect(s.attacks[0].attack.total).toBe(1 + 1 + 1) // BAB, Str +1, size +1
    expect(s.attacks[0].damageDice).toBe('1d6')
    expect(s.speed.base.ft).toBe(20)
    expect(s.skills.find((k) => k.key === 'hide')!.total.total).toBe(3 + 4) // Dex +3, size +4
    expect(s.load.limits.light.lb).toBe(43 * 0.75)
    expect(validate(c, rules).map((w) => w.id)).not.toContain('feat-missing-race-1')
  })
})

describe('ranger (https://www.d20srd.org/srd/classes/ranger.htm)', () => {
  const ranger = (n: number, choices: Record<number, Record<string, string>> = {}) => {
    const c = fresh('human', 'ranger', { ...ABIL, wis: 14 })
    c.levels = Array.from({ length: n }, (_, i) => ({ classId: 'ranger', skillRanks: {}, feats: [], classChoices: choices[i + 1] }))
    return c
  }
  it('1st level: Track granted, favored enemy +2 on Spot and damage vs that type (situational)', () => {
    const c = ranger(1, { 1: { favoredEnemy: 'animal' } })
    const s = compute(c, rules)
    expect(s.feats.some((f) => f.featId === 'track' && f.slot === 'granted')).toBe(true)
    expect(s.favoredEnemies).toEqual([{ id: 'animal', bonus: 2, name: expect.anything() }])
    const spot = s.skills.find((k) => k.key === 'spot')!.total
    expect(spot.parts.some((p) => p.sourceId.startsWith('favored-enemy:animal') && p.value === 2 && p.condition)).toBe(true)
    expect(validate(c, rules).map((w) => w.id)).not.toContain('choice-missing-favoredEnemy-1')
    expect(validate(ranger(1), rules).map((w) => w.id)).toContain('choice-missing-favoredEnemy-1')
  })
  it('5th level: a new favored enemy and +2 on one of them', () => {
    const c = ranger(5, { 1: { favoredEnemy: 'animal' }, 2: { combatStyle: 'archery' }, 5: { favoredEnemy: 'magical-beast', favoredEnemyIncrease: 'animal' } })
    expect(compute(c, rules).favoredEnemies.map((f) => [f.id, f.bonus])).toEqual([['animal', 4], ['magical-beast', 2]])
  })
  it('two-weapon combat style: Two-Weapon Fighting in light armor, not in medium armor', () => {
    const c = ranger(2, { 1: { favoredEnemy: 'animal' }, 2: { combatStyle: 'two-weapon' } })
    c.inventory = [{ uid: 'arm', kind: 'armor', refId: 'chain-shirt', quantity: 1, location: 'worn' }]
    expect(compute(c, rules).feats.some((f) => f.featId === 'two-weapon-fighting')).toBe(true)
    c.inventory = [{ uid: 'arm', kind: 'armor', refId: 'breastplate', quantity: 1, location: 'worn' }]
    const s = compute(c, rules)
    expect(s.feats.some((f) => f.featId === 'two-weapon-fighting')).toBe(false)
    expect(s.combatStyle?.active).toBe(false)
    expect(validate(c, rules).map((w) => w.id)).toContain('combat-style-inactive')
  })
  it('spells: none before 4th; at 4th caster level 2 and one 1st-level spell (bonus from Wis 14)', () => {
    expect(compute(ranger(3), rules).spellcasting[0].slots.every((x) => x.total === 0)).toBe(true)
    const sc = compute(ranger(4), rules).spellcasting[0]
    expect(sc.casterLevel.total).toBe(2)
    expect(sc.slots.find((x) => x.spellLevel === 1)).toMatchObject({ base: 0, bonus: 1, total: 1 })
    expect(sc.dc(1)).toBe(13)
  })
  it('wild empathy = ranger level + Cha', () => {
    expect(compute(ranger(3), rules).featureStats.find((f) => f.id === 'wild-empathy')!.stat.total).toBe(3)
  })
})
