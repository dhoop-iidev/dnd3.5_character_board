// Stage 7 — class-feature checks, cleric turning, and barbarian/monk/paladin/rogue/bard/crusader features.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { I18n } from '../../data/types'
import type { Character } from '../../model/character'
import { i18n, resolve } from '../stacking'
import { clericChoices, domainsOf, TURNING_TABLE } from '../cleric'
import { bardicSongs, SONG_EFFECTS } from '../arcane'
import { rageStats, removeDiseasePerWeek, slowFallFt, smitePerDay, ROGUE_SPECIAL_LEVELS } from '../classFeatures'
import type { ClassFeatures, Sheet, ComputeOptions } from './types'
import { src, abilityMod } from './common'
import type { AttacksOut } from './attacks'

export function classesStage(rules: Rules, opts: ComputeOptions, c: AttacksOut) {
  const {
    abilities,
    abilityPart,
    alignment,
    char,
    characterLevel,
    classLevels,
    crusaderLvl,
    exDruid,
    feats,
    flurry,
    flurryOn,
    focusPicks,
    furious,
    hasFeat,
    levels,
    mod,
    monkLevel,
    paladinGood,
    paladinLvl,
    pool,
    ranger,
    rogueLevel,
    sneak,
    styleId,
    swordsageLvl,
  } = c
  // ---- class-feature checks: wild empathy = d20 + druid/ranger level + Cha (https://www.d20srd.org/srd/classes/ranger.htm#wildEmpathy)
  const featureStats: Sheet['featureStats'] = []
  const empathyClasses = Object.entries(classLevels).filter(
    ([id]) => !(id === 'druid' && exDruid) && rules.classes.get(id)?.features?.some((f) => f.id === 'wild-empathy'),
  )
  if (empathyClasses.length) {
    // Druid and ranger wild empathy don't stack: two abilities of the same name, use the better one (no stacking
    // clause, unlike the animal companion; 3.5 FAQ pp. 9-10; docs/rules/rulings-classes.md C1).
    empathyClasses.sort((a, b) => b[1] - a[1])
    empathyClasses.splice(1)
    const f = rules.classes.get(empathyClasses[0][0])!.features!.find((x) => x.id === 'wild-empathy')!
    featureStats.push({
      id: 'wild-empathy',
      name: f.name,
      stat: resolve([
        ...empathyClasses.map(([id, n]) => ({
          sourceId: `class:${id}`,
          label: { en: `${rules.classes.get(id)!.name.en} ${n}`, fr: `${rules.classes.get(id)!.name.fr} ${n}` },
          value: n,
          bonusType: 'base' as const,
          source: f.source,
        })),
        abilityPart('cha'),
        // Synergy: 5 ranks of Handle Animal (https://www.d20srd.org/srd/skills/handleAnimal.htm).
        ...(levels.reduce((n, l) => n + (l.skillRanks['handle-animal'] ?? 0), 0) >= 5
          ? [
              {
                sourceId: 'synergy:handle-animal',
                label: i18n('Handle Animal 5 ranks', 'Dressage 5 degrés'),
                value: 2,
                bonusType: 'circumstance' as const,
                source: src('skills/handleAnimal.htm'),
              },
            ]
          : []),
      ]),
    })
  }
  // Bardic knowledge: d20 + bard level + Int modifier, +2 with 5 ranks of Knowledge (history); no taking 10 or 20
  // (https://www.d20srd.org/srd/classes/bard.htm#bardicKnowledge).
  const bardLevel = classLevels['bard'] ?? 0
  if (bardLevel) {
    const f = rules.classes.get('bard')!.features!.find((x) => x.id === 'bardic-knowledge')!
    featureStats.push({
      id: 'bardic-knowledge',
      name: f.name,
      stat: resolve([
        {
          sourceId: 'class:bard',
          label: i18n(`Bard ${bardLevel}`, `Barde ${bardLevel}`),
          value: bardLevel,
          bonusType: 'base',
          source: f.source,
        },
        abilityPart('int'),
        ...(levels.reduce((n, l) => n + (l.skillRanks['knowledge-history'] ?? 0), 0) >= 5
          ? [
              {
                sourceId: 'knowledge-history',
                label: i18n('Knowledge (history) 5 ranks', 'Connaissances (histoire) 5 degrés'),
                value: 2,
                bonusType: 'untyped' as const,
                source: f.source,
              },
            ]
          : []),
      ]),
    })
  }
  const rangerStyle = styleId ? ranger?.choices?.combatStyle?.find((o) => o.id === styleId) : undefined

  // ---- cleric: turn (positive energy) or rebuke (negative energy) undead, 3 + Cha mod per day (+4 per Extra
  // Turning); check 1d20 + Cha mod (+2 with 5 ranks of Knowledge (religion)); damage 2d6 + cleric level + Cha mod.
  const clericLevel = classLevels['cleric'] ?? 0
  const domains = clericLevel ? domainsOf(char, rules) : []
  // Paladins turn undead from 4th level as a cleric of 3 levels lower; a cleric/paladin adds both
  // (https://www.d20srd.org/srd/classes/multiclass.htm#classFeatures).
  const paladinLevel = classLevels['paladin'] ?? 0
  const paladinTurning = paladinLevel >= 4 && paladinGood ? paladinLevel - 3 : 0
  // Improved Turning: "as if you were one level higher" (https://www.d20srd.org/srd/feats.htm#improvedTurning).
  const improvedTurning = clericLevel + paladinTurning > 0 && hasFeat('improved-turning') ? 1 : 0
  // Phylactery of undead turning: "as if his class level were four levels higher"
  // (https://www.d20srd.org/srd/magicItems/wondrousItems.htm#phylacteryofUndeadTurning).
  const phylactery =
    clericLevel + paladinTurning > 0 &&
    char.inventory.some((i) => i.location === 'worn' && i.refId === 'phylactery-of-undead-turning')
      ? 4
      : 0
  const turningLevel = clericLevel + paladinTurning + improvedTurning + phylactery
  let turning: Sheet['turning']
  if (turningLevel) {
    const tsrc = src('combat/specialAttacks.htm#turnOrRebukeUndead')
    const extraTurning = feats.filter((f) => f.featId === 'extra-turning').length
    const religion = levels.reduce((n, l) => n + (l.skillRanks['knowledge-religion'] ?? 0), 0)
    turning = {
      mode: clericLevel && clericChoices(char).channel === 'negative' ? 'rebuke' : 'turn',
      level: turningLevel,
      usesPerDay: resolve([
        { sourceId: 'base', label: i18n('Base', 'Base'), value: 3, bonusType: 'base', source: tsrc },
        abilityPart('cha'),
        ...(extraTurning
          ? [
              {
                sourceId: 'feat:extra-turning',
                label: i18n(`Extra Turning ×${extraTurning}`, `Emprise sur les morts-vivants ×${extraTurning}`),
                value: 4 * extraTurning,
                bonusType: 'untyped' as const,
                source: src('feats.htm#extraTurning'),
              },
            ]
          : []),
      ]),
      check: resolve([
        abilityPart('cha'),
        ...(religion >= 5
          ? [
              {
                sourceId: 'synergy:knowledge-religion',
                label: i18n('Knowledge (religion) 5 ranks', 'Connaissances (religion) 5 degrés'),
                value: 2,
                bonusType: 'circumstance' as const,
                source: src('skills/knowledge.htm'),
              },
            ]
          : []),
      ]),
      damage: resolve([
        ...(clericLevel
          ? [
              {
                sourceId: 'class:cleric',
                label: i18n(`Cleric ${clericLevel}`, `Prêtre ${clericLevel}`),
                value: clericLevel,
                bonusType: 'base' as const,
                source: tsrc,
              },
            ]
          : []),
        ...(paladinTurning
          ? [
              {
                sourceId: 'class:paladin',
                label: i18n(`Paladin ${paladinLevel} − 3`, `Paladin ${paladinLevel} − 3`),
                value: paladinTurning,
                bonusType: 'base' as const,
                source: src('classes/paladin.htm#turnUndead'),
              },
            ]
          : []),
        ...(improvedTurning
          ? [
              {
                sourceId: 'feat:improved-turning',
                label: i18n('Improved Turning', 'Science du renvoi'),
                value: 1,
                bonusType: 'untyped' as const,
                source: src('feats.htm#improvedTurning'),
              },
            ]
          : []),
        ...(phylactery
          ? [
              {
                sourceId: 'item:phylactery',
                label: rules.magicItems.get('phylactery-of-undead-turning')!.name,
                value: 4,
                bonusType: 'untyped' as const,
                source: rules.magicItems.get('phylactery-of-undead-turning')!.source,
              },
            ]
          : []),
        abilityPart('cha'),
      ]),
      table: TURNING_TABLE.map((r) => ({ max: r.max, hd: turningLevel + r.delta })),
      // Domain turning (Air, Earth, Fire, Water, Plant: a separate pool of 3 + Cha, +4 per Extra Turning — the feat
      // applies to every turning ability, https://www.d20srd.org/srd/feats.htm#extraTurning; Sun: greater turning 1/day).
      // The abilities of one domain draw on one pool ("use these abilities a total number of times per day equal to
      // 3 + your Charisma modifier").
      extra: domains.flatMap((d) => {
        const list = d.effects?.turning ?? []
        const pool = list.filter((t) => t.perDay === '3+cha')
        const fixed = list.filter((t) => t.perDay !== '3+cha')
        return [
          ...(pool.length
            ? [
                {
                  name: d.name,
                  uses: pool.map((t) => ({ mode: t.mode, creatures: t.creatures })),
                  perDay: Math.max(0, 3 + mod('cha') + 4 * extraTurning),
                },
              ]
            : []),
          ...fixed.map((t) => ({
            name: d.name,
            uses: [{ mode: t.mode, creatures: t.creatures }],
            perDay: Number(t.perDay),
          })),
        ]
      }),
    }
  }

  // ---- barbarian, monk, paladin, rogue: rage, flurry, tracked uses, immunities and notes
  const classFeatures: ClassFeatures = { abilities: [], immunities: [], notes: [] }
  const note = (name: I18n, text: I18n, url: string) => classFeatures.notes.push({ name, text, source: src(url) })
  const barbLevel = classLevels['barbarian'] ?? 0
  if (barbLevel) {
    const r = rageStats(barbLevel)
    const active = char.activeEffects.some((e) => e.enabled && e.kind === 'class' && e.refId === 'rage')
    const con = abilities.con.score.total + (active ? 0 : r.strCon)
    classFeatures.rage = {
      name: r.name,
      perDay: r.perDay,
      strCon: r.strCon,
      will: r.will,
      tireless: r.tireless,
      rounds: Math.max(1, 3 + abilityMod(con)),
      active,
      available: alignment?.order !== 'lawful',
    }
    if (levels.every((l) => l.classId === 'barbarian'))
      note(
        i18n('Illiteracy', 'Illettrisme'),
        i18n(
          'Can’t read or write: 2 skill points to learn, or a level in another class.',
          'Ne sait ni lire ni écrire : 2 points de compétence pour apprendre, ou un niveau dans une autre classe.',
        ),
        'classes/barbarian.htm#illiteracy',
      )
  }
  // Improved uncanny dodge: barbarian 5, rogue 8, or uncanny dodge from two classes; the levels of the classes that
  // grant uncanny dodge stack (https://www.d20srd.org/srd/classes/barbarian.htm#improvedUncannyDodge).
  // Warblade: uncanny dodge at 2nd, improved at 6th, as the barbarian feature (Tome of Battle p. 22).
  const wbLevel = classLevels['warblade'] ?? 0
  const udClasses = [barbLevel >= 2, rogueLevel >= 4, wbLevel >= 2].filter(Boolean).length
  if (barbLevel >= 5 || rogueLevel >= 8 || wbLevel >= 6 || udClasses >= 2) {
    const udLevels =
      (barbLevel >= 2 ? barbLevel : 0) + (rogueLevel >= 4 ? rogueLevel : 0) + (wbLevel >= 2 ? wbLevel : 0)
    note(
      i18n('Improved uncanny dodge', 'Esquive instinctive supérieure'),
      i18n(
        `Can’t be flanked, except by a rogue of level ${udLevels + 4}+.`,
        `Ne peut pas être pris en tenaille, sauf par un roublard de niveau ${udLevels + 4} ou plus.`,
      ),
      barbLevel >= 5 ? 'classes/barbarian.htm#improvedUncannyDodge' : 'classes/rogue.htm#improvedUncannyDodge',
    )
  }
  // Evasion (monk 2, rogue 2) / improved evasion (monk 9, rogue special ability): the best one; two sources of evasion
  // don't make improved evasion (FAQ p. 9).
  const rogueSpecials = levels
    .filter(
      (l, i) =>
        l.classId === 'rogue' &&
        ROGUE_SPECIAL_LEVELS.includes(levels.slice(0, i + 1).filter((x) => x.classId === 'rogue').length),
    )
    .map((l) => l.classChoices?.specialAbility)
    .filter((x): x is string => !!x)
  const improvedEvasion = monkLevel >= 9 || rogueSpecials.includes('improved-evasion')
  if (improvedEvasion || monkLevel >= 2 || rogueLevel >= 2)
    note(
      improvedEvasion ? i18n('Improved evasion', 'Esquive extraordinaire') : i18n('Evasion', 'Esquive totale'),
      improvedEvasion
        ? i18n(
            'Reflex for half: no damage on a success, half on a failure (light or no armor; not helpless).',
            'Réflexes pour moitié : aucun dégât en cas de réussite, moitié en cas d’échec (armure légère ou aucune ; pas sans défense).',
          )
        : i18n(
            'Reflex for half: no damage on a success (light or no armor; not helpless).',
            'Réflexes pour moitié : aucun dégât en cas de réussite (armure légère ou aucune ; pas sans défense).',
          ),
      monkLevel >= 2
        ? improvedEvasion && monkLevel >= 9
          ? 'classes/monk.htm#monkImprovedEvasion'
          : 'classes/monk.htm#monkEvasion'
        : 'classes/rogue.htm#rogueEvasion',
    )

  if (monkLevel) {
    classFeatures.flurry = {
      penalty: flurry!.penalty,
      extra: flurry!.extra,
      available: flurry!.available,
      on: flurryOn,
    }
    if (monkLevel >= 7)
      classFeatures.abilities.push({
        id: 'wholeness-of-body',
        name: i18n('Wholeness of body', 'Plénitude physique'),
        max: 2 * monkLevel,
        period: 'day',
        pool: true,
        lines: [
          i18n(
            'Heal your own wounds, spread over several uses (standard action).',
            'Soigne vos propres blessures, en plusieurs fois (action simple).',
          ),
        ],
        source: src('classes/monk.htm#wholenessofBody'),
      })
    if (monkLevel >= 12)
      classFeatures.abilities.push({
        id: 'abundant-step',
        name: i18n('Abundant step', 'Pas chassé'),
        max: 1,
        period: 'day',
        lines: [
          i18n(
            `Dimension door, caster level ${Math.floor(monkLevel / 2)}.`,
            `Porte dimensionnelle, niveau de lanceur ${Math.floor(monkLevel / 2)}.`,
          ),
        ],
        source: src('classes/monk.htm#abundantStep'),
      })
    if (monkLevel >= 15)
      classFeatures.abilities.push({
        id: 'quivering-palm',
        name: i18n('Quivering palm', 'Paume vibratoire'),
        max: 1,
        period: 'week',
        lines: [
          i18n(
            `Announce before the attack; later, Fort DC ${10 + Math.floor(monkLevel / 2) + mod('wis')} or die (within ${monkLevel} days).`,
            `À annoncer avant l’attaque ; ensuite, Vigueur DD ${10 + Math.floor(monkLevel / 2) + mod('wis')} ou mort (dans les ${monkLevel} jours).`,
          ),
        ],
        source: src('classes/monk.htm#quiveringPalm'),
      })
    if (monkLevel >= 19)
      classFeatures.abilities.push({
        id: 'empty-body',
        name: i18n('Empty body', 'Désertion de l’âme'),
        max: monkLevel,
        period: 'day',
        pool: true,
        lines: [
          i18n(
            'Ethereal (as etherealness), rounds per day, spread out.',
            'Éthéré (comme forme éthérée), en rounds par jour, fractionnables.',
          ),
        ],
        source: src('classes/monk.htm#emptyBody'),
      })
    if (monkLevel >= 4) {
      const ft = slowFallFt(monkLevel)
      note(
        i18n('Slow fall', 'Chute ralentie'),
        ft === Infinity
          ? i18n(
              'Next to a wall: any distance without harm.',
              'Près d’une paroi : n’importe quelle hauteur sans dommage.',
            )
          : i18n(`Next to a wall: falls ${ft} ft shorter.`, `Près d’une paroi : chute réduite de ${ft * 0.3} m.`),
        'classes/monk.htm#slowFall',
      )
    }
    if (monkLevel >= 5) classFeatures.immunities.push(i18n('nonmagical diseases', 'maladies non magiques'))
    if (monkLevel >= 11) classFeatures.immunities.push(i18n('poisons', 'poisons'))
    if (monkLevel >= 13) classFeatures.spellResistance = 10 + monkLevel
    if (monkLevel >= 17)
      note(
        i18n('Timeless body, tongue of the sun and moon', 'Éternelle jeunesse, langues du soleil et de la lune'),
        i18n(
          'No aging penalties; speaks with any living creature.',
          'Plus de malus liés à l’âge ; parle avec toute créature vivante.',
        ),
        'classes/monk.htm#monkTimelessBody',
      )
    if (monkLevel >= 20)
      note(
        i18n('Perfect self', 'Perfection de l’être'),
        i18n(
          'Treated as an outsider for spells and magical effects; damage reduction 10/magic.',
          'Considéré comme un Extérieur pour les sorts et effets magiques ; réduction des dégâts 10/magie.',
        ),
        'classes/monk.htm#perfectSelf',
      )
  }
  // Stunning Fist: a monk gets monk level + 1 per 4 other levels uses per day; anyone else 1 per 4 levels
  // (https://www.d20srd.org/srd/feats.htm#stunningFist, https://www.d20srd.org/srd/classes/monk.htm#bonusFeat).
  if (hasFeat('stunning-fist')) {
    const uses = monkLevel ? monkLevel + Math.floor((characterLevel - monkLevel) / 4) : Math.floor(characterLevel / 4)
    classFeatures.abilities.push({
      id: 'stunning-fist',
      name: i18n('Stunning Fist', 'Coup étourdissant'),
      max: uses,
      period: 'day',
      lines: [
        i18n(
          `Declare before the attack roll; Fort DC ${10 + Math.floor(characterLevel / 2) + mod('wis')} or stunned 1 round; 1 per round.`,
          `À annoncer avant le jet d’attaque ; Vigueur DD ${10 + Math.floor(characterLevel / 2) + mod('wis')} ou étourdi 1 round ; 1 par round.`,
        ),
      ],
      source: src('feats.htm#stunningFist'),
    })
  }

  if (paladinLvl) {
    const lost = !paladinGood
    if (lost)
      note(
        i18n('Ex-paladin', 'Ancien paladin'),
        i18n(
          'Not lawful good: all paladin spells and abilities are lost until atonement.',
          'Pas loyal bon : tous les sorts et pouvoirs de paladin sont perdus jusqu’à une pénitence.',
        ),
        'classes/paladin.htm#exPaladins',
      )
    else {
      classFeatures.abilities.push({
        id: 'smite-evil',
        name: i18n('Smite evil', 'Châtiment du Mal'),
        max: smitePerDay(paladinLvl),
        period: 'day',
        lines: [
          i18n(
            `One melee attack: +${Math.max(0, mod('cha'))} attack, +${paladinLvl} damage; wasted on a non-evil target.`,
            `Une attaque au corps à corps : +${Math.max(0, mod('cha'))} à l’attaque, +${paladinLvl} aux dégâts ; perdu contre une cible non mauvaise.`,
          ),
        ],
        source: src('classes/paladin.htm#smiteEvil'),
      })
      if (paladinLvl >= 2 && mod('cha') > 0)
        classFeatures.abilities.push({
          id: 'lay-on-hands',
          name: i18n('Lay on hands', 'Imposition des mains'),
          max: paladinLvl * mod('cha'),
          period: 'day',
          pool: true,
          lines: [
            i18n(
              'Heal by touch (standard action), or damage undead (melee touch).',
              'Soigne par contact (action simple), ou blesse un mort-vivant (contact au corps à corps).',
            ),
          ],
          source: src('classes/paladin.htm#layonHands'),
        })
      if (paladinLvl >= 6)
        classFeatures.abilities.push({
          id: 'remove-disease',
          name: i18n('Remove disease', 'Guérison des maladies'),
          max: removeDiseasePerWeek(paladinLvl),
          period: 'week',
          lines: [i18n('As the spell.', 'Comme le sort.')],
          source: src('classes/paladin.htm#removeDisease'),
        })
      note(
        i18n('Aura of good, detect evil', 'Aura de Bien, détection du Mal'),
        i18n(
          `Aura of good as a cleric of level ${paladinLvl}; detect evil at will.`,
          `Aura de Bien comme un prêtre de niveau ${paladinLvl} ; détection du Mal à volonté.`,
        ),
        'classes/paladin.htm#auraofGood',
      )
      if (paladinLvl >= 3) {
        note(
          i18n('Aura of courage', 'Aura de bravoure'),
          i18n(
            'Immune to fear; allies within 10 ft +4 morale on saves vs fear (while conscious).',
            'Immunisé contre la terreur ; alliés à 3 m ou moins +4 de moral aux jets contre la terreur (si conscient).',
          ),
          'classes/paladin.htm#auraofCourage',
        )
        classFeatures.immunities.push(i18n('fear', 'terreur'), i18n('diseases', 'maladies'))
      }
    }
  }

  // Crusader (ToB pp. 8–14).
  if (crusaderLvl) {
    const row = rules.martialProgression.get('crusader')?.levels.find((r) => r.level === crusaderLvl) as
      { delayedDamagePool?: number } | undefined
    classFeatures.steelyResolve = { cap: row?.delayedDamagePool ?? 5, pool, furious }
    if (crusaderLvl >= 3)
      classFeatures.abilities.push({
        id: 'zealous-surge',
        name: i18n('Zealous surge', 'Sursaut de ferveur'),
        max: 1,
        period: 'day',
        lines: [
          i18n(
            'Reroll one saving throw (no action), after the roll but before knowing the result; the reroll stands.',
            'Relancer un jet de sauvegarde (sans action), après le jet mais avant de connaître le résultat ; le second jet est conservé.',
          ),
        ],
        source: { book: 'Tome of Battle', page: 11 },
      })
    if (crusaderLvl >= 6)
      classFeatures.abilities.push({
        id: 'crusader-smite',
        name: i18n('Smite (crusader)', 'Châtiment (croisé)'),
        max: crusaderLvl >= 18 ? 2 : 1,
        period: 'day',
        lines: [
          i18n(
            `Next melee attack: +${Math.max(0, mod('cha'))} attack, +${crusaderLvl} damage; any foe.`,
            `Prochaine attaque au corps à corps : +${Math.max(0, mod('cha'))} à l’attaque, +${crusaderLvl} aux dégâts ; tout adversaire.`,
          ),
        ],
        source: { book: 'Tome of Battle', page: 11 },
      })
    if (crusaderLvl >= 13)
      classFeatures.notes.push({
        name: i18n('Mettle', 'Cran'),
        text: i18n(
          'A successful Fortitude or Will save against an effect with a lesser effect on a success (half, partial): no effect at all. Not while unconscious or asleep.',
          'Un jet de Vigueur ou de Volonté réussi contre un effet réduit en cas de réussite (moitié, partiel) : aucun effet. Pas inconscient ni endormi.',
        ),
        source: { book: 'Tome of Battle', page: 11 },
      })
  }
  // Swordsage (ToB pp. 15–19).
  if (swordsageLvl) {
    if (swordsageLvl >= 7)
      classFeatures.notes.push({
        name: i18n('Sense magic', 'Détection de la magie martiale'),
        text: i18n(
          '10 minutes studying a weapon or armor: d20 + swordsage level vs DC 10 + its caster level to learn its properties. One try per item (FAQ p. 26).',
          '10 minutes d’étude d’une arme ou armure : d20 + niveau de maître des lames contre DD 10 + son niveau de lanceur pour connaître ses propriétés. Un seul essai par objet (FAQ p. 26).',
        ),
        source: { book: 'Tome of Battle', page: 16 },
      })
    if (swordsageLvl >= 9)
      classFeatures.notes.push({
        name:
          swordsageLvl >= 17 ? i18n('Improved evasion', 'Esquive extraordinaire') : i18n('Evasion', 'Esquive totale'),
        text:
          swordsageLvl >= 17
            ? i18n(
                'Reflex for half: no damage on a success, half on a failure; not helpless.',
                'Réflexes pour moitié : aucun dégât en cas de réussite, moitié en cas d’échec ; pas sans défense.',
              )
            : i18n(
                'Reflex for half: no damage on a success (light or no armor; not helpless).',
                'Réflexes pour moitié : aucun dégât en cas de réussite (armure légère ou aucune ; pas sans défense).',
              ),
        source: { book: 'Tome of Battle', page: 17 },
      })
    if (swordsageLvl >= 20)
      classFeatures.abilities.push({
        id: 'dual-boost',
        name: i18n('Dual boost', 'Double stimulation'),
        max: 3,
        period: 'day',
        lines: [
          i18n(
            'When initiating a boost, initiate another readied boost as a free action (both expended).',
            'En initiant une stimulation, en initier une autre préparée par une action libre (toutes deux utilisées).',
          ),
        ],
        source: { book: 'Tome of Battle', page: 17 },
      })
    const dn = (ids: string[]) => ids.map((d) => rules.disciplines.get(d as never)?.name).filter((x): x is I18n => !!x)
    const list = (ids: string[]) => ({
      en:
        dn(ids)
          .map((x) => x.en)
          .join(', ') || '—',
      fr:
        dn(ids)
          .map((x) => x.fr)
          .join(', ') || '—',
    })
    classFeatures.notes.push({
      name: i18n('Discipline focus', 'Focalisation de discipline'),
      text: {
        en: `Weapon Focus: ${list(focusPicks.weapon).en} · insightful strike (+Wis damage on its strikes): ${list(focusPicks.strike).en} · defensive stance (+2 saves): ${list(focusPicks.stance).en}`,
        fr: `Arme de prédilection : ${list(focusPicks.weapon).fr} · frappe perspicace (+Sag aux dégâts de ses frappes) : ${list(focusPicks.strike).fr} · posture défensive (+2 aux JS) : ${list(focusPicks.stance).fr}`,
      },
      source: { book: 'Tome of Battle', page: 16 },
    })
  }

  // Bard: bardic music, once per day per bard level; each song needs a bard level and ranks in one Perform skill
  // (https://www.d20srd.org/srd/classes/bard.htm#bardicMusic).
  if (bardLevel) {
    const perform: Record<string, number> = {}
    for (const l of levels)
      for (const [k, v] of Object.entries(l.skillRanks))
        if (k === 'perform' || k.startsWith('perform:')) perform[k] = (perform[k] ?? 0) + v
    const performRanks = Math.max(0, ...Object.values(perform))
    classFeatures.bardicMusic = {
      perDay: bardLevel,
      performRanks,
      songs: bardicSongs(bardLevel, mod('cha')).map((x) => ({ ...x, available: performRanks >= x.ranks })),
      performing: char.activeEffects
        .filter((e) => e.kind === 'class' && SONG_EFFECTS.includes(e.refId ?? ''))
        .map((e) => e.refId!),
    }
  }

  if (rogueLevel) {
    classFeatures.sneakAttack = `${sneak}d6`
    const specials = rogueSpecials
    note(
      i18n('Trapfinding', 'Recherche des pièges'),
      i18n(
        'Search for traps of DC above 20; Disable Device on magic traps.',
        'Fouille des pièges de DD supérieur à 20 ; Désamorçage/sabotage des pièges magiques.',
      ),
      'classes/rogue.htm#trapfinding',
    )
    const rogueCls = rules.classes.get('rogue')
    const named = (id: string) =>
      rogueCls?.choices?.specialAbility?.find((o) => o.id === id)?.name ?? { en: id, fr: id }
    if (specials.includes('crippling-strike'))
      note(
        named('crippling-strike'),
        i18n(
          'A sneak attack that deals damage also deals 2 Str damage.',
          'Une attaque sournoise qui inflige des dégâts inflige aussi 2 points de dégâts de Force.',
        ),
        'classes/rogue.htm#specialAbilities',
      )
    if (specials.includes('defensive-roll'))
      classFeatures.abilities.push({
        id: 'defensive-roll',
        name: named('defensive-roll'),
        max: 1,
        period: 'day',
        lines: [
          i18n(
            'When a blow would drop you to 0 hp or less: Reflex (DC = damage) for half; not if denied your Dex bonus.',
            'Quand un coup vous ferait tomber à 0 pv ou moins : Réflexes (DD = dégâts) pour moitié ; pas si privé du bonus de Dex.',
          ),
        ],
        source: src('classes/rogue.htm#specialAbilities'),
      })
    if (specials.includes('opportunist'))
      note(
        named('opportunist'),
        i18n(
          'Once per round, an attack of opportunity against a foe just damaged in melee by someone else.',
          'Une fois par round, une attaque d’opportunité contre un adversaire qui vient d’être blessé au corps à corps par un autre.',
        ),
        'classes/rogue.htm#specialAbilities',
      )
    if (specials.includes('skill-mastery'))
      note(
        named('skill-mastery'),
        i18n(
          `Take 10 under stress with ${3 + mod('int')} chosen skills per time taken.`,
          `Faire 10 même sous la pression avec ${3 + mod('int')} compétences choisies à chaque fois.`,
        ),
        'classes/rogue.htm#specialAbilities',
      )
    if (specials.includes('slippery-mind'))
      note(
        named('slippery-mind'),
        i18n(
          'A failed save vs an enchantment can be rerolled once, 1 round later.',
          'Un jet de sauvegarde raté contre un enchantement peut être retenté une fois, 1 round plus tard.',
        ),
        'classes/rogue.htm#specialAbilities',
      )
  }

  return { featureStats, rangerStyle, domains, turning, classFeatures, barbLevel }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type ClassesOut = AttacksOut & ReturnType<typeof classesStage>
