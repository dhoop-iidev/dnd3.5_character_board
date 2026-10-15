// One test per finding of docs/reviews/um_actually-2026-10-13.md (inputs are the reviewer's repros).
import { describe, expect, it } from 'vitest'
import { rules } from '../../data/rules'
import fenrirJson from '../../data/characters/chikibidouille.json'
import type { ActiveEffect, Character, ItemInstance } from '../../model/character'
import { compute } from '../compute'
import { skillBudget } from '../progression'
import { validate } from '../validate'

const fenrir = fenrirJson as unknown as Character
const at8 = (c: Partial<Character> = {}) => compute({ ...fenrir, ...c }, rules, { level: 8 })
const cond = (...ids: string[]): ActiveEffect[] => ids.map((id, i) => ({ uid: `c${i}`, kind: 'condition', refId: id, enabled: true }))
const weapon = (refId: string, extra: Partial<ItemInstance> = {}): ItemInstance => ({ uid: refId, kind: 'weapon', refId, quantity: 1, location: 'carried', ...extra })
const withWeapons = (items: ItemInstance[], extraLoadout: object = {}) => ({
  inventory: [...fenrir.inventory, ...items],
  loadouts: [{ id: 't', name: { en: 't', fr: 't' }, weapons: items.map((i) => i.uid), ...extraLoadout }],
  activeLoadout: 't',
})
const atk = (s: ReturnType<typeof compute>, uid: string) => s.attacks.find((a) => a.itemUid === uid)!

describe('M1 Jump and speed', () => {
  it('full plate (20 ft): −6 on Jump', () => expect(at8().skills.find((k) => k.key === 'jump')!.total.total).toBe(-5))
})

describe('m1 initiative is a Dex check', () => {
  it('shaken: −2 on initiative', () => expect(at8({ activeEffects: cond('shaken') }).initiative.total).toBe(1))
})

describe('m2 helpless, pinned, paralyzed', () => {
  it('helpless: Dex 0 for AC → 15', () => expect(at8({ activeEffects: cond('helpless') }).ac.total).toBe(15))
  it('paralyzed: Str 0', () => expect(at8({ activeEffects: cond('paralyzed') }).abilities.str.score.total).toBe(0))
})

describe('m3 Strength on ranged damage', () => {
  it('javelin and sling add Str (+4); crossbow ignores Str', () => {
    const s = at8(withWeapons([weapon('javelin'), weapon('sling'), weapon('light-crossbow')]))
    expect(atk(s, 'javelin').damage.total).toBe(4)
    expect(atk(s, 'sling').damage.total).toBe(4)
    expect(atk(s, 'light-crossbow').damage.total).toBe(0)
  })
})

describe('m4 Power Attack', () => {
  it('dagger: attack penalty applies, no damage bonus; unarmed strike gets the damage', () => {
    const s = at8({ ...withWeapons([weapon('dagger'), weapon('unarmed-strike')]), toggles: { ...fenrir.toggles, powerAttack: 3 } })
    expect(atk(s, 'dagger').attack.total).toBe(8 + 4 - 3) // BAB 8 + Str 4 − Power Attack 3
    expect(atk(s, 'dagger').damage.total).toBe(4) // light weapon: no Power Attack damage
    expect(atk(s, 'unarmed-strike').damage.total).toBe(4 + 3) // unarmed strike: Power Attack damage applies
  })
  it('longsword gripped two-handed: Str ×1.5 and PA ×2', () => {
    const s = at8({ ...withWeapons([weapon('longsword')], { twoHanded: ['longsword'] }), toggles: { ...fenrir.toggles, powerAttack: 2 } })
    expect(atk(s, 'longsword').damage.total).toBe(6 + 4)
  })
})

describe('m5 fighting defensively', () => {
  it('−4 on ranged attacks too', () => {
    const s = at8({ toggles: { ...fenrir.toggles, fightingDefensively: true } })
    expect(atk(s, 'longbow').attack.total).toBe(8 + 3 - 4)
  })
  it('Tumble 5 ranks: +3 dodge instead of +2', () => {
    const levels = structuredClone(fenrir.levels)
    levels[0].skillRanks['tumble'] = 5
    const s = at8({ levels, toggles: { ...fenrir.toggles, fightingDefensively: true } })
    expect(s.ac.total).toBe(24)
  })
})

describe('m6 haste', () => {
  it('speed capped at twice the normal speed; one extra attack', () => {
    const s = at8({ activeEffects: [{ uid: 'h', kind: 'magic', refId: 'potion-of-haste', enabled: true }] })
    expect(s.speed.current.ft).toBe(40)
    expect(atk(s, 'greatsword').iterative).toEqual([16, 16, 11])
  })
})

describe('m7 items and prerequisites / skill points', () => {
  it('a headband of intellect gives no skill points', () => {
    const c = { ...fenrir, inventory: [...fenrir.inventory, { uid: 'hb', kind: 'magic' as const, refId: 'headband-of-intellect-2', quantity: 1, location: 'worn' as const }] }
    expect(skillBudget(c, rules, 9).available).toBe(6) // warblade 4 + Int 1 + human 1; the headband adds nothing
  })
})

describe('m8 penalties applied, not only warned', () => {
  it('nonproficient bastard sword: −4', () => {
    const s = at8(withWeapons([weapon('bastard-sword')]))
    expect(atk(s, 'bastard-sword').attack.total).toBe(8 + 4 - 4)
  })
})

describe('m9 Weapon Master requirements lost', () => {
  it('Dex 12: no Superior Weapon Focus, no ki damage', () => {
    const s = compute({ ...fenrir, abilityDamage: { dex: 4 } }, rules)
    expect(atk(s, 'greatsword').attack.total).toBe(16)
    expect(atk(s, 'greatsword').kiDamageMax).toBeUndefined()
    expect(s.weaponMaster.kiDamagePerDay).toBe(0)
  })
})

describe('m10 French label', () => {
  it('Superior Weapon Focus is "suprême", not Greater Weapon Focus', () => {
    const wm3 = structuredClone(fenrir)
    wm3.levels[8].classId = 'weapon-master'
    const s = compute(wm3, rules)
    expect(atk(s, 'greatsword').attack.parts.find((p) => p.sourceId === 'wm:superior-weapon-focus')!.label.fr).toBe('Arme de prédilection suprême')
  })
})

describe('nitpicks', () => {
  it('n1 Combat Expertise toggle needs the feat', () => {
    const levels = structuredClone(fenrir.levels)
    levels[0].feats = levels[0].feats.filter((f) => f.featId !== 'combat-expertise')
    expect(at8({ levels, toggles: { ...fenrir.toggles, combatExpertise: 2 } }).ac.total).toBe(21)
  })
  it('n3 Speak Language has no key ability', () => {
    expect(at8().skills.find((k) => k.key === 'speak-language')!.total.parts.some((p) => p.sourceId === 'ability:int')).toBe(false)
  })
  it('n4 Weapon Focus on an exotic weapon requires proficiency', () => {
    const c = structuredClone(fenrir)
    c.levels[8].feats.push({ featId: 'weapon-focus', slot: 'general', choice: 'bastard-sword' })
    expect(validate(c, rules).some((w) => w.id === 'prereq-weapon-focus-9')).toBe(true)
  })
})

describe('actionable warnings (header badge)', () => {
  it('Fenrir: 3 levels with unspent points + 1 feat to choose; Spring Attack unusable is informative', () => {
    const w = validate(fenrir, rules)
    expect(w.filter((x) => x.actionable).map((x) => x.id).sort()).toEqual([
      'feat-missing-general-9',
      'maneuvers-missing-9',
      'skill-points-5',
      'skill-points-6',
      'skill-points-9',
      'stances-missing-9',
    ])
    expect(w.find((x) => x.id === 'unusable-spring-attack')!.actionable).toBe(false)
  })
})

describe('special materials and abilities', () => {
  const withArmor = (patch: Partial<ItemInstance>) => ({
    inventory: fenrir.inventory.map((i) => (i.uid === 'full-plate' ? { ...i, ...patch } : i)),
  })
  const withSword = (patch: Partial<ItemInstance>) => ({
    inventory: fenrir.inventory.map((i) => (i.uid === 'greatsword' ? { ...i, ...patch } : i)),
  })
  it('mithral full plate: ACP −3 (masterwork included), max Dex +3, half weight, medium for Spring Attack', () => {
    const c = { ...fenrir, ...withArmor({ material: 'mithral' }) }
    const s = compute(c, rules, { level: 8 })
    expect(s.armorCheckPenalty.total).toBe(-3)
    expect(s.maxDex.value).toBe(3)
    expect(s.load.carried.lb).toBeCloseTo(97.6 - 25, 5)
    expect(s.armor!.category).toBe('medium')
    expect(validate(c, rules).some((w) => w.id === 'unusable-spring-attack')).toBe(false)
  })
  it('adamantine full plate: DR 3/—', () => {
    expect(at8(withArmor({ material: 'adamantine' })).damageReduction.map((d) => d.value)).toEqual(['3/—'])
  })
  it('keen greatsword: 17–20; flaming burst: +1d6 fire and +1d10 on a ×2 crit; adamantine bypasses DR', () => {
    const s = at8(withSword({ properties: ['keen', 'flaming-burst'], material: 'adamantine' }))
    const gs = atk(s, 'greatsword')
    expect(gs.critRange).toBe(17)
    expect(gs.extraDamage.map((x) => x.dice)).toEqual(['1d6'])
    expect(gs.critExtraDamage.map((x) => x.dice)).toEqual(['1d10'])
    expect(gs.bypassDR).toContain('adamantine')
  })
  it('speed weapon and haste: one extra attack only (not cumulative)', () => {
    const s = at8({ ...withSword({ properties: ['speed'] }), activeEffects: [{ uid: 'h', kind: 'magic', refId: 'potion-of-haste', enabled: true }] })
    expect(atk(s, 'greatsword').iterative).toEqual([16, 16, 11])
  })
  it('alchemical silver: −1 damage', () => expect(atk(at8(withSword({ material: 'alchemical-silver' })), 'greatsword').damage.total).toBe(7))
  it('special ability on a non-magic weapon is flagged; total over +10 too', () => {
    const c1 = { ...fenrir, inventory: [...fenrir.inventory, { uid: 'k', kind: 'weapon' as const, refId: 'longsword', quantity: 1, location: 'carried' as const, properties: ['keen'] }] }
    expect(validate(c1, rules).some((w) => w.id === 'props-need-enh-k')).toBe(true)
  })
})
