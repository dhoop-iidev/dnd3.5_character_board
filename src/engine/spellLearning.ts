// Spells learned level by level: bard and sorcerer spells known (with the spell swap), wizard free spellbook spells.
// Shared by the rule checks and the Spells pane. https://www.d20srd.org/srd/classes/bard.htm#bardSpells,
// sorcerer.htm#sorcererSpells, wizard.htm#spellbooks; rulings-classes.md C31, C33.
import type { Rules } from '../data/rules'
import type { I18n } from '../data/types'
import type { Character } from '../model/character'
import { castableLevels, isSwapLevel, knownCaps, LEARNING_CLASSES, listLevel, spellLearnBlockers, wizardSchools } from './arcane'
import { compute } from './compute'
import { spellcastingAdvance } from './spells'
import { i18n } from './stacking'

/** Casting class whose spells are learned at character level L: the class taken (bard, sorcerer, wizard), or the one a
 * prestige level adds a spellcasting level to (spells known; for a wizard, the two free spellbook spells: house rule
 * #36, pending). */
export function spellOwner(char: Character, rules: Rules, L: number): string | undefined {
  const l = char.levels[L - 1]
  if (!l) return undefined
  if (LEARNING_CLASSES.includes(l.classId)) return l.classId
  const now = spellcastingAdvance(char.levels.slice(0, L), rules)
  const before = spellcastingAdvance(char.levels.slice(0, L - 1), rules)
  return Object.keys(now).find((id) => now[id] !== (before[id] ?? 0) && LEARNING_CLASSES.includes(id))
}

/** Effective spellcasting level of a class at character level L (class levels + prestige levels advancing it). */
export function castingLevelAt(char: Character, rules: Rules, classId: string, L: number): number {
  const own = char.levels.slice(0, L).filter((l) => l.classId === classId).length
  return own ? Math.min(20, own + (spellcastingAdvance(char.levels.slice(0, L), rules)[classId] ?? 0)) : 0
}

export interface SpellLearning {
  owner: string
  L: number
  /** Effective class level for spellcasting at L. */
  classLevel: number
  /** Spell levels that can be learned (table + key ability 10 + level). */
  castable: number[]
  /** Bard, sorcerer: new spells known per spell level at this level. */
  newByLevel?: Record<number, number>
  /** Wizard: free spellbook spells at this level (first wizard level: 3 + Int modifier 1st-level spells). */
  free?: number
  /** Wizard's first level: only 1st-level spells (all 0-level spells are in the book already). */
  onlyLevel?: number
  /** A spell known can be exchanged at this level (sorcerer 4, 6, 8…; bard 5, 8, 11…). */
  swap: boolean
  /** Highest spell level castable at this level (the swapped spell must be at least two levels lower). */
  highest: number
  /** Spells learned before this level (after earlier swaps). */
  knownBefore: string[]
  learned: string[]
  prohibited: string[]
}

export function spellLearning(char: Character, rules: Rules, L: number): SpellLearning | undefined {
  const owner = spellOwner(char, rules, L)
  const def = owner && rules.classes.get(owner)?.spellcasting
  if (!owner || !def) return undefined
  const n = castingLevelAt(char, rules, owner, L)
  const sheet = compute(char, rules, { level: L })
  const castable = castableLevels(rules, owner, n, sheet.abilities[def.ability].score.total)
  const highest = Math.max(-1, ...castable)
  const entry = char.levels[L - 1]
  const knownBefore = knownUpTo(char, rules, owner, L - 1)
  const base = { owner, L, classLevel: n, castable, highest, knownBefore, learned: entry.spellsLearned ?? [], swap: isSwapLevel(owner, n), prohibited: owner === 'wizard' ? wizardSchools(char).prohibited : [] }
  if (owner === 'wizard') {
    const first = n === 1 || !char.levels.slice(0, L - 1).some((l) => l.classId === 'wizard')
    return first
      ? { ...base, free: Math.max(0, 3 + sheet.abilities.int.mod), onlyLevel: 1, swap: false }
      : { ...base, free: 2, swap: false }
  }
  const now = knownCaps(rules, owner, n)
  const prev = castingLevelAt(char, rules, owner, L - 1) ? knownCaps(rules, owner, castingLevelAt(char, rules, owner, L - 1)) : []
  const newByLevel: Record<number, number> = {}
  now.forEach((v, lvl) => {
    const d = (v ?? 0) - (prev[lvl] ?? 0)
    if (d > 0 && castable.includes(lvl)) newByLevel[lvl] = d
  })
  return { ...base, newByLevel }
}

/** Bard / sorcerer spells known (wizard: free spellbook spells) up to level L, counting the prestige levels that
 * advance the class. */
export function knownUpTo(char: Character, rules: Rules, classId: string, L = char.levels.length): string[] {
  let out: string[] = []
  for (let i = 1; i <= L; i++) {
    if (spellOwner(char, rules, i) !== classId) continue
    const l = char.levels[i - 1]
    out.push(...(l.spellsLearned ?? []))
    if (l.spellSwap?.from && l.spellSwap.to && out.includes(l.spellSwap.from)) out = out.map((id) => (id === l.spellSwap!.from ? l.spellSwap!.to : id))
  }
  return out
}

/** Problems with the picks of one level: too many, missing, illegal spells, bad swap. */
export function learningProblems(rules: Rules, x: SpellLearning): { kind: 'extra' | 'missing' | 'illegal' | 'swap'; en: string; fr: string }[] {
  const out: { kind: 'extra' | 'missing' | 'illegal' | 'swap'; en: string; fr: string }[] = []
  const name = (id: string) => rules.spells.get(id)?.name ?? i18n(id, id)
  const seen = new Set(x.knownBefore)
  for (const id of x.learned) {
    const sp = rules.spells.get(id)
    if (!sp) {
      out.push({ kind: 'illegal', en: `unknown spell "${id}"`, fr: `sort inconnu « ${id} »` })
      continue
    }
    const why: I18n[] = spellLearnBlockers(rules, x.owner, sp, x.castable, x.prohibited)
    if (x.onlyLevel !== undefined && listLevel(rules, x.owner, id) !== x.onlyLevel) why.push(i18n(`only level ${x.onlyLevel} spells now`, `seulement des sorts de niveau ${x.onlyLevel} à ce niveau`))
    if (seen.has(id)) why.push(i18n('already known', 'déjà connu'))
    seen.add(id)
    if (why.length) out.push({ kind: 'illegal', en: `${name(id).en}: ${why.map((y) => y.en).join(', ')}`, fr: `${name(id).fr} : ${why.map((y) => y.fr).join(', ')}` })
  }
  if (x.free !== undefined) {
    if (x.learned.length > x.free) out.push({ kind: 'extra', en: `${x.learned.length - x.free} spell(s) too many (${x.free} free)`, fr: `${x.learned.length - x.free} sort(s) en trop (${x.free} gratuits)` })
    if (x.learned.length < x.free) out.push({ kind: 'missing', en: `${x.free - x.learned.length} free spellbook spell(s) to choose`, fr: `${x.free - x.learned.length} sort(s) gratuit(s) du grimoire à choisir` })
  }
  if (x.newByLevel) {
    const got: Record<number, number> = {}
    for (const id of x.learned) {
      const lvl = listLevel(rules, x.owner, id)
      if (lvl !== undefined) got[lvl] = (got[lvl] ?? 0) + 1
    }
    for (const lvl of new Set([...Object.keys(got), ...Object.keys(x.newByLevel)].map(Number))) {
      const want = x.newByLevel[lvl] ?? 0
      const have = got[lvl] ?? 0
      if (have > want) out.push({ kind: 'extra', en: `${have - want} level ${lvl} spell(s) too many (${want} new)`, fr: `${have - want} sort(s) de niveau ${lvl} en trop (${want} nouveau(x))` })
      if (have < want) out.push({ kind: 'missing', en: `${want - have} level ${lvl} spell(s) to learn`, fr: `${want - have} sort(s) de niveau ${lvl} à apprendre` })
    }
  }
  return out
}

/** Problems with a spell swap: allowed level, spell known, same level, at least two levels below the highest castable. */
export function swapProblems(rules: Rules, x: SpellLearning, swap: { from: string; to: string }): I18n[] {
  const out: I18n[] = []
  if (!x.swap) out.push(i18n('no spell swap at this level', 'pas d’échange de sort à ce niveau'))
  if (!x.knownBefore.includes(swap.from)) out.push(i18n('the replaced spell must be known', 'le sort remplacé doit être connu'))
  const a = listLevel(rules, x.owner, swap.from)
  const b = listLevel(rules, x.owner, swap.to)
  if (a === undefined || b === undefined || a !== b) out.push(i18n('both spells must be of the same level', 'les deux sorts doivent être du même niveau'))
  if (a !== undefined && a > x.highest - 2) out.push(i18n(`level ${a} is not two levels below the highest (${x.highest})`, `le niveau ${a} n’est pas inférieur de deux au plus haut (${x.highest})`))
  if (x.knownBefore.includes(swap.to) || x.learned.includes(swap.to)) out.push(i18n('the new spell is already known', 'le nouveau sort est déjà connu'))
  return out
}
