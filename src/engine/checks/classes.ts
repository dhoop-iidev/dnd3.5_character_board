// Class checks: cleric energy and domains vs alignment, class alignment, monk/paladin multiclassing, stray rogue special abilities, class-feature choices.
import { SRD, w, type CheckContext } from './common'
import { choicesAt } from '../classChoices'
import { parseAlignment, opposedDescriptors } from '../alignment'
import { domainsOf } from '../cleric'
import { CLASS_ALIGNMENT, NO_RETURN_CLASSES, ROGUE_SPECIAL_LEVELS } from '../classFeatures'

/** Class restrictions and class-feature choices. */
export function checkClasses(ctx: CheckContext): void {
  const { char, rules, out } = ctx
  // ---- cleric energy vs alignment: a good cleric channels positive energy, an evil one negative
  // (https://www.d20srd.org/srd/classes/cleric.htm#spontaneousCasting).
  {
    const first = char.levels.find((l) => l.classId === 'cleric')
    const ch = first?.classChoices?.channel
    const al = parseAlignment(char.identity.alignment)
    const good = al?.moral === 'good'
    const evil = al?.moral === 'evil'
    if (ch && ((good && ch === 'negative') || (evil && ch === 'positive')))
      out.push(
        w(
          'cleric-energy-alignment',
          'error',
          'levels',
          `A ${good ? 'good' : 'evil'} cleric must channel ${good ? 'positive' : 'negative'} energy`,
          `Un prêtre ${good ? 'bon' : 'mauvais'} canalise l'énergie ${good ? 'positive' : 'négative'}`,
          { srdUrl: `${SRD}classes/cleric.htm#spontaneousCasting` },
        ),
      )
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
          out.push(
            w(
              `cleric-domain-alignment-${d.id}`,
              'error',
              'levels',
              `The ${d.name.en} domain needs a matching alignment (${char.identity.alignment || 'none given'})`,
              `Le domaine ${d.name.fr} exige un alignement correspondant (${char.identity.alignment || 'non indiqué'})`,
              { srdUrl: `${SRD}classes/cleric.htm#domains`, actionable: true },
            ),
          )
      // Spells of an opposed alignment can't be cast (https://www.d20srd.org/srd/classes/cleric.htm).
      const opposed = al ? opposedDescriptors(al) : []
      const prepared = Object.values(char.spells?.['cleric']?.prepared ?? {}).flat()
      for (const id of new Set(prepared.map((x) => x.id).filter(Boolean))) {
        const sp = rules.spells.get(id)
        const bad = sp?.descriptors?.find((d) => opposed.includes(d))
        if (sp && bad)
          out.push(
            w(
              `cleric-opposed-spell-${id}`,
              'error',
              'levels',
              `${sp.name.en} has the ${bad} descriptor, opposed to the cleric's alignment: it can't be cast`,
              `${sp.name.fr} a le registre ${bad === 'evil' ? 'Mal' : bad === 'good' ? 'Bien' : bad === 'lawful' ? 'Loi' : 'Chaos'}, opposé à l'alignement du prêtre : il ne peut pas être lancé`,
              { srdUrl: `${SRD}classes/cleric.htm` },
            ),
          )
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
          paladin: {
            en: 'all paladin spells and abilities are lost',
            fr: 'tous les sorts et pouvoirs de paladin sont perdus',
          },
          barbarian: { en: 'no rage', fr: 'plus de rage' },
          druid: {
            en: 'all druid spells and abilities are lost, animal companion included',
            fr: 'tous les sorts et pouvoirs de druide sont perdus, compagnon animal compris',
          },
          bard: { en: 'abilities kept', fr: 'pouvoirs conservés' },
          monk: { en: 'abilities kept', fr: 'pouvoirs conservés' },
        }
        out.push(
          w(
            `class-alignment-${id}`,
            'warning',
            'levels',
            `${cls?.name.en ?? id} requires ${rule.text.en} (${char.identity.alignment}): no new ${cls?.name.en ?? id} level; ${lost[id]?.en ?? ''}`,
            `${cls?.name.fr ?? id} exige ${rule.text.fr} (${char.identity.alignment}) : plus de nouveau niveau de ${cls?.name.fr ?? id} ; ${lost[id]?.fr ?? ''}`,
            { srdUrl: rule.url },
          ),
        )
      }
    // Monk, paladin: after a level in another class, never again a level in this one.
    for (const id of NO_RETURN_CLASSES) {
      let seen = false
      let left = false
      char.levels.forEach((l, i) => {
        if (l.classId === id) {
          if (left)
            out.push(
              w(
                `no-return-${id}-${i + 1}`,
                'error',
                'levels',
                `Level ${i + 1}: a multiclass ${id} can't take a new ${id} level after a level in another class`,
                `Niveau ${i + 1} : un ${rules.classes.get(id)?.name.fr ?? id} multiclassé ne peut plus reprendre de niveau de ${rules.classes.get(id)?.name.fr ?? id} après un niveau dans une autre classe`,
                { level: i + 1, srdUrl: CLASS_ALIGNMENT[id].url, actionable: true },
              ),
            )
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
        out.push(
          w(
            `rogue-special-stray-${i + 1}`,
            'warning',
            'levels',
            `Level ${i + 1}: a rogue special ability is recorded here, but only rogue levels 10, 13, 16 and 19 grant one (ignored)`,
            `Niveau ${i + 1} : une aptitude spéciale de roublard est notée ici, mais seuls les niveaux 10, 13, 16 et 19 de roublard en donnent (ignorée)`,
            { level: i + 1, srdUrl: `${SRD}classes/rogue.htm#specialAbilities`, actionable: true },
          ),
        )
    })
  }

  // ---- class-feature choices (ranger favored enemy, combat style)
  char.levels.forEach((lvl, i) => {
    const L = i + 1
    for (const ch of choicesAt(char, rules, L)) {
      const v = lvl.classChoices?.[ch.key]
      if (!v)
        out.push(
          w(
            `choice-missing-${ch.key}-${L}`,
            'warning',
            'levels',
            `Level ${L}: ${ch.label.en} not chosen yet`,
            `Niveau ${L} : ${ch.label.fr} pas encore choisi`,
            { level: L, srdUrl: ch.srdUrl },
          ),
        )
      else if (!ch.options.some((o) => o.id === v))
        out.push(
          w(
            `choice-invalid-${ch.key}-${L}`,
            'error',
            'levels',
            `Level ${L}: ${ch.label.en} "${v}" is not allowed here`,
            `Niveau ${L} : ${ch.label.fr} « ${v} » n'est pas permis ici`,
            { level: L, srdUrl: ch.srdUrl },
          ),
        )
    }
  })
}
