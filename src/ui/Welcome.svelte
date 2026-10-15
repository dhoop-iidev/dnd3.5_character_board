<script lang="ts">
  // Start screen: no character ships with the app, the player (or the DM) imports a character JSON file.
  import { migrate } from '../model/migrate'
  import { app, openCharacter, tr } from '../state.svelte'

  const sharing = new URLSearchParams(location.search).has('share')
  let fileInput: HTMLInputElement | undefined = $state()
  let message = $state('')
  let dragging = $state(false)

  async function open(file: File | undefined) {
    if (!file) return
    try {
      openCharacter(migrate(JSON.parse(await file.text())))
    } catch (err) {
      message =
        tr({ en: 'This file is not a character: ', fr: 'Ce fichier n’est pas un personnage : ' }) +
        (err as Error).message
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }
</script>

<main
  class="welcome"
  class:dragging
  ondragover={(e) => {
    e.preventDefault()
    dragging = true
  }}
  ondragleave={() => (dragging = false)}
  ondrop={(e) => {
    e.preventDefault()
    dragging = false
    open(e.dataTransfer?.files[0])
  }}
>
  <div class="lang" role="group" aria-label="Language">
    <button class:on={app.character.settings.lang === 'fr'} onclick={() => (app.character.settings.lang = 'fr')}
      >FR</button
    >
    <button class:on={app.character.settings.lang === 'en'} onclick={() => (app.character.settings.lang = 'en')}
      >EN</button
    >
  </div>
  <h1>{tr({ en: 'D&D 3.5 Playboard', fr: 'Plateau de jeu D&D 3.5' })}</h1>
  {#if sharing}
    <p>{tr({ en: 'Opening the shared sheet…', fr: 'Ouverture de la fiche partagée…' })}</p>
  {:else}
    <p>
      {tr({
        en: 'Open a character file (.json) exported from this app. It stays in this browser only; nothing is sent anywhere.',
        fr: 'Ouvrez un fichier de personnage (.json) exporté depuis cette application. Il reste dans ce navigateur ; rien n’est envoyé nulle part.',
      })}
    </p>
    <button class="import" onclick={() => fileInput?.click()}
      >⭱ {tr({ en: 'Import a character', fr: 'Importer un personnage' })}</button
    >
    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      onchange={(e) => open(e.currentTarget.files?.[0])}
      hidden
    />
    <small>{tr({ en: 'or drop the file here', fr: 'ou déposez le fichier ici' })}</small>
    {#if message}<p class="error" role="alert">{message}</p>{/if}
  {/if}
</main>

<style>
  .welcome {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem 1rem;
    text-align: center;
    background: var(--paper);
    color: var(--ink);
  }
  .welcome.dragging {
    outline: 3px dashed var(--accent);
    outline-offset: -1rem;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 5vw, 2.8rem);
    border-bottom: 3px solid var(--frame);
    padding-bottom: 0.4rem;
  }
  p {
    max-width: 32rem;
    margin: 0;
    color: var(--ink-soft);
  }
  .import {
    font: inherit;
    font-size: 1.15rem;
    min-height: 3.2rem;
    padding: 0 1.5rem;
    border: 1px solid var(--frame);
    border-radius: 4px;
    background: var(--frame);
    color: var(--on-frame);
    cursor: pointer;
  }
  small {
    color: var(--ink-soft);
  }
  .error {
    color: var(--accent);
  }
  .lang {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
  }
  .lang button {
    font-family: var(--font-num);
    font-weight: 700;
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: 1px solid var(--rule-strong);
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .lang button:last-child {
    margin-left: -1px;
  }
  .lang button.on {
    background: var(--frame);
    border-color: var(--frame);
    color: var(--on-frame);
  }
</style>
