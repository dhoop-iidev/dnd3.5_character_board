// Fixes from the um_actually reviews of 2026-10-17 (docs/reviews/um_actually-2026-10-17-*.md).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { storedSpellUse } from '../spellItems'
import { compute } from '../compute'
import { computeCreature } from '../creature'
import { arcaneSpellcasterLevel, familiarAdvancement, knownCaps } from '../arcane'
import { spellLearning } from '../spellLearning'
import { hpState, takeDamage } from '../hitPoints'
import { metamagicProblems } from '../metamagic'
import { validate } from '../validate'
import fenrirJson from './fixtures/chikibidouille.json'

const fenrir = fenrirJson as unknown as Character
const clone = (): Character => structuredClone(fenrir)
const make = (classes: string[], abilities = { str: 10, dex: 14, con: 12, int: 16, wis: 14, cha: 16 }): Character => {
  const c = newCharacter({ name: 'T', race: 'human', classId: classes[0], abilities, lang: 'en', alignment: 'N' })
  c.levels = classes.map((classId) => ({ classId, skillRanks: {}, feats: [] }))
  return c
}

describe('combat core', () => {
  it('Toughness taken twice: +6 hp', () => {
    const c = clone()
    const before = compute(c, rules).hpMax.total
    c.levels[5].feats.push({ featId: 'toughness', slot: 'general' })
    c.levels[8].feats.push({ featId: 'toughness', slot: 'general' })
    expect(compute(c, rules).hpMax.total - before).toBe(6)
  })
  it('two negative levels: −10 hp, −2 attack and saves', () => {
    const c = clone()
    const before = compute(c, rules)
    c.activeEffects.push({ uid: 'd', kind: 'condition', refId: 'energy-drained', enabled: true, count: 2 })
    const after = compute(c, rules)
    expect(before.hpMax.total - after.hpMax.total).toBe(10)
    expect(before.saves.fort.total - after.saves.fort.total).toBe(2)
  })
  it('the flat-footed toggle also means no attacks of opportunity', () => {
    const c = make(['fighter'])
    c.toggles.situational = { flatFooted: true }
    expect(compute(c, rules).flags).toContain('noAoO')
  })
})

describe('hit points', () => {
  it('0 hp with nonlethal damage: unconscious; temporary hp count; stable', () => {
    expect(hpState(20, { damage: 20, nonlethal: 1, temp: 0 }).kind).toBe('unconscious')
    expect(hpState(20, { damage: 20, nonlethal: 0, temp: 8 }).kind).toBe('ok')
    expect(hpState(20, { damage: 23, nonlethal: 0, temp: 0 }, { stable: true }).kind).toBe('stable')
  })
  it('temporary hp: first-in, first-out (FAQ)', () => {
    const hp = { damage: 0, nonlethal: 0, temp: 12 }
    const song = { uid: 's', kind: 'class' as const, refId: 'inspire-greatness', enabled: true, tempHp: 12 }
    takeDamage(hp, 10, [song])
    expect(song.tempHp).toBe(2)
    hp.temp += 8 // false life, typed in
    // The song ends: only what is left of its own temporary hp goes.
    hp.temp -= song.tempHp
    expect(hp.temp).toBe(8)
  })
})

describe('arcane', () => {
  it('Spell Focus (evocation) raises evocation save DCs only', () => {
    const c = make(['wizard'])
    c.levels[0].feats = [{ featId: 'spell-focus', slot: 'general', choice: 'evocation' }]
    const sc = compute(c, rules).spellcasting[0]
    expect(sc.dc(1, 'evocation') - sc.dc(1, 'illusion')).toBe(1)
  })
  it('a specialist can’t use a scroll of a prohibited school without Use Magic Device', () => {
    const c = make(['wizard'])
    c.levels[0].classChoices = { school: 'evocation', prohibited1: 'enchantment', prohibited2: 'illusion' }
    const scroll = { uid: 'sc', kind: 'gear' as const, refId: 'scroll', quantity: 1, location: 'carried' as const, spellItem: 'scroll' as const, spells: [{ spellId: 'color-spray', level: 1, casterLevel: 1, activation: 'completion', uses: 'single' }] }
    c.inventory.push(scroll as never)
    expect(storedSpellUse(scroll as never, scroll.spells[0] as never, compute(c, rules), rules).usable).toBe(false)
  })
  it('Combat Casting: +4 Concentration when casting defensively (situational)', () => {
    const c = make(['wizard'])
    c.levels[0].feats = [{ featId: 'combat-casting', slot: 'general' }]
    const conc = compute(c, rules).skills.find((s) => s.def.id === 'concentration')!
    expect(conc.total.parts.some((p) => p.sourceId.startsWith('feat:combat-casting') && p.value === 4 && p.condition)).toBe(true)
  })
  it('Widen Spell works on clouds (fog cloud spreads)', () => {
    const opts = { owned: ['widen-spell'], spontaneous: false, bard: false, maxLevel: 9 }
    expect(metamagicProblems(rules.spells.get('fog-cloud')!, 2, { metamagic: ['widen-spell'] }, opts)).toEqual([])
  })
  it('familiar spell resistance overlaps the creature’s own (pseudodragon SR 19)', () => {
    const f = familiarAdvancement(11, true)!
    const sheet = computeCreature(rules.creatures.get('pseudodragon')!, {
      advancement: f.advancement,
      familiar: { int: f.int, masterHp: 50, masterBab: 5, masterLevel: 11, sr: f.sr, improved: true },
    })
    expect(sheet.spellResistance).toBe(19)
  })
  it('Improved Familiar needs the ability to acquire a familiar', () => {
    const c = make(['fighter'])
    c.levels[0].feats = [{ featId: 'improved-familiar', slot: 'general' }]
    expect(validate(c, rules).map((w) => w.id)).toContain('improved-familiar-no-familiar')
  })
})

describe('classes', () => {
  it('a druid in metal armor is flagged', () => {
    const c = make(['druid'])
    c.inventory.push({ uid: 'bp', kind: 'armor', refId: 'breastplate', location: 'worn', quantity: 1 })
    expect(validate(c, rules).map((w) => w.id)).toContain('druid-metal-bp')
  })
  it('wild shape doesn’t leak into the build checks', () => {
    const c = make(times('druid', 5), { str: 10, dex: 13, con: 12, int: 10, wis: 16, cha: 10 })
    c.levels[0].feats = [{ featId: 'dodge', slot: 'general' }]
    c.wildShape = { creatureId: 'rhinoceros', rounds: 50, keepItems: [] }
    // Only the informative "unusable while in this form", not a build error.
    expect(validate(c, rules).filter((w) => w.actionable && /dodge/i.test(w.message.en))).toEqual([])
  })
})

function times(id: string, n: number) {
  return Array.from({ length: n }, () => id)
}

describe('house rules #41 and #42', () => {
  it('#41: a sorcerer whose Charisma reaches 12 at level 8 learns all the 2nd-level spells known at once', () => {
    const c = make(times('sorcerer', 8), { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 })
    c.levels[3].abilityIncrease = 'cha'
    c.levels[7].abilityIncrease = 'cha'
    const x = spellLearning(c, rules, 8)!
    expect(x.castable).toContain(2)
    expect(x.newByLevel![2]).toBe(knownCaps(rules, 'sorcerer', 8)[2])
    // Level 7 (Cha 11): no 2nd-level spell yet.
    expect(spellLearning(c, rules, 7)!.newByLevel![2]).toBeUndefined()
  })
  it('#42: arcane spellcaster level = the highest single arcane class level (sorcerer 3 / wizard 4 = 4)', () => {
    const c = make([...times('sorcerer', 3), ...times('wizard', 4)])
    expect(arcaneSpellcasterLevel(compute(c, rules).classLevels, rules)).toBe(4)
  })
})
