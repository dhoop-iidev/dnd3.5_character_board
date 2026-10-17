// Example characters shipped in examples/ (importable from the welcome screen): legal builds, expected numbers.
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import druidJson from '../../../examples/druide-niveau-10.json'
import clericJson from '../../../examples/pretre-niveau-15.json'
import rangerJson from '../../../examples/rodeur-niveau-12.json'
import fighterJson from '../../../examples/guerriere-niveau-10.json'
import barbarianJson from '../../../examples/barbare-niveau-8.json'
import monkJson from '../../../examples/moine-niveau-8.json'
import paladinJson from '../../../examples/paladine-niveau-8.json'
import rogueJson from '../../../examples/roublard-niveau-10.json'
import wizardJson from '../../../examples/magicienne-niveau-7.json'
import sorcererJson from '../../../examples/ensorceleur-niveau-6.json'
import bardJson from '../../../examples/barde-niveau-6.json'
import { migrate } from '../../model/migrate'
import { compute } from '../compute'
import { companionAdvancement, companionLevel, computeCreature } from '../creature'
import { validate } from '../validate'
import { startWildShape } from '../../ui/wildShape'

describe('examples/druide-niveau-10.json (human druid 10)', () => {
  const c = migrate(structuredClone(druidJson))
  const s = compute(c, rules)
  it('is a legal, complete build: no warning needing a choice, no error', () => {
    const issues = validate(c, rules).filter((w) => w.actionable || w.severity === 'error')
    expect(issues.map((w) => w.id)).toEqual([])
  })
  it('core numbers (max hit dice, Wis 18 + periapt)', () => {
    expect(s.hpMax.total).toBe(100) // 10 × d8 max + Con +2 × 10
    expect(s.abilities.wis.score.total).toBe(20)
    expect([s.saves.fort.total, s.saves.ref.total, s.saves.will.total]).toEqual([11, 7, 14])
    expect(s.load.band).toBe('light')
    expect(s.speed.current.ft).toBe(20) // hide is medium armor
  })
  it('spells: caster level 10, 6/6/5/4/4/3 per day, DC 15 + level', () => {
    const sc = s.spellcasting[0]
    expect(sc.casterLevel.total).toBe(10)
    expect(sc.slots.map((x) => x.total)).toEqual([6, 6, 5, 4, 4, 3])
    expect(sc.dc(1)).toBe(16)
  })
  it('companion: dire wolf at effective level 4 (+2 HD, evasion)', () => {
    const wolf = computeCreature(rules.creatures.get('dire-wolf')!, {
      advancement: companionAdvancement(rules, companionLevel(s.classLevels), -6),
      maxHp: true,
    })
    expect(wolf.hitDice).toBe(8)
    expect(wolf.special.map((x) => x.id)).toContain('evasion')
  })
})

describe('wild shape (druid 10 → dire wolf; PHB/MM errata 2006, docs/rules/rulings-classes.md C4)', () => {
  const shaped = () => {
    const c = migrate(structuredClone(druidJson))
    c.hp.damage = 30
    startWildShape(c, 'dire-wolf')
    return c
  }
  it('one daily use, 10 hours, heals 10 hp (a night of rest)', () => {
    const c = shaped()
    expect(c.dailyUsesSpent['wild-shape']).toBe(1)
    expect(c.wildShape?.rounds).toBe(6000)
    expect(c.hp.damage).toBe(20)
  })
  it('physical scores, size, natural armor, speed of the form; gear melded; hit points kept', () => {
    const s = compute(shaped(), rules)
    expect([s.abilities.str.score.total, s.abilities.dex.score.total, s.abilities.con.score.total]).toEqual([25, 15, 17])
    expect(s.abilities.wis.score.total).toBe(18) // periapt melded: 16 + 2 increases
    expect(s.size).toBe('large')
    expect(s.ac.total).toBe(10 + 2 - 1 + 3) // Dex, Large, natural armor; hide armor and shield melded
    expect(s.speed.current.ft).toBe(50)
    expect(s.hpMax.total).toBe(100) // kept despite Con 17
    expect(s.armorCheckPenalty.total).toBe(0)
  })
  it('natural attack: her BAB + the form’s Str + size; sole natural attack 1½ Str', () => {
    const s = compute(shaped(), rules)
    expect(s.attacks).toHaveLength(1)
    expect(s.attacks[0].attack.total).toBe(7 + 7 - 1)
    expect(s.attacks[0].damageDice).toBe('1d8')
    expect(s.attacks[0].damage.total).toBe(10)
    expect(s.grapple.total).toBe(7 + 7 + 4)
  })
  it('kept items work again (DM ruling); ending the shape restores the sheet', () => {
    const c = shaped()
    c.wildShape!.keepItems.push('periapt')
    expect(compute(c, rules).abilities.wis.score.total).toBe(20)
    delete c.wildShape
    expect(compute(c, rules).ac.total).toBe(20)
  })
  it('house rule #24: a form with a climb speed gives +8 racial on Climb', () => {
    const c = migrate(structuredClone(druidJson))
    startWildShape(c, 'ape')
    const climb = compute(c, rules).skills.find((k) => k.key === 'climb')!.total
    expect(climb.parts.some((p) => p.sourceId === 'wild-shape-climb' && p.value === 8)).toBe(true)
  })
})

describe.each([
  ['pretre-niveau-15.json', clericJson],
  ['rodeur-niveau-12.json', rangerJson],
  ['guerriere-niveau-10.json', fighterJson],
  ['barbare-niveau-8.json', barbarianJson],
  ['moine-niveau-8.json', monkJson],
  ['paladine-niveau-8.json', paladinJson],
  ['roublard-niveau-10.json', rogueJson],
])('examples/%s', (_, json) => {
  it('is a legal, complete build: no warning at all', () => {
    const c = migrate(structuredClone(json))
    expect(validate(c, rules).map((w) => w.id)).toEqual([])
  })
})

describe('examples: core numbers', () => {
  it('human cleric 15 (Sun, Good): hp 150, AC 26, saves 14/7/18, 8th-level slot with fire storm', () => {
    const s = compute(migrate(structuredClone(clericJson)), rules)
    expect([s.hpMax.total, s.ac.total, s.bab.total]).toEqual([150, 26, 11])
    expect([s.saves.fort.total, s.saves.ref.total, s.saves.will.total]).toEqual([14, 7, 18])
    expect(s.turning!.level).toBe(20) // Improved Turning, phylactery of undead turning (+4)
    expect(s.turning!.usesPerDay.total).toBe(3 + 2 + 4)
    expect(s.spellcasting[0].slots.find((x) => x.spellLevel === 8)!.total).toBe(2)
  })
  it('elf ranger 12 (archery): bow +21/+16/+11, AC 24, wolf companion at effective level 6', () => {
    const c = migrate(structuredClone(rangerJson))
    const s = compute(c, rules)
    expect(s.attacks[0].iterative).toEqual([21, 16, 11])
    expect([s.hpMax.total, s.ac.total]).toEqual([108, 24])
    expect(companionLevel(s.classLevels)).toBe(6)
  })
  it('dwarf fighter 10 (waraxe and shield): +19/+14, 1d10+9, AC 26, hp 130', () => {
    const s = compute(migrate(structuredClone(fighterJson)), rules)
    const axe = s.attacks.find((a) => a.itemUid === 'axe')!
    expect([axe.attack.total, axe.damage.total, axe.damageDice]).toEqual([19, 9, '1d10'])
    expect([s.ac.total, s.hpMax.total]).toEqual([26, 130])
  })
})

describe('examples: barbarian, monk, paladin, rogue', () => {
  it('half-orc barbarian 8: greataxe +14/+9 1d12+7, rage 3/day for 3 + 4 rounds, DR 1/—', () => {
    const s = compute(migrate(structuredClone(barbarianJson)), rules)
    expect(s.attacks[0].iterative).toEqual([14, 9])
    expect(s.classFeatures.rage).toMatchObject({ perDay: 3, strCon: 4, rounds: 7 })
    expect(s.damageReduction[0].value).toBe('1/—')
    expect(s.speed.current.ft).toBe(30) // 30 + 10 fast movement, breastplate
  })
  it('human monk 8: unarmed 1d10, +10/+5, flurry +9/+9/+4, speed 50 ft, AC 19', () => {
    const c = migrate(structuredClone(monkJson))
    const s = compute(c, rules)
    const u = s.attacks.find((a) => a.itemUid === 'monk-unarmed')!
    expect([u.damageDice, ...u.iterative]).toEqual(['1d10', 10, 5])
    expect([s.speed.current.ft, s.ac.total]).toEqual([50, 19])
    c.toggles.flurry = true
    expect(compute(c, rules).attacks.find((a) => a.itemUid === 'monk-unarmed')!.iterative).toEqual([9, 9, 4])
  })
  it('human paladin 8: smite +2/+8, lay on hands 16 (Cha 15), caster level 4', () => {
    const c = migrate(structuredClone(paladinJson))
    const s = compute(c, rules)
    expect(s.classFeatures.abilities.find((a) => a.id === 'smite-evil')?.max).toBe(2)
    expect(s.classFeatures.abilities.find((a) => a.id === 'lay-on-hands')?.max).toBe(8 * 2)
    expect(s.spellcasting[0].casterLevel.total).toBe(4)
  })
  it('halfling rogue 10: short sword +15/+10 (Weapon Finesse), sneak attack 5d6, improved evasion', () => {
    const s = compute(migrate(structuredClone(rogueJson)), rules)
    expect(s.attacks[0].iterative).toEqual([15, 10])
    expect(s.classFeatures.sneakAttack).toBe('5d6')
    expect(s.classFeatures.notes.some((n) => n.name.en === 'Improved evasion')).toBe(true)
  })
})

describe('arcane examples: magicienne-niveau-7 (evoker), ensorceleur-niveau-6, barde-niveau-6', () => {
  const load = (j: unknown) => migrate(structuredClone(j))
  it('are legal, complete builds (spells learned, prohibited schools, swap)', () => {
    for (const j of [wizardJson, sorcererJson, bardJson]) {
      const c = load(j)
      expect(validate(c, rules).filter((w) => w.actionable || w.severity === 'error').map((w) => w.id)).toEqual([])
    }
  })
  it('spells per day with bonus spells (and the evoker’s extra spell at every level)', () => {
    expect(compute(load(wizardJson), rules).spellcasting[0].slots.map((x) => x.total)).toEqual([5, 6, 5, 4, 3])
    expect(compute(load(sorcererJson), rules).spellcasting[0].slots.map((x) => x.total)).toEqual([6, 7, 6, 4])
    expect(compute(load(bardJson), rules).spellcasting[0].slots.map((x) => x.total)).toEqual([3, 4, 3])
  })
  it('bard: chain shirt without arcane spell failure; bardic music 6/day, inspire courage and competence', () => {
    const s = compute(load(bardJson), rules)
    expect(s.spellcasting[0].spellFailure!.total).toBe(0)
    expect(s.classFeatures.bardicMusic!.perDay).toBe(6)
    expect(s.classFeatures.bardicMusic!.songs.filter((x) => x.available).map((x) => x.id)).toEqual(['countersong', 'fascinate', 'inspire-courage', 'inspire-competence', 'suggestion'])
  })
})

describe('extra spell slots', () => {
  it("the specialty slot needs a spell of the specialty school; the domain slot a domain spell", () => {
    const wiz = migrate(structuredClone(wizardJson))
    const cantrips = wiz.spells!.wizard.prepared[0]
    cantrips[cantrips.length - 1] = { id: 'read-magic', cast: false } // divination, specialist in evocation
    expect(validate(wiz, rules).map((x) => x.id)).toContain(`extra-slot-wizard-0-${cantrips.length - 1}`)
    const cleric = migrate(structuredClone(clericJson))
    const first = cleric.spells!.cleric.prepared[1]
    first[first.length - 1] = { id: 'bless', cast: false } // not a spell of her domains
    expect(validate(cleric, rules).map((x) => x.id)).toContain(`extra-slot-cleric-1-${first.length - 1}`)
  })
})
