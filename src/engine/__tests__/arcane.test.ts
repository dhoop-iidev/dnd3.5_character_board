// Wizard, sorcerer and bard (docs/rules/rulings-classes.md C26–C33): spellbook, spells known and swaps, arcane spell
// failure, familiar, bardic music, spellcasting levels from a prestige class.
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { familiarAdvancement, spellbook } from '../arcane'
import { compute } from '../compute'
import { computeCreature } from '../creature'
import { knownUpTo, learningProblems, spellLearning, swapProblems } from '../spellLearning'
import { validate } from '../validate'

const make = (classes: string[], abilities = { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 16 }): Character => {
  const c = newCharacter({ name: 'T', race: 'human', classId: classes[0], abilities, lang: 'en', alignment: 'CG' })
  c.levels = classes.map((classId) => ({ classId, skillRanks: {}, feats: [] }))
  return c
}
const times = (id: string, n: number) => Array.from({ length: n }, () => id)
const ids = (c: Character) => validate(c, rules).filter((w) => w.area === 'spells').map((w) => w.id)

describe('wizard', () => {
  it('spellbook: every 0-level spell except prohibited schools, 3 + Int 1st-level spells at 1st level', () => {
    const c = make(['wizard'])
    c.levels[0].classChoices = { school: 'evocation', prohibited1: 'enchantment', prohibited2: 'illusion' }
    const x = spellLearning(c, rules, 1)!
    expect(x.free).toBe(6) // 3 + Int 16 (+3)
    expect(x.onlyLevel).toBe(1)
    c.levels[0].spellsLearned = ['magic-missile', 'mage-armor', 'shield', 'grease', 'burning-hands', 'color-spray']
    const book = spellbook(c, rules, knownUpTo(c, rules, 'wizard'))
    expect(book.some((e) => e.id === 'daze')).toBe(false) // enchantment cantrip: prohibited
    expect(book.some((e) => e.id === 'ray-of-frost')).toBe(true)
    // Color spray is an illusion: prohibited.
    expect(learningProblems(rules, spellLearning(c, rules, 1)!).some((p) => /prohibited/.test(p.en))).toBe(true)
  })
  it('two free spells per later level, of a level she can cast', () => {
    const c = make(times('wizard', 5))
    c.levels[4].spellsLearned = ['fireball', 'magic-missile']
    expect(learningProblems(rules, spellLearning(c, rules, 5)!)).toEqual([])
    c.levels[1].spellsLearned = ['fireball']
    expect(learningProblems(rules, spellLearning(c, rules, 2)!).some((p) => p.kind === 'illegal')).toBe(true)
  })
  it('specialist: one of the two free spells of a new level is of her specialty school (SRD)', () => {
    const c = make(times('wizard', 3))
    c.levels[0].classChoices = { school: 'evocation', prohibited1: 'enchantment', prohibited2: 'illusion' }
    c.levels[2].spellsLearned = ['web', 'glitterdust']
    expect(learningProblems(rules, spellLearning(c, rules, 3)!).some((p) => /specialty/.test(p.en))).toBe(true)
    c.levels[2].spellsLearned = ['web', 'scorching-ray']
    expect(learningProblems(rules, spellLearning(c, rules, 3)!)).toEqual([])
  })
  it('specialist: an extra spell at every spell level, 0 included (C26); prohibited schools must be chosen', () => {
    const c = make(['wizard'])
    c.levels[0].classChoices = { school: 'conjuration' }
    const sc = compute(c, rules).spellcasting[0]
    expect(sc.slots.map((s) => s.extra)).toEqual([1, 1])
    expect(ids(c)).toContain('prohibited-schools-missing')
    c.levels[0].classChoices = { school: 'conjuration', prohibited1: 'divination', prohibited2: 'necromancy' }
    expect(ids(c)).toContain('prohibited-schools-invalid')
  })
  it('a prepared spell must be in the spellbook (read magic from memory)', () => {
    const c = make(['wizard'])
    c.spells = { wizard: { prepared: { 1: [{ id: 'magic-missile', cast: false }], 0: [{ id: 'read-magic', cast: false }] } } }
    expect(ids(c)).toContain('prepared-not-in-book-magic-missile')
    expect(ids(c)).not.toContain('prepared-not-in-book-read-magic')
  })
  it('wizard-only spells (mnemonic enhancer) are on the wizard list, not the sorcerer’s', () => {
    const w = make(times('wizard', 7))
    w.levels[6].spellsLearned = ['mnemonic-enhancer']
    expect(learningProblems(rules, spellLearning(w, rules, 7)!).filter((p) => p.kind === 'illegal')).toEqual([])
    const s = make(times('sorcerer', 8))
    s.levels[7].spellsLearned = ['mnemonic-enhancer']
    expect(learningProblems(rules, spellLearning(s, rules, 8)!).some((p) => /not on the class spell list/.test(p.en))).toBe(true)
  })
})

describe('sorcerer and bard: spells known', () => {
  it('sorcerer 1: 4 cantrips and 2 1st-level spells; missing and extra picks are flagged', () => {
    const c = make(['sorcerer'])
    expect(spellLearning(c, rules, 1)!.newByLevel).toEqual({ 0: 4, 1: 2 })
    c.levels[0].spellsLearned = ['daze', 'light', 'detect-magic', 'ray-of-frost', 'magic-missile']
    expect(ids(c).some((id) => id.startsWith('spells-missing-1'))).toBe(true)
    c.levels[0].spellsLearned.push('sleep', 'grease')
    expect(ids(c).some((id) => id.startsWith('spells-extra-1'))).toBe(true)
  })
  it('swap at sorcerer 4: only a spell two levels below the highest castable (C33)', () => {
    const c = make(times('sorcerer', 4))
    c.levels[0].spellsLearned = ['daze', 'light', 'detect-magic', 'ray-of-frost', 'magic-missile', 'sleep']
    const x = spellLearning(c, rules, 4)!
    expect(x.swap).toBe(true)
    expect(x.highest).toBe(2)
    expect(swapProblems(rules, x, { from: 'daze', to: 'mage-hand' })).toEqual([])
    expect(swapProblems(rules, x, { from: 'sleep', to: 'grease' }).length).toBeGreaterThan(0)
    expect(spellLearning(c, rules, 3)!.swap).toBe(false)
  })
  it('bard: swaps at 5, 8, 11…; cures are on the bard list', () => {
    const c = make(times('bard', 8))
    expect(spellLearning(c, rules, 5)!.swap).toBe(true)
    expect(spellLearning(c, rules, 6)!.swap).toBe(false)
    expect(spellLearning(c, rules, 8)!.swap).toBe(true)
    c.levels[1].spellsLearned = ['cure-light-wounds']
    expect(learningProblems(rules, spellLearning(c, rules, 2)!).filter((p) => p.kind === 'illegal')).toEqual([])
  })
})

describe('arcane spell failure', () => {
  const wear = (c: Character, refId: string, shield = false) => {
    c.inventory.push({ uid: refId, kind: 'armor', refId, location: 'worn', quantity: 1 })
    if (shield) c.loadouts[0].shield = refId
  }
  it('wizard in a chain shirt: 20%; bard in a chain shirt: none for bard spells; with a buckler: 5% (C32)', () => {
    const w = make(['wizard'])
    wear(w, 'chain-shirt')
    expect(compute(w, rules).spellcasting[0].spellFailure!.total).toBe(20)
    const b = make(['bard'])
    wear(b, 'chain-shirt')
    expect(compute(b, rules).spellcasting[0].spellFailure!.total).toBe(0)
    wear(b, 'buckler', true)
    expect(compute(b, rules).spellcasting[0].spellFailure!.total).toBe(5)
  })
  it('mithral breastplate: light armor for every purpose (FAQ pp. 53–54, C35): bard none and proficient; sorcerer 15%', () => {
    const mithral = (c: Character) => {
      c.inventory.push({ uid: 'bp', kind: 'armor', refId: 'breastplate', location: 'worn', quantity: 1, material: 'mithral' })
      return c
    }
    const b = mithral(make(['bard']))
    expect(compute(b, rules).spellcasting[0].spellFailure!.total).toBe(0)
    expect(validate(b, rules).some((w) => w.id === 'armor-prof-bp')).toBe(false)
    const s = mithral(make(['sorcerer']))
    expect(compute(s, rules).spellcasting[0].spellFailure!.total).toBe(15)
    // A sorcerer is proficient with no armor: still nonproficient in light armor.
    expect(validate(s, rules).some((w) => w.id === 'armor-prof-bp')).toBe(true)
  })
})

describe('familiar', () => {
  it('toad: master +3 hp; Alertness only within arm’s reach (situational)', () => {
    const c = make(['sorcerer'])
    const before = compute(c, rules)
    c.companions = [{ uid: 'f', creatureId: 'toad', kind: 'familiar', maxHp: true, damage: 0 }]
    const after = compute(c, rules)
    expect(after.hpMax.total - before.hpMax.total).toBe(3)
    const listen = after.skills.find((s) => s.def.id === 'listen')!
    expect(listen.total.parts.some((p) => p.sourceId.startsWith('familiar-alertness') && p.condition)).toBe(true)
  })
  it('familiar sheet: half the master’s hp, master’s BAB and base saves, natural armor and Int by master level', () => {
    const f = familiarAdvancement(5)!
    expect([f.advancement.naturalArmorAdj, f.int, f.sr]).toEqual([3, 8, 0])
    expect(familiarAdvancement(11)!.sr).toBe(16)
    const cat = computeCreature(rules.creatures.get('cat')!, {
      advancement: f.advancement,
      familiar: { int: f.int, masterHp: 27, masterBab: 2, masterLevel: 5, sr: 0 },
      masterBaseSaves: { fort: 1, ref: 1, will: 4 },
      maxHp: true,
    })
    expect(cat.hpMax.total).toBe(13)
    expect(cat.bab.total).toBe(2)
    expect(cat.abilities.int.score).toBe(8)
    expect(cat.saves.will.total - rules.creatures.get('cat')!.saves.will).toBe(4)
    expect(cat.effectHd).toBe(5)
  })
})

describe('bard', () => {
  it('inspire courage: +1 morale on attack and damage, +1 vs charm and fear; singing blocks spellcasting', () => {
    const c = make(['bard'])
    c.levels[0].skillRanks = { 'perform:sing': 4 }
    const s0 = compute(c, rules)
    expect(s0.classFeatures.bardicMusic!.perDay).toBe(1)
    expect(s0.classFeatures.bardicMusic!.songs.find((x) => x.id === 'inspire-courage')!.available).toBe(true)
    c.activeEffects.push({ uid: 'ic', kind: 'class', refId: 'inspire-courage', enabled: true })
    const s1 = compute(c, rules)
    expect(s1.flags).toContain('bardic-music')
    expect(s1.saves.will.parts.some((p) => p.sourceId.startsWith('song:inspire-courage') && p.condition)).toBe(true)
  })
  it('bardic knowledge: bard level + Int, +2 with 5 ranks of Knowledge (history)', () => {
    const c = make(times('bard', 3))
    expect(compute(c, rules).featureStats.find((f) => f.id === 'bardic-knowledge')!.stat.total).toBe(6)
    c.levels[0].skillRanks = { 'knowledge-history': 5 }
    expect(compute(c, rules).featureStats.find((f) => f.id === 'bardic-knowledge')!.stat.total).toBe(8)
  })
})

describe('prestige spellcasting levels', () => {
  it('Jade Phoenix Mage 2 adds a wizard spellcasting level (caster level, spells per day)', () => {
    const c = make([...times('wizard', 5), 'jade-phoenix-mage', 'jade-phoenix-mage'])
    const sc = compute(c, rules).spellcasting.find((x) => x.classId === 'wizard')!
    expect(sc.casterLevel.total).toBe(6)
    expect(sc.advanceLevels).toBe(1)
  })
})
