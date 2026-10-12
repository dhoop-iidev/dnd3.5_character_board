<script lang="ts">
  import { rules } from './data/rules'
  import { UI } from './i18n/ui'
  import { app, tr, view } from './state.svelte'
  import Combat from './ui/panes/Combat.svelte'
  import Equipment from './ui/panes/Equipment.svelte'
  import General from './ui/panes/General.svelte'
  import Notes from './ui/panes/Notes.svelte'
  import SaveControls from './ui/SaveControls.svelte'
  import Popup from './ui/Popup.svelte'

  type Tab = 'general' | 'equipment' | 'combat' | 'notes'
  const TABS: { id: Tab; label: typeof UI.tabGeneral }[] = [
    { id: 'general', label: UI.tabGeneral },
    { id: 'equipment', label: UI.tabEquipment },
    { id: 'combat', label: UI.tabCombat },
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

  const errors = $derived(view.warnings.filter((w) => w.severity !== 'info').length)
</script>

<svelte:window onhashchange={() => (tab = fromHash())} />

<header class="top">
  <div class="who">
    <h1>{c.identity.name}</h1>
    <p>
      {tr({ en: 'Human', fr: 'Humain' })} · {classSummary} · {tr(UI.level)} {view.sheet.characterLevel}
      · {c.identity.deity}
    </p>
  </div>
  <div class="controls">
    <label>
      <span>{tr(UI.loadout)}</span>
      <select bind:value={app.character.activeLoadout}>
        {#each c.loadouts as l (l.id)}<option value={l.id}>{tr(l.name)}</option>{/each}
      </select>
    </label>
    <button class="theme" title={tr(UI.theme)} onclick={() => (theme = nextTheme[theme])}>{themeIcon[theme]}</button>
    <div class="lang" role="group" aria-label="Language">
      <button class:on={c.settings.lang === 'fr'} onclick={() => (app.character.settings.lang = 'fr')}>FR</button>
      <button class:on={c.settings.lang === 'en'} onclick={() => (app.character.settings.lang = 'en')}>EN</button>
    </div>
  </div>
</header>

<nav class="tabs">
  {#each TABS as t (t.id)}
    <button class:active={tab === t.id} onclick={() => (tab = t.id)}>
      {tr(t.label)}
      {#if t.id === 'general' && errors}<span class="count">{errors}</span>{/if}
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
  {:else}
    <Notes />
  {/if}
</main>

<footer>
  <SaveControls />
  <a href="OGL.txt" target="_blank">Open Game License v1.0a</a> · SRD 3.5 · Sword and Fist (Weapon Master)
</footer>

<Popup />

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.75rem;
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 3px double var(--accent);
  }
  h1 {
    margin: 0;
    font-family: var(--font-title);
    color: var(--accent);
    font-size: clamp(1.4rem, 4vw, 2.1rem);
  }
  .who p {
    margin: 0.1rem 0 0;
    color: var(--ink-soft);
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .controls label {
    display: flex;
    flex-direction: column;
    font-size: 0.8em;
  }
  select {
    font: inherit;
    font-size: 1rem;
    min-height: 2.5rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
  }
  .theme,
  .lang button {
    font: inherit;
    min-width: 2.75rem;
    min-height: 2.5rem;
    border: 1px solid var(--accent);
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .lang button.on {
    background: var(--accent);
    color: var(--paper);
  }
  .tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 1rem 0;
    overflow-x: auto;
  }
  .tabs button {
    font-family: var(--font-title);
    font-size: 1rem;
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 2px solid var(--ink);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button.active {
    background: var(--ink);
    color: var(--paper);
  }
  .count {
    display: inline-block;
    min-width: 1.4em;
    margin-left: 0.3em;
    border-radius: 1em;
    background: var(--warn);
    color: #000;
    font-family: var(--font-body);
    font-size: 0.8em;
  }
  main {
    padding: 1rem;
    border-top: 2px solid var(--ink);
  }
  footer {
    padding: 1rem;
    font-size: 0.8em;
    color: var(--ink-soft);
    text-align: center;
  }
  footer a {
    color: var(--accent);
  }
</style>
