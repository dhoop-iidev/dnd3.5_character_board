import { SCHEMA_VERSION, type Character } from './character'

/** Upgrade a saved character (from localStorage or an imported JSON file) to the current schema. */
export function migrate(raw: unknown): Character {
  if (!raw || typeof raw !== 'object') throw new Error('Not a character file')
  const data = raw as { schemaVersion?: number }
  const version = data.schemaVersion ?? 0
  if (version > SCHEMA_VERSION)
    throw new Error(`This file was made by a newer version of the app (schema ${version} > ${SCHEMA_VERSION})`)
  // Add one step per schema change: if (version < 2) { ...; data.schemaVersion = 2 }
  return data as Character
}
