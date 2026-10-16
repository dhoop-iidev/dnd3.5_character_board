// Example characters shipped in examples/ (importable from the welcome screen): legal builds, expected numbers.
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import druidJson from '../../../examples/druide-niveau-10.json'
import { migrate } from '../../model/migrate'
import { compute } from '../compute'
import { companionAdvancement, companionLevel, computeCreature } from '../creature'
import { validate } from '../validate'

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
