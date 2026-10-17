// Stage 8 — the Sheet itself, from what the earlier stages computed.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { ArmorDef } from '../../data/types'
import type { Character, ItemInstance } from '../../model/character'
import { i18n } from '../stacking'
import { spellcastingAdvance, spellcastingOf } from '../spells'
import { spellFailure } from '../arcane'
import { barbarianDR } from '../classFeatures'
import type { Sheet, ComputeOptions } from './types'
import { ftToDistance, round2 } from './common'
import type { ClassesOut } from './classes'

export function assembleStage(rules: Rules, opts: ComputeOptions, c: ClassesOut): Sheet {
  const {
    abilities,
    ac,
    activeConditions,
    allCaps,
    armor,
    armorCheckPenalty,
    armorMat,
    attacks,
    attacksOfOpportunity,
    bab,
    band,
    barbLevel,
    baseFt,
    caps,
    carried,
    char,
    characterLevel,
    classFeatures,
    classLevels,
    domains,
    exDruid,
    favoredEnemies,
    feats,
    featureStats,
    flags,
    flatFootedAc,
    grapple,
    hasFeat,
    hpMax,
    initiative,
    iterativeBab,
    known,
    levels,
    limits,
    maneuverDR,
    maxDex,
    monkLevel,
    paladinGood,
    paladinLvl,
    proficiency,
    race,
    rangerLevel,
    rangerStyle,
    runningManeuvers,
    saves,
    shape,
    shield,
    size,
    skills,
    speedFrom,
    speedFt,
    stance,
    styleActive,
    styleFeats,
    touchAc,
    turning,
    unusableFeats,
    wmActive,
    wmLevel,
    wmRow,
  } = c
  return {
    lostClasses: [...(paladinLvl && !paladinGood ? ['paladin'] : []), ...(exDruid ? ['druid'] : [])],
    classFeatures,
    characterLevel,
    classLevels,
    feats,
    race,
    size,
    wildShape: shape ? { def: shape, rounds: char.wildShape!.rounds } : undefined,
    proficiency,
    // An ex-paladin (not lawful good) or ex-druid (alignment not neutral on one axis) loses the class's spells
    // (https://www.d20srd.org/srd/classes/paladin.htm#exPaladins, druid.htm#exDruids).
    spellcasting: spellcastingOf(
      classLevels,
      rules,
      (a) => abilities[a],
      Object.assign({}, ...levels.map((l) => l.classChoices ?? {})),
      spellcastingAdvance(levels, rules),
      (school) =>
        feats.filter((f) => (f.featId === 'spell-focus' || f.featId === 'greater-spell-focus') && f.choice === school)
          .length,
    )
      .filter((sc) => !(sc.classId === 'paladin' && !paladinGood) && !(sc.classId === 'druid' && exDruid))
      .map((sc) => {
        if (sc.def.kind !== 'arcane') return sc
        // Arcane spell failure: armor (category after mithral) and shield, each less its material reduction.
        const asf = (x: { item: ItemInstance; def: ArmorDef }) =>
          Math.max(
            0,
            x.def.arcaneFailure -
              ((x.item.material && rules.materials.get(x.item.material)?.effects.arcaneFailureReduction) || 0),
          )
        const nameOf = (x: { item: ItemInstance; def: ArmorDef }) => x.item.name ?? x.def.name
        return {
          ...sc,
          spellFailure: spellFailure(
            sc.classId,
            armor && { name: nameOf(armor), asf: asf(armor), category: armor.category },
            shield && { name: nameOf(shield), asf: asf(shield) },
          ),
        }
      }),
    featureStats,
    turning,
    domains,
    favoredEnemies,
    inactiveStyleFeats: styleActive ? [] : styleFeats,
    unusableFeats: [...unusableFeats],
    combatStyle:
      rangerStyle && rangerLevel >= 2 ? { id: rangerStyle.id, name: rangerStyle.name, active: styleActive } : undefined,
    abilities,
    hpMax,
    bab,
    iterativeBab,
    saves,
    ac,
    touchAc,
    flatFootedAc,
    initiative,
    grapple,
    attacksOfOpportunity,
    maxDex,
    armorCheckPenalty,
    speed: { base: ftToDistance(baseFt), current: ftToDistance(Math.max(0, speedFt)), from: speedFrom },
    load: { carried: { lb: round2(carried.lb), kg: round2(carried.kg) }, band, limits },
    skills,
    attacks,
    flags:
      hasFeat('combat-reflexes') &&
      !activeConditions.some((id) => id !== 'flat-footed' && rules.conditions.get(id)?.flags.includes('noAoO'))
        ? flags.filter((f) => f !== 'noAoO')
        : flags,
    weaponMaster: {
      level: wmLevel,
      active: wmActive,
      kiDamagePerDay: wmActive ? wmLevel : 0,
      increasedMultiplierPerDay: wmActive && wmRow && wmLevel >= 2 ? Math.floor(wmLevel / 2) : 0,
    },
    armor,
    shield,
    martial: { caps, all: allCaps, known, stance, active: runningManeuvers },
    damageReduction: [
      ...(barbarianDR(barbLevel)
        ? [{ value: `${barbarianDR(barbLevel)}/—`, source: i18n('Barbarian', 'Barbare') }]
        : []),
      ...(monkLevel >= 20
        ? [{ value: '10/magic', source: i18n('Monk (perfect self)', 'Moine (perfection de l’être)') }]
        : []),
      ...[...(stance ? [stance] : []), ...maneuverDR]
        .filter((d) => d.damageReduction)
        .map((d) => ({
          value: d.damageReduction!,
          source:
            d.type === 'stance'
              ? d.name
              : i18n(`${d.name.en} (if the strike hit)`, `${d.name.fr} (si la frappe a touché)`),
        })),
      ...(armor && armorMat?.effects.armorDR
        ? [
            {
              value: armorMat.effects.armorDR[armor.def.category as 'light' | 'medium' | 'heavy'] ?? '',
              source: armorMat.name,
            },
          ].filter((d) => d.value)
        : []),
    ],
  }
}
