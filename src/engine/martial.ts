// Tome of Battle rules (house rule #15): initiator level, maneuvers known/readied/stances, learning checks.
// Sources: Tome of Battle pp. 20–23 (warblade), 37–46 (blade magic). Numbers only; our own wording.
import type { Rules } from '../data/rules'
import type { ManeuverDef, ManeuverEffect } from '../data/types'
import type { Character, MartialState, TurnStage } from '../model/character'

/** Martial adept classes modeled so far (only the warblade, as requested). */
export const MARTIAL_CLASSES = ['warblade']

export interface MartialCaps {
  /** Level in the martial adept class. */
  classLevel: number
  /** Class level + ½ of all other class levels, rounded down (p. 39). */
  initiatorLevel: number
  /** Highest maneuver level learnable at this initiator level (Table 3–1). */
  maxManeuverLevel: number
  maneuversKnown: number
  maneuversReadied: number
  stancesKnown: number
}

/** Class levels and initiator level after the first `upTo` character levels. */
export function martialCaps(char: Character, rules: Rules, upTo = char.levels.length): MartialCaps | null {
  const levels = char.levels.slice(0, upTo)
  const classLevel = levels.filter((l) => l.classId === 'warblade').length
  if (!classLevel) return null
  const prog = rules.martialProgression.get('warblade')!
  const initiatorLevel = classLevel + Math.floor((levels.length - classLevel) / 2)
  const row = prog.levels.find((r) => r.level === classLevel)!
  const band = prog.highestManeuverLevelByInitiatorLevel.find(
    (b) => initiatorLevel >= b.minInitiatorLevel && initiatorLevel <= b.maxInitiatorLevel,
  )
  return {
    classLevel,
    initiatorLevel,
    maxManeuverLevel: band?.maneuverLevel ?? 9,
    maneuversKnown: row.maneuversKnown,
    maneuversReadied: row.maneuversReadied,
    stancesKnown: row.stancesKnown,
  }
}

/** Maneuvers and stances known after the first `upTo` character levels (learned, minus swapped out). */
export function knownManeuvers(char: Character, rules: Rules, upTo = char.levels.length): ManeuverDef[] {
  const ids: string[] = []
  for (const l of char.levels.slice(0, upTo)) {
    ids.push(...(l.maneuversLearned ?? []))
    if (l.maneuverSwap) {
      const i = ids.indexOf(l.maneuverSwap.from)
      if (i >= 0) ids.splice(i, 1)
      ids.push(l.maneuverSwap.to)
    }
  }
  return ids.map((id) => rules.maneuvers.get(id)).filter((m): m is ManeuverDef => !!m)
}

/** Why a maneuver can't be learned now (empty = it can). Counts maneuvers already known of the same discipline. */
export function learnBlockers(def: ManeuverDef, known: ManeuverDef[], caps: MartialCaps, rules: Rules): string[] {
  const out: string[] = []
  if (!rules.disciplines.has(def.discipline)) out.push('discipline not open to the warblade')
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
