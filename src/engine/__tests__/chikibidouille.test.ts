// Reference values for Chikibidouille (formerly Fenrir), checked by hand against docs/rules (see the plan's verification table).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import fenrirJson from '../../data/characters/chikibidouille.json'
import type { Character } from '../../model/character'
import { compute } from '../compute'
import { validate } from '../validate'

const fenrir = fenrirJson as unknown as Character
const at8 = compute(fenrir, rules, { level: 8 })
const skill = (sheet: ReturnType<typeof compute>, key: string) => sheet.skills.find((s) => s.key === key)!.total.total

describe('Chikibidouille, level 8 (Fighter 6 / Weapon Master 2)', () => {
  it('abilities: Str 18, Con 18 (16 + amulet +2)', () => {
    expect(at8.abilities.str.score.total).toBe(18)
    expect(at8.abilities.con.score.total).toBe(18)
    expect(at8.abilities.con.mod).toBe(4)
  })
  it('HP 112 = 8×10 + 8×4 (house rule #9)', () => expect(at8.hpMax.total).toBe(112))
  it('BAB +8/+3', () => {
    expect(at8.bab.total).toBe(8)
    expect(at8.iterativeBab).toEqual([8, 3])
  })
  it('saves Fort +9, Ref +8, Will +1', () => {
    expect(at8.saves.fort.total).toBe(9)
    expect(at8.saves.ref.total).toBe(8)
    expect(at8.saves.will.total).toBe(1)
  })
  it('AC 21 (10 + full plate +2 → 10 + Dex capped +1), touch 11, flat-footed 20', () => {
    expect(at8.ac.total).toBe(21)
    expect(at8.touchAc.total).toBe(11)
    expect(at8.flatFootedAc.total).toBe(20)
  })
  it('initiative +3, speed 20 ft / 6 m', () => {
    expect(at8.initiative.total).toBe(3)
    expect(at8.speed.current).toEqual({ ft: 20, m: 6 })
  })
  it('armor check penalty −5 (magic armor is masterwork)', () => expect(at8.armorCheckPenalty.total).toBe(-5))
  it('greatsword +2: attack +15/+10, damage 2d6+8, crit 19–20/×2', () => {
    const gs = at8.attacks.find((a) => a.itemUid === 'greatsword')!
    expect(gs.attack.total).toBe(15)
    expect(gs.iterative).toEqual([15, 10])
    expect(gs.damageDice).toBe('2d6')
    expect(gs.damage.total).toBe(8)
    expect(gs.critRange).toBe(19)
    expect(gs.critMult.total).toBe(2)
    expect(gs.kiDamageMax).toBe(20) // 12 + 8
  })
  it('skills match the baseline totals', () => {
    expect(skill(at8, 'intimidate')).toBe(8)
    expect(skill(at8, 'spot')).toBe(5)
    expect(skill(at8, 'listen')).toBe(5)
    expect(skill(at8, 'knowledge-monsters')).toBe(5)
    expect(skill(at8, 'craft:weaponsmithing')).toBe(4)
    expect(skill(at8, 'ride')).toBe(4)
    expect(skill(at8, 'climb')).toBe(3)
    expect(skill(at8, 'handle-animal')).toBe(2)
    expect(skill(at8, 'jump')).toBe(-5) // 2 + Str 4 − ACP 5 − 6 (speed 20 ft, SRD Jump)
  })
  it('light load', () => expect(at8.load.band).toBe('light'))
  it('attacks of opportunity: 1 + Dex 3 = 4 (Combat Reflexes)', () => expect(at8.attacksOfOpportunity.total).toBe(4))
})

describe('Chikibidouille, tank mode (heavy steel shield + short sword)', () => {
  const tank = compute({ ...fenrir, activeLoadout: 'tank' }, rules, { level: 8 })
  it('AC 23, Climb +1, Jump −7', () => {
    expect(tank.ac.total).toBe(23)
    expect(skill(tank, 'climb')).toBe(1)
    expect(skill(tank, 'jump')).toBe(-7)
  })
  it('short sword: no Weapon Master features, Str ×1', () => {
    const ss = tank.attacks.find((a) => a.itemUid === 'short-sword')!
    expect(ss.weaponOfChoice).toBe(false)
    expect(ss.attack.total).toBe(12) // BAB 8 + Str 4
    expect(ss.damage.total).toBe(4)
  })
})

describe('Chikibidouille, level 9 (Fighter 6 / Weapon Master 2 / Warblade 1)', () => {
  const at9 = compute(fenrir, rules)
  it('HP 128 (d12 max at warblade 1), BAB +9/+4', () => {
    expect(at9.hpMax.total).toBe(128)
    expect(at9.iterativeBab).toEqual([9, 4])
  })
  it('saves: Fort +11, Ref +9 (battle clarity +1 insight), Will +1', () => {
    expect(at9.saves.fort.total).toBe(11)
    expect(at9.saves.ref.total).toBe(9)
    expect(at9.saves.will.total).toBe(1)
  })
  it('battle clarity is lost when flat-footed', () => {
    const ff = compute({ ...fenrir, toggles: { ...fenrir.toggles, situational: { flatFooted: true } } }, rules)
    expect(ff.saves.ref.total).toBe(8)
  })
  it('greatsword +16/+11 (no Superior Weapon Focus: Weapon Master stays at 2)', () => {
    expect(at9.attacks.find((a) => a.itemUid === 'greatsword')!.iterative).toEqual([16, 11])
  })
  it('initiator level 5 = warblade 1 + ½ × 8 → 3rd-level maneuvers; 3 known, 3 readied, 1 stance', () => {
    expect(at9.martial.caps).toMatchObject({ classLevel: 1, initiatorLevel: 5, maxManeuverLevel: 3, maneuversKnown: 3, maneuversReadied: 3, stancesKnown: 1 })
  })
})

describe('Weapon Master 3 variant (level 9 = Weapon Master 3)', () => {
  const wm3 = structuredClone(fenrir)
  wm3.levels[8].classId = 'weapon-master'
  const at9 = compute(wm3, rules)
  it('HP 126, Fort +10', () => {
    expect(at9.hpMax.total).toBe(126)
    expect(at9.saves.fort.total).toBe(10)
  })
  it('Superior Weapon Focus: greatsword +17/+12', () => {
    expect(at9.attacks.find((a) => a.itemUid === 'greatsword')!.iterative).toEqual([17, 12])
  })
})

describe('effects', () => {
  it("bull's strength (+4 enhancement Str) raises attack, damage and Climb", () => {
    const buffed = compute(
      { ...fenrir, activeEffects: [{ uid: 'e1', kind: 'magic', refId: 'potion-of-bulls-strength', enabled: true }] },
      rules,
      { level: 8 },
    )
    expect(buffed.abilities.str.score.total).toBe(22)
    const gs = buffed.attacks.find((a) => a.itemUid === 'greatsword')!
    expect(gs.attack.total).toBe(17)
    expect(gs.damage.total).toBe(11) // floor(6 × 1.5) + 2
    expect(skill(buffed, 'climb')).toBe(5)
  })
  it('fatigued (−2 Str, −2 Dex) lowers attack and Initiative', () => {
    const tired = compute({ ...fenrir, activeEffects: [{ uid: 'e2', kind: 'condition', refId: 'fatigued', enabled: true }] }, rules, {
      level: 8,
    })
    expect(tired.abilities.str.score.total).toBe(16)
    expect(tired.initiative.total).toBe(2)
    expect(tired.attacks.find((a) => a.itemUid === 'greatsword')!.attack.total).toBe(14)
  })
})

describe('money and custom items', () => {
  it('coins weigh 50 per lb (100 gp + 50 sp = +3 lb)', () => {
    const rich = compute({ ...fenrir, money: { cp: 0, sp: 50, gp: 100, pp: 0, other: '' } }, rules, { level: 8 })
    expect(rich.load.carried.lb).toBeCloseTo(97.6 + 3, 5)
  })
  it('a worn custom item applies its bonuses (ring +1 deflection)', () => {
    const ring = {
      uid: 'r',
      kind: 'custom' as const,
      refId: '',
      quantity: 1,
      location: 'worn' as const,
      custom: { weightLb: 0, costGp: 0, text: { en: '', fr: '' }, slot: 'ring' as const, modifiers: [{ target: 'ac', bonusType: 'deflection' as const, value: 1 }] },
    }
    expect(compute({ ...fenrir, inventory: [...fenrir.inventory, ring] }, rules, { level: 8 }).ac.total).toBe(22)
  })
})

describe('conditions', () => {
  const withEffects = (...ids: string[]) =>
    compute(
      { ...fenrir, activeEffects: ids.map((id, i) => ({ uid: `c${i}`, kind: 'condition' as const, refId: id, enabled: true })) },
      rules,
      { level: 8 },
    )
  it('exhausted replaces fatigued (−6, not −8)', () => {
    expect(withEffects('fatigued', 'exhausted').abilities.str.score.total).toBe(12)
  })
  it('shaken and sickened (different sources, untyped) stack on attacks', () => {
    expect(withEffects('shaken', 'sickened').attacks.find((a) => a.itemUid === 'greatsword')!.attack.total).toBe(11)
  })
  it('prone: the two situational AC modifiers are toggled separately', () => {
    const prone = withEffects('prone')
    const parts = prone.ac.parts.filter((p) => p.sourceId.startsWith('condition:prone'))
    expect(parts).toHaveLength(2)
    expect(new Set(parts.map((p) => p.toggleKey)).size).toBe(2)
    expect(prone.ac.total).toBe(21)
  })
  it('flat-footed: no Dex, no dodge', () => {
    expect(withEffects('flat-footed').ac.total).toBe(20)
  })
})

describe('rule warnings', () => {
  const warnings = validate(fenrir, rules)
  const ids = warnings.map((w) => w.id)
  it('flags the 6 unspent skill points at levels 5–6 and the open level-9 choices', () => {
    expect(ids).toContain('skill-points-5')
    expect(ids).toContain('skill-points-6')
    expect(ids).toContain('skill-points-9')
    expect(ids).toContain('feat-missing-general-9')
  })
  it('flags Spring Attack as unusable in heavy armor', () => expect(ids).toContain('unusable-spring-attack'))
  it('two items on one slot are flagged (armor + robe on the body)', () => {
    const robed = { ...fenrir, inventory: [...fenrir.inventory, { uid: 'robe', kind: 'magic' as const, refId: 'robe-of-blending', quantity: 1, location: 'worn' as const }] }
    expect(validate(robed, rules).map((w) => w.id)).toContain('slot-body')
  })
  it('no errors in the build itself', () => {
    expect(warnings.filter((w) => w.severity === 'error')).toEqual([])
  })
})
