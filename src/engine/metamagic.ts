// Metamagic feats (https://www.d20srd.org/srd/feats.htm#metamagicFeats): a spell prepared (wizard, cleric, druid…) or
// cast (bard, sorcerer) with one or more metamagic feats uses a slot of a higher level; it otherwise works at its
// original level (save DC included), except Heighten Spell, which raises the spell's actual level. The same feat can't
// be applied twice to one spell. A spontaneous caster needs a full-round action (one extra full-round action for a
// longer casting time), however many feats he applies, and can't use Quicken Spell (FAQ 6/30/2008 p. 37; rulings C36).
import type { Rules } from '../data/rules'
import type { I18n, SpellDef } from '../data/types'
import type { FeatPick } from '../model/character'
import { hasSomatic } from './arcane'
import { i18n } from './stacking'

const SRD = 'https://www.d20srd.org/srd/'
export const METAMAGIC_URL = `${SRD}feats.htm#metamagicFeats`

export interface MetamagicDef {
  id: string
  /** Slot levels added (Heighten Spell: the chosen new level instead, see `MetamagicChoice.heighten`). */
  adj: number
}

/** The nine SRD metamagic feats and their slot level adjustment (names: feats.json). */
export const METAMAGIC: MetamagicDef[] = [
  { id: 'empower-spell', adj: 2 },
  { id: 'enlarge-spell', adj: 1 },
  { id: 'extend-spell', adj: 1 },
  { id: 'heighten-spell', adj: 0 },
  { id: 'maximize-spell', adj: 3 },
  { id: 'quicken-spell', adj: 4 },
  { id: 'silent-spell', adj: 1 },
  { id: 'still-spell', adj: 1 },
  { id: 'widen-spell', adj: 3 },
]

export const metamagicDef = (id: string) => METAMAGIC.find((m) => m.id === id)

/** Feat name (official French term) from feats.json. */
export const metamagicName = (rules: Rules, id: string): I18n => rules.feats.get(id)?.name ?? i18n(id, id)

/** Metamagic feats the character has (usable ones: a lost prerequisite removes a feat from the sheet). */
export const ownedMetamagic = (feats: FeatPick[]) => METAMAGIC.filter((m) => feats.some((f) => f.featId === m.id)).map((m) => m.id)

export interface MetamagicChoice {
  metamagic?: string[]
  /** Heighten Spell: the spell's new level. */
  heighten?: number
}

/** Spell level after Heighten Spell (its actual level: save DC, globes…). */
export const actualLevel = (spellLevel: number, c: MetamagicChoice) =>
  c.metamagic?.includes('heighten-spell') && c.heighten !== undefined ? Math.max(spellLevel, c.heighten) : spellLevel

/** Slot level used: the (heightened) level plus every other feat's adjustment. */
export function slotLevel(spellLevel: number, c: MetamagicChoice): number {
  const extra = (c.metamagic ?? []).reduce((n, id) => n + (id === 'heighten-spell' ? 0 : (metamagicDef(id)?.adj ?? 0)), 0)
  return actualLevel(spellLevel, c) + extra
}

/** No somatic component once stilled: no arcane spell failure (https://www.d20srd.org/srd/feats.htm#stillSpell). */
export const somaticAfter = (sp: SpellDef, c: MetamagicChoice) => hasSomatic(sp) && !c.metamagic?.includes('still-spell')

/** Casting time of a casting time text, in "full-round units": 1 for a standard action or 1 round, more for longer. */
function longerThanFullRound(sp: SpellDef): boolean | undefined {
  const t = sp.castingTime.en.toLowerCase()
  if (/standard action|free action|swift action|immediate action|full[- ]round action|^1 round/.test(t)) return false
  if (/minute|hour|\d+ rounds|day/.test(t)) return true
  return undefined
}

export interface MetamagicProblem {
  kind: 'illegal' | 'noEffect'
  text: I18n
}

/**
 * Why a metamagic application isn't allowed (illegal) or does nothing (noEffect).
 * `spontaneous`: cast on the spot by a bard or sorcerer (or a cleric's cure/inflict); `bard`: a bard spell.
 */
export function metamagicProblems(
  sp: SpellDef,
  spellLevel: number,
  c: MetamagicChoice,
  opts: { owned: string[]; spontaneous: boolean; bard: boolean; maxLevel: number },
): MetamagicProblem[] {
  const out: MetamagicProblem[] = []
  const ids = c.metamagic ?? []
  const bad = (en: string, fr: string) => out.push({ kind: 'illegal', text: i18n(en, fr) })
  const none = (en: string, fr: string) => out.push({ kind: 'noEffect', text: i18n(en, fr) })
  if (new Set(ids).size !== ids.length) bad('the same metamagic feat can’t be applied twice', 'le même don de métamagie ne s’applique pas deux fois')
  for (const id of ids) {
    if (!metamagicDef(id)) bad(`${id}: not a metamagic feat`, `${id} : pas un don de métamagie`)
    else if (!opts.owned.includes(id)) bad(`${id}: feat not known`, `${id} : don non acquis`)
  }
  if (ids.includes('quicken-spell')) {
    if (opts.spontaneous) bad('Quicken Spell can’t be used on a spell cast spontaneously', 'Incantation rapide ne s’applique pas à un sort lancé spontanément')
    if (longerThanFullRound(sp)) bad('Quicken Spell: casting time longer than 1 full round', 'Incantation rapide : temps d’incantation supérieur à 1 round complet')
  }
  if (ids.includes('silent-spell')) {
    if (opts.bard) bad('Silent Spell can’t be applied to bard spells', 'Incantation silencieuse ne s’applique pas aux sorts de barde')
    else if (!/(^|[\s,])V($|[\s,/])/.test(sp.components)) none('Silent Spell: no verbal component', 'Incantation silencieuse : pas de composante verbale')
  }
  if (ids.includes('still-spell') && !hasSomatic(sp)) none('Still Spell: no somatic component', 'Incantation statique : pas de composante gestuelle')
  if (ids.includes('enlarge-spell') && !/^(close|medium|long)\b/i.test(sp.range.en.trim()))
    none('Enlarge Spell: range not close, medium or long', 'Extension de portée : portée ni courte, ni moyenne, ni longue')
  if (ids.includes('extend-spell') && /^(instantaneous|permanent|concentration)\b/i.test(sp.duration.en.trim()) && !/\d/.test(sp.duration.en))
    none('Extend Spell: instantaneous, permanent or concentration duration', 'Extension de durée : durée instantanée, permanente ou concentration')
  if (ids.includes('widen-spell') && !/\b(burst|emanation|line|spreads?)\b/i.test([sp.area?.en, sp.effect?.en, sp.target?.en].join(' ')))
    none('Widen Spell: no burst, emanation, line or spread area', 'Extension de zone d’effet : pas de zone en rayonnement, émanation, ligne ou étendue')
  if (ids.includes('heighten-spell') && (c.heighten === undefined || c.heighten <= spellLevel))
    bad('Heighten Spell: choose a level above the spell’s', 'Augmentation d’intensité : choisir un niveau supérieur à celui du sort')
  const slot = slotLevel(spellLevel, c)
  if (actualLevel(spellLevel, c) > 9) bad('Heighten Spell: 9th level at most', 'Augmentation d’intensité : 9e niveau au maximum')
  if (slot > opts.maxLevel) bad(`needs a level ${slot} slot (the class has none above ${opts.maxLevel})`, `il faut un emplacement de niveau ${slot} (la classe n’en a pas au-delà du niveau ${opts.maxLevel})`)
  return out
}

/** Casting time of a metamagic spell cast spontaneously (https://www.d20srd.org/srd/feats.htm#metamagicFeats). */
export function spontaneousCastingTime(sp: SpellDef): I18n {
  const longer = longerThanFullRound(sp)
  return longer
    ? i18n(`${sp.castingTime.en} + 1 full-round action`, `${sp.castingTime.fr} + 1 action complexe`)
    : i18n('1 full-round action (metamagic, spontaneous)', '1 action complexe (métamagie, sort spontané)')
}

/** "Empowered, Extended magic missile" style label. */
export function metamagicLabel(rules: Rules, c: MetamagicChoice): I18n {
  const ids = c.metamagic ?? []
  const parts = ids.map((id) => {
    const n = metamagicName(rules, id)
    return id === 'heighten-spell' && c.heighten !== undefined ? i18n(`${n.en} (level ${c.heighten})`, `${n.fr} (niveau ${c.heighten})`) : n
  })
  return i18n(parts.map((p) => p.en).join(', '), parts.map((p) => p.fr).join(', '))
}
