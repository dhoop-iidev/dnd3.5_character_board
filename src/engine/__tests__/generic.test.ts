// Generic character model: new characters, two-weapon fighting, races, ranger (SRD 3.5).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character, ItemInstance } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { validate } from '../validate'
import { choicesAt } from '../classChoices'

const ABIL = { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 10 }
const fresh = (race = 'human', classId = 'fighter', abilities = ABIL) => newCharacter({ name: 'Test', race, classId, abilities, lang: 'en' })
const weapon = (uid: string, refId: string): ItemInstance => ({ uid, kind: 'weapon', refId, quantity: 1, location: 'worn' })
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

describe('um_actually 2026-10-15 (races & classes) fixes', () => {
  const ids = (c: Character) => validate(c, rules).map((w) => w.id)
  const levels = (c: Character, classId: string, n: number) => {
    c.levels = Array.from({ length: n }, () => ({ classId, skillRanks: {}, feats: [] }))
    return c
  }
  it('racial weapon proficiency counts everywhere (elf wizard: longsword, Weapon Focus)', () => {
    const c = levels(fresh('elf', 'wizard'), 'wizard', 3)
    c.inventory = [weapon('ls', 'longsword')]
    wield(c, ['ls'])
    c.levels[2].feats = [{ featId: 'weapon-focus', slot: 'general', choice: 'longsword' }]
    expect(ids(c)).not.toContain('weapon-prof-ls')
    expect(ids(c).some((i) => i.startsWith('prereq-weapon-focus'))).toBe(false)
  })
  it('Exotic Weapon Proficiency removes the −4', () => {
    const c = fresh()
    c.inventory = [weapon('sc', 'spiked-chain')]
    wield(c, ['sc'])
    c.levels[0].feats = [{ featId: 'exotic-weapon-proficiency', slot: 'general', choice: 'spiked-chain' }]
    expect(atk(c, 'sc').attack.parts.some((p) => p.sourceId === 'nonproficient-weapon')).toBe(false)
  })
  it('wizard bonus feat at 5th; monk bonus feats at 1st ignore prerequisites', () => {
    const wiz = levels(fresh('human', 'wizard'), 'wizard', 5)
    wiz.levels[4].feats = [{ featId: 'craft-wand', slot: 'class' }]
    expect(ids(wiz).filter((i) => i.includes('-class-'))).toEqual([])
    const monk = fresh('human', 'monk')
    monk.levels[0].feats = [{ featId: 'stunning-fist', slot: 'class' }]
    expect(ids(monk).some((i) => i.startsWith('prereq-stunning-fist') || i.startsWith('feat-not-class'))).toBe(false)
  })
  it('paladin divine grace, barbarian fast movement, monk AC bonus and fast movement', () => {
    const pal = levels(fresh('human', 'paladin', { ...ABIL, cha: 16 }), 'paladin', 2)
    expect(compute(pal, rules).saves.will.total).toBe(0 + 1 + 3) // base 0, Wis +1, Cha +3
    expect(compute(fresh('human', 'barbarian'), rules).speed.current.ft).toBe(40)
    const monk = levels(fresh('human', 'monk', { ...ABIL, wis: 16 }), 'monk', 3)
    const s = compute(monk, rules)
    expect(s.ac.total).toBe(10 + 2 + 3) // Dex +2, Wis +3
    expect(s.speed.current.ft).toBe(40)
  })
  it('cleric domain slot: cleric 1, Wis 12 → three 1st-level spells', () => {
    const sc = compute(fresh('human', 'cleric'), rules).spellcasting[0]
    expect(sc.slots.find((x) => x.spellLevel === 1)).toMatchObject({ base: 1, bonus: 1, extra: 1, total: 3 })
  })
  it('a low Wisdom keeps the slots (for lower-level spells)', () => {
    const c = levels(fresh('human', 'ranger', { ...ABIL, wis: 11 }), 'ranger', 10)
    const slot = compute(c, rules).spellcasting[0].slots.find((x) => x.spellLevel === 2)!
    expect(slot).toMatchObject({ blocked: true, bonus: 0, total: 1 })
  })
  it('half-orc Int is at least 3', () => {
    expect(compute(fresh('half-orc', 'barbarian', { ...ABIL, int: 3 }), rules).abilities.int.score.total).toBe(3)
  })
  it('granted feats meet prerequisites: ranger 3 with Endurance can take Diehard', () => {
    const c = levels(fresh('human', 'ranger'), 'ranger', 3)
    c.levels[2].feats = [{ featId: 'diehard', slot: 'general' }]
    expect(ids(c).some((i) => i.startsWith('prereq-diehard'))).toBe(false)
  })
  it('favored enemy choices left on a non-ranger level are ignored', () => {
    const c = fresh('human', 'ranger')
    c.levels = [
      { classId: 'ranger', skillRanks: {}, feats: [], classChoices: { favoredEnemy: 'animal' } },
      { classId: 'fighter', skillRanks: {}, feats: [], classChoices: { favoredEnemy: 'undead', favoredEnemyIncrease: 'animal' } },
    ]
    expect(compute(c, rules).favoredEnemies.map((f) => [f.id, f.bonus])).toEqual([['animal', 2]])
  })
  it('halfling +1 with slings; wild empathy +2 with 5 ranks of Handle Animal', () => {
    const h = fresh('halfling', 'fighter')
    h.inventory = [weapon('sl', 'sling')]
    wield(h, ['sl'])
    expect(atk(h, 'sl').attack.parts.some((p) => p.sourceId.startsWith('race:halfling') && p.value === 1)).toBe(true)
    const r = fresh('human', 'ranger')
    r.levels[0].skillRanks = { 'handle-animal': 5 }
    expect(compute(r, rules).featureStats[0].stat.total).toBe(1 + 0 + 2)
  })
})

describe('rulings 2026-10-16 (docs/rules/rulings-classes.md)', () => {
  const ids = (c: Character) => validate(c, rules).map((w) => w.id)
  it('C1: druid/ranger wild empathy uses the better class level, not the sum', () => {
    const c = fresh('human', 'druid')
    c.levels = [
      { classId: 'druid', skillRanks: {}, feats: [] },
      { classId: 'druid', skillRanks: {}, feats: [] },
      { classId: 'ranger', skillRanks: {}, feats: [], classChoices: { favoredEnemy: 'animal' } },
    ]
    expect(compute(c, rules).featureStats[0].stat.total).toBe(2) // druid 2, Cha +0
  })
  it('C2: Two-Weapon Defense from the combat style is legal, but unusable in medium armor', () => {
    const c = fresh('human', 'ranger', { ...ABIL, dex: 15 })
    c.levels = [
      { classId: 'ranger', skillRanks: {}, feats: [], classChoices: { favoredEnemy: 'animal' } },
      { classId: 'ranger', skillRanks: {}, feats: [], classChoices: { combatStyle: 'two-weapon' } },
      { classId: 'ranger', skillRanks: {}, feats: [{ featId: 'two-weapon-defense', slot: 'general' }] },
    ]
    c.inventory = [{ uid: 'arm', kind: 'armor', refId: 'chain-shirt', quantity: 1, location: 'worn' }]
    expect(compute(c, rules).feats.some((f) => f.featId === 'two-weapon-defense')).toBe(true)
    c.inventory = [{ uid: 'arm', kind: 'armor', refId: 'breastplate', quantity: 1, location: 'worn' }]
    const s = compute(c, rules)
    expect(s.feats.some((f) => f.featId === 'two-weapon-defense')).toBe(false)
    expect(ids(c).some((i) => i.startsWith('prereq-two-weapon-defense'))).toBe(false)
    expect(ids(c)).toContain('unusable-two-weapon-defense')
  })
})

describe('cleric turning (https://www.d20srd.org/srd/combat/specialAttacks.htm#turnOrRebukeUndead)', () => {
  it('cleric 3, Cha 14: 3 + 2 uses, check 1d20 + 2, damage 2d6 + 3 + 2, table around level 3', () => {
    const c = fresh('human', 'cleric', { ...ABIL, cha: 14 })
    c.levels = [1, 2, 3].map(() => ({ classId: 'cleric', skillRanks: {}, feats: [] }))
    const t = compute(c, rules).turning!
    expect([t.usesPerDay.total, t.check.total, t.damage.total, t.level]).toEqual([5, 2, 5, 3])
    expect(t.table[0].hd).toBe(-1)
    expect(t.table[4].hd).toBe(3)
    expect(t.mode).toBe('turn')
  })
  it('cleric 2 / paladin 5: turning level 2 + (5 − 3) = 4 (multiclass rule)', () => {
    const c = fresh('human', 'cleric')
    c.levels = [...[1, 2].map(() => ({ classId: 'cleric', skillRanks: {}, feats: [] })), ...[1, 2, 3, 4, 5].map(() => ({ classId: 'paladin', skillRanks: {}, feats: [] }))]
    expect(compute(c, rules).turning!.level).toBe(4)
  })
  it('negative energy: rebuke', () => {
    const c = fresh('human', 'cleric')
    c.levels[0].classChoices = { channel: 'negative' }
    expect(compute(c, rules).turning!.mode).toBe('rebuke')
  })
})

describe('cleric domains (https://www.d20srd.org/srd/spellLists/clericDomains.htm)', () => {
  const cleric = (d1: string, d2: string, extra: Record<string, string> = {}) => {
    const c = fresh('human', 'cleric', { ...ABIL, wis: 14 })
    c.levels[0].classChoices = { domain1: d1, domain2: d2, channel: 'positive', ...extra }
    return c
  }
  it('22 domains; Knowledge makes every Knowledge skill a class skill', () => {
    expect(rules.domains.size).toBe(22)
    const s = compute(cleric('knowledge', 'good'), rules)
    expect(s.skills.find((k) => k.key === 'knowledge-arcana')!.classSkill).toBe(true)
  })
  it('War: Weapon Focus and Martial Weapon Proficiency with the deity’s weapon', () => {
    const s = compute(cleric('war', 'good', { deityWeapon: 'longsword' }), rules)
    expect(s.feats.some((f) => f.featId === 'weapon-focus' && f.choice === 'longsword')).toBe(true)
    expect(s.proficiency.weapons.has('longsword')).toBe(true)
  })
  it('domain spell levels and the rule checks accept two different domains', () => {
    expect(rules.spells.get('entangle')!.level['domain:plant']).toBe(1)
    const ids = validate(cleric('war', 'good', { deityWeapon: 'longsword' }), rules).map((w) => w.id)
    expect(ids.filter((i) => i.startsWith('choice-'))).toEqual([])
  })
  it('a good cleric channelling negative energy is flagged', () => {
    const c = cleric('war', 'good', { channel: 'negative', deityWeapon: 'longsword' })
    c.identity.alignment = 'NG'
    expect(validate(c, rules).map((w) => w.id)).toContain('cleric-energy-alignment')
  })
})

describe('Summon Monster templates (https://www.d20srd.org/srd/monsters/celestialCreature.htm)', () => {
  it('celestial dire wolf (6 HD): DR 5/magic, SR 11', async () => {
    const { computeCreature } = await import('../creature')
    const s = computeCreature(rules.creatures.get('dire-wolf')!, { template: rules.templates.get('celestial') })
    expect(s.template?.dr).toBe('5/magic')
    expect(s.template?.sr).toBe(11)
  })
  it('Summon Monster I–IX lists exist and their template creatures exist', () => {
    const sm = rules.summonLists.filter((l) => l.spellId.startsWith('summon-monster-'))
    expect(sm).toHaveLength(9)
    for (const l of sm) for (const id of Object.keys(l.templates ?? {})) expect(rules.creatures.has(id)).toBe(true)
  })
})

// Regression (um_actually 2026-10-17 classes M1): the cleric's and swordsage's class choices must stay offered.
describe('class choices offered at 1st level', () => {
  const at1 = (classId: string) => {
    const c = newCharacter({ name: 'T', race: 'human', classId, abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 }, lang: 'en', alignment: 'N' })
    c.levels = [{ classId, skillRanks: {}, feats: [] }]
    return c
  }
  it('cleric: two domains and the energy; missing ones are flagged', () => {
    const c = at1('cleric')
    expect(choicesAt(c, rules, 1).map((x) => x.key)).toEqual(['domain1', 'domain2', 'channel'])
    const ids = validate(c, rules).map((w) => w.id)
    expect(ids).toContain('choice-missing-domain1-1')
    expect(ids).toContain('choice-missing-channel-1')
  })
  it('swordsage: discipline focus', () => {
    expect(choicesAt(at1('swordsage'), rules, 1).map((x) => x.key)).toEqual(['disciplineFocus'])
  })
})

describe('item locations (worn / carried / stored)', () => {
  it('only worn weapons and shields can be in hand', () => {
    const c = wield(fresh(), ['ls'])
    c.inventory = [weapon('ls', 'longsword'), { uid: 'sh', kind: 'armor', refId: 'heavy-steel-shield', quantity: 1, location: 'worn' }]
    c.loadouts[0].shield = 'sh'
    expect(atk(c, 'ls')).toBeDefined()
    expect(compute(c, rules).ac.total).toBe(14) // 10 + Dex 2 + shield 2
    c.inventory = c.inventory.map((i) => ({ ...i, location: 'carried' as const })) // in the backpack
    expect(compute(c, rules).attacks.find((a) => a.itemUid === 'ls')).toBeUndefined()
    expect(compute(c, rules).ac.total).toBe(12)
  })

  it("a sheathed custom weapon's bonuses apply only in hand", () => {
    const blade: ItemInstance = {
      ...weapon('bl', 'longsword'),
      custom: { weightLb: 4, costGp: 0, text: { en: '', fr: '' }, modifiers: [{ target: 'save.will', bonusType: 'luck', value: 1 }] },
    }
    const c = wield(fresh(), [])
    c.inventory = [blade]
    const will = compute(c, rules).saves.will.total
    expect(compute(wield(c, ['bl']), rules).saves.will.total).toBe(will + 1)
  })
})
