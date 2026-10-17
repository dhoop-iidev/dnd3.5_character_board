import { SCHEMA_VERSION, type Character } from './character'

/** Upgrade a saved character (from localStorage or an imported JSON file) to the current schema. */
export function migrate(raw: unknown): Character {
  if (!raw || typeof raw !== 'object') throw new Error('Not a character file')
  const data = raw as { schemaVersion?: number }
  const version = data.schemaVersion ?? 0
  if (version > SCHEMA_VERSION)
    throw new Error(`This file was made by a newer version of the app (schema ${version} > ${SCHEMA_VERSION})`)
  const c = data as Character & { xp?: number }
  // v1 -> v2: XP added; start at the threshold of the current level.
  if (version < 2) {
    const n = c.levels?.length ?? 1
    c.xp = c.xp ?? (1000 * n * (n - 1)) / 2
    c.schemaVersion = 2
  }
  // v2 -> v3: money, defenses, conditional modifiers, popup annotations, images, languages.
  if (c.schemaVersion < 3) {
    c.money ??= { cp: 0, sp: 0, gp: 0, pp: 0, other: '' }
    c.defenses ??= { dr: '', sr: '', resistances: '' }
    c.conditionalModifiers ??= ''
    c.annotations ??= {}
    c.images ??= {}
    c.identity.languages ??= ['Commun']
    c.identity.title ??= ''
    c.identity.motto ??= ''
    c.schemaVersion = 3
  }
  // v3 -> v4: Tome of Battle martial state.
  if (c.schemaVersion < 4) {
    c.martial ??= { readied: [], expended: [], active: [] }
    c.schemaVersion = 4
  }
  // v4 -> v5: running maneuvers track a turn stage per effect (old "until" entries restart at stage 0).
  if (c.schemaVersion < 5) {
    c.martial.active = (c.martial.active ?? []).map((a) => ({ id: a.id, stage: 0 }))
    c.schemaVersion = 5
  }
  // v5 -> v6: generic races and classes. Feat slots 'human' -> 'race', 'fighter' -> 'class'.
  if (c.schemaVersion < 6) {
    for (const l of c.levels)
      for (const f of l.feats) {
        const slot = f.slot as string
        if (slot === 'human') f.slot = 'race'
        else if (slot === 'fighter') f.slot = 'class'
      }
    c.schemaVersion = 6
  }
  // v6 -> v7: three item locations. Old 'carried' (hands, belt) -> 'worn', except magic items and custom items with a
  // slot or bonuses, which go to the backpack so that they don't start giving bonuses or filling a slot; old 'pack'
  // (backpack) -> 'carried'. Weapons and shields a loadout uses go on the body, where they must now be to be in hand.
  if (c.schemaVersion < 7) {
    const inHand = new Set((c.loadouts ?? []).flatMap((l) => [...l.weapons, ...(l.shield ? [l.shield] : [])]))
    for (const i of c.inventory ?? []) {
      const loc = i.location as string
      if (loc !== 'stored' && inHand.has(i.uid)) i.location = 'worn'
      else if (loc === 'pack') i.location = 'carried'
      else if (loc === 'carried')
        i.location = i.kind === 'magic' || (i.kind === 'custom' && (i.custom?.slot || i.custom?.modifiers?.length)) ? 'carried' : 'worn'
    }
    c.schemaVersion = 7
  }
  return c
}
