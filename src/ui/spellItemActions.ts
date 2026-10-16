// Using a spell stored in an item: a scroll's spell is gone, a potion is drunk (one fewer), a wand or staff spends
// charges, a command-word item one of its daily uses. https://www.d20srd.org/srd/magicItems/magicItemBasics.htm
import type { Character, ItemInstance } from '../model/character'

export function useStoredSpell(c: Character, item: ItemInstance, index: number) {
  const s = item.spells?.[index]
  if (!s) return
  if (s.uses === 'charges') {
    if (!item.charges) return
    item.charges.left = Math.max(0, item.charges.left - (s.cost ?? 1))
  } else if (s.uses === 'perDay') s.used = (s.used ?? 0) + 1
  else if (item.spellItem === 'potion' || item.spellItem === 'oil') {
    item.quantity -= 1
    if (item.quantity <= 0) c.inventory = c.inventory.filter((i) => i.uid !== item.uid)
  } else {
    // Scroll: the writing of the cast spell disappears; a blank scroll is removed.
    s.used = 1
    if (item.spellItem === 'scroll' && item.spells!.every((x) => x.used)) c.inventory = c.inventory.filter((i) => i.uid !== item.uid)
  }
}

/** New day: uses per day of every item come back. */
export function newDayItemSpells(c: Character) {
  for (const item of c.inventory) for (const s of item.spells ?? []) if (s.uses === 'perDay') delete s.used
}
