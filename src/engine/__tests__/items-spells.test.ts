// Spell items (scrolls, potions, wands, staffs, spells in any item) and custom weapons.
// https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm, magicItemBasics.htm
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import type { Character, ItemInstance, StoredSpell } from '../../model/character'
import { newCharacter } from '../../model/newCharacter'
import { compute } from '../compute'
import { itemSaveDc, spellItemPrice, storedSpellUse } from '../spellItems'
import { newDayItemSpells, useStoredSpell } from '../../ui/spellItemActions'

const make = (classId: string, n = 1): Character => {
  const c = newCharacter({ name: 'T', race: 'human', classId, abilities: { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 12 }, lang: 'en', alignment: 'NG' })
  c.levels = Array.from({ length: n }, () => ({ classId, skillRanks: {}, feats: [] }))
  return c
}
const spell = (spellId: string, level: number, casterLevel: number, extra: Partial<StoredSpell> = {}): StoredSpell => ({
  spellId,
  level,
  casterLevel,
  activation: 'trigger',
  uses: 'charges',
  cost: 1,
  ...extra,
})

describe('prices (Table: Estimating Magic Item Gold Piece Values)', () => {
  it('scroll level × CL × 25, potion × 50, wand × 750, 0-level counts ½', () => {
    expect(spellItemPrice('scroll', [spell('fireball', 3, 5)])).toBe(375)
    expect(spellItemPrice('potion', [spell('cure-light-wounds', 1, 1)])).toBe(50)
    expect(spellItemPrice('wand', [spell('cure-light-wounds', 1, 1)])).toBe(750)
    expect(spellItemPrice('scroll', [spell('light', 0, 1)])).toBe(12.5)
  })
  it('staff: costliest spell full, next 75%, others 50%; a 2-charge spell at half value', () => {
    // 4×8×750/2 = 12,000; 3×8×750 = 18,000; 1×8×750 = 6,000 → 18,000 + 9,000 + 3,000.
    const staff = [spell('burning-hands', 1, 8), spell('fireball', 3, 8), spell('wall-of-fire', 4, 8, { cost: 2 })]
    expect(spellItemPrice('staff', staff)).toBe(30000)
  })
})

describe('using spell items (https://www.d20srd.org/srd/magicItems/magicItemBasics.htm)', () => {
  const wand = (): ItemInstance => ({
    uid: 'w',
    kind: 'custom',
    refId: '',
    name: { en: 'Wand of cure light wounds', fr: 'Baguette de soins légers' },
    quantity: 1,
    location: 'worn',
    spellItem: 'wand',
    spells: [spell('cure-light-wounds', 1, 1)],
    charges: { left: 50, max: 50 },
    custom: { weightLb: 0, costGp: 750, text: { en: '', fr: '' } },
  })
  it('item save DC = 10 + level + the minimum ability modifier for that level', () => {
    expect([itemSaveDc(0), itemSaveDc(1), itemSaveDc(3), itemSaveDc(9)]).toEqual([10, 11, 14, 23])
  })
  it('spell trigger: a cleric can use the wand; a fighter needs Use Magic Device DC 20; a 3rd-level paladin can', () => {
    const w = wand()
    expect(storedSpellUse(w, w.spells![0], compute(make('cleric'), rules), rules).usable).toBe(true)
    const f = storedSpellUse(w, w.spells![0], compute(make('fighter'), rules), rules)
    expect(f.usable).toBe(false)
    expect(f.notes[0].en).toContain('DC 20')
    expect(storedSpellUse(w, w.spells![0], compute(make('paladin', 3), rules), rules).usable).toBe(true)
  })
  it('using spends charges; a scroll is removed when its last spell is read; a potion is drunk', () => {
    const c = make('cleric')
    const w = wand()
    const scroll: ItemInstance = { uid: 's', kind: 'custom', refId: '', quantity: 1, location: 'carried', spellItem: 'scroll', spells: [spell('bless', 1, 1, { activation: 'completion', uses: 'single' })] }
    const potion: ItemInstance = { uid: 'p', kind: 'custom', refId: '', quantity: 2, location: 'carried', spellItem: 'potion', spells: [spell('cure-light-wounds', 1, 1, { activation: 'use', uses: 'single' })] }
    c.inventory = [w, scroll, potion]
    useStoredSpell(c, w, 0)
    expect(w.charges!.left).toBe(49)
    useStoredSpell(c, scroll, 0)
    expect(c.inventory.some((i) => i.uid === 's')).toBe(false)
    useStoredSpell(c, potion, 0)
    expect(potion.quantity).toBe(1)
  })
  it('scroll above the reader’s caster level: caster level check DC = scroll CL + 1', () => {
    const c = make('cleric')
    const sc: ItemInstance = { uid: 's', kind: 'custom', refId: '', quantity: 1, location: 'carried', spellItem: 'scroll', spells: [spell('cure-serious-wounds', 3, 5, { activation: 'completion', uses: 'single' })] }
    const u = storedSpellUse(sc, sc.spells![0], compute(c, rules), rules)
    expect(u.notes.some((n) => n.en.includes('DC 6'))).toBe(true)
  })
  it('a weapon with daylight 3/day: uses per day, back on a new day', () => {
    const c = make('fighter')
    const sword: ItemInstance = { uid: 'gs', kind: 'weapon', refId: 'greatsword', quantity: 1, location: 'worn', spells: [spell('daylight', 3, 5, { activation: 'command', uses: 'perDay', perDay: 3 })] }
    c.inventory = [sword]
    const sheet = compute(c, rules)
    expect(storedSpellUse(sword, sword.spells![0], sheet, rules)).toMatchObject({ usable: true, left: 3 })
    useStoredSpell(c, sword, 0)
    expect(storedSpellUse(sword, sword.spells![0], sheet, rules).left).toBe(2)
    newDayItemSpells(c)
    expect(storedSpellUse(sword, sword.spells![0], sheet, rules).left).toBe(3)
  })
})

describe('custom weapons', () => {
  it('own damage dice and critical; bonuses while wielded only', () => {
    const c = make('fighter')
    c.inventory = [
      {
        uid: 'j',
        kind: 'weapon',
        refId: 'greatsword',
        name: { en: 'Justicar', fr: 'Justicière' },
        quantity: 1,
        location: 'worn',
        enhancement: 3,
        custom: {
          weightLb: 8,
          costGp: 65000,
          text: { en: '', fr: '' },
          damage: '2d8',
          critRange: 17,
          modifiers: [{ target: 'save.all', bonusType: 'sacred', value: 2, condition: { en: 'vs fear', fr: 'contre la terreur' } }],
        },
      },
    ]
    const willBefore = compute(c, rules).saves.will
    c.loadouts[0].weapons = ['j']
    const s = compute(c, rules)
    expect([s.attacks[0].damageDice, s.attacks[0].critRange]).toEqual(['2d8', 17])
    expect(s.saves.will.parts.some((p) => p.sourceId.startsWith('item:j') && p.value === 2)).toBe(true)
    expect(willBefore.parts.some((p) => p.sourceId.startsWith('item:j'))).toBe(false)
  })
  it('Weapon Finesse with a nonproficient shield: the shield penalty once (FAQ p. 51)', () => {
    const c = make('rogue', 4)
    c.levels[0].feats = [{ featId: 'weapon-finesse', slot: 'general' }]
    c.inventory = [
      { uid: 'ss', kind: 'weapon', refId: 'short-sword', quantity: 1, location: 'worn' },
      { uid: 'sh', kind: 'armor', refId: 'heavy-steel-shield', quantity: 1, location: 'worn' },
    ]
    c.loadouts[0].weapons = ['ss']
    c.loadouts[0].shield = 'sh'
    const a = compute(c, rules).attacks[0].attack
    expect(a.parts.filter((p) => p.value === -2 && /shield|nonproficient/i.test(p.sourceId)).length).toBe(1)
  })
})
