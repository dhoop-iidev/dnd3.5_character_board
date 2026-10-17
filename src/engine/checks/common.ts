// Shared pieces of the rule checks (engine/validate.ts and engine/checks/*): warning type, helper, context.
import type { Rules } from '../../data/rules'
import type { I18n } from '../../data/types'
import type { Character } from '../../model/character'
import type { Sheet } from '../compute'

export type Severity = 'error' | 'warning' | 'info'
export type WarningArea =
  'abilities' | 'skills' | 'feats' | 'levels' | 'inventory' | 'combat' | 'maneuvers' | 'spells' | 'companions'

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

export const SRD = 'https://www.d20srd.org/srd/'
export const w = (
  id: string,
  severity: Severity,
  area: WarningArea,
  en: string,
  fr: string,
  extra: Partial<RuleWarning> = {},
): RuleWarning => ({ id, severity, area, message: { en, fr }, ...extra })

/** What every check reads: the character, its build without temporary state (`perm`), the current sheet (`now`, with
 * temporary effects), the build's sheet at a level (computed once), and the list the warnings go to. */
export interface CheckContext {
  char: Character
  rules: Rules
  perm: Character
  now: Sheet
  sheetAt: (level: number) => Sheet
  out: RuleWarning[]
}
