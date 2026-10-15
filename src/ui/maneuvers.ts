// Shared helpers for the Maneuvers pane and the Combat block (Tome of Battle, house rule #15).
import { rules } from '../data/rules'
import type { I18n, ManeuverDef } from '../data/types'
import type { ActiveManeuver } from '../model/character'
import { app, tr } from '../state.svelte'
import { openPopup } from './popupState.svelte'

export const TYPE_LABEL: Record<ManeuverDef['type'], I18n> = {
  boost: { en: 'boost', fr: 'stimulation' },
  counter: { en: 'counter', fr: 'riposte' },
  strike: { en: 'strike', fr: 'frappe' },
  stance: { en: 'stance', fr: 'posture' },
  other: { en: 'other', fr: 'autre' },
}

export const ACTION_LABEL: Record<ManeuverDef['action'], I18n> = {
  swift: { en: 'swift action', fr: 'action rapide' },
  immediate: { en: 'immediate action', fr: 'action immédiate' },
  move: { en: 'move action', fr: 'action de mouvement' },
  standard: { en: 'standard action', fr: 'action simple' },
  fullRound: { en: 'full-round action', fr: 'action complexe' },
  other: { en: 'see text', fr: 'voir texte' },
}

/** French name with the English name (house rule #16), or the English name alone in English. */
export function maneuverName(def: ManeuverDef): string {
  return app.character.settings.lang === 'fr' ? `${def.name.fr} (${def.name.en})` : def.name.en
}

export function disciplineName(id: string): string {
  return tr(rules.disciplines.get(id)?.name) || id
}

export function maneuverPopup(def: ManeuverDef) {
  const line = (en: string, fr: string, v: I18n) => (v.en || v.fr ? [{ en: `${en}: ${v.en}`, fr: `${fr} : ${v.fr}` }] : [])
  openPopup({
    title: { en: def.name.en, fr: `${def.name.fr} — ${def.name.en}` },
    summary: def.summary,
    lines: [
      {
        en: `${rules.disciplines.get(def.discipline)?.name.en} (${TYPE_LABEL[def.type].en}), level ${def.level}${def.prereqCount ? ` · prerequisite: ${def.prereqCount} ${rules.disciplines.get(def.discipline)?.name.en} maneuver(s)` : ''}`,
        fr: `${rules.disciplines.get(def.discipline)?.name.fr} (${TYPE_LABEL[def.type].fr}), niveau ${def.level}${def.prereqCount ? ` · condition : ${def.prereqCount} manœuvre(s) ${rules.disciplines.get(def.discipline)?.name.fr}` : ''}`,
      },
      { en: `Initiation: ${ACTION_LABEL[def.action].en}`, fr: `Initiation : ${ACTION_LABEL[def.action].fr}` },
      ...line('Range', 'Portée', def.range),
      ...line('Target', 'Cible', def.target),
      ...(def.area ? line('Area', 'Zone', def.area) : []),
      ...line('Duration', 'Durée', def.duration),
      ...line('Saving throw', 'Jet de sauvegarde', def.save),
      ...(def.damageReduction ? [{ en: `Damage reduction ${def.damageReduction}`, fr: `Réduction des dégâts ${def.damageReduction}` }] : []),
      ...(def.notes ? [def.notes] : []),
    ],
    html: def.text,
    source: def.source,
    noteKey: `maneuver:${def.id}`,
  })
}

/** How long a just-initiated maneuver keeps affecting the sheet. */
export function runningUntil(def: ManeuverDef): ActiveManeuver['until'] {
  const durations = (def.effects ?? []).map((e) => e.duration)
  if (durations.includes('encounter') || durations.includes('minute')) return 'encounter'
  if (durations.includes('round') || durations.includes('rounds')) return 'round'
  return 'endOfTurn'
}
