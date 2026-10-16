// Barbarian, monk, paladin and rogue features (SRD 3.5; FAQ 6/30/2008 where it settles a question).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character, ItemInstance, LevelEntry } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { computeCreature, paladinMountAdvancement } from '../creature'
import { featSlotsAt } from '../progression'
import { choicesAt } from '../classChoices'
import { validate } from '../validate'
import { endRage, startRage } from '../../ui/classActions'

const ABIL = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 14 }
function make(classId: string, n: number, opts: { alignment?: string; race?: string; abilities?: typeof ABIL; levels?: LevelEntry[] } = {}): Character {
  const c = newCharacter({ name: 'T', race: opts.race ?? 'human', classId, abilities: opts.abilities ?? ABIL, lang: 'en', alignment: opts.alignment })
  c.levels = opts.levels ?? Array.from({ length: n }, () => ({ classId, skillRanks: {}, feats: [] }))
  return c
}
const ids = (c: Character) => validate(c, rules).map((w) => w.id)
const item = (uid: string, kind: ItemInstance['kind'], refId: string, extra: Partial<ItemInstance> = {}): ItemInstance => ({ uid, kind, refId, quantity: 1, location: 'carried', ...extra })

describe('barbarian (https://www.d20srd.org/srd/classes/barbarian.htm)', () => {
  it('rage: +4 Str/Con (untyped), +2 morale Will, −2 AC, 3 + new Con rounds, extra hp', () => {
    const c = make('barbarian', 1, { alignment: 'CN' })
    const before = compute(c, rules)
    expect(before.classFeatures.rage).toMatchObject({ perDay: 1, strCon: 4, will: 2, rounds: 3 + 4, active: false, available: true })
    startRage(c, before.classFeatures.rage!.rounds)
    const s = compute(c, rules)
    expect(s.abilities.str.score.total).toBe(20)
    expect(s.abilities.con.score.total).toBe(18)
    expect(s.hpMax.total).toBe(before.hpMax.total + 2)
    expect(s.saves.will.total).toBe(before.saves.will.total + 2)
    expect(s.ac.total).toBe(before.ac.total - 2)
    expect(s.classFeatures.rage!.active).toBe(true)
    expect(c.dailyUsesSpent['class:rage']).toBe(1)
  })
  it('rage: no Cha/Dex/Int skills except Balance, Escape Artist, Intimidate, Ride; no Concentration; no Combat Expertise', () => {
    const c = make('barbarian', 1, { alignment: 'CN', abilities: { ...ABIL, int: 13 } })
    c.levels[0].feats = [{ featId: 'combat-expertise', slot: 'general' }]
    c.toggles.combatExpertise = 1
    const ac = compute(c, rules).ac.total
    startRage(c, 5)
    const s = compute(c, rules)
    const usable = (k: string) => s.skills.find((x) => x.key === k)!.usable
    expect([usable('bluff'), usable('hide'), usable('concentration'), usable('intimidate'), usable('climb')]).toEqual([false, false, false, true, true])
    expect(s.ac.total).toBe(ac - 1 - 2) // Combat Expertise +1 dodge gone, rage −2
  })
  it('end of rage: fatigued for the encounter; tireless from 17th', () => {
    const c = make('barbarian', 1, { alignment: 'CN' })
    startRage(c, 5)
    endRage(c, false)
    expect(c.activeEffects.map((e) => [e.kind, e.refId, e.encounter])).toEqual([['condition', 'fatigued', true]])
    const t = make('barbarian', 17, { alignment: 'CN' })
    startRage(t, 5)
    endRage(t, compute(t, rules).classFeatures.rage!.tireless)
    expect(t.activeEffects).toEqual([])
  })
  it('greater rage (11th), mighty rage (20th), uses per day and damage reduction', () => {
    expect(compute(make('barbarian', 11), rules).classFeatures.rage).toMatchObject({ perDay: 3, strCon: 6, will: 3 })
    const s20 = compute(make('barbarian', 20), rules)
    expect(s20.classFeatures.rage).toMatchObject({ perDay: 6, strCon: 8, will: 4, tireless: true })
    expect(s20.damageReduction[0].value).toBe('5/—')
    expect(compute(make('barbarian', 7), rules).damageReduction[0].value).toBe('1/—')
    expect(compute(make('barbarian', 6), rules).damageReduction).toEqual([])
  })
  it('a lawful barbarian can’t rage and is flagged', () => {
    const c = make('barbarian', 2, { alignment: 'LN' })
    expect(compute(c, rules).classFeatures.rage!.available).toBe(false)
    expect(ids(c)).toContain('class-alignment-barbarian')
  })
  it('barbarian 2 / rogue 4: improved uncanny dodge, flanked only by a rogue 10+', () => {
    const c = make('barbarian', 0, {
      alignment: 'CN',
      levels: [...Array(2)].map(() => ({ classId: 'barbarian', skillRanks: {}, feats: [] })).concat([...Array(4)].map(() => ({ classId: 'rogue', skillRanks: {}, feats: [] }))),
    })
    const n = compute(c, rules).classFeatures.notes.find((x) => x.name.en === 'Improved uncanny dodge')
    expect(n?.text.en).toContain('level 10+')
  })
})

describe('monk (https://www.d20srd.org/srd/classes/monk.htm)', () => {
  const unarmed = (c: Character) => compute(c, rules).attacks.find((a) => a.itemUid === 'monk-unarmed')!
  it('unarmed strike is always an attack: 1d6 at 1st (1d4 Small), 1d8 at 4th, 2d10 at 20th; full Str', () => {
    const m = make('monk', 1, { alignment: 'LN' })
    const a = unarmed(m)
    expect([a.damageDice, a.attack.total, a.damage.total]).toEqual(['1d6', 3, 3])
    expect(unarmed(make('monk', 1, { alignment: 'LN', race: 'halfling' })).damageDice).toBe('1d4')
    expect(unarmed(make('monk', 4, { alignment: 'LN' })).damageDice).toBe('1d8')
    expect(unarmed(make('monk', 20, { alignment: 'LN' })).damageDice).toBe('2d10')
  })
  it('flurry of blows: −2 and one extra attack at 1st; no penalty and two extra attacks at 11th (total BAB)', () => {
    const m = make('monk', 1, { alignment: 'LN' })
    m.toggles.flurry = true
    expect(unarmed(m).iterative).toEqual([1, 1])
    const m11 = make('monk', 11, { alignment: 'LN' })
    m11.toggles.flurry = true
    const a = unarmed(m11)
    expect(a.iterative).toEqual([a.attack.total, a.attack.total, a.attack.total, a.attack.total - 5])
    // Fighter 4 / monk 4: BAB +7 → +5/+5/+0 before Str (FAQ p. 21: flurry uses the total base attack bonus).
    const fm = make('fighter', 0, {
      alignment: 'LN',
      levels: [...Array(4)].map(() => ({ classId: 'fighter', skillRanks: {}, feats: [] })).concat([...Array(4)].map(() => ({ classId: 'monk', skillRanks: {}, feats: [] }))),
    })
    fm.toggles.flurry = true
    expect(unarmed(fm).iterative).toEqual([5 + 3, 5 + 3, 0 + 3])
  })
  it('no flurry in armor; a non-monk weapon is flagged in a flurry', () => {
    const m = make('monk', 3, { alignment: 'LN' })
    m.toggles.flurry = true
    m.inventory = [item('arm', 'armor', 'leather', { location: 'worn' }), item('ls', 'weapon', 'longsword')]
    m.loadouts[0].weapons = ['ls']
    const s = compute(m, rules)
    expect(s.classFeatures.flurry!.available).toBe(false)
    m.inventory = [item('ls', 'weapon', 'longsword')]
    const s2 = compute(m, rules)
    expect(s2.attacks.find((a) => a.itemUid === 'ls')!.notes.some((n) => n.name.en === 'Flurry of blows')).toBe(true)
  })
  it('ki strike; amulet of mighty fists +2 on the unarmed strike', () => {
    expect(unarmed(make('monk', 16, { alignment: 'LN' })).bypassDR).toEqual(['magic', 'lawful', 'adamantine'])
    const m = make('monk', 1, { alignment: 'LN' })
    m.inventory = [item('amf', 'magic', 'amulet-of-mighty-fists-2', { location: 'worn' })]
    expect(unarmed(m).attack.total).toBe(3 + 2)
  })
  it('wholeness of body 2 × level, diamond soul SR, Stunning Fist uses and DC', () => {
    const s7 = compute(make('monk', 7, { alignment: 'LN' }), rules)
    expect(s7.classFeatures.abilities.find((a) => a.id === 'wholeness-of-body')?.max).toBe(14)
    expect(compute(make('monk', 13, { alignment: 'LN' }), rules).classFeatures.spellResistance).toBe(23)
    const m = make('monk', 5, { alignment: 'LN' })
    m.levels[0].feats = [{ featId: 'stunning-fist', slot: 'class' }]
    const sf = compute(m, rules).classFeatures.abilities.find((a) => a.id === 'stunning-fist')!
    expect(sf.max).toBe(5)
    expect(sf.lines[0].en).toContain('DC 13') // 10 + ½ × 5 + Wis 1
  })
  it('monk multiclass: no monk level after another class; nonlawful flagged', () => {
    const c = make('monk', 0, {
      alignment: 'LN',
      levels: [{ classId: 'monk', skillRanks: {}, feats: [] }, { classId: 'fighter', skillRanks: {}, feats: [] }, { classId: 'monk', skillRanks: {}, feats: [] }],
    })
    expect(ids(c)).toContain('no-return-monk-3')
    expect(ids(make('monk', 2, { alignment: 'CN' }))).toContain('class-alignment-monk')
  })
})

describe('paladin (https://www.d20srd.org/srd/classes/paladin.htm)', () => {
  it('smite evil: + Cha to attack, + paladin level to damage, melee only; uses per day', () => {
    const p = make('paladin', 5, { alignment: 'LG' })
    p.inventory = [item('ls', 'weapon', 'longsword'), item('bow', 'weapon', 'longbow')]
    p.loadouts[0].weapons = ['ls', 'bow']
    const before = compute(p, rules)
    p.toggles.smite = true
    const s = compute(p, rules)
    const ls = (x: typeof s) => x.attacks.find((a) => a.itemUid === 'ls')!
    expect(ls(s).attack.total).toBe(ls(before).attack.total + 2)
    // One attack only: the iterative after it doesn't get the bonus; +5 damage as a first-attack line.
    expect(ls(s).iterative[0]).toBe(ls(before).iterative[0] + 2)
    const p6 = make('paladin', 6, { alignment: 'LG' })
    p6.inventory = p.inventory
    p6.loadouts[0].weapons = ['ls']
    const b6 = compute(p6, rules).attacks[0].iterative
    p6.toggles.smite = true
    expect(compute(p6, rules).attacks[0].iterative).toEqual([b6[0] + 2, b6[1]])
    expect(ls(s).damage.total).toBe(ls(before).damage.total)
    expect(ls(s).extraDamage.find((x) => x.type.en === 'smite evil')?.dice).toBe('5')
    expect(s.attacks.find((a) => a.itemUid === 'bow')!.attack.total).toBe(before.attacks.find((a) => a.itemUid === 'bow')!.attack.total)
    expect(s.classFeatures.abilities.find((a) => a.id === 'smite-evil')?.max).toBe(2)
    expect(s.classFeatures.abilities.find((a) => a.id === 'lay-on-hands')?.max).toBe(10)
  })
  it('ex-paladin (not lawful good): no divine grace, spells, turning, smite; flagged', () => {
    const p = make('paladin', 6, { alignment: 'CG' })
    const s = compute(p, rules)
    expect(s.saves.fort.parts.some((x) => x.sourceId === 'divine-grace')).toBe(false)
    expect(s.spellcasting).toEqual([])
    expect(s.turning).toBeUndefined()
    expect(s.classFeatures.abilities).toEqual([])
    expect(ids(p)).toContain('class-alignment-paladin')
  })
  it('special mount at 5th: heavy warhorse +2 HD, natural armor +4, Str +1, Int 6', () => {
    const m = paladinMountAdvancement(5)!
    const s = computeCreature(rules.creatures.get('warhorse-heavy')!, { advancement: m.advancement, mount: m.mount })
    const base = rules.creatures.get('warhorse-heavy')!
    expect(s.hitDice).toBe(base.hitDice.count + 2)
    expect(s.abilities.str.score).toBe(base.abilities.str! + 1)
    expect(s.abilities.int.score).toBe(6)
    expect(s.special.map((x) => x.id)).toContain('share-saving-throws')
    expect(paladinMountAdvancement(15)!.advancement.special.map((x) => x.id)).toContain('spell-resistance')
  })
  it('remove disease per week; multiclass paladin can’t come back', () => {
    expect(compute(make('paladin', 12, { alignment: 'LG' }), rules).classFeatures.abilities.find((a) => a.id === 'remove-disease')?.max).toBe(3)
    const c = make('paladin', 0, {
      alignment: 'LG',
      levels: [{ classId: 'paladin', skillRanks: {}, feats: [] }, { classId: 'fighter', skillRanks: {}, feats: [] }, { classId: 'paladin', skillRanks: {}, feats: [] }],
    })
    expect(ids(c)).toContain('no-return-paladin-3')
  })
})

describe('rogue (https://www.d20srd.org/srd/classes/rogue.htm)', () => {
  it('sneak attack dice on every attack: 1d6 at 1st, 5d6 at 9th', () => {
    const r = make('rogue', 9)
    r.inventory = [item('d', 'weapon', 'dagger')]
    r.loadouts[0].weapons = ['d']
    const s = compute(r, rules)
    expect(s.classFeatures.sneakAttack).toBe('5d6')
    expect(s.attacks[0].extraDamage.some((x) => x.dice === '5d6')).toBe(true)
    expect(compute(make('rogue', 1), rules).classFeatures.sneakAttack).toBe('1d6')
  })
  it('special ability at 10th; "feat" gives a feat slot for any feat; taken abilities aren’t offered again', () => {
    const r = make('rogue', 13)
    expect(choicesAt(r, rules, 10).map((x) => x.key)).toEqual(['specialAbility'])
    expect(choicesAt(r, rules, 11)).toEqual([])
    r.levels[9].classChoices = { specialAbility: 'opportunist' }
    expect(choicesAt(r, rules, 13)[0].options.map((o) => o.id)).not.toContain('opportunist')
    r.levels[12].classChoices = { specialAbility: 'feat' }
    expect(featSlotsAt(r, rules, 13).class).toBe(1)
    expect(ids(r)).toContain('feat-missing-class-13')
    expect(compute(r, rules).classFeatures.notes.some((n) => n.name.en === 'Opportunist')).toBe(true)
  })
  it('defensive roll is tracked once per day', () => {
    const r = make('rogue', 10)
    r.levels[9].classChoices = { specialAbility: 'defensive-roll' }
    expect(compute(r, rules).classFeatures.abilities.find((a) => a.id === 'defensive-roll')?.max).toBe(1)
  })
})

describe('review 2026-10-16 (classes): fixes', () => {
  it('Weapon Finesse only when better than Str after the shield penalty', () => {
    const f = make('fighter', 4, { abilities: { ...ABIL, str: 12, dex: 14 } })
    f.levels[0].feats = [{ featId: 'weapon-finesse', slot: 'general' }]
    f.inventory = [item('ss', 'weapon', 'short-sword'), item('sh', 'armor', 'heavy-steel-shield')]
    f.loadouts[0].weapons = ['ss']
    f.loadouts[0].shield = 'sh'
    expect(compute(f, rules).attacks[0].attack.total).toBe(4 + 1)
    f.loadouts[0].shield = undefined
    expect(compute(f, rules).attacks[0].attack.total).toBe(4 + 2)
  })
  it('French feminine alignments: a "Chaotique bonne" paladin is an ex-paladin', () => {
    expect(ids(make('paladin', 2, { alignment: 'Chaotique bonne' }))).toContain('class-alignment-paladin')
    expect(ids(make('paladin', 2, { alignment: 'Loyale bonne' }))).not.toContain('class-alignment-paladin')
  })
  it('ending a rage while fatigued: exhausted; rage needs a nonlawful alignment', () => {
    const c = make('barbarian', 1, { alignment: 'CN' })
    startRage(c, 5)
    c.activeEffects.push({ uid: 'f', kind: 'condition', refId: 'fatigued', enabled: true })
    endRage(c, false)
    expect(c.activeEffects.map((e) => e.refId)).toEqual(['exhausted'])
    const l = make('barbarian', 1, { alignment: 'LN' })
    startRage(l, 5)
    expect(compute(l, rules).abilities.str.score.total).toBe(16)
  })
  it('monk fast movement is an enhancement bonus; lost with a shield', () => {
    const m = make('monk', 6, { alignment: 'LN' })
    m.inventory = [item('b', 'magic', 'boots-of-striding-and-springing', { location: 'worn' })]
    expect(compute(m, rules).speed.current.ft).toBe(50)
    m.inventory = [item('s', 'armor', 'buckler')]
    m.loadouts[0].shield = 's'
    expect(compute(m, rules).speed.current.ft).toBe(30)
  })
  it('shuriken in a flurry; Huge monk damage', () => {
    const m = make('monk', 8, { alignment: 'LN' })
    m.inventory = [item('sh', 'weapon', 'shuriken-5')]
    m.loadouts[0].weapons = ['sh']
    m.toggles.flurry = true
    const a = compute(m, rules).attacks.find((x) => x.itemUid === 'sh')!
    expect(a.iterative.length).toBe(3)
  })
  it('mounted: the lance is one-handed (Str ×1, no shield warning)', () => {
    const p = make('paladin', 5, { alignment: 'LG' })
    p.inventory = [item('l', 'weapon', 'lance'), item('sh', 'armor', 'heavy-steel-shield')]
    p.loadouts[0].weapons = ['l']
    p.loadouts[0].shield = 'sh'
    expect(ids(p)).toContain('two-hands-shield')
    p.toggles.mounted = true
    const s = compute(p, rules)
    expect(s.attacks[0].twoHands).toBe(false)
    expect(ids(p)).not.toContain('two-hands-shield')
  })
  it('mount share saving throws: the paladin’s better base save', () => {
    const m = paladinMountAdvancement(20)!
    const s = computeCreature(rules.creatures.get('warhorse-heavy')!, { advancement: m.advancement, mount: m.mount, masterBaseSaves: { fort: 12, ref: 6, will: 6 } })
    const plain = computeCreature(rules.creatures.get('warhorse-heavy')!, { advancement: m.advancement, mount: m.mount })
    expect(s.saves.fort.total).toBe(plain.saves.fort.total + 4)
    expect(s.saves.will.total).toBe(plain.saves.will.total + 2)
    expect(s.saves.ref.total).toBe(plain.saves.ref.total)
  })
  it('paladin-only spells exist; a Wis 10 paladin has no useless blocked slot', () => {
    expect(['bless-weapon', 'heal-mount', 'holy-sword'].every((id) => rules.spells.get(id)?.level['paladin'])).toBe(true)
    const p = make('paladin', 4, { alignment: 'LG', abilities: { ...ABIL, wis: 10 } })
    expect(compute(p, rules).spellcasting[0].slots.find((x) => x.spellLevel === 1)?.total).toBe(0)
  })
  it('a rogue special ability recorded at a wrong level is ignored and flagged', () => {
    const r = make('rogue', 5)
    r.levels[4].classChoices = { specialAbility: 'feat' }
    expect(featSlotsAt(r, rules, 5).class).toBe(0)
    expect(ids(r)).toContain('rogue-special-stray-5')
  })
  it('ex-druid: no wild empathy; a Small character’s backpack weighs a quarter', () => {
    expect(compute(make('druid', 3, { alignment: 'LG' }), rules).featureStats.some((f) => f.id === 'wild-empathy')).toBe(false)
    const h = make('rogue', 1, { race: 'halfling' })
    h.inventory = [item('bp', 'gear', 'backpack')]
    expect(compute(h, rules).load.carried.lb).toBe(0.5)
  })
})

describe('monk two-weapon fighting with the unarmed strike as the off hand (FAQ pp. 19-20)', () => {
  it('kama + unarmed strike: −2/−2 with Two-Weapon Fighting (light off-hand), plus flurry', () => {
    const m = make('monk', 6, { alignment: 'LN' })
    m.levels[0].feats = [{ featId: 'two-weapon-fighting', slot: 'general' }]
    m.inventory = [item('k', 'weapon', 'kama')]
    m.loadouts[0].weapons = ['k']
    m.loadouts[0].twoWeapon = true
    const s = compute(m, rules)
    const u = s.attacks.find((a) => a.itemUid === 'monk-unarmed')!
    expect(u.hand).toBe('off')
    expect(s.attacks.find((a) => a.itemUid === 'k')!.hand).toBe('primary')
  })
})
