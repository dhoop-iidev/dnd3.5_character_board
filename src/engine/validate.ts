// Rule checks. They only produce warnings; nothing is ever blocked (CLAUDE.md).
import type { Rules } from '../data/rules'
import type { I18n } from '../data/types'
import type { Character } from '../model/character'
import { compute } from './compute'
import { unmetPrereqs } from './prereq'
import { classBonusFeatList, featSlotsAt, isAbilityIncreaseLevel, skillBudget } from './progression'
import { disciplinesAt, knownManeuvers, learnBlockers, martialCaps, martialCapsAll, martialOwner } from './martial'
import { choicesAt } from './classChoices'
import { raceOf } from './race'
import { parseAlignment, opposedDescriptors } from './alignment'
import { domainsOf } from './cleric'
import { CLASS_ALIGNMENT, NO_RETURN_CLASSES, ROGUE_SPECIAL_LEVELS } from './classFeatures'

export { unmetPrereqs }

export type Severity = 'error' | 'warning' | 'info'
export type WarningArea = 'abilities' | 'skills' | 'feats' | 'levels' | 'inventory' | 'combat' | 'maneuvers'

export interface RuleWarning {
  id: string
  severity: Severity
  area: WarningArea
  level?: number
  message: I18n
  srdUrl?: string
  book?: string
  /** Needs a choice from the player (missing/extra feat, skill points, ability increase, illegal pick). */
  actionable?: boolean
}

const SRD = 'https://www.d20srd.org/srd/'
const w = (
  id: string,
  severity: Severity,
  area: WarningArea,
  en: string,
  fr: string,
  extra: Partial<RuleWarning> = {},
): RuleWarning => ({ id, severity, area, message: { en, fr }, ...extra })

/**
 * The character without temporary state (effects, ability damage, combat toggles), used to check build legality.
 * Worn magic items stay: an item bonus may be used to qualify for a feat (3.5 FAQ, rulings-character.md#q6).
 */
function permanent(char: Character): Character {
  return {
    ...char,
    activeEffects: [],
    abilityDamage: {},
    toggles: { ...char.toggles, powerAttack: 0, combatExpertise: 0, fightingDefensively: false, totalDefense: false },
  }
}


export function validate(char: Character, rules: Rules): RuleWarning[] {
  const out: RuleWarning[] = []
  const perm = permanent(char)
  const classCount: Record<string, number> = {}
  const rankTotals: Record<string, number> = {}
  const feats: { featId: string; choice?: string }[] = []
  let deityFeats = 0

  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const cls = rules.classes.get(lvl.classId)
    if (!cls) {
      out.push(w(`unknown-class-${L}`, 'error', 'levels', `Level ${L}: unknown class "${lvl.classId}"`, `Niveau ${L} : classe inconnue « ${lvl.classId} »`, { level: L }))
      return
    }
    const before = compute(perm, rules, { level: L - 1 })
    classCount[cls.id] = (classCount[cls.id] ?? 0) + 1
    const classLevel = classCount[cls.id]
    const after = compute(perm, rules, { level: L })

    // Prestige class entry requirements, checked on the state before its first level.
    if (cls.prestige && classLevel === 1) {
      const unmet = unmetPrereqs(cls.requirements, before, rules, feats, perm.weaponOfChoice)
      if (cls.requirements?.masterworkWeapon) {
        const hasMw = char.inventory.some(
          (it) =>
            it.kind === 'weapon' &&
            it.refId === perm.weaponOfChoice &&
            (it.masterwork || (it.enhancement ?? 0) > 0 || !!(it.material && rules.materials.get(it.material)?.effects.masterwork)),
        )
        if (!hasMw) unmet.push({ en: 'masterwork weapon of choice', fr: 'arme de prédilection de maître' })
      }
      if (unmet.length)
        out.push(w(`prestige-${cls.id}`, 'error', 'levels',
          `Level ${L}: requirements for ${cls.name.en} not met: ${unmet.map((u) => u.en).join(', ')}`,
          `Niveau ${L} : conditions de ${cls.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
          { level: L, book: cls.source.book, srdUrl: cls.source.srdUrl ?? `${SRD}prestigeClasses.htm` }))
    }

    // Skill points and max ranks (docs/rules/skills.md; rulings-character.md q3, q4).
    const budget = skillBudget(perm, rules, L)
    const { available, spent } = budget
    for (const [key, ranks] of Object.entries(lvl.skillRanks)) {
      const skillId = key.split(':')[0]
      rankTotals[key] = (rankTotals[key] ?? 0) + ranks
      const max = budget.maxRanks(skillId)
      if (rankTotals[key] > max) {
        const name = rules.skills.get(skillId)?.name ?? { en: key, fr: key }
        const kind = budget.costPerRank(skillId) === 1 || max === L + 3
        out.push(w(`max-ranks-${key}-${L}`, 'error', 'skills',
          `Level ${L}: ${name.en} has ${rankTotals[key]} ranks, max ${max} (${kind ? 'class' : 'cross-class'} skill)`,
          `Niveau ${L} : ${name.fr} a ${rankTotals[key]} degrés, max ${max} (compétence ${kind ? 'de classe' : 'hors classe'})`,
          { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` }))
      }
      if (!rules.skills.has(skillId))
        out.push(w(`unknown-skill-${key}`, 'error', 'skills', `Unknown skill "${key}"`, `Compétence inconnue « ${key} »`, { level: L }))
    }
    if (spent !== available)
      out.push(w(`skill-points-${L}`, spent < available ? 'warning' : 'error', 'skills',
        spent < available
          ? `Level ${L} (${cls.name.en}): ${available - spent} skill point(s) unspent (${spent}/${available})`
          : `Level ${L} (${cls.name.en}): ${spent - available} skill point(s) too many (${spent}/${available})`,
        spent < available
          ? `Niveau ${L} (${cls.name.fr}) : ${available - spent} point(s) de compétence non dépensé(s) (${spent}/${available})`
          : `Niveau ${L} (${cls.name.fr}) : ${spent - available} point(s) de compétence en trop (${spent}/${available})`,
        { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` }))

    // Feat slots (docs/rules/feats.md; house rule #3 for the deity feat).
    const expected = featSlotsAt(perm, rules, L)
    for (const slot of ['general', 'race', 'class'] as const) {
      const n = lvl.feats.filter((f) => f.slot === slot).length
      const label = { general: ['general', 'général'], race: ['racial bonus', 'racial'], class: ['class bonus', 'supplémentaire de classe'] }[slot]
      if (n < expected[slot])
        out.push(w(`feat-missing-${slot}-${L}`, 'warning', 'feats',
          `Level ${L}: ${label[0]} feat not chosen yet`, `Niveau ${L} : don ${label[1]} pas encore choisi`,
          { level: L, srdUrl: `${SRD}feats.htm` }))
      if (n > expected[slot])
        out.push(w(`feat-extra-${slot}-${L}`, 'error', 'feats',
          `Level ${L}: too many ${slot} feats (${n}, allowed ${expected[slot]})`, `Niveau ${L} : trop de dons (${slot}) : ${n}, autorisé ${expected[slot]}`,
          { level: L, srdUrl: `${SRD}feats.htm` }))
    }
    deityFeats += lvl.feats.filter((f) => f.slot === 'deity').length

    // Prerequisites at the level the feat is taken (feats taken earlier in the same level count).
    for (const pick of lvl.feats) {
      const def = rules.feats.get(pick.featId)
      if (!def) {
        out.push(w(`unknown-feat-${pick.featId}`, 'error', 'feats', `Unknown feat "${pick.featId}"`, `Don inconnu « ${pick.featId} »`, { level: L }))
        continue
      }
      const bonusList = classBonusFeatList(char, rules, L)
      if (pick.slot === 'class' && !(bonusList ? bonusList.includes(def.id) : def.fighterBonus))
        out.push(w(`feat-not-class-${pick.featId}`, 'error', 'feats',
          `Level ${L}: ${def.name.en} is not a ${cls.name.en} bonus feat`, `Niveau ${L} : ${def.name.fr} n'est pas un don supplémentaire de ${cls.name.fr}`,
          { level: L, srdUrl: cls.source.srdUrl ?? `${SRD}classes/fighter.htm` }))
      // Feats granted by class features at this level count too (ranger Endurance → Diehard).
      const granted = [...after.feats.filter((f) => f.slot === 'granted'), ...after.inactiveStyleFeats]
      const unmet =
        pick.slot === 'class' && cls.bonusFeatIgnorePrereqs ? [] : unmetPrereqs(def.prereq, after, rules, [...feats, ...granted], pick.choice)
      if (unmet.length)
        out.push(w(`prereq-${pick.featId}-${L}`, 'error', 'feats',
          `Level ${L}: ${def.name.en} prerequisites not met: ${unmet.map((u) => u.en).join(', ')}`,
          `Niveau ${L} : conditions de ${def.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
          { level: L, srdUrl: def.source.srdUrl }))
      if (!def.multiple && feats.some((f) => f.featId === pick.featId && f.choice === pick.choice))
        out.push(w(`feat-dup-${pick.featId}-${L}`, 'error', 'feats', `Level ${L}: ${def.name.en} taken twice`, `Niveau ${L} : ${def.name.fr} pris deux fois`, { level: L }))
      feats.push(pick)
    }

    // Rolled hit points (house rule #9 switched off): each level after the 1st needs its roll.
    if (L > 1 && char.settings.maxHitDice === false) {
      const r = lvl.hpRoll
      if (r === undefined)
        out.push(w(`hp-roll-missing-${L}`, 'warning', 'levels', `Level ${L}: hit points not rolled yet (average used)`, `Niveau ${L} : points de vie pas encore lancés (moyenne utilisée)`, { level: L, srdUrl: `${SRD}combat/combatStatistics.htm#hitPoints` }))
      else if (r < 1 || r > cls.hitDie)
        out.push(w(`hp-roll-invalid-${L}`, 'error', 'levels', `Level ${L}: a d${cls.hitDie} roll must be 1–${cls.hitDie}`, `Niveau ${L} : un jet de d${cls.hitDie} va de 1 à ${cls.hitDie}`, { level: L }))
    }

    // Ability increases every 4 levels.
    if (isAbilityIncreaseLevel(L) && !lvl.abilityIncrease)
      out.push(w(`ability-increase-missing-${L}`, 'warning', 'abilities', `Level ${L}: ability increase not chosen`, `Niveau ${L} : augmentation de caractéristique non choisie`, { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` }))
    if (!isAbilityIncreaseLevel(L) && lvl.abilityIncrease)
      out.push(w(`ability-increase-extra-${L}`, 'error', 'abilities', `Level ${L}: no ability increase at this level`, `Niveau ${L} : pas d'augmentation de caractéristique à ce niveau`, { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` }))
  })

  // ---- Tome of Battle: maneuvers learned per martial level (pp. 21–22, 39, 44, 96): each martial adept class level
  // (crusader, swordsage, warblade), or prestige class level advancing one of them, feeds one progression.
  const TOB = 'Tome of Battle'
  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const learned = (lvl.maneuversLearned ?? []).map((id) => rules.maneuvers.get(id))
    const owner = martialOwner(char, rules, L)
    if (!owner) {
      if (learned.length || lvl.maneuverSwap)
        out.push(w(`maneuvers-not-martial-${L}`, 'error', 'maneuvers', `Level ${L}: maneuvers are learned at martial adept or martial prestige class levels`, `Niveau ${L} : les manœuvres s’apprennent aux niveaux de classe martiale ou de classe de prestige martiale`, { level: L, book: TOB }))
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
        out.push(w(`${kind}s-missing-${L}`, 'warning', 'maneuvers', `Level ${L}: ${want - got} ${kind}(s) to learn`, `Niveau ${L} : ${want - got} ${fr}(s) à apprendre`, { level: L, book: TOB, actionable: true }))
      if (got > want)
        out.push(w(`${kind}s-extra-${L}`, 'error', 'maneuvers', `Level ${L}: ${got - want} ${kind}(s) too many (allowed ${want})`, `Niveau ${L} : ${got - want} ${fr}(s) en trop (autorisé ${want})`, { level: L, book: TOB, actionable: true }))
    }
    // Level, discipline and prerequisite at the time of learning (earlier picks of the same level count, like feats).
    // Prerequisites count maneuvers known from every martial class.
    const before = knownManeuvers(char, rules, L - 1)
    const allowed = disciplinesAt(char, rules, L)
    learned.forEach((m, j) => {
      if (!m) {
        out.push(w(`maneuver-unknown-${L}-${j}`, 'error', 'maneuvers', `Level ${L}: unknown maneuver "${lvl.maneuversLearned![j]}"`, `Niveau ${L} : manœuvre inconnue « ${lvl.maneuversLearned![j]} »`, { level: L }))
        return
      }
      const soFar = [...before, ...learned.slice(0, j).filter((x) => !!x)]
      const blockers = learnBlockers(m, soFar, caps, rules, allowed)
      if (blockers.length)
        out.push(w(`maneuver-illegal-${m.id}-${L}`, 'error', 'maneuvers', `Level ${L}: ${m.name.en} can't be learned: ${blockers.join(', ')}`, `Niveau ${L} : ${m.name.fr} ne peut pas être appris : ${blockers.join(', ')}`, { level: L, book: `${TOB} p. 39` }))
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
      if (to) problems.push(...learnBlockers(to, [...before, ...learned.filter((x) => !!x)].filter((k) => k.id !== from?.id), caps, rules, allowed))
      if (problems.length)
        out.push(w(`maneuver-swap-${L}`, 'error', 'maneuvers', `Level ${L}: maneuver swap not allowed: ${problems.join(', ')}`, `Niveau ${L} : échange de manœuvre impossible : ${problems.join(', ')}`, { level: L, book: TOB }))
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
    for (const [a, b] of [[4, 12], [8, 16]])
      if (picks[a] && picks[a] === picks[b])
        out.push(w(`discipline-focus-${b}`, 'warning', 'maneuvers', `Swordsage ${b}: discipline focus must be a second discipline (not the one chosen at ${a})`, `Maître des lames ${b} : la focalisation doit porter sur une seconde discipline (pas celle du niveau ${a})`, { book: 'Tome of Battle p. 16', actionable: true }))
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
        out.push(w(`maneuvers-readied-missing-${capsNow.classId}`, 'warning', 'maneuvers', `${label.en}: ${wantReadied - readiedMine.length} readied maneuver slot(s) empty`, `${label.fr} : ${wantReadied - readiedMine.length} emplacement(s) de manœuvre préparée vide(s)`, { book: `${TOB} p. 38` }))
      if (readiedMine.length > capsNow.maneuversReadied)
        out.push(w(`maneuvers-readied-extra-${capsNow.classId}`, 'error', 'maneuvers', `${label.en}: too many readied maneuvers (${readiedMine.length}/${capsNow.maneuversReadied})`, `${label.fr} : trop de manœuvres préparées (${readiedMine.length}/${capsNow.maneuversReadied})`, { book: TOB }))
    }
    const knownNonStance = knownNow.filter((k) => k.type !== 'stance')
    for (const id of readied)
      if (!knownNonStance.some((k) => k.id === id))
        out.push(w(`maneuver-readied-unknown-${id}`, 'error', 'maneuvers', `Readied maneuver not known: ${rules.maneuvers.get(id)?.name.en ?? id}`, `Manœuvre préparée non connue : ${rules.maneuvers.get(id)?.name.fr ?? id}`, { book: TOB }))
    const st = char.martial?.stance
    if (st && !knownNow.some((k) => k.id === st && k.type === 'stance'))
      out.push(w('stance-unknown', 'error', 'maneuvers', 'Current stance is not a known stance', 'La posture active n’est pas une posture connue', { book: TOB }))
  }

  // ---- cleric energy vs alignment: a good cleric channels positive energy, an evil one negative
  // (https://www.d20srd.org/srd/classes/cleric.htm#spontaneousCasting).
  {
    const first = char.levels.find((l) => l.classId === 'cleric')
    const ch = first?.classChoices?.channel
    const al = parseAlignment(char.identity.alignment)
    const good = al?.moral === 'good'
    const evil = al?.moral === 'evil'
    if (ch && ((good && ch === 'negative') || (evil && ch === 'positive')))
      out.push(w('cleric-energy-alignment', 'error', 'levels', `A ${good ? 'good' : 'evil'} cleric must channel ${good ? 'positive' : 'negative'} energy`, `Un prêtre ${good ? 'bon' : 'mauvais'} canalise l'énergie ${good ? 'positive' : 'négative'}`, { srdUrl: `${SRD}classes/cleric.htm#spontaneousCasting` }))
    if (first) {
      // Alignment domains (Chaos, Evil, Good, Law) only if the cleric's alignment matches
      // (https://www.d20srd.org/srd/classes/cleric.htm#domains).
      const NEED: Record<string, (a: NonNullable<typeof al>) => boolean> = {
        good: (a) => a.moral === 'good',
        evil: (a) => a.moral === 'evil',
        law: (a) => a.order === 'lawful',
        chaos: (a) => a.order === 'chaotic',
      }
      const domains = domainsOf(char, rules)
      for (const d of domains)
        if (NEED[d.id] && (!al || !NEED[d.id](al)))
          out.push(w(`cleric-domain-alignment-${d.id}`, 'error', 'levels',
            `The ${d.name.en} domain needs a matching alignment (${char.identity.alignment || 'none given'})`,
            `Le domaine ${d.name.fr} exige un alignement correspondant (${char.identity.alignment || 'non indiqué'})`,
            { srdUrl: `${SRD}classes/cleric.htm#domains`, actionable: true }))
      // Spells of an opposed alignment can't be cast (https://www.d20srd.org/srd/classes/cleric.htm).
      const opposed = al ? opposedDescriptors(al) : []
      const prepared = Object.values(char.spells?.['cleric']?.prepared ?? {}).flat()
      for (const id of new Set(prepared.map((x) => x.id).filter(Boolean))) {
        const sp = rules.spells.get(id)
        const bad = sp?.descriptors?.find((d) => opposed.includes(d))
        if (sp && bad)
          out.push(w(`cleric-opposed-spell-${id}`, 'error', 'levels',
            `${sp.name.en} has the ${bad} descriptor, opposed to the cleric's alignment: it can't be cast`,
            `${sp.name.fr} a le registre ${bad === 'evil' ? 'Mal' : bad === 'good' ? 'Bien' : bad === 'lawful' ? 'Loi' : 'Chaos'}, opposé à l'alignement du prêtre : il ne peut pas être lancé`,
            { srdUrl: `${SRD}classes/cleric.htm` }))
      }
    }
  }

  // ---- class alignment (https://www.d20srd.org/srd/classes/): no new level out of alignment; a paladin also loses her
  // abilities, a barbarian his rage, a druid his spells and abilities (monk: keeps them).
  {
    const al = parseAlignment(char.identity.alignment)
    const taken = new Set(char.levels.map((l) => l.classId))
    if (al)
      for (const [id, rule] of Object.entries(CLASS_ALIGNMENT)) {
        if (!taken.has(id) || rule.ok(al)) continue
        const cls = rules.classes.get(id)
        const lost: Record<string, { en: string; fr: string }> = {
          paladin: { en: 'all paladin spells and abilities are lost', fr: 'tous les sorts et pouvoirs de paladin sont perdus' },
          barbarian: { en: 'no rage', fr: 'plus de rage' },
          druid: { en: 'all druid spells and abilities are lost, animal companion included', fr: 'tous les sorts et pouvoirs de druide sont perdus, compagnon animal compris' },
          bard: { en: 'abilities kept', fr: 'pouvoirs conservés' },
          monk: { en: 'abilities kept', fr: 'pouvoirs conservés' },
        }
        out.push(w(`class-alignment-${id}`, 'warning', 'levels',
          `${cls?.name.en ?? id} requires ${rule.text.en} (${char.identity.alignment}): no new ${cls?.name.en ?? id} level; ${lost[id]?.en ?? ''}`,
          `${cls?.name.fr ?? id} exige ${rule.text.fr} (${char.identity.alignment}) : plus de nouveau niveau de ${cls?.name.fr ?? id} ; ${lost[id]?.fr ?? ''}`,
          { srdUrl: rule.url }))
      }
    // Monk, paladin: after a level in another class, never again a level in this one.
    for (const id of NO_RETURN_CLASSES) {
      let seen = false
      let left = false
      char.levels.forEach((l, i) => {
        if (l.classId === id) {
          if (left)
            out.push(w(`no-return-${id}-${i + 1}`, 'error', 'levels',
              `Level ${i + 1}: a multiclass ${id} can't take a new ${id} level after a level in another class`,
              `Niveau ${i + 1} : un ${rules.classes.get(id)?.name.fr ?? id} multiclassé ne peut plus reprendre de niveau de ${rules.classes.get(id)?.name.fr ?? id} après un niveau dans une autre classe`,
              { level: i + 1, srdUrl: CLASS_ALIGNMENT[id].url, actionable: true }))
          seen = true
        } else if (seen) left = true
      })
    }
  }

  // A rogue special ability recorded at a level that doesn't grant one (after levels were reordered) is ignored.
  {
    let rogueN = 0
    char.levels.forEach((l, i) => {
      if (l.classId === 'rogue') rogueN++
      if (l.classChoices?.specialAbility && !(l.classId === 'rogue' && ROGUE_SPECIAL_LEVELS.includes(rogueN)))
        out.push(w(`rogue-special-stray-${i + 1}`, 'warning', 'levels',
          `Level ${i + 1}: a rogue special ability is recorded here, but only rogue levels 10, 13, 16 and 19 grant one (ignored)`,
          `Niveau ${i + 1} : une aptitude spéciale de roublard est notée ici, mais seuls les niveaux 10, 13, 16 et 19 de roublard en donnent (ignorée)`,
          { level: i + 1, srdUrl: `${SRD}classes/rogue.htm#specialAbilities`, actionable: true }))
    })
  }

  // ---- class-feature choices (ranger favored enemy, combat style)
  char.levels.forEach((lvl, i) => {
    const L = i + 1
    for (const ch of choicesAt(char, rules, L)) {
      const v = lvl.classChoices?.[ch.key]
      if (!v)
        out.push(w(`choice-missing-${ch.key}-${L}`, 'warning', 'levels', `Level ${L}: ${ch.label.en} not chosen yet`, `Niveau ${L} : ${ch.label.fr} pas encore choisi`, { level: L, srdUrl: ch.srdUrl }))
      else if (!ch.options.some((o) => o.id === v))
        out.push(w(`choice-invalid-${ch.key}-${L}`, 'error', 'levels', `Level ${L}: ${ch.label.en} "${v}" is not allowed here`, `Niveau ${L} : ${ch.label.fr} « ${v} » n'est pas permis ici`, { level: L, srdUrl: ch.srdUrl }))
    }
  })

  // ---- multiclass XP penalty (https://www.d20srd.org/srd/xp.htm#multiclassCharactersAndExperiencePoints): −20% for
  // each base class more than one level apart from the highest, ignoring the favored class and prestige classes.
  {
    const favored = raceOf(char, rules).favoredClass
    const base = Object.entries(classCount).filter(([id]) => !rules.classes.get(id)?.prestige)
    const highest = base.reduce<[string, number] | undefined>((a, b) => (!a || b[1] > a[1] ? b : a), undefined)
    const counted = base.filter(([id]) => id !== (favored === 'any' ? highest?.[0] : favored))
    const top = Math.max(0, ...counted.map(([, n]) => n))
    const behind = counted.filter(([, n]) => top - n > 1)
    if (behind.length)
      out.push(w('multiclass-xp-penalty', 'info', 'levels',
        `Multiclass XP penalty: −${20 * behind.length}% (classes more than one level apart)`,
        `Pénalité d'XP de multiclassage : −${20 * behind.length} % (classes à plus d'un niveau d'écart)`,
        { srdUrl: `${SRD}xp.htm` }))
  }

  if (deityFeats > 1)
    out.push(w('deity-feats', 'error', 'feats', `Only one deity bonus feat (house rule #3), found ${deityFeats}`, `Un seul don accordé par le dieu (règle maison n°3), trouvé ${deityFeats}`))

  // Current state checks (with temporary effects).
  const now = compute(char, rules)
  if (!rules.races.has(char.identity.race))
    out.push(w('unknown-race', 'error', 'levels', `Unknown race "${char.identity.race}": human rules used`, `Race inconnue « ${char.identity.race} » : règles de l'humain utilisées`, { srdUrl: `${SRD}races.htm` }))
  // Two-weapon fighting: neither weapon can be wielded in two hands.
  for (const a of now.attacks)
    if (a.hand && a.weapon.handedness === 'twoHanded')
      out.push(w(`twf-two-handed-${a.itemUid}`, 'error', 'combat', `${a.weapon.name.en} needs both hands: it can't be used for two-weapon fighting`, `${a.weapon.name.fr} demande les deux mains : impossible en combat à deux armes`, { srdUrl: `${SRD}combat/specialAttacks.htm#twoWeaponFighting` }))
  // Ranger combat style works only in light or no armor (https://www.d20srd.org/srd/classes/ranger.htm#combatStyle).
  if (now.combatStyle && !now.combatStyle.active)
    out.push(w('combat-style-inactive', 'warning', 'combat', `${now.combatStyle.name.en} combat style unusable: medium or heavy armor worn`, `Style de combat (${now.combatStyle.name.fr}) inutilisable : armure intermédiaire ou lourde portée`, { srdUrl: `${SRD}classes/ranger.htm#combatStyle` }))
  const loseFeat = (id: string, why: I18n) => {
    const def = rules.feats.get(id)
    out.push(w(`unusable-${id}`, 'warning', 'feats', `${def?.name.en ?? id} can't be used: ${why.en}`, `${def?.name.fr ?? id} inutilisable : ${why.fr}`, { srdUrl: def?.source.srdUrl }))
  }
  for (const id of now.unusableFeats)
    loseFeat(id, {
      en: 'its prerequisite comes from the ranger combat style, lost in medium or heavy armor',
      fr: 'sa condition vient du style de combat du rôdeur, perdu en armure intermédiaire ou lourde',
    })
  if (now.feats.some((f) => f.featId === 'spring-attack') && now.armor?.category === 'heavy')
    loseFeat('spring-attack', { en: 'wearing heavy armor (still counts as a prerequisite)', fr: 'armure lourde portée (compte toujours comme condition)' })
  // Feats taken as a bonus feat that ignores prerequisites (monk) can't lose them.
  const noPrereq = new Set(
    char.levels.flatMap((l) => (rules.classes.get(l.classId)?.bonusFeatIgnorePrereqs ? l.feats.filter((p) => p.slot === 'class').map((p) => p.featId) : [])),
  )
  for (const f of now.feats) {
    const def = rules.feats.get(f.featId)
    if (!def?.prereq.abilities || noPrereq.has(f.featId)) continue
    const unmet = unmetPrereqs({ abilities: def.prereq.abilities }, now, rules, [], f.choice)
    if (unmet.length) loseFeat(f.featId, { en: `prerequisite lost (${unmet.map((u) => u.en).join(', ')})`, fr: `condition perdue (${unmet.map((u) => u.fr).join(', ')})` })
  }
  if (now.weaponMaster.level > 0) {
    const req = rules.classes.get('weapon-master')?.requirements
    const unmet = unmetPrereqs({ ...req, skills: undefined, bab: undefined }, now, rules, now.feats, char.weaponOfChoice)
    if (unmet.length)
      out.push(w('weapon-master-lost', 'warning', 'levels',
        `Weapon Master class features lost while requirements are unmet: ${unmet.map((u) => u.en).join(', ')}`,
        `Pouvoirs de maître d'armes perdus tant que les conditions ne sont pas remplies : ${unmet.map((u) => u.fr).join(', ')}`,
        { book: 'Complete Warrior p.16 / 3.5 FAQ' }))
    const focus = now.feats.find((f) => f.featId === 'weapon-focus' && f.choice === char.weaponOfChoice)
    if (!focus)
      out.push(w('weapon-of-choice', 'error', 'combat', 'Weapon of choice must be a Weapon Focus weapon', "L'arme de prédilection doit être celle du don Arme de prédilection", { book: 'Sword and Fist p.38' }))
  }

  // Equipment: proficiency, load, max Dex, slots.
  const profArmor = now.proficiency.armor
  for (const x of [now.armor, now.shield]) {
    if (x && !profArmor.has(x.def.category))
      out.push(w(`armor-prof-${x.item.uid}`, 'error', 'inventory', `Not proficient with ${x.def.name.en}`, `Pas de maniement de ${x.def.name.fr}`, { srdUrl: `${SRD}equipment/armor.htm` }))
  }
  for (const a of now.attacks)
    if (!a.proficient)
      out.push(w(`weapon-prof-${a.itemUid}`, 'error', 'combat', `Not proficient with ${a.weapon.name.en} (−4 attack)`, `Pas de maniement de ${a.weapon.name.fr} (−4 à l'attaque)`, { srdUrl: `${SRD}equipment/weapons.htm` }))
  // Two-handed grip with a shield on the arm: only a buckler can stay strapped (−1 attack, already applied);
  // a light or heavy shield needs its hand (rulings-combat-equipment.md R27).
  if (now.shield && now.shield.def.id !== 'buckler' && now.attacks.some((a) => a.twoHands && a.weapon.kind === 'melee'))
    out.push(w('two-hands-shield', 'warning', 'combat',
      `A weapon held two-handed and ${now.shield.def.name.en} in the same loadout: the shield hand is needed for the weapon (only a buckler stays usable)`,
      `Arme tenue à deux mains et ${now.shield.def.name.fr} dans la même configuration : la main du bouclier sert à tenir l'arme (seule une targe reste utilisable)`,
      { srdUrl: `${SRD}equipment/armor.htm#buckler` }))
  if (now.load.band !== 'light')
    out.push(w('load', now.load.band === 'overloaded' ? 'error' : 'warning', 'inventory',
      `Load: ${now.load.band} (${now.load.carried.lb} lb)`, `Charge : ${now.load.band === 'medium' ? 'intermédiaire' : now.load.band === 'heavy' ? 'lourde' : 'excessive'} (${now.load.carried.kg} kg)`,
      { srdUrl: `${SRD}carryingCapacity.htm` }))
  if (now.maxDex.value !== null && now.abilities.dex.mod > now.maxDex.value)
    out.push(w('max-dex', 'info', 'combat',
      `Dex bonus to AC capped at +${now.maxDex.value} by ${now.maxDex.from.en} (Dex mod +${now.abilities.dex.mod})`,
      `Bonus de Dex à la CA limité à +${now.maxDex.value} par ${now.maxDex.from.fr} (mod. Dex +${now.abilities.dex.mod})`,
      { srdUrl: `${SRD}equipment/armor.htm#maximumDexBonus` }))
  // Special abilities need at least +1 (https://www.d20srd.org/srd/magicItems/magicWeapons.htm). Above a +10 total
  // the item is epic (https://www.d20srd.org/srd/epic/magicItems/epicMagicItems.htm): allowed, only noted.
  for (const it of char.inventory) {
    const props = (it.properties ?? []).map((id) => rules.itemProperties.get(id)).filter((d) => !!d)
    if (!props.length) continue
    const enh = it.enhancement ?? 0
    const total = enh + props.reduce((s, p) => s + p.bonusEquivalent, 0)
    if (enh < 1)
      out.push(w(`props-need-enh-${it.uid}`, 'error', 'inventory', 'Special abilities need at least a +1 enhancement bonus', 'Les propriétés spéciales exigent au moins un bonus d’altération de +1', { srdUrl: `${SRD}magicItems/magicWeapons.htm` }))
    if (total > 10)
      out.push(w(`props-epic-${it.uid}`, 'info', 'inventory', `Total bonus +${total}: epic item (above +10)`, `Bonus total +${total} : objet épique (au-delà de +10)`, { srdUrl: `${SRD}epic/magicItems/epicMagicItems.htm` }))
  }
  const slots: Record<string, number> = {}
  for (const it of char.inventory) {
    if (it.location !== 'worn') continue
    const armorCat = it.kind === 'armor' ? rules.armor.get(it.refId)?.category : undefined
    const slot =
      it.kind === 'magic'
        ? rules.magicItems.get(it.refId)?.slot
        : it.kind === 'custom'
          ? it.custom?.slot
        : armorCat && armorCat !== 'shield' && armorCat !== 'tower'
          ? 'body' // a suit of armor occupies the body slot
          : undefined
    if (slot) slots[slot] = (slots[slot] ?? 0) + it.quantity
  }
  for (const [slot, n] of Object.entries(slots))
    if (n > (slot === 'ring' ? 2 : 1))
      out.push(w(`slot-${slot}`, 'error', 'inventory', `Too many items worn on slot "${slot}": only the first works`, `Trop d'objets sur l'emplacement « ${slot} » : seul le premier fonctionne`, { srdUrl: `${SRD}magicItems/magicItemBasics.htm` }))

  // Build choices the player must make or fix; situational warnings (unusable feat, load, max Dex, slots,
  // suspended class features) are informative only.
  const INFORMATIVE = /^(unusable-|weapon-master-lost|multiclass-xp-penalty|load$|max-dex$|slot-|armor-prof-|weapon-prof-)/
  for (const x of out) x.actionable = ['skills', 'feats', 'abilities', 'levels', 'maneuvers'].includes(x.area) && !INFORMATIVE.test(x.id)
  return out
}
