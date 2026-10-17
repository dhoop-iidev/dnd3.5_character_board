// Character sheet computation. Every value is a Stat {total, parts} so the UI can show its breakdown.
// Rules references: docs/rules/*.md (formulas cite d20srd URLs there).
// compute() runs the stages of engine/sheet/ in order; each stage gets what the earlier ones computed and returns its
// own values (types: engine/sheet/types.ts; shared helpers and rule tables: engine/sheet/common.ts).
import type { Rules } from '../data/rules'
import type { Character } from '../model/character'
import type { ComputeOptions, Sheet } from './sheet/types'
import { buildStage } from './sheet/build'
import { modifiersStage } from './sheet/modifiers'
import { coreStage } from './sheet/core'
import { defenseStage } from './sheet/defense'
import { skillsStage } from './sheet/skills'
import { attacksStage } from './sheet/attacks'
import { classesStage } from './sheet/classes'
import { assembleStage } from './sheet/assemble'

export type {
  AbilityBlock,
  AttackLine,
  ClassAbility,
  ClassFeatures,
  ComputeOptions,
  LoadBand,
  Sheet,
  SkillLine,
} from './sheet/types'
export { abilityMod, capacity, fmt, ftToDistance, maxDice, wildShapeSizes, wildShapeUses } from './sheet/common'

export function compute(char: Character, rules: Rules, opts: ComputeOptions = {}): Sheet {
  const c1 = buildStage(char, rules, opts)
  const c2 = { ...c1, ...modifiersStage(rules, opts, c1) }
  const c3 = { ...c2, ...coreStage(rules, opts, c2) }
  const c4 = { ...c3, ...defenseStage(rules, opts, c3) }
  const c5 = { ...c4, ...skillsStage(rules, opts, c4) }
  const c6 = { ...c5, ...attacksStage(rules, opts, c5) }
  const c7 = { ...c6, ...classesStage(rules, opts, c6) }
  return assembleStage(rules, opts, c7)
}
