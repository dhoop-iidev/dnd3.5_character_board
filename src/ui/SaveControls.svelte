<script lang="ts">
  // Move the character between PC and tablet as a JSON file (CLAUDE.md: no backend).
  import { migrate } from '../model/migrate'
  import { encodeShare } from '../model/share'
  import { app, closeCharacter, openCharacter, tr } from '../state.svelte'

  // ---- read-only link for the DM (character compressed in the URL, without pictures)
  let shareOpen = $state(false)
  let includeNotes = $state(false)
  let shareUrl = $state('')
  // The DM can't open a link to this computer's dev server: from a local address, link to the public site.
  const PUBLIC_URL = 'https://dhoop-iidev.github.io/dnd3.5_character_board/'
  const isLocal = /^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(location.hostname) || location.protocol === 'file:'
  async function makeLink() {
    const data = await encodeShare(app.character, { includeNotes })
    const base = isLocal ? PUBLIC_URL : `${location.origin}${location.pathname}`
    shareUrl = `${base}?share=${data}#/general`
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      message = tr({ en: 'Link copied.', fr: 'Lien copié.' })
    } catch {
      message = tr({ en: 'Copy the link by hand.', fr: 'Copiez le lien à la main.' })
    }
  }
  async function sendLink() {
    try {
      await navigator.share({ title: app.character.identity.name, url: shareUrl })
    } catch {
      // cancelled or unsupported: the copy button still works
    }
  }

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
      if (
        !confirm(
          tr({
            en: `Replace the current character with "${character.identity.name}"?`,
            fr: `Remplacer le personnage actuel par « ${character.identity.name} » ?`,
          }),
        )
      )
        return
      openCharacter(character)
      message = tr({ en: 'Character imported.', fr: 'Personnage importé.' })
    } catch (err) {
      message = tr({ en: 'Import failed: ', fr: "Échec de l'import : " }) + (err as Error).message
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  function reset() {
    if (
      confirm(
        tr({
          en: 'Close this character and remove it from this browser? Export it first: changes not exported are lost.',
          fr: 'Fermer ce personnage et l’effacer de ce navigateur ? Exportez-le d’abord : les modifications non exportées seront perdues.',
        }),
      )
    )
      closeCharacter()
  }
</script>

<div class="save">
  <button onclick={exportJson}>⭳ {tr({ en: 'Export (JSON)', fr: 'Exporter (JSON)' })}</button>
  <button onclick={() => fileInput?.click()}>⭱ {tr({ en: 'Import', fr: 'Importer' })}</button>
  <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={importJson} hidden />
  {#if !app.shared}<button onclick={reset}>✕ {tr({ en: 'Close the character', fr: 'Fermer le personnage' })}</button
    >{/if}
  <button class="dm" onclick={() => ((shareOpen = !shareOpen), (shareUrl = ''))}
    >⚑ {tr({ en: 'Share with the DM', fr: 'Partager avec le MJ' })}</button
  >
  {#if message}<span>{message}</span>{/if}
</div>

{#if shareOpen}
  <div class="share">
    <p>
      {tr({
        en: 'Creates a read-only link to your current sheet (without pictures). Your DM opens it in a browser; nothing is saved on their side. Make a new link after each change.',
        fr: 'Crée un lien en lecture seule vers votre fiche actuelle (sans les images). Votre MJ l’ouvre dans un navigateur ; rien n’est enregistré chez lui. Refaites un lien après chaque changement.',
      })}
    </p>
    <label
      ><input type="checkbox" bind:checked={includeNotes} onchange={() => (shareUrl = '')} />
      {tr({
        en: 'Include my notes (Notes pane and popup notes)',
        fr: 'Inclure mes notes (onglet Notes et notes des popups)',
      })}</label
    >
    {#if !shareUrl}
      <button onclick={makeLink}>{tr({ en: 'Create the link', fr: 'Créer le lien' })}</button>
    {:else}
      <input class="url" readonly value={shareUrl} onfocus={(e) => e.currentTarget.select()} />
      <div class="row">
        <button onclick={copyLink}>{tr({ en: 'Copy', fr: 'Copier' })}</button>
        {#if 'share' in navigator}<button onclick={sendLink}>{tr({ en: 'Send…', fr: 'Envoyer…' })}</button>{/if}
        <small>{Math.round(shareUrl.length / 100) / 10} k {tr({ en: 'characters', fr: 'caractères' })}</small>
      </div>
    {/if}
  </div>
{/if}

<style>
  .save {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.9rem;
  }
  button {
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.9rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  .dm {
    border-color: var(--frame);
  }
  .share {
    max-width: 40rem;
    margin: 0 auto 0.9rem;
    padding: 0.8rem 1rem;
    border: 1.5px solid var(--frame);
    border-radius: 3px;
    background: var(--box);
    text-align: left;
  }
  .share p {
    margin: 0 0 0.5rem;
  }
  .share label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    min-height: 2.4rem;
  }
  .url {
    width: 100%;
    font: inherit;
    font-size: 0.85rem;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--paper);
    color: var(--ink);
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.5rem;
  }
</style>
