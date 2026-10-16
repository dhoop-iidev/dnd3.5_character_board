// Tome of Battle rules (house rule #15): initiator level, maneuvers known/readied/stances, learning checks, recovery.
// Sources: Tome of Battle pp. 8–26 (crusader, swordsage, warblade), 37–46 (blade magic), 95–96 (prestige classes
// advancing a martial progression). Numbers only; our own wording.
import type { Rules } from '../data/rules'
import type { ManeuverDef, ManeuverEffect } from '../data/types'
import type { Character, MartialState, TurnStage } from '../model/character'

/** Martial adept base classes (Tome of Battle chapter 1). */
export const MARTIAL_CLASSES = ['crusader', 'swordsage', 'warblade']

export interface MartialCaps {
  /** Martial adept class this progression belongs to (a prestige class's levels feed one of them). */
  classId: string
  /** Levels in that martial adept class. */
  classLevel: number
  /** Prestige class levels added to this progression (Tome of Battle p. 96). */
  advanceLevels: number
  /** Class level + prestige levels advancing it + ½ of all other levels, rounded down (pp. 39, 96). */
  initiatorLevel: number
  /** Highest maneuver level learnable at this initiator level (Table 3–1). */
  maxManeuverLevel: number
  maneuversKnown: number
  maneuversReadied: number
  stancesKnown: number
  /** Disciplines of the base class (a prestige class level uses its own list). */
  disciplines: string[]
}

/** Which martial progression a character level feeds (pp. 39, 96): a martial adept class level feeds itself; a prestige
 * class level that advances martial progression feeds the class chosen at its first level (`classChoices.martialClass`),
 * by default the martial adept class taken first. Undefined: no maneuvers at that level. */
export function martialOwner(char: Character, rules: Rules, L: number): string | undefined {
  const entry = char.levels[L - 1]
  if (!entry) return undefined
  if (MARTIAL_CLASSES.includes(entry.classId)) return entry.classId
  const cls = rules.classes.get(entry.classId)
  if (!cls?.martialAdvance) return undefined
  const firstOfPrc = char.levels.find((l) => l.classId === entry.classId)
  const chosen = firstOfPrc?.classChoices?.martialClass
  const taken = char.levels.slice(0, L).map((l) => l.classId).filter((id) => MARTIAL_CLASSES.includes(id))
  if (chosen && taken.includes(chosen)) return chosen
  return taken[0]
}

/** Prestige class levels (class id → level within it) up to L, with the increments of its martial advancement. */
function advanceAt(char: Character, rules: Rules, L: number) {
  const entry = char.levels[L - 1]
  const cls = rules.classes.get(entry.classId)
  const n = char.levels.slice(0, L).filter((l) => l.classId === entry.classId).length
  return cls?.martialAdvance?.levels.find((r) => r.level === n)
}

/** Every martial progression of the character after the first `upTo` levels. */
export function martialCapsAll(char: Character, rules: Rules, upTo = char.levels.length): MartialCaps[] {
  const levels = char.levels.slice(0, upTo)
  const out: MartialCaps[] = []
  for (const classId of MARTIAL_CLASSES) {
    const classLevel = levels.filter((l) => l.classId === classId).length
    if (!classLevel) continue
    const prog = rules.martialProgression.get(classId)
    const row = prog?.levels.find((r) => r.level === classLevel)
    if (!prog || !row) continue
    let advanceLevels = 0
    let known = row.maneuversKnown
    let readied = row.maneuversReadied
    let stances = row.stancesKnown
    for (let L = 1; L <= levels.length; L++) {
      if (MARTIAL_CLASSES.includes(levels[L - 1].classId) || martialOwner(char, rules, L) !== classId) continue
      const cls = rules.classes.get(levels[L - 1].classId)
      if (cls?.martialAdvance?.initiatorLevel === 'full') advanceLevels++
      const inc = advanceAt(char, rules, L)
      known += inc?.known ?? 0
      readied += inc?.readied ?? 0
      stances += inc?.stances ?? 0
    }
    const initiatorLevel = classLevel + advanceLevels + Math.floor((levels.length - classLevel - advanceLevels) / 2)
    const band = prog.highestManeuverLevelByInitiatorLevel.find(
      (b) => initiatorLevel >= b.minInitiatorLevel && initiatorLevel <= b.maxInitiatorLevel,
    )
    out.push({
      classId,
      classLevel,
      advanceLevels,
      initiatorLevel,
      maxManeuverLevel: band?.maneuverLevel ?? 9,
      maneuversKnown: known,
      maneuversReadied: readied,
      stancesKnown: stances,
      disciplines: rules.classes.get(classId)?.disciplines ?? [],
    })
  }
  return out
}

/** One martial progression: the given class, or the character's first one. */
export function martialCaps(char: Character, rules: Rules, upTo = char.levels.length, classId?: string): MartialCaps | null {
  const all = martialCapsAll(char, rules, upTo)
  return (classId ? all.find((c) => c.classId === classId) : all[0]) ?? null
}

/** Maneuvers and stances known after the first `upTo` levels (learned, minus swapped out), optionally only those of one
 * martial progression. */
export function knownManeuvers(char: Character, rules: Rules, upTo = char.levels.length, classId?: string): ManeuverDef[] {
  const ids: string[] = []
  char.levels.slice(0, upTo).forEach((l, i) => {
    if (classId && martialOwner(char, rules, i + 1) !== classId) return
    ids.push(...(l.maneuversLearned ?? []))
    if (l.maneuverSwap) {
      const k = ids.indexOf(l.maneuverSwap.from)
      if (k >= 0) ids.splice(k, 1)
      ids.push(l.maneuverSwap.to)
    }
  })
  return ids.map((id) => rules.maneuvers.get(id)).filter((m): m is ManeuverDef => !!m)
}

/** Disciplines a maneuver learned at level L may come from: the martial class's, or the prestige class's own list. */
export function disciplinesAt(char: Character, rules: Rules, L: number): string[] {
  const entry = char.levels[L - 1]
  const cls = entry && rules.classes.get(entry.classId)
  return cls?.martialAdvance?.disciplines ?? cls?.disciplines ?? []
}

/** Why a maneuver can't be learned now (empty = it can). Counts maneuvers already known of the same discipline. */
export function learnBlockers(def: ManeuverDef, known: ManeuverDef[], caps: MartialCaps, rules: Rules, disciplines = caps.disciplines): string[] {
  const out: string[] = []
  if (!rules.disciplines.has(def.discipline) || !disciplines.includes(def.discipline)) out.push('discipline not open to this class')
  if (def.level > caps.maxManeuverLevel) out.push(`level ${def.level} > ${caps.maxManeuverLevel} (initiator level ${caps.initiatorLevel})`)
  const sameDiscipline = known.filter((k) => k.discipline === def.discipline && k.id !== def.id).length
  if (sameDiscipline < def.prereqCount)
    out.push(`needs ${def.prereqCount} ${def.discipline} maneuvers known (has ${sameDiscipline})`)
  if (known.some((k) => k.id === def.id)) out.push('already known')
  return out
}

/** Recovery rule of the warblade (p. 22): swift action + melee attack, or standard action doing nothing else. */
export const WARBLADE_RECOVERY = {
  en: 'Recover all expended maneuvers: swift action followed by a melee attack (or a standard action doing nothing else). Not in a round where you initiate a maneuver or change stance.',
  fr: 'Récupérer toutes les manœuvres utilisées : action rapide suivie d’une attaque au corps à corps (ou d’une action simple sans rien faire d’autre). Impossible le round où vous initiez une manœuvre ou changez de posture.',
}

// ---- Running maneuvers: each effect ends at its own turn stage (Tome of Battle p. 45 "Duration").
// Stages: 0 your turn · 1 after your turn · 2 your next turn · 3 after your next turn …

/** First stage at which the effect no longer applies. */
export function effectEnd(e: Pick<ManeuverEffect, 'duration' | 'rounds'>): number {
  switch (e.duration) {
    case 'attack': // the strike's own attack(s)
    case 'endOfTurn': // boosts: until the end of your turn (p. 42)
      return 1
    case 'round': // 1 round: until just before your next turn (p. 45)
      return 2
    case 'rounds': // "until the end of your next turn" = 1 more turn
      return 1 + 2 * (e.rounds ?? 1)
    default: // minute, encounter, stance
      return Infinity
  }
}

/** Stage at which the whole maneuver stops running (extra dice: the strike; DR on a hit: 1 round, p. 84). */
export function maneuverEnd(def: ManeuverDef): number {
  const ends = (def.effects ?? []).map(effectEnd)
  if (def.extraDamage?.length) ends.push(1)
  if (def.damageReduction) ends.push(2)
  return ends.length ? Math.max(...ends) : 1
}

/** Advance running maneuvers at the end of your turn or the start of your next one; drops the finished ones. */
export function advanceManeuvers(state: MartialState, rules: Rules, event: 'endOfTurn' | 'startOfTurn'): void {
  state.active = state.active
    .map((a) => ({ ...a, stage: (event === 'endOfTurn' ? a.stage % 2 === 0 : a.stage % 2 === 1) ? a.stage + 1 : a.stage }))
    .filter((a) => {
      const def = rules.maneuvers.get(a.id)
      return !!def && a.stage < maneuverEnd(def)
    })
}

/** Is this effect of a running maneuver still applying at this stage? */
export const effectLive = (e: ManeuverEffect, stage: TurnStage) => stage < effectEnd(e)

/** Change (or leave) the stance: accumulated stance bonuses are lost (Blood in the Water, pp. 43, 86). */
export function setStance(state: MartialState, id: string | undefined): void {
  delete state.crits
  if (id) state.stance = id
  else delete state.stance
}

/** Recovery rule of each martial adept class (crusader pp. 9–10, swordsage p. 16, warblade p. 22); end of an
 * encounter recovers everything for all of them (p. 40). */
export const RECOVERY: Record<string, { en: string; fr: string }> = {
  warblade: WARBLADE_RECOVERY,
  swordsage: {
    en: 'Recover one expended maneuver of your choice: full-round action (does not provoke); usable again from your next turn.',
    fr: 'Récupérer une manœuvre utilisée au choix : action complexe (ne provoque pas) ; utilisable de nouveau à partir du tour suivant.',
  },
  crusader: {
    en: 'Granted at random: at the start of an encounter, some readied maneuvers are granted, the others withheld. At the end of each of your turns, one withheld maneuver is granted. When none is left to grant at the end of a turn, all are recovered and a new set is drawn. Only granted maneuvers can be initiated.',
    fr: 'Accordées au hasard : au début d’une rencontre, certaines manœuvres préparées sont accordées, les autres retenues. À la fin de chacun de vos tours, une manœuvre retenue est accordée. Quand il n’en reste plus à accorder en fin de tour, toutes sont récupérées et un nouveau tirage a lieu. Seules les manœuvres accordées peuvent être initiées.',
  },
}

/** Readied maneuvers (ids) that belong to one martial progression (p. 40: readied and expended are tracked per class). */
export function readiedOf(char: Character, rules: Rules, classId: string): string[] {
  const mine = new Set(knownManeuvers(char, rules, char.levels.length, classId).map((k) => k.id))
  return (char.martial?.readied ?? []).filter((id) => mine.has(id))
}

/** Crusader: number of maneuvers granted at a time (Table 1–1, 2 / 3 from 10th / 4 at 20th). */
export function crusaderGranted(rules: Rules, crusaderLevel: number): number {
  const row = rules.martialProgression.get('crusader')?.levels.find((r) => r.level === crusaderLevel) as
    | { maneuversGranted?: number }
    | undefined
  return row?.maneuversGranted ?? rules.martialProgression.get('crusader')?.grantedAtStart ?? 2
}

function draw(ids: string[], n: number, rand: () => number): string[] {
  const pool = [...ids]
  const out: string[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return out
}

/** Crusader, start of an encounter (or after a recovery): draw `g` granted maneuvers among the readied ones. */
export function crusaderDraw(state: MartialState, readied: string[], g: number, rand = Math.random): void {
  state.granted = draw(readied, g, rand)
}

/** Crusader, end of each turn (pp. 9–10, 40): grant one withheld maneuver at random; if none is withheld, recover the
 * crusader's expended maneuvers and draw a new granted set. Returns what happened. */
export function crusaderEndTurn(state: MartialState, readied: string[], g: number, rand = Math.random): 'granted' | 'recovered' | 'none' {
  if (!state.granted) return 'none'
  const withheld = readied.filter((id) => !state.granted!.includes(id))
  if (withheld.length) {
    state.granted = [...state.granted, ...draw(withheld, 1, rand)]
    return 'granted'
  }
  state.expended = state.expended.filter((id) => !readied.includes(id))
  crusaderDraw(state, readied, g, rand)
  return 'recovered'
}
