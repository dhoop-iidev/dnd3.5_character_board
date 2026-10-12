<script lang="ts">
  // Move the character between PC and tablet as a JSON file (CLAUDE.md: no backend).
  import { migrate } from '../model/migrate'
  import { app, resetToSeed, tr } from '../state.svelte'

  let fileInput: HTMLInputElement | undefined = $state()
  let message = $state('')

  function exportJson() {
    const c = app.character
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${c.identity.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJson(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const character = migrate(JSON.parse(await file.text()))
      if (!confirm(tr({ en: `Replace the current character with "${character.identity.name}"?`, fr: `Remplacer le personnage actuel par « ${character.identity.name} » ?` })))
        return
      app.character = character
      message = tr({ en: 'Character imported.', fr: 'Personnage importé.' })
    } catch (err) {
      message = tr({ en: 'Import failed: ', fr: "Échec de l'import : " }) + (err as Error).message
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  function reset() {
    if (confirm(tr({ en: 'Reset to the original character file? Unsaved changes are lost.', fr: 'Revenir au personnage d’origine ? Les modifications non exportées seront perdues.' })))
      resetToSeed()
  }
</script>

<div class="save">
  <button onclick={exportJson}>⭳ {tr({ en: 'Export (JSON)', fr: 'Exporter (JSON)' })}</button>
  <button onclick={() => fileInput?.click()}>⭱ {tr({ en: 'Import', fr: 'Importer' })}</button>
  <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={importJson} hidden />
  <button onclick={reset}>↺ {tr({ en: 'Reset', fr: 'Réinitialiser' })}</button>
  {#if message}<span>{message}</span>{/if}
</div>

<style>
  .save {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  button {
    font: inherit;
    min-height: 2.5rem;
    padding: 0 0.8rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
