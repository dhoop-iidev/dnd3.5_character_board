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
  <a href="OGL.txt" target="_blank">Open Game License v1.0a</a> · SRD 3.5 · Sword and Fist (Weapon Master) ·
  <a href="models/CREDITS.md" target="_blank">3D : « Fallen Paladin », Pigcraft, CC-BY 4.0</a>
</footer>

<Popup />

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
    box-shadow: 0 4px 0 -2px var(--paper), 0 5px 0 -2px var(--frame);
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
  .controls label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-family: var(--font-title);
    font-size: 0.85em;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  select {
    font: inherit;
    font-family: var(--font-body);
    font-size: 1rem;
    min-height: 2.75rem;
    padding: 0 0.6rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
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
</style>
