// One test per finding of docs/reviews/um_actually-2026-10-16-full.md (inputs are the reviewers' repros).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import fixture from './fixtures/chikibidouille.json'
import type { ActiveEffect, Character, ItemInstance } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { parseAlignment } from '../alignment'
import { compute } from '../compute'
import { companionAdvancement, computeCreature } from '../creature'
import { validate } from '../validate'

const chiki = fixture as unknown as Character
const cond = (...ids: string[]): ActiveEffect[] => ids.map((id, i) => ({ uid: `c${i}`, kind: 'condition', refId: id, enabled: true }))
const ABIL = { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 14 }
const fresh = (classId: string, n = 1, abilities = ABIL, race = 'human') => {
  const c = newCharacter({ name: 'Test', race, classId, abilities, lang: 'en' })
  c.levels = Array.from({ length: n }, (_, i) => ({ ...(c.levels[0] ?? {}), classId, skillRanks: {}, feats: [], ...(i ? { classChoices: undefined } : {}) }))
  return c
}
const ids = (c: Character) => validate(c, rules).map((w) => w.id)
const weapon = (uid: string, refId: string, extra: Partial<ItemInstance> = {}): ItemInstance => ({ uid, kind: 'weapon', refId, quantity: 1, location: 'carried', ...extra })

describe('M1 ki damage includes damage bonuses from effects', () => {
  it('+1 morale damage: greatsword 2d6+9, ki 21', () => {
    const c: Character = {
      ...chiki,
      activeEffects: [{ uid: 'm', kind: 'custom', enabled: true, custom: { name: { en: 'Morale', fr: 'Moral' }, modifiers: [{ target: 'damage.all', bonusType: 'morale', value: 1 }] } }],
    }
    const gs = compute(c, rules).attacks.find((a) => a.itemUid === 'greatsword')!
    expect(gs.damage.total).toBe(9)
    expect(gs.kiDamageMax).toBe(21)
  })
  it('Power Attack is not maximized', () => {
    const gs = compute({ ...chiki, toggles: { ...chiki.toggles, powerAttack: 3 } }, rules).attacks.find((a) => a.itemUid === 'greatsword')!
    expect(gs.damage.total).toBe(8 + 6)
    expect(gs.kiDamageMax).toBe(20)
  })
})

describe('M2 Combat Reflexes: attacks of opportunity while flat-footed', () => {
  it('the flat-footed condition no longer says "no attacks of opportunity"', () => {
    const c = { ...chiki, activeEffects: cond('flat-footed') }
    const hasCr = compute(c, rules).feats.some((f) => f.featId === 'combat-reflexes')
    expect(compute(c, rules).flags.includes('noAoO')).toBe(!hasCr)
  })
  it('without the feat, still none', () => {
    const c = fresh('fighter')
    c.activeEffects = cond('flat-footed')
    expect(compute(c, rules).flags).toContain('noAoO')
  })
})

describe('M3 uncanny dodge', () => {
  it('barbarian 2, Dex 14: the flat-footed condition keeps the Dex bonus (AC 12)', () => {
    const c = fresh('barbarian', 2)
    c.activeEffects = cond('flat-footed')
    expect(compute(c, rules).ac.total).toBe(12)
  })
  it('dodge bonuses kept with uncanny dodge', () => {
    const c = fresh('barbarian', 2)
    c.levels[0].feats = [{ featId: 'dodge', slot: 'general' }]
    const before = compute(c, rules).ac.total
    c.activeEffects = cond('flat-footed')
    expect(compute(c, rules).ac.total).toBe(before)
  })
  it('stunned still loses Dex', () => {
    const c = fresh('barbarian', 2)
    c.activeEffects = cond('stunned')
    expect(compute(c, rules).ac.total).toBeLessThan(12)
  })
})

describe('M4 Improved Turning', () => {
  it('cleric 1 with the feat: turning level 2, damage 2d6 + 1 + 1 + Cha', () => {
    const c = fresh('cleric')
    c.levels[0].feats = [{ featId: 'improved-turning', slot: 'general' }]
    const t = compute(c, rules).turning!
    expect(t.level).toBe(2)
    expect(t.damage.total).toBe(1 + 1 + 2)
  })
})

describe('M5 alignment domains and opposed spells', () => {
  it('an LG cleric with Evil and Chaos is flagged twice', () => {
    const c = fresh('cleric')
    c.identity.alignment = 'Lawful Good'
    c.levels[0].classChoices = { domain1: 'evil', domain2: 'chaos', channel: 'positive' }
    const w = ids(c)
    expect(w).toContain('cleric-domain-alignment-evil')
    expect(w).toContain('cleric-domain-alignment-chaos')
  })
  it('spelled-out alignments are understood', () => {
    expect(parseAlignment('Loyal bon')).toEqual({ order: 'lawful', moral: 'good' })
    expect(parseAlignment('Neutral Evil')).toEqual({ order: 'neutral', moral: 'evil' })
    expect(parseAlignment('N')).toEqual({ order: 'neutral', moral: 'neutral' })
    expect(parseAlignment('CM')).toEqual({ order: 'chaotic', moral: 'evil' })
    const c = fresh('cleric')
    c.identity.alignment = 'Lawful Good'
    c.levels[0].classChoices = { domain1: 'war', domain2: 'good', channel: 'negative', deityWeapon: 'longsword' }
    expect(ids(c)).toContain('cleric-energy-alignment')
  })
  it('a good cleric preparing an evil spell is flagged', () => {
    const c = fresh('cleric', 3)
    c.identity.alignment = 'NG'
    c.levels[0].classChoices = { domain1: 'war', domain2: 'good', channel: 'positive', deityWeapon: 'longsword' }
    const evil = [...rules.spells.values()].find((s) => s.descriptors?.includes('evil') && s.level['cleric'] === 1)!
    c.spells = { cleric: { prepared: { 1: [{ id: evil.id, cast: false }] } } } as Character['spells']
    expect(ids(c)).toContain(`cleric-opposed-spell-${evil.id}`)
  })
})

describe('M7 a creature’s Str penalty applies in full', () => {
  it('owl companion at druid 6: talons 1d4−2', () => {
    const owl = rules.creatures.get('owl')!
    const s = computeCreature(owl, { advancement: companionAdvancement(rules, 6) })
    expect(s.attacks[0].damage).toBe('1d4-2')
  })
})

describe('M8 companion Multiattack', () => {
  it('druid 9 wolf: second bite at −5; heavy horse hooves keep −5', () => {
    const adv = companionAdvancement(rules, 9)
    const w = computeCreature(rules.creatures.get('wolf')!, { advancement: adv })
    expect(w.attacks[0].iterative).toEqual([w.attacks[0].bonus.total - 5])
    const h = computeCreature(rules.creatures.get('horse-heavy')!, { advancement: adv })
    expect(h.attacks.every((a) => !a.bonus.parts?.some((p) => p.sourceId === 'multiattack'))).toBe(true)
  })
})

describe('M9 companion bonus HD entitlements', () => {
  it('wolf at druid 9 (8 HD): 2 feats, 1 ability increase', () => {
    const s = computeCreature(rules.creatures.get('wolf')!, { advancement: companionAdvancement(rules, 9) })
    expect(s.hitDice).toBe(8)
    expect(s.bonusHdGains).toMatchObject({ feats: 2, abilityIncreases: 2 })
  })
})

describe('M11/M12 elemental wild shape', () => {
  const druid16 = () => {
    const c = fresh('druid', 16)
    c.wildShape = { creatureId: 'elemental-large-air', rounds: 100, keepItems: [], elemental: true }
    return c
  }
  it('the elemental’s feats: Weapon Finesse and Improved Initiative', () => {
    const s = compute(druid16(), rules)
    expect(s.feats.some((f) => f.featId === 'improved-initiative')).toBe(true)
    expect(s.initiative.total).toBe(7 + 4)
    const slam = s.attacks[0]
    expect(slam.attack.parts.some((p) => p.sourceId === 'ability:dex')).toBe(true)
  })
})

describe('M10 Combat Expertise on natural attacks', () => {
  it('druid in wolf form, Combat Expertise 2: bite −2', () => {
    const c = fresh('druid', 5, { ...ABIL, int: 13 })
    c.levels[0].feats = [{ featId: 'combat-expertise', slot: 'general' }]
    c.wildShape = { creatureId: 'wolf', rounds: 100, keepItems: [] }
    const before = compute(c, rules).attacks[0].attack.total
    c.toggles = { ...c.toggles, combatExpertise: 2 }
    expect(compute(c, rules).attacks[0].attack.total).toBe(before - 2)
  })
})

describe('minor fixes', () => {
  it('bane: greatsword +2 bane gets +4 vs the foe', () => {
    const c: Character = { ...chiki, inventory: chiki.inventory.map((i) => (i.uid === 'greatsword' ? { ...i, properties: ['bane'] } : i)) }
    const plain = compute(chiki, rules).attacks.find((a) => a.itemUid === 'greatsword')!.attack.total
    const key = `prop:bane|greatsword`
    const s = compute({ ...c, toggles: { ...c.toggles, situational: { ...c.toggles.situational, [key]: true } } }, rules)
    expect(s.attacks.find((a) => a.itemUid === 'greatsword')!.attack.total).toBe(plain + 2)
  })
  it('Combat Expertise not added to total defense', () => {
    const c = fresh('fighter', 1, { ...ABIL, int: 13 })
    c.levels[0].feats = [{ featId: 'combat-expertise', slot: 'general' }]
    c.toggles = { ...c.toggles, totalDefense: true }
    const ac = compute(c, rules).ac.total
    c.toggles = { ...c.toggles, combatExpertise: 1 }
    expect(compute(c, rules).ac.total).toBe(ac)
  })
  it('bastard sword two-handed is a martial weapon', () => {
    const c = fresh('fighter')
    c.inventory = [weapon('b', 'bastard-sword')]
    c.loadouts[0].weapons = ['b']
    expect(compute(c, rules).attacks[0].proficient).toBe(false)
    c.loadouts[0].twoHanded = ['b']
    expect(compute(c, rules).attacks[0].proficient).toBe(true)
    expect(ids(c).some((i) => i.startsWith('weapon-prof'))).toBe(false)
  })
  it('two-handed weapon with a heavy shield is flagged', () => {
    const c = fresh('fighter')
    c.inventory = [weapon('g', 'greatsword'), { uid: 's', kind: 'armor', refId: 'heavy-steel-shield', quantity: 1, location: 'carried' }]
    c.loadouts[0].weapons = ['g']
    c.loadouts[0].shield = 's'
    expect(ids(c)).toContain('two-hands-shield')
  })
  it('unconscious: helpless −4 AC vs melee (situational)', () => {
    const c = fresh('fighter')
    c.activeEffects = cond('unconscious')
    expect(compute(c, rules).ac.parts.some((p) => p.sourceId.startsWith('condition:helpless') && p.value === -4)).toBe(true)
  })
  it('minimum 1 hp per level with a negative Con', () => {
    const c = fresh('wizard', 3, { ...ABIL, con: 3 })
    c.levels.forEach((l) => (l.hpRoll = 1))
    c.settings = { ...c.settings, maxHitDice: false }
    // d4 max − 4, then 1 − 4 twice: each level still gives 1 hp.
    expect(compute(c, rules).hpMax.total).toBe(3)
  })
  it('Weapon Master entry accepts an adamantine weapon', () => {
    const c: Character = {
      ...chiki,
      inventory: chiki.inventory.map((i) => (i.uid === 'greatsword' ? { ...i, enhancement: 0, masterwork: false, material: 'adamantine' } : i)),
    }
    expect(ids(c)).not.toContain('prestige-weapon-master')
  })
  it('a stored weapon doesn’t attack', () => {
    const c: Character = { ...chiki, inventory: chiki.inventory.map((i) => (i.uid === 'longbow' ? { ...i, location: 'stored' } : i)) }
    expect(compute(c, rules).attacks.some((a) => a.itemUid === 'longbow')).toBe(false)
  })
  it('Extra Turning needs a turning ability; item creation needs the caster level', () => {
    const f = fresh('fighter')
    f.levels[0].feats = [{ featId: 'extra-turning', slot: 'general' }]
    expect(ids(f).some((i) => i.startsWith('prereq-extra-turning'))).toBe(true)
    const w = fresh('wizard')
    w.levels[0].feats = [{ featId: 'craft-wand', slot: 'general' }]
    expect(ids(w).some((i) => i.startsWith('prereq-craft-wand'))).toBe(true)
  })
  it('War domain: no Martial Weapon Proficiency for a simple deity weapon', () => {
    const c = fresh('cleric')
    c.levels[0].classChoices = { domain1: 'war', domain2: 'strength', channel: 'positive', deityWeapon: 'morningstar' }
    expect(compute(c, rules).feats.some((f) => f.featId === 'martial-weapon-proficiency')).toBe(false)
  })
  it('domain turning: one shared pool of 3 + Cha (+4 per Extra Turning)', () => {
    const c = fresh('cleric')
    c.levels[0].classChoices = { domain1: 'fire', domain2: 'sun', channel: 'positive' }
    c.levels[0].feats = [{ featId: 'extra-turning', slot: 'general' }]
    const extra = compute(c, rules).turning!.extra
    const fire = extra.find((x) => x.name.en === 'Fire')!
    expect(fire.uses).toHaveLength(2)
    expect(fire.perDay).toBe(3 + 2 + 4)
    expect(extra.find((x) => x.name.en === 'Sun')!.perDay).toBe(1)
  })
  it('celestial charger: 15 HD, maximum hp 211', () => {
    const s = computeCreature(rules.creatures.get('unicorn-celestial-charger')!, { maxHp: true })
    expect(s.hitDice).toBe(15)
    expect(s.hpMax.total).toBe(211)
  })
  it('a celestial animal is a magical beast', () => {
    const s = computeCreature(rules.creatures.get('dire-rat')!, { template: rules.templates.get('celestial') })
    expect(s.typeText.en).toMatch(/magical beast/i)
  })
  it('zero-damage arms show 0', () => {
    const oct = computeCreature(rules.creatures.get('octopus')!)
    expect(oct.attacks.some((a) => a.damage === '0')).toBe(true)
  })
  it('wild shape: coins meld, quadruped carrying capacity', () => {
    const c = fresh('druid', 5)
    c.money = { cp: 0, sp: 0, gp: 3000, pp: 0, other: '' }
    expect(compute(c, rules).load.carried.lb).toBeGreaterThanOrEqual(60)
    c.wildShape = { creatureId: 'wolf', rounds: 100, keepItems: [] }
    const s = compute(c, rules)
    expect(s.load.carried.lb).toBe(0)
    // Wolf Str 13, Medium quadruped ×1.5: light load 50 × 1.5 = 75 lb.
    expect(s.load.limits.light.lb).toBe(75)
  })
  it('a Small character’s greatsword weighs half', () => {
    const big = fresh('fighter')
    big.inventory = [weapon('g', 'greatsword')]
    const small = fresh('fighter', 1, ABIL, 'halfling')
    small.inventory = [weapon('g', 'greatsword')]
    expect(compute(small, rules).load.carried.lb).toBe(compute(big, rules).load.carried.lb / 2)
  })
})
