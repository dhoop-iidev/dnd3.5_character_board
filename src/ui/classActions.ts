// Class ability actions shared by the class features block and the turn bar: barbarian rage (start, end, fatigue),
// daily/weekly uses. https://www.d20srd.org/srd/classes/barbarian.htm#rage
import type { Character } from '../model/character'
import { newUid } from './items'

export const RAGE_KEY = 'class:rage'
/** Set when the barbarian raged in the current encounter (once per encounter); cleared at the end of the encounter. */
export const RAGE_ENCOUNTER_KEY = 'encounter:rage'

export const isRaging = (c: Character) => c.activeEffects.some((e) => e.kind === 'class' && e.refId === 'rage')

export function startRage(c: Character, rounds: number) {
  c.dailyUsesSpent[RAGE_KEY] = (c.dailyUsesSpent[RAGE_KEY] ?? 0) + 1
  c.dailyUsesSpent[RAGE_ENCOUNTER_KEY] = 1
  c.activeEffects.push({ uid: newUid(), kind: 'class', refId: 'rage', enabled: true, rounds })
}

/** End the rage (by choice or when its rounds run out): fatigued for the rest of the encounter, unless tireless; an
 * already fatigued barbarian becomes exhausted (https://www.d20srd.org/srd/conditionSummary.htm#fatigued). */
export function endRage(c: Character, tireless: boolean) {
  c.activeEffects = c.activeEffects.filter((e) => !(e.kind === 'class' && e.refId === 'rage'))
  if (tireless || c.activeEffects.some((e) => e.kind === 'condition' && e.refId === 'exhausted')) return
  if (c.activeEffects.some((e) => e.kind === 'condition' && e.refId === 'fatigued')) {
    c.activeEffects = c.activeEffects.filter((e) => !(e.kind === 'condition' && e.refId === 'fatigued'))
    c.activeEffects.push({ uid: newUid(), kind: 'condition', refId: 'exhausted', enabled: true })
  } else c.activeEffects.push({ uid: newUid(), kind: 'condition', refId: 'fatigued', enabled: true, encounter: true })
}

/** New day: daily uses back (weekly ones stay). */
export function newDayClassUses(c: Character) {
  for (const k of Object.keys(c.dailyUsesSpent)) if (k.startsWith('class:') || k.startsWith('encounter:')) delete c.dailyUsesSpent[k]
}
export function newWeekClassUses(c: Character) {
  for (const k of Object.keys(c.dailyUsesSpent)) if (/^(class|week|encounter):/.test(k)) delete c.dailyUsesSpent[k]
}
