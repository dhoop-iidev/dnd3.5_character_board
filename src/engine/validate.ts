// Rule checks. They only produce warnings; nothing is ever blocked (CLAUDE.md).
// Each area lives in engine/checks/*.ts; this file builds the shared context and runs them in order.
import type { Rules } from '../data/rules'
import type { Character } from '../model/character'
import { compute } from './compute'
import { unmetPrereqs } from './prereq'
import type { CheckContext, RuleWarning } from './checks/common'
import { checkBuild } from './checks/build'
import { checkManeuvers } from './checks/maneuvers'
import { checkSpells } from './checks/spells'
import { checkClasses } from './checks/classes'
import { checkCompanions } from './checks/companions'
import { checkEquipment } from './checks/equipment'

export { unmetPrereqs }
export type { RuleWarning, Severity, WarningArea } from './checks/common'

/**
 * The character without temporary state (effects, ability damage, combat toggles), used to check build legality.
 * Worn magic items stay: an item bonus may be used to qualify for a feat (3.5 FAQ, rulings-character.md#q6).
 */
function permanent(char: Character): Character {
  return {
    ...char,
    activeEffects: [],
    abilityDamage: {},
    wildShape: undefined,
    toggles: { ...char.toggles, powerAttack: 0, combatExpertise: 0, fightingDefensively: false, totalDefense: false },
  }
}

export function validate(char: Character, rules: Rules): RuleWarning[] {
  const out: RuleWarning[] = []
  const perm = permanent(char)
  // The build's sheet at each level, computed once (level L's "after" is level L + 1's "before").
  const sheets = new Map<number, ReturnType<typeof compute>>()
  const sheetAt = (L: number) => sheets.get(L) ?? sheets.set(L, compute(perm, rules, { level: L })).get(L)!
  // Current state (with temporary effects).
  const now = compute(char, rules)
  const ctx: CheckContext = { char, rules, perm, now, sheetAt, out }
  checkBuild(ctx)
  checkManeuvers(ctx)
  checkSpells(ctx)
  checkClasses(ctx)
  checkCompanions(ctx)
  checkEquipment(ctx)

  // Build choices the player must make or fix; situational warnings (unusable feat, load, max Dex, slots,
  // suspended class features) are informative only.
  const INFORMATIVE =
    /^(unusable-|weapon-master-lost|multiclass-xp-penalty|load$|max-dex$|slot-|armor-prof-|weapon-prof-|prepared-)/
  for (const x of out)
    x.actionable =
      ['skills', 'feats', 'abilities', 'levels', 'maneuvers', 'spells'].includes(x.area) && !INFORMATIVE.test(x.id)
  return out
}
