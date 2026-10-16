// Active effects (conditions, potions, custom effects): display helpers shared by the Combat pane and the turn bar.
import { rules } from '../data/rules'
import type { I18n } from '../data/types'
import type { ActiveEffect } from '../model/character'
import { bardicSongs } from '../engine/arcane'

export function effectName(e: ActiveEffect): I18n {
  if (e.kind === 'condition') return rules.conditions.get(e.refId ?? '')?.name ?? { en: '?', fr: '?' }
  if (e.kind === 'magic') return rules.magicItems.get(e.refId ?? '')?.name ?? { en: '?', fr: '?' }
  if (e.kind === 'class' && e.refId === 'rage') return { en: 'Rage', fr: 'Rage de berserker' }
  if (e.kind === 'class') {
    const song = bardicSongs(20, 0).find((x) => x.id === e.refId)
    if (song) return song.name
  }
  return e.custom?.name ?? { en: '?', fr: '?' }
}
