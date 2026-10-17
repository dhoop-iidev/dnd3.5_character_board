// Build checks, level by level: prestige class requirements, skill points and ranks, feat slots and prerequisites, rolled hit points, ability increases; the deity feat, the multiclass XP penalty, the race.
import { SRD, w, type CheckContext } from './common'
import { unmetPrereqs } from '../prereq'
import { classBonusFeatList, featSlotsAt, isAbilityIncreaseLevel, skillBudget } from '../progression'
import { raceOf } from '../race'

/** Level-by-level build legality (checked on the build without temporary state). */
export function checkBuild(ctx: CheckContext): void {
  const { char, rules, perm, sheetAt, out } = ctx
  const classCount: Record<string, number> = {}
  const rankTotals: Record<string, number> = {}
  const feats: { featId: string; choice?: string }[] = []
  let deityFeats = 0

  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const cls = rules.classes.get(lvl.classId)
    if (!cls) {
      out.push(
        w(
          `unknown-class-${L}`,
          'error',
          'levels',
          `Level ${L}: unknown class "${lvl.classId}"`,
          `Niveau ${L} : classe inconnue « ${lvl.classId} »`,
          { level: L },
        ),
      )
      return
    }
    const before = sheetAt(L - 1)
    classCount[cls.id] = (classCount[cls.id] ?? 0) + 1
    const classLevel = classCount[cls.id]
    const after = sheetAt(L)

    // Prestige class entry requirements, checked on the state before its first level.
    if (cls.prestige && classLevel === 1) {
      const owned = [...feats, ...before.feats.filter((f) => f.slot === 'granted'), ...before.inactiveStyleFeats]
      const unmet = unmetPrereqs(cls.requirements, before, rules, owned, perm.weaponOfChoice)
      if (cls.requirements?.masterworkWeapon) {
        const hasMw = char.inventory.some(
          (it) =>
            it.kind === 'weapon' &&
            it.refId === perm.weaponOfChoice &&
            (it.masterwork ||
              (it.enhancement ?? 0) > 0 ||
              !!(it.material && rules.materials.get(it.material)?.effects.masterwork)),
        )
        if (!hasMw) unmet.push({ en: 'masterwork weapon of choice', fr: 'arme de prédilection de maître' })
      }
      if (unmet.length)
        out.push(
          w(
            `prestige-${cls.id}`,
            'error',
            'levels',
            `Level ${L}: requirements for ${cls.name.en} not met: ${unmet.map((u) => u.en).join(', ')}`,
            `Niveau ${L} : conditions de ${cls.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
            { level: L, book: cls.source.book, srdUrl: cls.source.srdUrl ?? `${SRD}prestigeClasses.htm` },
          ),
        )
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
        out.push(
          w(
            `max-ranks-${key}-${L}`,
            'error',
            'skills',
            `Level ${L}: ${name.en} has ${rankTotals[key]} ranks, max ${max} (${kind ? 'class' : 'cross-class'} skill)`,
            `Niveau ${L} : ${name.fr} a ${rankTotals[key]} degrés, max ${max} (compétence ${kind ? 'de classe' : 'hors classe'})`,
            { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` },
          ),
        )
      }
      if (!rules.skills.has(skillId))
        out.push(
          w(`unknown-skill-${key}`, 'error', 'skills', `Unknown skill "${key}"`, `Compétence inconnue « ${key} »`, {
            level: L,
          }),
        )
    }
    if (spent !== available)
      out.push(
        w(
          `skill-points-${L}`,
          spent < available ? 'warning' : 'error',
          'skills',
          spent < available
            ? `Level ${L} (${cls.name.en}): ${available - spent} skill point(s) unspent (${spent}/${available})`
            : `Level ${L} (${cls.name.en}): ${spent - available} skill point(s) too many (${spent}/${available})`,
          spent < available
            ? `Niveau ${L} (${cls.name.fr}) : ${available - spent} point(s) de compétence non dépensé(s) (${spent}/${available})`
            : `Niveau ${L} (${cls.name.fr}) : ${spent - available} point(s) de compétence en trop (${spent}/${available})`,
          { level: L, srdUrl: `${SRD}skills/skillsSummary.htm` },
        ),
      )

    // Feat slots (docs/rules/feats.md; house rule #3 for the deity feat).
    const expected = featSlotsAt(perm, rules, L)
    for (const slot of ['general', 'race', 'class'] as const) {
      const n = lvl.feats.filter((f) => f.slot === slot).length
      const label = {
        general: ['general', 'général'],
        race: ['racial bonus', 'racial'],
        class: ['class bonus', 'supplémentaire de classe'],
      }[slot]
      if (n < expected[slot])
        out.push(
          w(
            `feat-missing-${slot}-${L}`,
            'warning',
            'feats',
            `Level ${L}: ${label[0]} feat not chosen yet`,
            `Niveau ${L} : don ${label[1]} pas encore choisi`,
            { level: L, srdUrl: `${SRD}feats.htm` },
          ),
        )
      if (n > expected[slot])
        out.push(
          w(
            `feat-extra-${slot}-${L}`,
            'error',
            'feats',
            `Level ${L}: too many ${slot} feats (${n}, allowed ${expected[slot]})`,
            `Niveau ${L} : trop de dons (${slot}) : ${n}, autorisé ${expected[slot]}`,
            { level: L, srdUrl: `${SRD}feats.htm` },
          ),
        )
    }
    deityFeats += lvl.feats.filter((f) => f.slot === 'deity').length

    // Prerequisites at the level the feat is taken (feats taken earlier in the same level count).
    for (const pick of lvl.feats) {
      const def = rules.feats.get(pick.featId)
      if (!def) {
        out.push(
          w(
            `unknown-feat-${pick.featId}`,
            'error',
            'feats',
            `Unknown feat "${pick.featId}"`,
            `Don inconnu « ${pick.featId} »`,
            { level: L },
          ),
        )
        continue
      }
      const bonusList = classBonusFeatList(char, rules, L)
      if (pick.slot === 'class' && !(bonusList ? bonusList.includes(def.id) : def.fighterBonus))
        out.push(
          w(
            `feat-not-class-${pick.featId}`,
            'error',
            'feats',
            `Level ${L}: ${def.name.en} is not a ${cls.name.en} bonus feat`,
            `Niveau ${L} : ${def.name.fr} n'est pas un don supplémentaire de ${cls.name.fr}`,
            { level: L, srdUrl: cls.source.srdUrl ?? `${SRD}classes/fighter.htm` },
          ),
        )
      // Feats granted by class features at this level count too (ranger Endurance → Diehard).
      const granted = [...after.feats.filter((f) => f.slot === 'granted'), ...after.inactiveStyleFeats]
      const unmet =
        pick.slot === 'class' && cls.bonusFeatIgnorePrereqs
          ? []
          : unmetPrereqs(def.prereq, after, rules, [...feats, ...granted], pick.choice)
      if (unmet.length)
        out.push(
          w(
            `prereq-${pick.featId}-${L}`,
            'error',
            'feats',
            `Level ${L}: ${def.name.en} prerequisites not met: ${unmet.map((u) => u.en).join(', ')}`,
            `Niveau ${L} : conditions de ${def.name.fr} non remplies : ${unmet.map((u) => u.fr).join(', ')}`,
            { level: L, srdUrl: def.source.srdUrl },
          ),
        )
      if (!def.multiple && feats.some((f) => f.featId === pick.featId && f.choice === pick.choice))
        out.push(
          w(
            `feat-dup-${pick.featId}-${L}`,
            'error',
            'feats',
            `Level ${L}: ${def.name.en} taken twice`,
            `Niveau ${L} : ${def.name.fr} pris deux fois`,
            { level: L },
          ),
        )
      feats.push(pick)
    }

    // Rolled hit points (house rule #9 switched off): each level after the 1st needs its roll.
    if (L > 1 && char.settings.maxHitDice === false) {
      const r = lvl.hpRoll
      if (r === undefined)
        out.push(
          w(
            `hp-roll-missing-${L}`,
            'warning',
            'levels',
            `Level ${L}: hit points not rolled yet (average used)`,
            `Niveau ${L} : points de vie pas encore lancés (moyenne utilisée)`,
            { level: L, srdUrl: `${SRD}combat/combatStatistics.htm#hitPoints` },
          ),
        )
      else if (r < 1 || r > cls.hitDie)
        out.push(
          w(
            `hp-roll-invalid-${L}`,
            'error',
            'levels',
            `Level ${L}: a d${cls.hitDie} roll must be 1–${cls.hitDie}`,
            `Niveau ${L} : un jet de d${cls.hitDie} va de 1 à ${cls.hitDie}`,
            { level: L },
          ),
        )
    }

    // Ability increases every 4 levels.
    if (isAbilityIncreaseLevel(L) && !lvl.abilityIncrease)
      out.push(
        w(
          `ability-increase-missing-${L}`,
          'warning',
          'abilities',
          `Level ${L}: ability increase not chosen`,
          `Niveau ${L} : augmentation de caractéristique non choisie`,
          { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` },
        ),
      )
    if (!isAbilityIncreaseLevel(L) && lvl.abilityIncrease)
      out.push(
        w(
          `ability-increase-extra-${L}`,
          'error',
          'abilities',
          `Level ${L}: no ability increase at this level`,
          `Niveau ${L} : pas d'augmentation de caractéristique à ce niveau`,
          { level: L, srdUrl: `${SRD}theBasics.htm#abilityScores` },
        ),
      )
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
      out.push(
        w(
          'multiclass-xp-penalty',
          'info',
          'levels',
          `Multiclass XP penalty: −${20 * behind.length}% (classes more than one level apart)`,
          `Pénalité d'XP de multiclassage : −${20 * behind.length} % (classes à plus d'un niveau d'écart)`,
          { srdUrl: `${SRD}xp.htm` },
        ),
      )
  }

  if (deityFeats > 1)
    out.push(
      w(
        'deity-feats',
        'error',
        'feats',
        `Only one deity bonus feat (house rule #3), found ${deityFeats}`,
        `Un seul don accordé par le dieu (règle maison n°3), trouvé ${deityFeats}`,
      ),
    )
  if (!rules.races.has(char.identity.race))
    out.push(
      w(
        'unknown-race',
        'error',
        'levels',
        `Unknown race "${char.identity.race}": human rules used`,
        `Race inconnue « ${char.identity.race} » : règles de l'humain utilisées`,
        { srdUrl: `${SRD}races.htm` },
      ),
    )
}
