// Stage 5 — skills.
// Moved verbatim from compute() (2026-10-17 split); see engine/compute.ts for the order of the stages.
import type { Rules } from '../../data/rules'
import type { Character } from '../../model/character'
import { i18n, resolve, type Part } from '../stacking'
import { classSkillsOf } from '../cleric'
import { RAGE_SKILL_EXCEPTIONS } from '../classFeatures'
import type { SkillLine, ComputeOptions } from './types'
import { src } from './common'
import type { DefenseOut } from './defense'

export function skillsStage(rules: Rules, opts: ComputeOptions, c: DefenseOut) {
  const { abilityPart, armorCheckPenalty, char, classLevels, feats, flags, levels, partsFor, speedFt, toggles } = c
  // ---- skills (docs/rules/skills.md)
  const ranksByKey: Record<string, number> = {}
  for (const l of levels) for (const [k, v] of Object.entries(l.skillRanks)) ranksByKey[k] = (ranksByKey[k] ?? 0) + v
  // Class skills of every class taken (cleric: plus the domain skills).
  const isClassSkill = (skillId: string) =>
    Object.keys(classLevels).some((c) => classSkillsOf(char, rules, c).includes(skillId))
  const skillKeys = new Set<string>()
  for (const s of rules.skills.values()) if (!s.hasSubtypes) skillKeys.add(s.id)
  for (const k of Object.keys(ranksByKey)) skillKeys.add(k)
  const skills: SkillLine[] = []
  for (const key of skillKeys) {
    const [id, subtype] = key.split(':')
    const def = rules.skills.get(id)
    if (!def) continue
    const ranks = ranksByKey[key] ?? 0
    const parts: Part[] = []
    if (ranks)
      parts.push({
        sourceId: 'ranks',
        label: i18n('Ranks', 'Degrés de maîtrise'),
        value: Math.floor(ranks),
        bonusType: 'base',
        source: src('skills/skillsSummary.htm'),
      })
    if (!def.noAbility) parts.push(abilityPart(def.ability))
    // Jump: −6 per 10 ft of speed below 30 ft, +4 per 10 ft above (armor, load and spells count:
    // https://www.d20srd.org/srd/skills/jump.htm). Counted per full 10 ft.
    if (id === 'jump' && speedFt !== 30) {
      const steps = Math.floor(Math.abs(speedFt - 30) / 10)
      const value = speedFt < 30 ? -6 * steps : 4 * steps
      if (value)
        parts.push({
          sourceId: 'jump-speed',
          label: { en: `Speed ${speedFt} ft`, fr: `Vitesse ${(speedFt / 5) * 1.5} m` },
          value,
          bonusType: 'base',
          source: src('skills/jump.htm'),
        })
    }
    if (def.armorCheck && armorCheckPenalty.total)
      parts.push({
        sourceId: 'acp',
        label: i18n('Armor check penalty', "Malus d'armure aux tests"),
        value: armorCheckPenalty.total * def.armorCheck,
        bonusType: 'base',
        source: src('equipment/armor.htm#armorCheckPenalty'),
      })
    for (const syn of rules.synergies) {
      if (syn.to !== id && syn.to !== key) continue
      const fromRanks = ranksByKey[syn.from] ?? 0
      if (fromRanks < syn.ranks) continue
      const fromDef = rules.skills.get(syn.from.split(':')[0])
      parts.push({
        sourceId: `synergy:${syn.from}`,
        label: { en: `Synergy (${fromDef?.name.en ?? syn.from})`, fr: `Synergie (${fromDef?.name.fr ?? syn.from})` },
        value: syn.value,
        bonusType: 'untyped',
        source: syn.source,
        condition: syn.condition,
        situationalOn: toggles.situational[`synergy:${syn.from}|skill.${id}`] ?? false,
        toggleKey: `synergy:${syn.from}|skill.${id}`,
      })
    }
    const strdex = def.ability === 'str' || def.ability === 'dex' ? ['skill.strdex'] : []
    for (const f of feats) {
      // Skill Focus and similar feats: modifier on the chosen skill.
      const fdef = rules.feats.get(f.featId)
      for (const spec of fdef?.modifiers ?? [])
        if (spec.target === 'skill.choice' && (f.choice === key || f.choice === id))
          parts.push({
            sourceId: `feat:${f.featId}:${f.choice}`,
            label: fdef!.name,
            value: spec.value,
            bonusType: spec.bonusType,
            source: fdef!.source,
          })
    }
    parts.push(...partsFor([`skill.${id}`, `skill.${key}`, 'skill.all', ...strdex]))
    // While raging: no Cha-, Dex- or Int-based skill (except Balance, Escape Artist, Intimidate, Ride), no Concentration.
    const rageBlocked =
      flags.includes('raging') &&
      (id === 'concentration' || (['cha', 'dex', 'int'].includes(def.ability) && !RAGE_SKILL_EXCEPTIONS.includes(id)))
    skills.push({
      key,
      def,
      subtype,
      ranks,
      classSkill: isClassSkill(id),
      usable: (!def.trainedOnly || ranks > 0) && !rageBlocked,
      total: resolve(parts),
    })
  }
  skills.sort((a, b) => a.def.name.en.localeCompare(b.def.name.en))

  return { skills }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type SkillsOut = DefenseOut & ReturnType<typeof skillsStage>
