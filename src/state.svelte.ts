// App state: the current character (autosaved in the browser), derived sheet and rule warnings.
import { rules } from './data/rules'
import type { I18n, Lang } from './data/types'
import type { Character } from './model/character'
import { migrate } from './model/migrate'
import { decodeShare } from './model/share'
import { compute } from './engine/compute'
import { validate } from './engine/validate'

const STORAGE_KEY = 'dnd35-playboard:character'

// No character ships with the app (the user's character stays private): until one is imported, the app
// shows the welcome screen and `character` is a placeholder that only carries the interface language.
function placeholder(): Character {
  const lang: Lang = navigator.language?.startsWith('fr') ? 'fr' : 'en'
  return { settings: { lang } } as unknown as Character
}

function load(): Character | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    // Storage unavailable or corrupt: start from the welcome screen.
  }
  return null
}

const stored = load()
export const app = $state<{ character: Character; loaded: boolean; shared: { name: string } | null }>({
  character: stored ?? placeholder(),
  loaded: !!stored,
  shared: null,
})

// Read-only view of a character shared by link (?share=…): shown, never saved over the local character.
const shareParam = new URLSearchParams(location.search).get('share')
if (shareParam)
  decodeShare(shareParam)
    .then((character) => {
      app.shared = { name: character.identity.name }
      app.character = character
      app.loaded = true
    })
    .catch(() => alert('Lien de partage invalide / invalid share link'))

/** Leave the shared view and go back to the local character. */
export function leaveShared() {
  location.href = location.pathname + location.hash
}

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
  if (app.shared || !app.loaded) return // shared view: never overwrite the local character
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.character))
  } catch {
    // Private mode or quota: nothing to do, the JSON export still works.
  }
}

/** Open an imported character (already migrated). */
export function openCharacter(character: Character) {
  app.character = character
  app.loaded = true
}

/** Close the character: forget it in this browser and go back to the welcome screen. */
export function closeCharacter() {
  const lang = app.character.settings.lang
  app.loaded = false
  app.character = { settings: { lang } } as unknown as Character
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

$effect.root(() => {
  $effect(() => {
    JSON.stringify(app.character) // track deep changes
    save()
  })
})
