<script lang="ts">
  // Start screen: no character ships with the app, the player (or the DM) imports a character JSON file.
  import { rules } from '../data/rules'
  import { ABILITIES, type AbilityId } from '../data/types'
  import { migrate } from '../model/migrate'
  import { newCharacter } from '../model/newCharacter'
  import { app, openCharacter, tr } from '../state.svelte'

  const sharing = new URLSearchParams(location.search).has('share')
  let fileInput: HTMLInputElement | undefined = $state()
  let message = $state('')
  let dragging = $state(false)

  // ---- new character: name, race, first class, ability scores (before racial adjustments)
  const ABBR: Record<AbilityId, { en: string; fr: string }> = {
    str: { en: 'STR', fr: 'FOR' },
    dex: { en: 'DEX', fr: 'DEX' },
    con: { en: 'CON', fr: 'CON' },
    int: { en: 'INT', fr: 'INT' },
    wis: { en: 'WIS', fr: 'SAG' },
    cha: { en: 'CHA', fr: 'CHA' },
  }
  const races = [...rules.races.values()]
  const baseClasses = [...rules.classes.values()].filter((c) => !c.prestige).sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  let creating = $state(false)
  let form = $state({
    name: '',
    race: races.find((r) => r.id === 'human')?.id ?? races[0]?.id ?? 'human',
    classId: 'fighter',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } as Record<AbilityId, number>,
  })
  const race = $derived(rules.races.get(form.race))
  function create() {
    openCharacter(newCharacter({ ...form, lang: app.character.settings.lang }))
  }

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

    {#if !creating}
      <button class="secondary" onclick={() => (creating = true)}>＋ {tr({ en: 'Create a new character', fr: 'Créer un nouveau personnage' })}</button>
    {:else}
      <form
        class="create"
        onsubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <h2>{tr({ en: 'New character (level 1)', fr: 'Nouveau personnage (niveau 1)' })}</h2>
        <label>{tr({ en: 'Name', fr: 'Nom' })}<input bind:value={form.name} /></label>
        <label
          >{tr({ en: 'Race', fr: 'Race' })}
          <select bind:value={form.race}>
            {#each races as r (r.id)}<option value={r.id}>{tr(r.name)}</option>{/each}
          </select></label
        >
        <label
          >{tr({ en: 'Class', fr: 'Classe' })}
          <select bind:value={form.classId}>
            {#each baseClasses as c (c.id)}<option value={c.id}>{tr(c.name)}</option>{/each}
          </select></label
        >
        <fieldset>
          <legend>{tr({ en: 'Ability scores (before racial adjustments)', fr: 'Caractéristiques (avant ajustements raciaux)' })}</legend>
          {#each ABILITIES as a (a)}
            {@const adj = race?.abilityAdjustments[a] ?? 0}
            <label class="abil"
              >{tr(ABBR[a])}
              <input type="number" min="3" max="18" bind:value={form.abilities[a]} />
              {#if adj}<small>{adj > 0 ? '+' : ''}{adj} → {form.abilities[a] + adj}</small>{/if}
            </label>
          {/each}
        </fieldset>
        <p class="hint">
          {tr({
            en: 'Then choose skills, feats and class options in Progression (General tab), and add equipment.',
            fr: 'Choisissez ensuite compétences, dons et options de classe dans Progression (onglet Général), puis ajoutez l’équipement.',
          })}
        </p>
        <div class="row">
          <button type="button" class="secondary" onclick={() => (creating = false)}>{tr({ en: 'Cancel', fr: 'Annuler' })}</button>
          <button type="submit" class="import">{tr({ en: 'Create', fr: 'Créer' })}</button>
        </div>
      </form>
    {/if}
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
  .secondary {
    font: inherit;
    min-height: 2.8rem;
    padding: 0 1.2rem;
  }
  .create {
    width: min(100%, 34rem);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    text-align: left;
    padding: 1rem 1.2rem;
    border: 1.5px solid var(--frame);
    border-radius: 4px;
    background: var(--box);
  }
  .create h2 {
    margin: 0 0 0.3rem;
    font-family: var(--font-title);
    font-size: 1.2rem;
  }
  .create label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.9rem;
  }
  .create input,
  .create select {
    min-height: 2.6rem;
    padding: 0 0.5rem;
  }
  fieldset {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
    gap: 0.5rem;
    border: 1px solid var(--rule);
    border-radius: 4px;
  }
  .create .abil input {
    width: 100%;
  }
  .hint {
    font-size: 0.85rem;
  }
  .row {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
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
