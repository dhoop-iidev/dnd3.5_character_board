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
  /* Header and tabs: tooled leather with gold trim, like the PHB 3.5 cover. */
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.8rem 1.2rem;
    color: var(--gold-light);
    background:
      var(--grain-dark),
      linear-gradient(180deg, #4a2c18, var(--leather) 60%, var(--leather-dark));
    border-bottom: 3px solid var(--gold);
    box-shadow: inset 0 -6px 0 -3px var(--gold-dark);
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 4.2vw, 2.4rem);
    line-height: 1.1;
    background: linear-gradient(180deg, #fff3c4, var(--gold) 55%, #8a6514);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 1px rgb(0 0 0 / 0.6));
  }
  .who p {
    margin: 0.15rem 0 0;
    font-family: var(--font-title);
    color: #e9d6a6;
    letter-spacing: 0.02em;
  }
  .controls {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .controls label {
    display: flex;
    flex-direction: column;
    font-family: var(--font-title);
    font-size: 0.85em;
    color: #e9d6a6;
  }
  select {
    font: inherit;
    font-family: var(--font-body);
    font-size: 1rem;
    min-height: 2.6rem;
    background: #f6ead0;
    color: #2a1a0e;
    border: 1px solid var(--gold);
    border-radius: 4px;
  }
  .theme,
  .lang button {
    font-family: var(--font-num);
    font-weight: 700;
    min-width: 2.8rem;
    min-height: 2.6rem;
    border: 1px solid var(--gold);
    background: linear-gradient(180deg, #5a3720, var(--leather-dark));
    color: var(--gold-light);
    cursor: pointer;
  }
  .lang button:first-child {
    border-radius: 4px 0 0 4px;
  }
  .lang button:last-child {
    border-radius: 0 4px 4px 0;
  }
  .theme {
    border-radius: 50%;
  }
  .lang button.on {
    background: linear-gradient(180deg, var(--gold-light), var(--gold) 60%, var(--gold-dark));
    color: #2a1a0e;
  }
  .tabs {
    display: flex;
    gap: 0.3rem;
    padding: 0.6rem 1rem 0;
    overflow-x: auto;
    background: linear-gradient(180deg, rgb(60 35 15 / 0.15), transparent);
  }
  .tabs button {
    font-family: var(--font-title);
    font-size: 1.1rem;
    min-height: 2.8rem;
    padding: 0 1.1rem;
    border: 1px solid var(--gold-dark);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--noise), var(--paper-2);
    color: var(--ink);
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button.active {
    background: linear-gradient(180deg, var(--accent), var(--accent-dark));
    color: var(--gold-light);
    border-color: var(--gold);
    box-shadow: inset 0 2px 0 var(--gold);
  }
  .count {
    display: inline-block;
    min-width: 1.4em;
    margin-left: 0.3em;
    border-radius: 1em;
    background: var(--gold);
    color: #2a1a0e;
    font-family: var(--font-num);
    font-size: 0.75em;
    text-align: center;
  }
  main {
    padding: 1rem;
    border-top: 2px solid var(--gold-dark);
  }
  footer {
    padding: 1rem;
    font-size: 0.85em;
    color: var(--ink-soft);
    text-align: center;
    border-top: 1px solid var(--rule);
  }
  footer a {
    color: var(--accent);
  }
</style>
