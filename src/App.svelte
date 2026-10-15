<script lang="ts">
  import { rules } from './data/rules'
  import { UI } from './i18n/ui'
  import { levelForXp } from './engine/progression'
  import { app, leaveShared, tr, view } from './state.svelte'
  import Combat from './ui/panes/Combat.svelte'
  import Maneuvers from './ui/panes/Maneuvers.svelte'
  import Spells from './ui/panes/Spells.svelte'
  import Equipment from './ui/panes/Equipment.svelte'
  import General from './ui/panes/General.svelte'
  import Notes from './ui/panes/Notes.svelte'
  import SaveControls from './ui/SaveControls.svelte'
  import Popup from './ui/Popup.svelte'
  import Welcome from './ui/Welcome.svelte'

  type Tab = 'general' | 'equipment' | 'combat' | 'maneuvers' | 'spells' | 'notes'
  const TABS: { id: Tab; label: typeof UI.tabGeneral }[] = [
    { id: 'general', label: UI.tabGeneral },
    { id: 'equipment', label: UI.tabEquipment },
    { id: 'combat', label: UI.tabCombat },
    { id: 'maneuvers', label: { en: 'Maneuvers', fr: 'Manœuvres' } },
    { id: 'spells', label: { en: 'Spells', fr: 'Sorts' } },
    { id: 'notes', label: UI.tabNotes },
  ]

  const fromHash = (): Tab => {
    const h = location.hash.replace('#/', '') as Tab
    return TABS.some((t) => t.id === h) ? h : 'general'
  }
  let tab = $state<Tab>(fromHash())
  $effect(() => {
    location.hash = `#/${tab}`
  })

  const c = $derived(app.character)
  const classSummary = $derived(
    Object.entries(view.sheet.classLevels)
      .map(([id, n]) => `${tr(rules.classes.get(id)?.name)} ${n}`)
      .join(' / '),
  )
  // Per-device theme (not part of the character): auto follows the system.
  type Theme = 'auto' | 'light' | 'dark'
  const THEME_KEY = 'dnd35-playboard:theme'
  let theme = $state<Theme>(readTheme())
  function readTheme(): Theme {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme) || 'auto'
    } catch {
      return 'auto'
    }
  }
  $effect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  })
  const nextTheme: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' }
  const themeIcon: Record<Theme, string> = { auto: '◐', light: '☀', dark: '☾' }

  // Badge: only choices the player has to make (pending level-up included), not informative warnings.
  const errors = $derived(
    view.warnings.filter((w) => w.actionable && w.area !== 'maneuvers').length +
      (levelForXp(app.character.xp) > app.character.levels.length ? 1 : 0),
  )
  const maneuverErrors = $derived(view.warnings.filter((w) => w.actionable && w.area === 'maneuvers').length)
  // The Maneuvers tab only exists once the character has a warblade level.
  // The Spells tab only exists once the character has a spellcasting class.
  const tabs = $derived(
    TABS.filter(
      (t) => (t.id !== 'maneuvers' || view.sheet.martial.caps) && (t.id !== 'spells' || view.sheet.spellcasting.length),
    ),
  )
</script>

<svelte:window onhashchange={() => (tab = fromHash())} />

{#if app.shared}
  <div class="shared-banner" role="status">
    {tr({
      en: `Read-only view of ${app.shared.name}'s sheet, shared by link. Changes here are not saved.`,
      fr: `Fiche de ${app.shared.name} partagée par lien, en lecture seule. Les changements ici ne sont pas enregistrés.`,
    })}
    <button onclick={leaveShared}>{tr({ en: 'Back to my sheet', fr: 'Revenir à ma fiche' })}</button>
  </div>
{/if}

{#if !app.loaded}
  <Welcome />
{:else}
  <header class="top">
    <div class="who">
      <h1>{c.identity.name}</h1>
      {#if c.identity.title}<p class="title">{c.identity.title}</p>{/if}
      <p>
        {tr(view.sheet.race.name)} · {classSummary} · {tr(UI.level)}
        {view.sheet.characterLevel}
        {#if c.identity.deity}· {c.identity.deity}{/if}
      </p>
    </div>
    <div class="controls">
      <button class="theme" title={tr(UI.theme)} onclick={() => (theme = nextTheme[theme])}>{themeIcon[theme]}</button>
      <div class="lang" role="group" aria-label="Language">
        <button class:on={c.settings.lang === 'fr'} onclick={() => (app.character.settings.lang = 'fr')}>FR</button>
        <button class:on={c.settings.lang === 'en'} onclick={() => (app.character.settings.lang = 'en')}>EN</button>
      </div>
    </div>
  </header>

  <nav class="tabs">
    {#each tabs as t (t.id)}
      <button class:active={tab === t.id} onclick={() => (tab = t.id)}>
        {tr(t.label)}
        {#if t.id === 'maneuvers' && maneuverErrors}<span
            class="count"
            title={tr({ en: 'Choices to make', fr: 'Choix à faire' })}>{maneuverErrors}</span
          >{/if}
        {#if t.id === 'general' && errors}<span class="count" title={tr({ en: 'Choices to make', fr: 'Choix à faire' })}
            >{errors}</span
          >{/if}
      </button>
    {/each}
  </nav>

  <main>
    {#if tab === 'general'}
      <General />
    {:else if tab === 'equipment'}
      <Equipment />
    {:else if tab === 'combat'}
      <Combat />
    {:else if tab === 'maneuvers'}
      <Maneuvers />
    {:else if tab === 'spells'}
      <div class="grid-spells"><Spells /></div>
    {:else}
      <Notes />
    {/if}
  </main>

  <footer>
    <SaveControls />
    <a href="OGL.txt" target="_blank">Open Game License v1.0a</a> · SRD 3.5 · Sword and Fist (Weapon Master) · Tome of Battle (Warblade)
  </footer>

  <Popup />
{/if}

<style>
  /* Header: the sheet's title block. Paper, large name, a heavy rule over a hairline (book style). */
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem 1.5rem;
    padding: 1.4rem 1.5rem 1rem;
    color: var(--ink);
    background: var(--paper);
    border-bottom: 3px solid var(--frame);
    box-shadow:
      0 4px 0 -2px var(--paper),
      0 5px 0 -2px var(--frame);
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(1.7rem, 4.2vw, 2.6rem);
    line-height: 1.05;
    letter-spacing: 0.01em;
    color: var(--ink);
  }
  .who p {
    margin: 0.35rem 0 0;
    font-family: var(--font-title);
    font-size: 1.05rem;
    color: var(--ink-soft);
    letter-spacing: 0.03em;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .theme,
  .lang button {
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 0.9rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: 1px solid var(--rule-strong);
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .theme {
    border-radius: 4px;
    font-size: 1.1rem;
  }
  .theme:hover,
  .lang button:not(.on):hover {
    background: var(--paper-2);
  }
  .lang {
    display: flex;
  }
  .lang button:first-child {
    border-radius: 4px 0 0 4px;
  }
  .lang button:last-child {
    border-radius: 0 4px 4px 0;
    margin-left: -1px;
  }
  .lang button.on {
    background: var(--frame);
    border-color: var(--frame);
    color: var(--on-frame);
  }
  /* Tabs: small caps on a hairline, active one underlined in red. */
  .tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.4rem 1rem 0;
    overflow-x: auto;
    border-bottom: 1px solid var(--rule);
    scrollbar-width: none;
  }
  .tabs button {
    position: relative;
    font-family: var(--font-title);
    font-size: 1.15rem;
    letter-spacing: 0.04em;
    min-height: 3rem;
    padding: 0 0.9rem;
    border: none;
    background: none;
    color: var(--ink-soft);
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button::after {
    content: '';
    position: absolute;
    left: 0.6rem;
    right: 0.6rem;
    bottom: -1px;
    height: 3px;
    background: transparent;
  }
  .tabs button:hover {
    color: var(--ink);
  }
  .tabs button.active {
    color: var(--ink);
  }
  .tabs button.active::after {
    background: var(--accent);
  }
  .count {
    display: inline-block;
    min-width: 1.35rem;
    margin-left: 0.3em;
    padding: 0 0.3em;
    border-radius: 1em;
    background: var(--accent);
    color: var(--paper);
    font-family: var(--font-num);
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1.35rem;
    text-align: center;
    vertical-align: 0.15em;
  }
  main {
    padding: 1.5rem;
  }
  footer {
    padding: 1.25rem 1rem 1.5rem;
    font-size: 0.85em;
    color: var(--ink-soft);
    text-align: center;
    border-top: 1px solid var(--rule);
  }
  footer a {
    color: var(--ink-soft);
  }
  @media (max-width: 30rem) {
    .top {
      padding: 1rem 1rem 0.8rem;
    }
    main {
      padding: 1rem;
    }
    .tabs {
      padding: 0.2rem 0.4rem 0;
    }
    .tabs button {
      padding: 0 0.6rem;
      font-size: 1.05rem;
    }
  }
  .title {
    margin: 0.1rem 0 0;
    font-style: italic;
    font-size: 1.05rem;
  }
  .shared-banner {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    background: var(--frame);
    color: var(--on-frame);
  }
  .shared-banner button {
    font: inherit;
    min-height: 2.4rem;
    padding: 0 0.8rem;
    border: 1px solid var(--on-frame);
    border-radius: 3px;
    background: transparent;
    color: var(--on-frame);
    cursor: pointer;
  }
</style>
