// Metamagic feats, Spell Mastery and Improved Familiar (rulings-classes.md C36–C38).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { familiarAdvancement, improvedFamiliarBlockers, improvedFamiliarCheck } from '../arcane'
import { compute } from '../compute'
import { computeCreature } from '../creature'
import { actualLevel, metamagicProblems, slotLevel } from '../metamagic'
import { masteryProblems, spellMasteryPicks } from '../spellLearning'
import { validate } from '../validate'

const make = (classes: string[], alignment = 'NG'): Character => {
  const c = newCharacter({ name: 'T', race: 'human', classId: classes[0], abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 16 }, lang: 'en', alignment })
  c.levels = classes.map((classId) => ({ classId, skillRanks: {}, feats: [] }))
  return c
}
const times = (id: string, n: number) => Array.from({ length: n }, () => id)
const sp = (id: string) => rules.spells.get(id)!
const opts = { owned: ['empower-spell', 'quicken-spell', 'silent-spell', 'still-spell', 'heighten-spell', 'extend-spell'], spontaneous: false, bard: false, maxLevel: 9 }
const illegal = (id: string, lvl: number, c: Parameters<typeof slotLevel>[1], o = opts) =>
  metamagicProblems(sp(id), lvl, c, o).filter((p) => p.kind === 'illegal')

describe('metamagic', () => {
  it('slot level: empowered magic missile in a 3rd-level slot; heightened to 5th and stilled: 6th, actual level 5', () => {
    expect(slotLevel(1, { metamagic: ['empower-spell'] })).toBe(3)
    const c = { metamagic: ['heighten-spell', 'still-spell'], heighten: 5 }
    expect(slotLevel(1, c)).toBe(6)
    expect(actualLevel(1, c)).toBe(5)
    expect(actualLevel(1, { metamagic: ['empower-spell'] })).toBe(1)
  })
  it('restrictions: no Quicken when spontaneous, no Silent on bard spells, feat known, same feat once', () => {
    expect(illegal('magic-missile', 1, { metamagic: ['quicken-spell'] })).toEqual([])
    expect(illegal('magic-missile', 1, { metamagic: ['quicken-spell'] }, { ...opts, spontaneous: true }).length).toBe(1)
    expect(illegal('cure-light-wounds', 1, { metamagic: ['silent-spell'] }, { ...opts, bard: true }).length).toBe(1)
    expect(illegal('magic-missile', 1, { metamagic: ['maximize-spell'] }).length).toBe(1)
    expect(illegal('magic-missile', 1, { metamagic: ['empower-spell', 'empower-spell'] }).length).toBe(1)
    // 1-round casting time: can be quickened; 10 minutes: can't.
    expect(illegal('summon-monster-i', 1, { metamagic: ['quicken-spell'] })).toEqual([])
    expect(illegal('identify', 1, { metamagic: ['quicken-spell'] }).length).toBe(1)
    // Extend on an instantaneous spell: legal, no effect.
    expect(metamagicProblems(sp('magic-missile'), 1, { metamagic: ['extend-spell'] }, opts).map((p) => p.kind)).toEqual(['noEffect'])
  })
  it('wizard: an empowered magic missile needs a 3rd-level slot (rule check)', () => {
    const c = make(times('wizard', 5))
    c.levels[0].feats = [{ featId: 'empower-spell', slot: 'general' }]
    c.levels[0].spellsLearned = ['magic-missile']
    c.spells = { wizard: { prepared: { 1: [{ id: 'magic-missile', cast: false, metamagic: ['empower-spell'] }] } } }
    const ids = () => validate(c, rules).map((w) => w.id)
    expect(ids()).toContain('prepared-metamagic-wizard-1-0-slot')
    c.spells.wizard.prepared = { 3: [{ id: 'magic-missile', cast: false, metamagic: ['empower-spell'] }] }
    expect(ids().filter((id) => id.startsWith('prepared-metamagic'))).toEqual([])
    // A feat the wizard doesn't have.
    c.spells.wizard.prepared = { 3: [{ id: 'magic-missile', cast: false, metamagic: ['widen-spell'] }] }
    expect(ids().some((id) => id.startsWith('prepared-metamagic-wizard-3-0-widen'))).toBe(true)
  })
})

describe('Spell Mastery', () => {
  it('as many spells as the Int modifier, from the spellbook', () => {
    const c = make(['wizard'])
    c.levels[0].feats = [{ featId: 'spell-mastery', slot: 'general', spells: ['magic-missile', 'shield', 'fireball'] }]
    c.levels[0].spellsLearned = ['magic-missile', 'shield', 'mage-armor', 'grease', 'sleep', 'color-spray']
    const [p] = spellMasteryPicks(c, rules)
    expect(p.allowed).toBe(3)
    // Fireball isn't in a 1st-level wizard's spellbook.
    expect(masteryProblems(c, rules, p).map((x) => x.kind)).toEqual(['illegal'])
    c.levels[0].feats[0].spells = ['magic-missile', 'shield', 'mage-armor', 'grease']
    expect(masteryProblems(c, rules, spellMasteryPicks(c, rules)[0]).map((x) => x.kind)).toEqual(['extra'])
  })
  it('without the spellbook: only read magic and mastered spells', () => {
    const c = make(['wizard'])
    c.levels[0].feats = [{ featId: 'spell-mastery', slot: 'general', spells: ['magic-missile'] }]
    c.levels[0].spellsLearned = ['magic-missile', 'shield', 'mage-armor', 'grease', 'sleep', 'color-spray']
    c.spells = { wizard: { withoutBook: true, prepared: { 0: [{ id: 'read-magic', cast: false }], 1: [{ id: 'magic-missile', cast: false }, { id: 'shield', cast: false }] } } }
    const ids = validate(c, rules).map((w) => w.id).filter((id) => id.startsWith('prepared-without-book'))
    expect(ids).toEqual(['prepared-without-book-shield'])
  })
})

describe('Improved Familiar', () => {
  it('arcane spellcaster level and alignment within one step', () => {
    expect(improvedFamiliarBlockers('pseudodragon', { hasFeat: true, arcaneLevel: 7, alignment: 'NG' })).toEqual([])
    expect(improvedFamiliarBlockers('pseudodragon', { hasFeat: true, arcaneLevel: 7, alignment: 'CN' })).toEqual([])
    expect(improvedFamiliarBlockers('pseudodragon', { hasFeat: true, arcaneLevel: 6, alignment: 'NG' }).length).toBe(1)
    expect(improvedFamiliarBlockers('imp', { hasFeat: true, arcaneLevel: 7, alignment: 'NG' }).length).toBe(1)
    expect(improvedFamiliarBlockers('imp', { hasFeat: false, arcaneLevel: 7, alignment: 'LN' }).length).toBe(1)
    expect(improvedFamiliarBlockers('stirge', { hasFeat: true, arcaneLevel: 5, alignment: 'CE' })).toEqual([])
  })
  it('type/subtype table (house rule #38): level checked, subtype left to the DM', () => {
    const fire = improvedFamiliarCheck('elemental-small-fire', { hasFeat: true, arcaneLevel: 5, alignment: 'LG' })
    expect(fire.blockers).toEqual([])
    expect(fire.check?.en).toMatch(/Fire/)
    expect(improvedFamiliarBlockers('mephit-ice', { hasFeat: true, arcaneLevel: 6, alignment: 'N' }).length).toBe(1)
    // Celestial hawk from arcane level 3; a shocker lizard for a lawful good master (alignment table fails, subtype one stands).
    expect(improvedFamiliarCheck('hawk', { hasFeat: true, arcaneLevel: 3, alignment: 'CE', template: 'celestial' }).blockers).toEqual([])
    expect(improvedFamiliarBlockers('shocker-lizard', { hasFeat: true, arcaneLevel: 5, alignment: 'LG' })).toEqual([])
  })
  it('pseudodragon: keeps its type, Alertness for the master, no speech with animals; rule check', () => {
    const c = make(times('wizard', 7))
    c.levels[5].feats = [{ featId: 'improved-familiar', slot: 'general' }]
    c.companions = [{ uid: 'f', creatureId: 'pseudodragon', kind: 'familiar', maxHp: true, damage: 0 }]
    const s = compute(c, rules)
    expect(s.skills.find((x) => x.def.id === 'spot')!.total.parts.some((p) => p.sourceId.startsWith('familiar-alertness'))).toBe(true)
    expect(validate(c, rules).some((w) => w.area === 'companions')).toBe(false)
    const f = familiarAdvancement(7, true)!
    expect(f.advancement.special.some((x) => x.id === 'speak-with-animals')).toBe(false)
    const sheet = computeCreature(rules.creatures.get('pseudodragon')!, {
      advancement: f.advancement,
      familiar: { int: f.int, masterHp: 40, masterBab: 3, masterLevel: 7, sr: 0, improved: true },
      maxHp: true,
    })
    expect(sheet.typeText.en).not.toMatch(/magical beast for effects/)
    expect(sheet.hpMax.total).toBe(20)
    c.identity.alignment = 'LE'
    expect(validate(c, rules).map((w) => w.id)).toContain('familiar-improved-f')
  })
})

describe('house rule #40: no metamagic in a slot the key ability is too low for', () => {
  it('flags it', () => {
    const c = make(times('wizard', 5))
    c.baseAbilities.int = 12 // 2nd-level spells at most: 3rd-level slots are blocked
    c.levels[0].feats = [{ featId: 'empower-spell', slot: 'general' }]
    c.levels[0].spellsLearned = ['magic-missile']
    c.spells = { wizard: { prepared: { 3: [{ id: 'magic-missile', cast: false, metamagic: ['empower-spell'] }] } } }
    expect(validate(c, rules).map((w) => w.id)).toContain('prepared-metamagic-wizard-3-0-blocked')
  })
})
