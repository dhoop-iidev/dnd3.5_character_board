// Spell checks: spells learned per level and swaps (bard, sorcerer, wizard), the wizard's schools and spellbook, Spell Mastery, metamagic on prepared spells.
import { SRD, w, type CheckContext } from './common'
import { domainsOf } from '../cleric'
import { listLevel, preparable, prohibitedCount, wizardSchools } from '../arcane'
import {
  knownUpTo,
  learningProblems,
  masteredSpells,
  masteryProblems,
  spellLearning,
  spellMasteryPicks,
  SPELL_MASTERY_URL,
  swapProblems,
} from '../spellLearning'
import { METAMAGIC_URL, metamagicProblems, ownedMetamagic, slotLevel } from '../metamagic'
import { spellLevelFor } from '../spells'

/** Spells learned, the spellbook, Spell Mastery and metamagic. */
export function checkSpells(ctx: CheckContext): void {
  const { char, rules, now, out } = ctx
  // ---- Bard, sorcerer, wizard: spells learned per level (spells known, free spellbook spells) and spell swaps
  // (https://www.d20srd.org/srd/classes/bard.htm, sorcerer.htm, wizard.htm; rulings-classes.md C31, C33).
  char.levels.forEach((lvl, i) => {
    const L = i + 1
    const x = spellLearning(char, rules, L)
    if (!x) {
      if (lvl.spellsLearned?.length || lvl.spellSwap)
        out.push(
          w(
            `spells-not-learned-${L}`,
            'error',
            'spells',
            `Level ${L}: no spells are learned at this level`,
            `Niveau ${L} : aucun sort ne s’apprend à ce niveau`,
            { level: L },
          ),
        )
      return
    }
    const url = `${SRD}classes/${x.owner}.htm`
    for (const p of learningProblems(rules, x))
      out.push(
        w(
          `spells-${p.kind}-${L}-${p.en}`,
          p.kind === 'missing' ? 'warning' : 'error',
          'spells',
          `Level ${L}: ${p.en}`,
          `Niveau ${L} : ${p.fr}`,
          { level: L, srdUrl: url, actionable: true },
        ),
      )
    if (lvl.spellSwap) {
      const problems = swapProblems(rules, x, lvl.spellSwap)
      if (problems.length)
        out.push(
          w(
            `spell-swap-${L}`,
            'error',
            'spells',
            `Level ${L}: spell swap not allowed: ${problems.map((p) => p.en).join(', ')}`,
            `Niveau ${L} : échange de sort impossible : ${problems.map((p) => p.fr).join(', ')}`,
            { level: L, srdUrl: url, actionable: true },
          ),
        )
    }
  })
  // Wizard: prohibited schools chosen (two, a diviner one; never divination), spells prepared from the spellbook and
  // not from a prohibited school (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization, #spellbooks).
  if (char.levels.some((l) => l.classId === 'wizard')) {
    const { specialty, prohibited } = wizardSchools(char)
    const want = prohibitedCount(specialty)
    const WIZ = `${SRD}classes/wizard.htm#schoolSpecialization`
    if (
      new Set(prohibited).size !== prohibited.length ||
      prohibited.includes(specialty ?? '') ||
      prohibited.includes('divination')
    )
      out.push(
        w(
          'prohibited-schools-invalid',
          'error',
          'spells',
          'Prohibited schools: two different schools other than the specialty and divination',
          'Écoles interdites : deux écoles différentes, autres que la spécialité et la divination',
          { srdUrl: WIZ, actionable: true },
        ),
      )
    else if (prohibited.length < want)
      out.push(
        w(
          'prohibited-schools-missing',
          'warning',
          'spells',
          `Specialist wizard: ${want - prohibited.length} prohibited school(s) to choose (Progression, wizard 1)`,
          `Magicien spécialisé : ${want - prohibited.length} école(s) interdite(s) à choisir (Progression, magicien 1)`,
          { srdUrl: WIZ, actionable: true },
        ),
      )
    const book = preparable(char, rules, knownUpTo(char, rules, 'wizard'))
    for (const [lvl, list] of Object.entries(char.spells?.['wizard']?.prepared ?? {}))
      for (const slot of list) {
        const sp = slot.id ? rules.spells.get(slot.id) : undefined
        if (!sp) continue
        if (!book.has(sp.id))
          out.push(
            w(
              `prepared-not-in-book-${sp.id}`,
              'warning',
              'spells',
              `${sp.name.en} (level ${lvl} slot) is not in the spellbook`,
              `${sp.name.fr} (emplacement de niveau ${lvl}) n’est pas dans le grimoire`,
              { srdUrl: `${SRD}classes/wizard.htm#spellbooks` },
            ),
          )
        if (prohibited.includes(sp.schoolId ?? ''))
          out.push(
            w(
              `prepared-prohibited-${sp.id}`,
              'error',
              'spells',
              `${sp.name.en}: prohibited school`,
              `${sp.name.fr} : école interdite`,
              { srdUrl: WIZ },
            ),
          )
      }
    for (const id of char.spells?.['wizard']?.spellbook ?? []) {
      const sp = rules.spells.get(id)
      if (!sp || listLevel(rules, 'wizard', id) === undefined)
        out.push(
          w(
            `spellbook-not-wizard-${id}`,
            'error',
            'spells',
            `${sp?.name.en ?? id}: not a wizard spell`,
            `${sp?.name.fr ?? id} : pas un sort de magicien`,
            { srdUrl: `${SRD}classes/wizard.htm#spellbooks` },
          ),
        )
      else if (prohibited.includes(sp.schoolId ?? ''))
        out.push(
          w(
            `spellbook-prohibited-${id}`,
            'error',
            'spells',
            `${sp.name.en}: prohibited school (can't be learned)`,
            `${sp.name.fr} : école interdite (ne peut pas être appris)`,
            { srdUrl: WIZ },
          ),
        )
    }
  }
  // Spell Mastery: as many spells as the Int modifier, from the spellbook; without the spellbook, only those (and read
  // magic) can be prepared (https://www.d20srd.org/srd/feats.htm#spellMasterySpecial).
  for (const p of spellMasteryPicks(char, rules))
    for (const x of masteryProblems(char, rules, p))
      out.push(
        w(
          `spell-mastery-${x.kind}-${p.L}-${p.index}-${x.text.en}`,
          x.kind === 'missing' ? 'warning' : 'error',
          'spells',
          `Spell Mastery (level ${p.L}): ${x.text.en}`,
          `Maîtrise des sorts (niveau ${p.L}) : ${x.text.fr}`,
          { level: p.L, srdUrl: SPELL_MASTERY_URL },
        ),
      )
  if (char.spells?.['wizard']?.withoutBook) {
    const mastered = masteredSpells(char)
    for (const list of Object.values(char.spells['wizard'].prepared))
      for (const slot of list) {
        const sp = slot.id ? rules.spells.get(slot.id) : undefined
        if (sp && sp.id !== 'read-magic' && !mastered.has(sp.id))
          out.push(
            w(
              `prepared-without-book-${sp.id}`,
              'warning',
              'spells',
              `${sp.name.en}: prepared without the spellbook, but not a Spell Mastery spell`,
              `${sp.name.fr} : préparé sans le grimoire, mais pas un sort de Maîtrise des sorts`,
              { srdUrl: SPELL_MASTERY_URL },
            ),
          )
      }
  }
  // Extra slots: a cleric's domain slot holds a spell of one of her domains
  // (https://www.d20srd.org/srd/classes/cleric.htm#domainsandDomainSpells), a specialist wizard's extra slot a spell of
  // the specialty school (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization).
  {
    const domains = domainsOf(char, rules)
    const { specialty } = wizardSchools(char)
    for (const sc of now.spellcasting) {
      if (sc.classId !== 'cleric' && !(sc.classId === 'wizard' && specialty)) continue
      for (const [lvl, list] of Object.entries(char.spells?.[sc.classId]?.prepared ?? {})) {
        const slotInfo = sc.slots.find((x) => x.spellLevel === Number(lvl))
        if (!slotInfo?.extra) continue
        list.forEach((slot, j) => {
          const sp = slot.id ? rules.spells.get(slot.id) : undefined
          if (!sp || j < slotInfo.total - slotInfo.extra) return
          const cleric = sc.classId === 'cleric'
          if (cleric ? domains.some((d) => sp.level[`domain:${d.id}`] !== undefined) : sp.schoolId === specialty) return
          out.push(
            w(
              `extra-slot-${sc.classId}-${lvl}-${j}`,
              'error',
              'spells',
              cleric
                ? `${sp.name.en} in a domain slot: not a spell of your domains`
                : `${sp.name.en} in the specialty slot: not a spell of your specialty school`,
              cleric
                ? `${sp.name.fr} dans un emplacement de domaine : ce n'est pas un sort de vos domaines`
                : `${sp.name.fr} dans l'emplacement de spécialité : ce n'est pas un sort de votre école de spécialité`,
              { srdUrl: cleric ? `${SRD}classes/cleric.htm#domainsandDomainSpells` : `${SRD}classes/wizard.htm#schoolSpecialization` },
            ),
          )
        })
      }
    }
  }
  // Metamagic on prepared spells (https://www.d20srd.org/srd/feats.htm#metamagicFeats): feats known, the slot is of the
  // spell's level + the feats' adjustments or higher, each feat's restrictions.
  {
    const owned = ownedMetamagic(now.feats)
    const domainIds = domainsOf(char, rules).map((d) => d.id)
    for (const sc of now.spellcasting) {
      if (sc.def.style !== 'prepared') continue
      for (const [lvl, list] of Object.entries(char.spells?.[sc.classId]?.prepared ?? {}))
        list.forEach((slot, j) => {
          const sp = slot.id ? rules.spells.get(slot.id) : undefined
          if (!sp || !slot.metamagic?.length) return
          const slotInfo = sc.slots.find((x) => x.spellLevel === Number(lvl))
          const domainSlot = sc.classId === 'cleric' && !!slotInfo?.extra && j >= slotInfo.total - slotInfo.extra
          const base = spellLevelFor(sp, sc.classId, sc.def.list, domainIds, domainSlot) ?? Number(lvl)
          const id = `prepared-metamagic-${sc.classId}-${lvl}-${j}`
          const need = slotLevel(base, slot)
          // House rule #40: never in a slot of a level the key ability is too low for.
          if (sc.slots.find((x) => x.spellLevel === Number(lvl))?.blocked)
            out.push(
              w(
                `${id}-blocked`,
                'error',
                'spells',
                `${sp.name.en} with metamagic: key ability too low for level ${lvl} slots (house rule #40)`,
                `${sp.name.fr} avec métamagie : caractéristique trop basse pour les emplacements de niveau ${lvl} (règle maison n° 40)`,
                { srdUrl: METAMAGIC_URL },
              ),
            )
          if (need > Number(lvl))
            out.push(
              w(
                `${id}-slot`,
                'error',
                'spells',
                `${sp.name.en} with metamagic needs a level ${need} slot (prepared in a level ${lvl} slot)`,
                `${sp.name.fr} avec métamagie demande un emplacement de niveau ${need} (préparé dans un emplacement de niveau ${lvl})`,
                { srdUrl: METAMAGIC_URL },
              ),
            )
          for (const p of metamagicProblems(sp, base, slot, {
            owned,
            spontaneous: false,
            bard: false,
            maxLevel: sc.def.maxSpellLevel,
          }))
            out.push(
              w(
                `${id}-${p.text.en}`,
                p.kind === 'illegal' ? 'error' : 'info',
                'spells',
                `${sp.name.en}: ${p.text.en}`,
                `${sp.name.fr} : ${p.text.fr}`,
                { srdUrl: METAMAGIC_URL },
              ),
            )
        })
    }
  }
}
