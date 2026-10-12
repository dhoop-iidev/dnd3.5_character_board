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
  return c
}
