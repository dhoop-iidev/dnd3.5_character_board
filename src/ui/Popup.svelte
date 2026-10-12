<script lang="ts">
  import { app, tr } from '../state.svelte'
  import { UI } from '../i18n/ui'
  import { fmt } from '../engine/compute'
  import type { Part } from '../engine/stacking'
  import SourceLink from './SourceLink.svelte'
  import { closePopup, popup } from './popupState.svelte'

  let dialog: HTMLDialogElement | undefined = $state()

  $effect(() => {
    if (!dialog) return
    if (popup.content && !dialog.open) dialog.showModal()
    if (!popup.content && dialog.open) dialog.close()
  })

  const stat = $derived(popup.content?.stat?.())

  function toggle(p: Part) {
    if (!p.toggleKey) return
    const s = app.character.toggles.situational
    s[p.toggleKey] = !s[p.toggleKey]
  }

  const reason = (p: Part) =>
    p.inactiveReason === 'notStacking'
      ? tr(UI.notStacking)
      : p.inactiveReason === 'sameSource'
        ? tr(UI.sameSource)
        : p.inactiveReason === 'situational'
          ? tr(UI.situational)
          : ''
</script>

<dialog bind:this={dialog} onclose={closePopup} onclick={(e) => e.target === dialog && closePopup()}>
  {#if popup.content}
    {@const c = popup.content}
    <header>
      <h2>{tr(c.title)}</h2>
      <button class="close" onclick={closePopup} aria-label={tr(UI.close)}>✕</button>
    </header>

    {#if stat}
      <table>
        <tbody>
          {#each stat.parts as p (p.sourceId + p.label.en + p.value)}
            <tr class:inactive={!p.active}>
              <td>
                {tr(p.label)}
                {#if p.condition}
                  <button class="cond" class:on={p.situationalOn} onclick={() => toggle(p)}>
                    {p.situationalOn ? '☑' : '☐'} {tr(p.condition)}
                  </button>
                {/if}
                {#if !p.active && p.inactiveReason !== 'situational'}<em> ({reason(p)})</em>{/if}
              </td>
              <td class="num">{fmt(p.value)}</td>
              <td class="type">{p.bonusType === 'base' || p.bonusType === 'ability' ? '' : p.bonusType}</td>
              <td><SourceLink source={p.source} /></td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th>{tr(UI.total)}</th>
            <th class="num">{c.signed === false ? stat.total : fmt(stat.total)}</th>
            <th colspan="2"></th>
          </tr>
        </tfoot>
      </table>
    {/if}

    {#if c.summary}<p class="summary">{tr(c.summary)}</p>{/if}
    {#each c.lines ?? [] as line}<p class="line">{tr(line)}</p>{/each}
    {#if c.html}<div class="rule-text">{@html tr(c.html)}</div>{/if}
    {#if c.source}<p><strong>{tr(UI.source)} :</strong> <SourceLink source={c.source} /></p>{/if}
  {/if}
</dialog>

<style>
  dialog {
    width: min(42rem, calc(100vw - 2rem));
    max-height: 85vh;
    border: 2px solid var(--accent);
    border-radius: 6px;
    background: var(--paper);
    color: var(--ink);
    padding: 1rem 1.25rem;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--accent);
    margin-bottom: 0.5rem;
  }
  h2 {
    margin: 0;
    font-family: var(--font-title);
    color: var(--accent);
  }
  .close {
    font-size: 1.3rem;
    background: none;
    border: none;
    color: var(--ink);
    cursor: pointer;
    min-width: 2.5rem;
    min-height: 2.5rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td,
  th {
    padding: 0.3em 0.4em;
    border-bottom: 1px solid var(--rule);
    text-align: left;
    vertical-align: top;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .type {
    font-size: 0.8em;
    color: var(--ink-soft);
  }
  .inactive {
    opacity: 0.55;
    text-decoration: line-through;
  }
  .inactive .cond {
    text-decoration: none;
  }
  .cond {
    display: block;
    margin-top: 0.2em;
    font: inherit;
    font-size: 0.85em;
    background: var(--box);
    border: 1px dashed var(--accent);
    border-radius: 4px;
    color: var(--ink);
    cursor: pointer;
    padding: 0.2em 0.5em;
  }
  .cond.on {
    border-style: solid;
  }
  .summary {
    font-weight: 600;
  }
  .rule-text {
    font-size: 0.95em;
    border-top: 1px solid var(--rule);
    margin-top: 0.5rem;
  }
</style>
