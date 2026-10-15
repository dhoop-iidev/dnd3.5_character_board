// Prerequisite checks (feats, prestige classes).
import type { Rules } from '../data/rules'
import type { I18n, Prereq } from '../data/types'
import type { Sheet } from './compute'
import { proficientWith } from './proficiency'

/** Check a prerequisite against a computed sheet; returns the unmet parts (English/French). */
export function unmetPrereqs(
  prereq: Prereq | undefined,
  sheet: Sheet,
  rules: Rules,
  ownedFeats: { featId: string; choice?: string }[],
  choice?: string,
): I18n[] {
  if (!prereq) return []
  const out: I18n[] = []
  for (const [a, min] of Object.entries(prereq.abilities ?? {})) {
    const score = sheet.abilities[a as keyof Sheet['abilities']].score.total
    if (score < (min ?? 0)) out.push({ en: `${a.toUpperCase()} ${min} (has ${score})`, fr: `${a.toUpperCase()} ${min} (a ${score})` })
  }
  if (prereq.bab !== undefined && sheet.bab.total < prereq.bab)
    out.push({ en: `BAB +${prereq.bab} (has +${sheet.bab.total})`, fr: `BBA +${prereq.bab} (a +${sheet.bab.total})` })
  for (const req of prereq.feats ?? []) {
    const [id, c] = req.split(':')
    const wanted = c === '$choice' ? choice : c
    if (!ownedFeats.some((f) => f.featId === id && (wanted === undefined || f.choice === wanted))) {
      const name = rules.feats.get(id)?.name ?? { en: id, fr: id }
      out.push({ en: `${name.en}${wanted ? ` (${wanted})` : ''}`, fr: `${name.fr}${wanted ? ` (${wanted})` : ''}` })
    }
  }
  if (prereq.proficiency === '$choice' && choice) {
    const weapon = rules.weapons.get(choice)
    if (weapon && !proficientWith(sheet.proficiency, weapon))
      out.push({ en: `proficiency with ${weapon.name.en}`, fr: `maniement de ${weapon.name.fr}` })
  }
  // Weapon aptitude (Tome of Battle p. 22): warblade level − 2 stacks with fighter levels for feat prerequisites.
  const fighterLevel = (sheet.classLevels['fighter'] ?? 0) + Math.max(0, (sheet.classLevels['warblade'] ?? 0) - 2)
  if (prereq.fighterLevel && fighterLevel < prereq.fighterLevel)
    out.push({ en: `Fighter level ${prereq.fighterLevel}`, fr: `Guerrier niveau ${prereq.fighterLevel}` })
  if (prereq.characterLevel && sheet.characterLevel < prereq.characterLevel)
    out.push({ en: `Character level ${prereq.characterLevel}`, fr: `Niveau global ${prereq.characterLevel}` })
  for (const [skill, min] of Object.entries(prereq.skills ?? {})) {
    const ranks = sheet.skills.find((s) => s.key === skill)?.ranks ?? 0
    if (ranks < min) {
      const name = rules.skills.get(skill.split(':')[0])?.name ?? { en: skill, fr: skill }
      out.push({ en: `${name.en} ${min} ranks (has ${ranks})`, fr: `${name.fr} ${min} degrés (a ${ranks})` })
    }
  }
  return out
}

