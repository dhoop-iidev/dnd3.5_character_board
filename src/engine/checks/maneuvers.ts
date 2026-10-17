// Tome of Battle checks: maneuvers learned per martial level, swaps, swordsage discipline focus, readied maneuvers and stance.
import { w, type CheckContext } from './common'
import { disciplinesAt, knownManeuvers, learnBlockers, martialCaps, martialCapsAll, martialOwner } from '../martial'

/** Maneuvers learned and readied (Tome of Battle pp. 21–22, 38–39, 44, 96). */
export function checkManeuvers(ctx: CheckContext): void {
  const { char, rules, out } = ctx
  // ---- Tome of Battle: maneuvers learned per martial level (pp. 21–22, 39, 44, 96): each martial adept class level
  // (crusader, swordsage, warblade), or prestige class level advancing one of them, feeds one progression.
  const TOB = 'Tome of Battle'
  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const learned = (lvl.maneuversLearned ?? []).map((id) => rules.maneuvers.get(id))
    const owner = martialOwner(char, rules, L)
    if (!owner) {
      if (learned.length || lvl.maneuverSwap)
        out.push(
          w(
            `maneuvers-not-martial-${L}`,
            'error',
            'maneuvers',
            `Level ${L}: maneuvers are learned at martial adept or martial prestige class levels`,
            `Niveau ${L} : les manœuvres s’apprennent aux niveaux de classe martiale ou de classe de prestige martiale`,
            { level: L, book: TOB },
          ),
        )
      return
    }
    const caps = martialCaps(char, rules, L, owner)
    if (!caps) return
    const prev = martialCaps(char, rules, L - 1, owner)
    const newManeuvers = caps.maneuversKnown - (prev?.maneuversKnown ?? 0)
    const newStances = caps.stancesKnown - (prev?.stancesKnown ?? 0)
    const gotManeuvers = learned.filter((m) => m && m.type !== 'stance').length
    const gotStances = learned.filter((m) => m && m.type === 'stance').length
    for (const [got, want, kind, fr] of [
      [gotManeuvers, newManeuvers, 'maneuver', 'manœuvre'],
      [gotStances, newStances, 'stance', 'posture'],
    ] as const) {
      if (got < want)
        out.push(
          w(
            `${kind}s-missing-${L}`,
            'warning',
            'maneuvers',
            `Level ${L}: ${want - got} ${kind}(s) to learn`,
            `Niveau ${L} : ${want - got} ${fr}(s) à apprendre`,
            { level: L, book: TOB, actionable: true },
          ),
        )
      if (got > want)
        out.push(
          w(
            `${kind}s-extra-${L}`,
            'error',
            'maneuvers',
            `Level ${L}: ${got - want} ${kind}(s) too many (allowed ${want})`,
            `Niveau ${L} : ${got - want} ${fr}(s) en trop (autorisé ${want})`,
            { level: L, book: TOB, actionable: true },
          ),
        )
    }
    // Level, discipline and prerequisite at the time of learning (earlier picks of the same level count, like feats).
    // Prerequisites count maneuvers known from every martial class.
    const before = knownManeuvers(char, rules, L - 1)
    const allowed = disciplinesAt(char, rules, L)
    learned.forEach((m, j) => {
      if (!m) {
        out.push(
          w(
            `maneuver-unknown-${L}-${j}`,
            'error',
            'maneuvers',
            `Level ${L}: unknown maneuver "${lvl.maneuversLearned![j]}"`,
            `Niveau ${L} : manœuvre inconnue « ${lvl.maneuversLearned![j]} »`,
            { level: L },
          ),
        )
        return
      }
      const soFar = [...before, ...learned.slice(0, j).filter((x) => !!x)]
      const blockers = learnBlockers(m, soFar, caps, rules, allowed)
      if (blockers.length)
        out.push(
          w(
            `maneuver-illegal-${m.id}-${L}`,
            'error',
            'maneuvers',
            `Level ${L}: ${m.name.en} can't be learned: ${blockers.join(', ')}`,
            `Niveau ${L} : ${m.name.fr} ne peut pas être appris : ${blockers.join(', ')}`,
            { level: L, book: `${TOB} p. 39` },
          ),
        )
    })
    // Swap: at the levels of the martial class table that allow it; one maneuver (not a stance) for another of a level
    // you can learn (crusader p. 9, swordsage p. 16, warblade p. 21). Prestige class levels don't swap.
    const swap = lvl.maneuverSwap
    if (swap) {
      const from = rules.maneuvers.get(swap.from)
      const to = rules.maneuvers.get(swap.to)
      const problems: string[] = []
      const row = rules.martialProgression.get(owner)?.levels.find((r) => r.level === caps.classLevel)
      if (lvl.classId !== owner || !row?.maneuverSwap) problems.push('no maneuver swap at this level')
      if (!from || !before.some((k) => k.id === from.id)) problems.push('the replaced maneuver must be known')
      if (from?.type === 'stance' || to?.type === 'stance') problems.push('stances cannot be swapped')
      if (to)
        problems.push(
          ...learnBlockers(
            to,
            [...before, ...learned.filter((x) => !!x)].filter((k) => k.id !== from?.id),
            caps,
            rules,
            allowed,
          ),
        )
      if (problems.length)
        out.push(
          w(
            `maneuver-swap-${L}`,
            'error',
            'maneuvers',
            `Level ${L}: maneuver swap not allowed: ${problems.join(', ')}`,
            `Niveau ${L} : échange de manœuvre impossible : ${problems.join(', ')}`,
            { level: L, book: TOB },
          ),
        )
    }
  })
  // Swordsage discipline focus (p. 16, FAQ p. 26): the 12th- and 16th-level picks must be a second discipline, not the
  // one chosen at 4th and 8th.
  {
    const picks: Record<number, string | undefined> = {}
    let n = 0
    char.levels.forEach((l) => {
      if (l.classId !== 'swordsage') return
      picks[++n] = l.classChoices?.disciplineFocus
    })
    for (const [a, b] of [
      [4, 12],
      [8, 16],
    ])
      if (picks[a] && picks[a] === picks[b])
        out.push(
          w(
            `discipline-focus-${b}`,
            'warning',
            'maneuvers',
            `Swordsage ${b}: discipline focus must be a second discipline (not the one chosen at ${a})`,
            `Maître des lames ${b} : la focalisation doit porter sur une seconde discipline (pas celle du niveau ${a})`,
            { book: 'Tome of Battle p. 16', actionable: true },
          ),
        )
  }
  // Current readied maneuvers and stance, per martial class (pp. 38, 96: no readied slot can be left empty).
  const allNow = martialCapsAll(char, rules)
  if (allNow.length) {
    const knownNow = knownManeuvers(char, rules)
    const readied = char.martial?.readied ?? []
    for (const capsNow of allNow) {
      const mine = knownManeuvers(char, rules, char.levels.length, capsNow.classId).filter((k) => k.type !== 'stance')
      const readiedMine = readied.filter((id) => mine.some((k) => k.id === id))
      const label = rules.classes.get(capsNow.classId)?.name ?? { en: capsNow.classId, fr: capsNow.classId }
      const wantReadied = Math.min(capsNow.maneuversReadied, mine.length)
      if (readiedMine.length < wantReadied)
        out.push(
          w(
            `maneuvers-readied-missing-${capsNow.classId}`,
            'warning',
            'maneuvers',
            `${label.en}: ${wantReadied - readiedMine.length} readied maneuver slot(s) empty`,
            `${label.fr} : ${wantReadied - readiedMine.length} emplacement(s) de manœuvre préparée vide(s)`,
            { book: `${TOB} p. 38` },
          ),
        )
      if (readiedMine.length > capsNow.maneuversReadied)
        out.push(
          w(
            `maneuvers-readied-extra-${capsNow.classId}`,
            'error',
            'maneuvers',
            `${label.en}: too many readied maneuvers (${readiedMine.length}/${capsNow.maneuversReadied})`,
            `${label.fr} : trop de manœuvres préparées (${readiedMine.length}/${capsNow.maneuversReadied})`,
            { book: TOB },
          ),
        )
    }
    const knownNonStance = knownNow.filter((k) => k.type !== 'stance')
    for (const id of readied)
      if (!knownNonStance.some((k) => k.id === id))
        out.push(
          w(
            `maneuver-readied-unknown-${id}`,
            'error',
            'maneuvers',
            `Readied maneuver not known: ${rules.maneuvers.get(id)?.name.en ?? id}`,
            `Manœuvre préparée non connue : ${rules.maneuvers.get(id)?.name.fr ?? id}`,
            { book: TOB },
          ),
        )
    const st = char.martial?.stance
    if (st && !knownNow.some((k) => k.id === st && k.type === 'stance'))
      out.push(
        w(
          'stance-unknown',
          'error',
          'maneuvers',
          'Current stance is not a known stance',
          'La posture active n’est pas une posture connue',
          { book: TOB },
        ),
      )
  }
}
