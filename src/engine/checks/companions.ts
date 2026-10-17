// Companion checks: Improved Familiar and the familiar lists.
import { w, type CheckContext } from './common'
import {
  arcaneSpellcasterLevel,
  FAMILIARS,
  familiarLevel,
  IMPROVED_FAMILIAR_URL,
  improvedFamiliarCheck,
  isImprovedFamiliar,
} from '../arcane'

/** Familiars (https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars, feats.htm#improvedFamiliar). */
export function checkCompanions(ctx: CheckContext): void {
  const { char, rules, now, out } = ctx
  // Improved Familiar: "Ability to acquire a new familiar" (sorcerer or wizard), https://www.d20srd.org/srd/feats.htm#improvedFamiliar.
  if (now.feats.some((f) => f.featId === 'improved-familiar') && familiarLevel(now.classLevels) === 0)
    out.push(
      w(
        'improved-familiar-no-familiar',
        'error',
        'feats',
        'Improved Familiar needs the ability to acquire a familiar (sorcerer or wizard)',
        'Familier supérieur demande de pouvoir obtenir un familier (ensorceleur ou magicien)',
        { srdUrl: IMPROVED_FAMILIAR_URL },
      ),
    )
  // Familiar: an improved familiar needs the feat, the arcane spellcaster level and an alignment close enough
  // (https://www.d20srd.org/srd/feats.htm#improvedFamiliar); otherwise one of the ten standard familiars.
  for (const c of (char.companions ?? []).filter((x) => x.kind === 'familiar')) {
    const name = rules.creatures.get(c.creatureId)?.name ?? { en: c.creatureId, fr: c.creatureId }
    if (isImprovedFamiliar(c.creatureId, c.template)) {
      const arcaneLevel = arcaneSpellcasterLevel(now.classLevels, rules)
      const { blockers: why, check } = improvedFamiliarCheck(c.creatureId, {
        hasFeat: now.feats.some((f) => f.featId === 'improved-familiar'),
        arcaneLevel,
        alignment: char.identity.alignment,
        template: c.template,
      })
      if (why.length)
        out.push(
          w(
            `familiar-improved-${c.uid}`,
            'error',
            'companions',
            `${name.en} as a familiar: ${why.map((x) => x.en).join(', ')}`,
            `${name.fr} comme familier : ${why.map((x) => x.fr).join(', ')}`,
            { srdUrl: IMPROVED_FAMILIAR_URL },
          ),
        )
      else if (check)
        out.push(
          w(
            `familiar-check-${c.uid}`,
            'info',
            'companions',
            `${name.en} as a familiar: ${check.en}`,
            `${name.fr} comme familier : ${check.fr}`,
            { srdUrl: IMPROVED_FAMILIAR_URL },
          ),
        )
      if (c.template && !FAMILIARS.some((f) => f.id === c.creatureId))
        out.push(
          w(
            `familiar-template-${c.uid}`,
            'error',
            'companions',
            `${name.en}: only an animal of the standard familiar list can be celestial or fiendish`,
            `${name.fr} : seul un animal de la liste des familiers peut être céleste ou fiélon`,
            { srdUrl: IMPROVED_FAMILIAR_URL },
          ),
        )
    } else if (!FAMILIARS.some((f) => f.id === c.creatureId))
      out.push(
        w(
          `familiar-not-allowed-${c.uid}`,
          'error',
          'companions',
          `${name.en} is not on the familiar lists`,
          `${name.fr} n’est pas sur les listes de familiers`,
          { srdUrl: IMPROVED_FAMILIAR_URL },
        ),
      )
  }
}
