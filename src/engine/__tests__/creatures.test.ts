// Animal companions and summoned creatures (SRD stat blocks + advancement / Augment Summoning).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import { companionAdvancement, companionLevel, computeCreature } from '../creature'

const wolf = rules.creatures.get('wolf')!

describe('creature data', () => {
  it('wolf stat block as printed (https://www.d20srd.org/srd/monsters/wolf.htm)', () => {
    const s = computeCreature(wolf)
    expect([s.hpMax.total, s.ac.total, s.attacks[0].bonus.total, s.attacks[0].damage]).toEqual([13, 14, 3, '1d6+1'])
    expect([s.saves.fort.total, s.saves.ref.total, s.saves.will.total]).toEqual([5, 5, 1])
  })
  it('summon lists point to existing creatures and spells', () => {
    expect(rules.summonLists).toHaveLength(9)
    for (const l of rules.summonLists) {
      expect(rules.spells.has(l.spellId)).toBe(true)
      for (const id of l.creatures) expect(rules.creatures.has(id)).toBe(true)
    }
  })
})

describe('animal companion (https://www.d20srd.org/srd/classes/druid.htm#animalCompanion)', () => {
  it('effective level: druid level + ½ ranger level from ranger 4', () => {
    expect(companionLevel({ druid: 3 })).toBe(3)
    expect(companionLevel({ ranger: 3 })).toBe(0)
    expect(companionLevel({ ranger: 5 })).toBe(2)
  })
  it('druid 3 wolf: +2 HD, natural armor +2, Str/Dex +1 → 4 HD wolf', () => {
    const s = computeCreature(wolf, { advancement: companionAdvancement(rules, 3) })
    expect(s.hitDice).toBe(4)
    expect(s.hpMax.total).toBe(26) // 4d8+8 average
    expect(s.bab.total).toBe(3)
    expect(s.attacks[0].bonus.total).toBe(6) // BAB 3 + Str 2 + Weapon Focus 1
    expect(s.ac.total).toBe(17) // 14 + natural 2 + Dex 1
    expect([s.saves.fort.total, s.saves.ref.total, s.saves.will.total]).toEqual([6, 7, 2]) // poor save at 4 HD = +1, Wis +1
    expect(s.special.map((x) => x.id)).toEqual(expect.arrayContaining(['link', 'share-spells', 'evasion']))
  })
  it('maximum hit dice (house rule #9 box): 4d8 max + Con', () => {
    expect(computeCreature(wolf, { advancement: companionAdvancement(rules, 3), maxHp: true }).hpMax.total).toBe(40)
  })
  it('hit points entered by hand', () => {
    expect(computeCreature(wolf, { hpManual: 9 }).hpMax.total).toBe(9)
  })
})

describe('summoned creatures', () => {
  it('Augment Summoning: +4 Str and Con (+2 attack, +3 damage for a sole natural attack, +2 hp/HD)', () => {
    const s = computeCreature(wolf, { augment: true })
    expect(s.attacks[0].bonus.total).toBe(5)
    expect(s.attacks[0].damage).toBe('1d6+4')
    expect(s.hpMax.total).toBe(17)
    expect(s.saves.fort.total).toBe(7)
  })
})
