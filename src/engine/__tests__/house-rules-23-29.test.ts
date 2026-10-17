// House rules #23, #25, #26, #27, #29 as decided on 2026-10-16 (docs/house-rules.md, rulings-classes.md C25).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { companionAdvancement, computeCreature } from '../creature'
import { resolve } from '../stacking'

const make = (classId: string, n = 1, race = 'human'): Character => {
  const c = newCharacter({ name: 'T', race, classId, abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 12 }, lang: 'en', alignment: 'LN' })
  c.levels = Array.from({ length: n }, () => ({ classId, skillRanks: {}, feats: [] }))
  return c
}

describe('#23 racial bonuses stack (SRD Magic Overview)', () => {
  it('two racial bonuses from different traits add up', () => {
    const r = resolve([
      { sourceId: 'a', label: { en: 'a', fr: 'a' }, value: 2, bonusType: 'racial' },
      { sourceId: 'b', label: { en: 'b', fr: 'b' }, value: 2, bonusType: 'racial' },
    ])
    expect(r.total).toBe(4)
  })
  it('a dwarf against a poison spell: +2 vs poison and +2 vs spells', () => {
    const c = make('fighter', 1, 'dwarf')
    const fort = compute(c, rules).saves.fort
    const keys = fort.parts.filter((p) => p.bonusType === 'racial').map((p) => p.toggleKey!)
    expect(keys.length).toBe(2)
    c.toggles.situational = Object.fromEntries(keys.map((k) => [k, true]))
    expect(compute(c, rules).saves.fort.total).toBe(fort.total + 4)
  })
})

describe('#25 war-trained horse companion', () => {
  it('heavy horse at druid 9: primary hooves (+5, full Str) and a third hoof at −5', () => {
    const def = rules.creatures.get('horse-heavy')!
    const adv = companionAdvancement(rules, 9)
    const plain = computeCreature(def, { advancement: adv })
    const war = computeCreature(def, { advancement: adv, warTrained: true })
    expect(war.attacks[0].attack.role).toBe('primary')
    expect(war.attacks[0].bonus.total).toBe(plain.attacks[0].bonus.total + 5)
    expect(war.attacks[0].iterative).toEqual([war.attacks[0].bonus.total - 5])
    expect(plain.attacks[0].iterative).toEqual([])
  })
  it('a camel gets nothing from training', () => {
    const def = rules.creatures.get('camel')!
    const war = computeCreature(def, { warTrained: true })
    expect(war.attacks[0].attack.role).toBe('secondary')
  })
})

describe('#27 Knowledge (monsters) for the "all Knowledge" classes', () => {
  it('class skill for a bard, a wizard and a Knowledge-domain cleric, not a sorcerer', () => {
    const skill = (c: Character) => compute(c, rules).skills.find((s) => s.key === 'knowledge-monsters')!.classSkill
    expect(skill(make('bard'))).toBe(true)
    expect(skill(make('wizard'))).toBe(true)
    expect(skill(make('sorcerer'))).toBe(false)
    const cl = make('cleric')
    cl.levels[0].classChoices = { domain1: 'knowledge', domain2: 'law', channel: 'positive' }
    expect(skill(cl)).toBe(true)
  })
})

describe('#29 quarterstaff in a flurry, per round', () => {
  it('one end: Power Attack ×2; both ends: ×1', () => {
    const m = make('monk', 6)
    m.levels[0].feats = [{ featId: 'power-attack', slot: 'general' }]
    m.inventory = [{ uid: 'q', kind: 'weapon', refId: 'quarterstaff', quantity: 1, location: 'worn' }]
    m.loadouts[0].weapons = ['q']
    m.toggles = { ...m.toggles, flurry: true, powerAttack: 2 }
    const pa = (c: Character) => compute(c, rules).attacks.find((a) => a.itemUid === 'q')!.damage.parts.find((p) => p.sourceId === 'power-attack')!.value
    expect(pa(m)).toBe(4)
    m.toggles.staffBothEnds = true
    expect(pa(m)).toBe(2)
  })
})
