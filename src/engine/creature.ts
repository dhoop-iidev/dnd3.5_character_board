// Creatures: animal companions and summoned creatures. Starts from the SRD stat block as printed and applies explained
// adjustments: companion advancement (bonus HD, natural armor, Str/Dex: https://www.d20srd.org/srd/classes/druid.htm#animalCompanion),
// Augment Summoning (+4 Str and Con: https://www.d20srd.org/srd/feats.htm#augmentSummoning), and the hit point option
// (maximum hit dice or hit points entered by hand).
import type { Rules } from '../data/rules'
import type { AbilityId, CompanionAdvancementRow, CreatureAttack, CreatureDef, I18n, TemplateDef } from '../data/types'
import { ABILITIES } from '../data/types'
import { i18n, resolve, type Part, type Stat } from './stacking'

const mod = (score: number | null) => (score === null ? 0 : Math.floor((score - 10) / 2))
const DRUID = 'https://www.d20srd.org/srd/classes/druid.htm#animalCompanion'
const AUGMENT = 'https://www.d20srd.org/srd/feats.htm#augmentSummoning'
const TYPES = 'https://www.d20srd.org/srd/typesSubtypesAbilities.htm'

/** Base attack progression and good saves per creature type (https://www.d20srd.org/srd/typesSubtypesAbilities.htm). */
const TYPE_RULES: Record<string, { bab: 1 | 0.75 | 0.5; good: ('fort' | 'ref' | 'will')[] }> = {
  animal: { bab: 0.75, good: ['fort', 'ref'] },
  'magical-beast': { bab: 1, good: ['fort', 'ref'] },
  vermin: { bab: 0.75, good: ['fort'] },
  plant: { bab: 0.75, good: ['fort'] },
  fey: { bab: 0.5, good: ['ref', 'will'] },
  elemental: { bab: 0.75, good: [] },
  outsider: { bab: 1, good: ['fort', 'ref', 'will'] },
  giant: { bab: 0.75, good: ['fort'] },
  humanoid: { bab: 0.75, good: [] },
  'monstrous-humanoid': { bab: 1, good: ['ref', 'will'] },
  dragon: { bab: 1, good: ['fort', 'ref', 'will'] },
}
const babFor = (t: string, hd: number) => Math.floor(hd * (TYPE_RULES[t]?.bab ?? 0.75))
const saveFor = (good: boolean, hd: number) => (good ? 2 + Math.floor(hd / 2) : Math.floor(hd / 3))

export interface CreatureOptions {
  /** Companion advancement row (bonus HD, natural armor, Str/Dex, special). */
  advancement?: CompanionAdvancementRow
  /** Augment Summoning: +4 enhancement bonus to Str and Con. */
  augment?: boolean
  /** Maximum hit points for every hit die (otherwise `hpManual`, or the printed average). */
  maxHp?: boolean
  hpManual?: number
  /** Celestial / fiendish template (Summon Monster): damage reduction, resistances, spell resistance by Hit Dice,
   * smite, darkvision, Int at least 3 (https://www.d20srd.org/srd/monsters/celestialCreature.htm). */
  template?: TemplateDef
}

export interface CreatureAttackLine {
  attack: CreatureAttack
  bonus: Stat
  /** Bonuses of the iterative attacks after the first (weapons: +9/+4). */
  iterative: number[]
  damage: string
  /** Damage bonus explanation. */
  damageBonus: Stat
}

export interface CreatureSheet {
  def: CreatureDef
  hitDice: number
  hpMax: Stat
  abilities: Record<AbilityId, { score: number | null; mod: number; stat: Stat }>
  ac: Stat
  touch: Stat
  flatFooted: Stat
  initiative: Stat
  bab: Stat
  grapple: Stat
  saves: Record<'fort' | 'ref' | 'will', Stat>
  /** Full attack (first routine). */
  attacks: CreatureAttackLine[]
  /** Alternative full attacks ("or" in the stat block). */
  altAttacks: CreatureAttackLine[][]
  /** Template applied: name, damage reduction, resistances, spell resistance, smite. */
  template?: { def: TemplateDef; dr: string; resistances: I18n; sr: number }
  /** Companion special abilities gained (link, share spells, evasion…). */
  special: { id: string; name: I18n; text: I18n }[]
  /** Type line, after a template (a celestial/fiendish animal or vermin becomes a magical beast). */
  typeText: I18n
  /** Companion bonus Hit Dice: feats, ability increases and skill points they entitle to (described only, not applied;
   * https://www.d20srd.org/srd/improvingMonsters.htm). */
  bonusHdGains?: { feats: number; abilityIncreases: number; skillPoints: number }
}

function parseDamage(dmg: string): { dice: string; bonus: number } {
  const m = dmg.match(/^\s*([0-9]+d[0-9]+)?\s*([-+−]\s*\d+)?/)
  return { dice: m?.[1] ?? '', bonus: m?.[2] ? Number(m[2].replace('−', '-').replace(/\s/g, '')) : 0 }
}
const fmtDmg = (dice: string, bonus: number) => (dice ? `${dice}${bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : ''}` : `${Math.max(1, bonus)}`)
/** Str modifier to damage with a factor (×½, ×1, ×1½): a bonus is multiplied, a penalty applies in full
 * (https://www.d20srd.org/srd/combat/combatStatistics.htm#damage); factor 0 = no Str (grab-only arms). */
const strToDamage = (m: number, f: number) => (f === 0 ? 0 : m > 0 ? Math.floor(m * f) : m)

export function computeCreature(def: CreatureDef, opts: CreatureOptions = {}): CreatureSheet {
  const adv = opts.advancement
  const src = def.source
  const advSource = { srdUrl: DRUID }
  const printed = (label: I18n, value: number): Part => ({ sourceId: 'statblock', label, value, bonusType: 'base', source: src })
  const STAT = i18n('Stat block', 'Profil')

  // ---- abilities
  const abilities = {} as CreatureSheet['abilities']
  const delta = {} as Record<AbilityId, number>
  for (const a of ABILITIES) {
    const base = def.abilities[a]
    const parts: Part[] = []
    if (base !== null) parts.push(printed(STAT, base))
    if (base !== null && adv?.strDexAdj && (a === 'str' || a === 'dex'))
      parts.push({ sourceId: 'companion', label: i18n('Companion Str/Dex adjustment', 'Ajustement For/Dex du compagnon'), value: adv.strDexAdj, bonusType: 'base', source: advSource })
    if (base !== null && opts.augment && (a === 'str' || a === 'con'))
      parts.push({ sourceId: 'augment', label: i18n('Augment Summoning', 'Convocation suprême'), value: 4, bonusType: 'enhancement', source: { srdUrl: AUGMENT } })
    // Celestial/fiendish: Intelligence at least 3.
    if (opts.template && a === 'int' && base !== null && base < 3)
      parts.push({ sourceId: 'template', label: opts.template.name, value: 3 - base, bonusType: 'base', source: opts.template.source })
    const stat = resolve(parts)
    const score = base === null ? null : stat.total
    abilities[a] = { score, mod: mod(score), stat }
    delta[a] = mod(score) - mod(base)
  }

  // ---- hit dice, BAB, saves (bonus HD follow the creature type's progressions)
  const bonusHD = adv?.bonusHD ?? 0
  const hd = def.hitDice.count + bonusHD
  // Extra Hit Dice groups (class levels: celestial charger 8d10 + 7d8) count for hit points, the template and the total.
  const extraGroups = def.hitDice.extra ?? []
  const extraHd = extraGroups.reduce((n, g) => n + g.count, 0)
  const totalHd = hd + extraHd
  const dBab = babFor(def.type, hd) - babFor(def.type, def.hitDice.count)
  const babParts: Part[] = [printed(STAT, def.bab)]
  if (dBab) babParts.push({ sourceId: 'bonus-hd', label: i18n(`+${bonusHD} HD (companion)`, `+${bonusHD} DV (compagnon)`), value: dBab, bonusType: 'base', source: advSource })
  const bab = resolve(babParts)

  // ---- hit points
  const conMod = abilities.con.mod
  const extra = def.hitDice.bonus - mod(def.abilities.con) * (def.hitDice.count + extraHd) // Toughness etc. in the printed bonus
  const hpParts: Part[] = []
  if (opts.maxHp) {
    const dice = [`${hd}d${def.hitDice.die}`, ...extraGroups.map((g) => `${g.count}d${g.die}`)].join(' + ')
    const maxDice = hd * def.hitDice.die + extraGroups.reduce((n, g) => n + g.count * g.die, 0)
    hpParts.push({ sourceId: 'hd', label: i18n(`${dice} maximum`, `${dice} au maximum`), value: maxDice, bonusType: 'base', source: { srdUrl: TYPES } })
    hpParts.push({ sourceId: 'con', label: i18n(`Con ${conMod >= 0 ? '+' : ''}${conMod} × ${totalHd}`, `Con ${conMod >= 0 ? '+' : ''}${conMod} × ${totalHd}`), value: conMod * totalHd, bonusType: 'ability' })
    if (extra) hpParts.push({ sourceId: 'extra', label: i18n('Other (feats)', 'Autres (dons)'), value: extra, bonusType: 'base', source: src })
  } else if (opts.hpManual !== undefined) {
    hpParts.push({ sourceId: 'manual', label: i18n('Hit points entered', 'Points de vie saisis'), value: opts.hpManual, bonusType: 'base' })
  } else {
    hpParts.push(printed(i18n('Average hit points (stat block)', 'Points de vie moyens (profil)'), def.hp))
    if (bonusHD) hpParts.push({ sourceId: 'bonus-hd', label: i18n(`+${bonusHD}d${def.hitDice.die} (average)`, `+${bonusHD}d${def.hitDice.die} (moyenne)`), value: Math.floor((bonusHD * (def.hitDice.die + 1)) / 2) + mod(def.abilities.con) * bonusHD, bonusType: 'base', source: advSource })
    if (delta.con) hpParts.push({ sourceId: 'con', label: i18n(`Con change × ${totalHd} HD`, `Variation de Con × ${totalHd} DV`), value: delta.con * totalHd, bonusType: 'ability' })
  }
  const hpMax = resolve(hpParts)
  hpMax.total = Math.max(totalHd, hpMax.total)

  // ---- saves
  const saveAbility = { fort: 'con', ref: 'dex', will: 'wis' } as const
  // Good or poor save: read from the printed save (base = save − ability modifier), which also covers creatures with
  // other good saves than their type's (dire animals); fall back to the type when it doesn't match either progression.
  const typeGood = TYPE_RULES[def.type]?.good ?? []
  const isGood = (s: 'fort' | 'ref' | 'will') => {
    const base = def.saves[s] - mod(def.abilities[saveAbility[s]])
    if (base === saveFor(true, def.hitDice.count)) return true
    if (base === saveFor(false, def.hitDice.count)) return false
    return typeGood.includes(s)
  }
  const saves = {} as CreatureSheet['saves']
  for (const s of ['fort', 'ref', 'will'] as const) {
    const parts: Part[] = [printed(STAT, def.saves[s])]
    const dBase = saveFor(isGood(s), hd) - saveFor(isGood(s), def.hitDice.count)
    if (dBase) parts.push({ sourceId: 'bonus-hd', label: i18n(`+${bonusHD} HD`, `+${bonusHD} DV`), value: dBase, bonusType: 'base', source: advSource })
    const d = delta[saveAbility[s]]
    if (d) parts.push({ sourceId: 'ability', label: i18n(`${saveAbility[s].toUpperCase()} change`, `Variation de ${saveAbility[s].toUpperCase()}`), value: d, bonusType: 'ability' })
    saves[s] = resolve(parts)
  }

  // ---- AC, initiative, grapple
  const acParts: Part[] = [printed(STAT, def.ac.total)]
  if (adv?.naturalArmorAdj)
    acParts.push({ sourceId: 'natural', label: i18n('Companion natural armor', 'Armure naturelle du compagnon'), value: adv.naturalArmorAdj, bonusType: 'naturalArmor', source: advSource })
  if (delta.dex) acParts.push({ sourceId: 'dex', label: i18n('Dex change', 'Variation de Dex'), value: delta.dex, bonusType: 'ability' })
  const ac = resolve(acParts)
  const touch = resolve([printed(STAT, def.ac.touch), ...(delta.dex ? [{ ...acParts.at(-1)! }] : [])])
  const flatFooted = resolve([printed(STAT, def.ac.flatFooted), ...(adv?.naturalArmorAdj ? [acParts[1]] : [])])
  const initiative = resolve([printed(STAT, def.initiative), ...(delta.dex ? [{ sourceId: 'dex', label: i18n('Dex change', 'Variation de Dex'), value: delta.dex, bonusType: 'ability' as const }] : [])])
  const grapple = resolve([
    printed(STAT, def.grapple),
    ...(dBab ? [{ ...babParts[1] }] : []),
    ...(delta.str ? [{ sourceId: 'str', label: i18n('Str change', 'Variation de For'), value: delta.str, bonusType: 'ability' as const }] : []),
  ])

  // ---- attacks: printed bonus + BAB change + attack ability change; damage: Str change × its factor
  const special = adv?.special ?? []
  // Companion multiattack (https://www.d20srd.org/srd/classes/druid.htm#animalCompanion): with three or more natural
  // attacks, the Multiattack feat (secondary attacks at −2 instead of −5); otherwise a second attack with its primary
  // natural weapon at −5. An animal whose natural attacks are all secondary (horse, camel) has no primary weapon:
  // nothing is added (house rule #25, pending).
  const naturalCount = def.attacks.filter((a) => a.role !== 'weapon').reduce((n, a) => n + a.count, 0)
  const hasMultiattackBand = special.some((x) => x.id === 'multiattack')
  const multiattack = hasMultiattackBand && naturalCount >= 3
  const extraPrimary = hasMultiattackBand && naturalCount < 3 ? def.attacks.find((a) => a.role === 'primary') : undefined
  const attackLine = (atk: CreatureAttack): CreatureAttackLine => {
    const parts: Part[] = [printed(STAT, atk.bonus)]
    if (dBab) parts.push({ ...babParts[1] })
    const dA = delta[atk.attackAbility]
    if (dA) parts.push({ sourceId: 'ability', label: i18n(`${atk.attackAbility.toUpperCase()} change`, `Variation de ${atk.attackAbility === 'str' ? 'For' : 'Dex'}`), value: dA, bonusType: 'ability' })
    // Companion multiattack: secondary natural attacks at −2 instead of −5 (https://www.d20srd.org/srd/monsterFeats.htm#multiattack).
    if (multiattack && atk.role === 'secondary')
      parts.push({ sourceId: 'multiattack', label: i18n('Multiattack', 'Attaques multiples'), value: 3, bonusType: 'untyped', source: { srdUrl: 'https://www.d20srd.org/srd/monsterFeats.htm#multiattack' } })
    const { dice, bonus } = parseDamage(atk.damage)
    const oldStr = mod(def.abilities.str)
    const newStr = abilities.str.mod
    const f = atk.strDamageFactor
    const dDmg = strToDamage(newStr, f) - strToDamage(oldStr, f)
    const damageBonus = resolve([
      printed(i18n('Damage bonus (stat block)', 'Bonus aux dégâts (profil)'), bonus),
      ...(dDmg ? [{ sourceId: 'str', label: i18n(`Str change × ${f}`, `Variation de For × ${f}`), value: dDmg, bonusType: 'ability' as const }] : []),
    ])
    const total = resolve(parts)
    // Iterative attacks (+9/+4): each one moves with the first.
    const iterative = (atk.iterative ?? []).map((b) => b + total.total - atk.bonus)
    if (atk === extraPrimary) iterative.push(total.total - 5)
    // A printed "0" (grab-only arms, webs) stays 0.
    const damage = /^\s*0\s*$/.test(atk.damage) ? '0' : fmtDmg(dice, damageBonus.total)
    return { attack: atk, bonus: total, iterative, damage, damageBonus }
  }
  const attacks = def.attacks.map(attackLine)
  // Alternative full attacks ("or" in the stat block).
  const altAttacks = (def.altAttacks ?? []).map((r) => r.map(attackLine))

  const t = opts.template
  const band = t?.bands.find((b) => hd >= b.minHD && hd <= b.maxHD)
  const template = t ? { def: t, dr: band?.dr ?? '—', resistances: band?.resistances ?? { en: '—', fr: '—' }, sr: Math.min(25, totalHd + t.srPlusHD) } : undefined
  // Celestial/fiendish: an animal or vermin becomes a magical beast (https://www.d20srd.org/srd/monsters/celestialCreature.htm).
  const beast = !!t && (def.type === 'animal' || def.type === 'vermin')
  const typeText = beast
    ? {
        en: def.typeText.en.replace(/\b(animal|vermin)\b/i, (w) => `magical beast (augmented ${w.toLowerCase()})`),
        fr: def.typeText.fr.replace(/\b(animal|vermine)\b/i, (w) => `créature magique (${w.toLowerCase()} augmenté${/vermine/i.test(w) ? 'e' : ''})`),
      }
    : def.typeText
  // Companion bonus HD: a feat per 3 HD, an ability increase per 4 HD, skill points per HD (animal: 2 + Int, min 1)
  // (https://www.d20srd.org/srd/improvingMonsters.htm).
  const bonusHdGains = bonusHD
    ? {
        feats: Math.floor(hd / 3) - Math.floor(def.hitDice.count / 3),
        abilityIncreases: Math.floor(hd / 4) - Math.floor(def.hitDice.count / 4),
        skillPoints: bonusHD * Math.max(1, 2 + abilities.int.mod),
      }
    : undefined
  return { def, hitDice: totalHd, hpMax, abilities, ac, touch, flatFooted, initiative, bab, grapple, saves, attacks, altAttacks, template, special, typeText, bonusHdGains }
}

/** Effective druid level for the animal companion: druid level + ½ ranger level from ranger 4 (FAQ p. 29). */
export function companionLevel(classLevels: Record<string, number>): number {
  const ranger = classLevels['ranger'] ?? 0
  return (classLevels['druid'] ?? 0) + (ranger >= 4 ? Math.floor(ranger / 2) : 0)
}

/** Advancement row for a companion: effective level minus the alternative animal's level adjustment. */
export function companionAdvancement(rules: Rules, effectiveLevel: number, levelAdjustment = 0): CompanionAdvancementRow | undefined {
  const lvl = effectiveLevel + levelAdjustment
  const rows = rules.companions?.advancement ?? []
  const row = rows.find((r) => lvl >= r.minLevel && lvl <= r.maxLevel)
  // Special abilities accumulate: each band of the table lists only the new ones.
  return row && { ...row, special: rows.filter((r) => r.minLevel <= row.minLevel).flatMap((r) => r.special) }
}
