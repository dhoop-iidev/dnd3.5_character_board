// App state: the current character (autosaved in the browser), derived sheet and rule warnings.
import { rules } from './data/rules'
import seed from './data/characters/fenrir.json'
import type { I18n, Lang } from './data/types'
import type { Character } from './model/character'
import { migrate } from './model/migrate'
import { compute } from './engine/compute'
import { validate } from './engine/validate'

const STORAGE_KEY = 'dnd35-playboard:character'

function seedCopy(): Character {
  return structuredClone(seed) as unknown as Character
}

function load(): Character {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    // Storage unavailable or corrupt: fall back to the seed character.
  }
  return seedCopy()
}

export const app = $state({ character: load() })

const sheetState = $derived(compute(app.character, rules))
const warningState = $derived(validate(app.character, rules))

/** Computed sheet and warnings (modules can't export derived state directly). */
export const view = {
  get sheet() {
    return sheetState
  },
  get warnings() {
    return warningState
  },
}

export function lang(): Lang {
  return app.character.settings.lang
}

/** Pick the text in the current language. */
export function tr(text: I18n | undefined): string {
  if (!text) return ''
  return text[app.character.settings.lang] || text.en
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.character))
  } catch {
    // Private mode or quota: nothing to do, the JSON export still works.
  }
}

export function resetToSeed() {
  app.character = seedCopy()
  save()
}

$effect.root(() => {
  $effect(() => {
    JSON.stringify(app.character) // track deep changes
    save()
  })
})
