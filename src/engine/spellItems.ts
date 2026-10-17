// Items that hold spells: scrolls, potions and oils, wands, staffs, and any item with a spell effect (a weapon's
// daylight 3/day, a ring's command word). Prices, save DCs and who can use them, from the SRD:
// https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm (Table: Estimating Magic Item Gold Piece Values),
// https://www.d20srd.org/srd/magicItems/magicItemBasics.htm (activation, saving throws),
// https://www.d20srd.org/srd/magicItems/scrolls.htm, wands.htm, staffs.htm, potions.htm.
import type { Rules } from '../data/rules'
import type { I18n, SpellDef } from '../data/types'
import type { ItemInstance, SpellItemType, StoredSpell } from '../model/character'
import type { Sheet } from './compute'
import { classSpellLevel } from './spells'

const i18n = (en: string, fr: string): I18n => ({ en, fr })

/** Default activation, uses and charges of each spell item type. */
export const SPELL_ITEM_TYPES: Record<SpellItemType, { name: I18n; activation: StoredSpell['activation']; uses: StoredSpell['uses']; maxLevel: number; weightLb: number; charges?: number; minCasterLevel?: number; multi: boolean }> = {
  scroll: { name: i18n('Scroll', 'Parchemin'), activation: 'completion', uses: 'single', maxLevel: 9, weightLb: 0, multi: true },
  potion: { name: i18n('Potion', 'Potion'), activation: 'use', uses: 'single', maxLevel: 3, weightLb: 0, multi: false },
  oil: { name: i18n('Oil', 'Huile'), activation: 'use', uses: 'single', maxLevel: 3, weightLb: 0, multi: false },
  wand: { name: i18n('Wand', 'Baguette'), activation: 'trigger', uses: 'charges', maxLevel: 4, weightLb: 0, charges: 50, multi: false },
  staff: { name: i18n('Staff', 'Bâton'), activation: 'trigger', uses: 'charges', maxLevel: 9, weightLb: 5, charges: 50, minCasterLevel: 8, multi: true },
}

/** Lowest level of a spell on any class list (domain lists ignored). */
export function defaultSpellLevel(sp: SpellDef): number {
  const lv = Object.entries(sp.level).filter(([k]) => !k.startsWith('domain:')).map(([, v]) => v)
  return lv.length ? Math.min(...lv) : Math.min(...Object.values(sp.level))
}
/** Minimum caster level for a spell level (cleric, druid, wizard: 2 × level − 1; 0-level: 1). */
export const minCasterLevel = (level: number) => Math.max(1, 2 * level - 1)

/** Save DC of a spell from an item: 10 + spell level + the modifier of the minimum ability score to cast it
 * (10 + level). Staffs use the wielder's DC when better (see `storedSpellUse`). */
export const itemSaveDc = (level: number) => 10 + level + Math.floor(level / 2)

/** Market price (gp) of a spell item from its spells (0-level spells count as ½). Staff: the costliest spell at full
 * price, the next at 75%, the others at 50%; a spell spending 2 charges at half price. */
export function spellItemPrice(type: SpellItemType, spells: StoredSpell[]): number {
  const v = (s: StoredSpell) => (s.level === 0 ? 0.5 : s.level) * s.casterLevel
  if (type === 'scroll') return spells.reduce((n, s) => n + v(s) * 25, 0)
  if (type === 'potion' || type === 'oil') return spells.reduce((n, s) => n + v(s) * 50, 0)
  if (type === 'wand') return spells.reduce((n, s) => n + v(s) * 750, 0)
  const sorted = spells.map((s) => (v(s) * 750) / ((s.cost ?? 1) === 2 ? 2 : 1)).sort((a, b) => b - a)
  return sorted.reduce((n, p, i) => n + p * (i === 0 ? 1 : i === 1 ? 0.75 : 0.5), 0)
}

export interface StoredSpellUse {
  dc: number
  casterLevel: number
  /** Casting classes whose list has the spell (any level of that class, even without spells yet). */
  onListOf: string[]
  /** Usable without a check (on your list, or a potion / command-word item). */
  usable: boolean
  notes: I18n[]
  /** Uses left: charges, uses today, or 1/0 for a single use. */
  left: number
}

/** How the character can use a stored spell: save DC, caster level, list, Use Magic Device and caster level checks. */
export function storedSpellUse(item: ItemInstance, s: StoredSpell, sheet: Sheet, rules: Rules): StoredSpellUse {
  const sp = rules.spells.get(s.spellId)
  // A specialist wizard's prohibited schools are off her list: scrolls and wands of them need Use Magic Device
  // (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization).
  const prohibitedFor = (classId: string) => sheet.spellcasting.find((sc) => sc.classId === classId)?.prohibited ?? []
  const onList = (classId: string, list: string) =>
    !!sp && classSpellLevel(sp, classId, list) !== undefined && !prohibitedFor(classId).includes(sp.schoolId ?? '')
  const lists = sheet.spellcasting.filter((sc) => onList(sc.classId, sc.def.list))
  // Any class level counts for a spell trigger item, even without spells yet (a 3rd-level paladin).
  const classesWithList = Object.keys(sheet.classLevels).filter((id) => {
    const list = rules.classes.get(id)?.spellcasting?.list
    return !!list && onList(id, list)
  })
  let dc = itemSaveDc(s.level)
  let cl = s.casterLevel
  const notes: I18n[] = []
  // Staffs: the wielder's caster level and save DC when higher (https://www.d20srd.org/srd/magicItems/staffs.htm).
  if (item.spellItem === 'staff')
    for (const sc of lists) {
      dc = Math.max(dc, sc.dc(s.level, sp?.schoolId))
      cl = Math.max(cl, sc.casterLevel.total)
    }
  const needsList = s.activation === 'completion' || s.activation === 'trigger'
  const usable = !needsList || classesWithList.length > 0
  if (needsList && !usable)
    notes.push(
      s.activation === 'completion'
        ? i18n(`Not on your class lists: Use Magic Device DC ${20 + s.casterLevel}`, `Pas sur vos listes de sorts : Utilisation d’objets magiques DD ${20 + s.casterLevel}`)
        : i18n('Not on your class lists: Use Magic Device DC 20', 'Pas sur vos listes de sorts : Utilisation d’objets magiques DD 20'),
    )
  // Scroll: a caster of too low a level makes a caster level check (DC = scroll caster level + 1).
  if (s.activation === 'completion' && usable) {
    const best = Math.max(0, ...lists.map((sc) => sc.casterLevel.total))
    const canCast = lists.some((sc) => sc.slots.some((x) => x.spellLevel === ((sp && classSpellLevel(sp, sc.classId, sc.def.list)) ?? 99) && x.total > 0))
    if (!canCast || best < s.casterLevel)
      notes.push(i18n(`Caster level check: 1d20 + ${best} vs DC ${s.casterLevel + 1} (mishap on a failure)`, `Test de niveau de lanceur : 1d20 + ${best} contre DD ${s.casterLevel + 1} (incident en cas d’échec)`))
  }
  if (s.activation === 'completion') notes.push(i18n('Standard action, provokes attacks of opportunity', 'Action simple, provoque des attaques d’opportunité'))
  if (s.activation === 'trigger') notes.push(i18n('Standard action, no attack of opportunity', 'Action simple, sans attaque d’opportunité'))
  const left =
    s.uses === 'charges'
      ? Math.floor((item.charges?.left ?? 0) / (s.cost ?? 1))
      : s.uses === 'perDay'
        ? Math.max(0, (s.perDay ?? 1) - (s.used ?? 0))
        : s.used
          ? 0
          : Math.max(0, item.spellItem === 'potion' || item.spellItem === 'oil' ? item.quantity : 1)
  return { dc, casterLevel: cl, onListOf: classesWithList, usable, notes, left }
}

/** The item has a magic aura (shown with a marker in the lists). */
export function isMagicItem(item: ItemInstance): boolean {
  return (
    item.kind === 'magic' ||
    (item.enhancement ?? 0) > 0 ||
    !!item.properties?.length ||
    !!item.spells?.length ||
    !!item.custom?.modifiers?.length
  )
}
