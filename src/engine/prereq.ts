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
  // Weapon aptitude (Tome of Battle pp. 22, 102): warblade levels, plus Bloodstorm Blade levels, − 2 stack with fighter
  // levels for feat prerequisites.
  const aptitude = (sheet.classLevels['warblade'] ?? 0) + (sheet.classLevels['bloodstorm-blade'] ?? 0)
  const fighterLevel = (sheet.classLevels['fighter'] ?? 0) + Math.max(0, aptitude - 2)
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
  // Tome of Battle prestige classes (p. 96): maneuvers and stances known, by discipline. Stances count as maneuvers only
  // for maneuver prerequisites (p. 44), so here a stance fills only the stance entries (rulings-tob.md T20). Each entry
  // needs its own maneuvers: one maneuver never fills two entries (house rule #33).
  const m = prereq.martial
  if (m) {
    const known = sheet.martial.known
    const discName = (ids?: string[]) => {
      const n = (ids ?? []).map((d) => rules.disciplines.get(d)?.name ?? { en: d, fr: d })
      return { en: n.map((x) => x.en).join(' or '), fr: n.map((x) => x.fr).join(' ou ') }
    }
    // Maximum matching of the maneuvers known to the entries' slots (augmenting paths; a few dozen items at most).
    const reqs = m.maneuvers ?? []
    const pool = known.filter((k) => k.type !== 'stance')
    const fits = (r: (typeof reqs)[number], k: (typeof pool)[number]) =>
      (!r.disciplines || r.disciplines.includes(k.discipline)) && k.level >= (r.minLevel ?? 1) && (!r.type || k.type === r.type)
    const slots = reqs.flatMap((r, i) => Array.from({ length: r.count }, () => i))
    const owner: number[] = pool.map(() => -1) // maneuver index -> slot index
    const tryFill = (s: number, seen: Set<number>): boolean => {
      for (let k = 0; k < pool.length; k++) {
        if (seen.has(k) || !fits(reqs[slots[s]], pool[k])) continue
        seen.add(k)
        if (owner[k] < 0 || tryFill(owner[k], seen)) {
          owner[k] = s
          return true
        }
      }
      return false
    }
    slots.forEach((_, s) => tryFill(s, new Set()))
    const filled = reqs.map((_, i) => owner.filter((s) => s >= 0 && slots[s] === i).length)
    for (const [i, r] of reqs.entries()) {
      const have = filled[i]
      if (have < r.count) {
        const d = discName(r.disciplines)
        const lv = r.minLevel ? { en: ` of level ${r.minLevel}+`, fr: ` de niveau ${r.minLevel}+` } : { en: '', fr: '' }
        const kind = r.type === 'strike' ? { en: 'strike', fr: 'frappe' } : { en: 'maneuver', fr: 'manœuvre' }
        out.push({
          en: `${r.count} ${d.en} ${kind.en}(s)${lv.en} (has ${have})`.replace('  ', ' '),
          fr: `${r.count} ${kind.fr}(s) ${d.fr}${lv.fr} (a ${have})`.replace('  ', ' '),
        })
      }
    }
    for (const r of m.stances ?? []) {
      const have = known.filter((k) => k.type === 'stance' && (!r.disciplines || r.disciplines.includes(k.discipline))).length
      if (have < r.count) {
        const d = discName(r.disciplines)
        out.push({ en: `${r.count} ${d.en} stance(s) (has ${have})`.replace('  ', ' '), fr: `${r.count} posture(s) ${d.fr} (a ${have})`.replace('  ', ' ') })
      }
    }
    if (m.anyManeuverLevel && !known.some((k) => k.level >= m.anyManeuverLevel!))
      out.push({ en: `a maneuver of level ${m.anyManeuverLevel}+`, fr: `une manœuvre de niveau ${m.anyManeuverLevel}+` })
    if (m.distinctDisciplines) {
      const n = new Set(known.map((k) => k.discipline)).size
      if (n < m.distinctDisciplines)
        out.push({ en: `maneuvers from ${m.distinctDisciplines} disciplines (has ${n})`, fr: `manœuvres de ${m.distinctDisciplines} disciplines (a ${n})` })
    }
    if (m.keySkills) {
      const keys = new Set([...rules.disciplines.values()].map((d) => d.keySkill))
      const n = [...keys].filter((k) => (sheet.skills.find((s) => s.key === k)?.ranks ?? 0) >= m.keySkills!.ranks).length
      if (n < m.keySkills.count)
        out.push({
          en: `${m.keySkills.ranks} ranks in ${m.keySkills.count} discipline key skills (has ${n})`,
          fr: `${m.keySkills.ranks} degrés dans ${m.keySkills.count} compétences clés de discipline (a ${n})`,
        })
    }
  }
  // "Other" prerequisites that the sheet can answer: turning ability (Extra/Improved Turning) and caster level
  // (item creation feats, https://www.d20srd.org/srd/feats.htm#itemCreationFeats).
  for (const o of prereq.other ?? []) {
    if (/turn or rebuke/i.test(o.en) && !sheet.turning)
      out.push(o)
    const race = o.en.match(/^Race: (\w+)/i)
    // A half-elf counts as an elf for every effect related to race (https://www.d20srd.org/srd/races.htm#halfElves).
    if (race && sheet.race.id !== race[1].toLowerCase() && !(race[1].toLowerCase() === 'elf' && sheet.race.id === 'half-elf'))
      out.push(o)
    if (/^wild shape ability/i.test(o.en) && (sheet.classLevels['druid'] ?? 0) < 5) out.push(o)
    if (/^Wizard level 1/i.test(o.en) && !sheet.classLevels['wizard']) out.push(o)
    const cl = o.en.match(/^Caster level (\d+)/i)
    if (cl) {
      const best = Math.max(0, ...sheet.spellcasting.map((sc) => sc.casterLevel.total))
      if (best < Number(cl[1])) out.push({ en: `${o.en} (has ${best})`, fr: `${o.fr} (a ${best})` })
    }
  }
  return out
}

