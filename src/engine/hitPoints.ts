// Hit points at the table: damage, healing, nonlethal damage and temporary hit points.
// https://www.d20srd.org/srd/combat/injuryDeath.htm
import type { I18n } from '../data/types'
import type { ActiveEffect, Character } from '../model/character'
import { i18n } from './stacking'

export const INJURY_URL = 'https://www.d20srd.org/srd/combat/injuryDeath.htm'

type Hp = Character['hp']

/** Lethal damage: temporary hit points go first ("When temporary hit points are lost, they're lost first"). Temporary
 * hit points from different sources are first-in, first-out (FAQ 6/30/2008 p. 113): the effects that gave some (in the
 * order they started) lose theirs first, so an effect that ends later only takes back what is left of its own. */
export function takeDamage(hp: Hp, n: number, effects: ActiveEffect[] = []) {
  if (n <= 0) return
  const fromTemp = Math.min(hp.temp, n)
  hp.temp -= fromTemp
  hp.damage += n - fromTemp
  let left = fromTemp
  for (const e of effects) {
    if (!left) break
    if (!e.tempHp) continue
    const k = Math.min(e.tempHp, left)
    e.tempHp -= k
    left -= k
    if (!e.tempHp) delete e.tempHp
  }
}

/** Healing (a cure spell, a potion): removes lethal damage and as much nonlethal damage ("When a spell or a magical
 * power cures hit point damage, it also removes an equal amount of nonlethal damage"). */
export function heal(hp: Hp, n: number) {
  if (n <= 0) return
  hp.damage = Math.max(0, hp.damage - n)
  hp.nonlethal = Math.max(0, hp.nonlethal - n)
}

/** Nonlethal damage (+) or its recovery (−). */
export function addNonlethal(hp: Hp, n: number) {
  hp.nonlethal = Math.max(0, hp.nonlethal + n)
}

export interface HpState {
  /** Current hit points (maximum − lethal damage), temporary ones not included. */
  current: number
  kind: 'ok' | 'staggered' | 'disabled' | 'unconscious' | 'dying' | 'stable' | 'dead'
  text?: I18n
}

/**
 * State from hit points and nonlethal damage. Temporary hit points count in the hit points compared (they come off
 * first). Dead at −10; dying from −1 to −9 (stable: no more loss); unconscious when nonlethal damage exceeds the hit
 * points, even at 0; disabled at 0; staggered when nonlethal damage equals them.
 */
export function hpState(max: number, hp: Hp, opts: { stable?: boolean } = {}): HpState {
  const current = max - hp.damage
  const total = current + hp.temp
  if (total <= -10) return { current, kind: 'dead', text: i18n('Dead (−10 hp or less)', 'Mort (−10 pv ou moins)') }
  if (total < 0)
    return opts.stable
      ? { current, kind: 'stable', text: i18n('Stable: unconscious, no longer loses hit points (10% per hour to wake up)', 'Stable : inconscient, ne perd plus de points de vie (10 % par heure de reprendre conscience)') }
      : { current, kind: 'dying', text: i18n('Dying: unconscious, loses 1 hp per round unless stabilized (10% each round)', 'Mourant : inconscient, perd 1 pv par round sauf stabilisation (10 % par round)') }
  if (hp.nonlethal > total) return { current, kind: 'unconscious', text: i18n('Unconscious (nonlethal damage above current hp)', 'Inconscient (dégâts non létaux supérieurs aux pv actuels)') }
  if (total === 0) return { current, kind: 'disabled', text: i18n('Disabled (0 hp): one move or standard action per round; a strenuous action costs 1 hp', 'Hors de combat (0 pv) : une action de mouvement ou simple par round ; une action exigeante coûte 1 pv') }
  if (hp.nonlethal > 0 && hp.nonlethal === total) return { current, kind: 'staggered', text: i18n('Staggered (nonlethal damage = current hp): one move or standard action per round', 'Chancelant (dégâts non létaux = pv actuels) : une action de mouvement ou simple par round') }
  return { current, kind: 'ok' }
}
