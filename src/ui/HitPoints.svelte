<script lang="ts">
  // Hit points at the table (General and Combat panes): damage (temporary hit points first), healing (also removes as
  // much nonlethal damage), nonlethal damage, temporary hit points, and the resulting state.
  // https://www.d20srd.org/srd/combat/injuryDeath.htm
  import { addNonlethal, heal, hpState, INJURY_URL, takeDamage } from '../engine/hitPoints'
  import { UI } from '../i18n/ui'
  import { app, tr, view } from '../state.svelte'
  import StatValue from './StatValue.svelte'

  let { compact = false }: { compact?: boolean } = $props()

  const hp = $derived(app.character.hp)
  const max = $derived(view.sheet.hpMax.total)
  const stable = $derived(app.character.activeEffects.some((e) => e.enabled && e.kind === 'condition' && e.refId === 'stable'))
  const st = $derived(hpState(max, hp, { stable }))
  const hurt = (n: number) => takeDamage(app.character.hp, n, app.character.activeEffects)
  let amount = $state<number | undefined>(undefined)
  const n = $derived(Math.max(0, Math.floor(Number(amount) || 0)))
  const step = (d: number) => (d < 0 ? hurt(-d) : heal(app.character.hp, d))
</script>

<div class="hpbox" class:compact>
  <div class="title">{tr(UI.hp)}</div>
  <div class="now">
    <span class="current" class:low={st.current <= max / 4}>{st.current}</span>
    <span>/</span>
    <StatValue stat={() => view.sheet.hpMax} title={UI.hp} signed={false} />
    {#if hp.temp}<span class="temp">+{hp.temp} {tr({ en: 'temp', fr: 'temp.' })}</span>{/if}
  </div>
  <div class="buttons" role="group" aria-label={tr({ en: 'Damage and healing', fr: 'Dégâts et soins' })}>
    {#each [-10, -5, -1] as d (d)}<button class="dmg" onclick={() => step(d)}>{d}</button>{/each}
    {#each [1, 5, 10] as d (d)}<button class="heal" onclick={() => step(d)}>+{d}</button>{/each}
  </div>
  <div class="amount">
    <input type="number" min="0" bind:value={amount} placeholder="0" aria-label={tr({ en: 'Amount', fr: 'Montant' })} />
    <button class="dmg" disabled={!n} onclick={() => { hurt(n); amount = undefined }}>{tr({ en: 'Damage', fr: 'Dégâts' })}</button>
    <button class="heal" disabled={!n} onclick={() => { heal(app.character.hp, n); amount = undefined }}>{tr({ en: 'Heal', fr: 'Soins' })}</button>
    <button disabled={!n} onclick={() => { addNonlethal(app.character.hp, n); amount = undefined }}>{tr({ en: 'Nonlethal', fr: 'Non létaux' })}</button>
  </div>
  <div class="extra">
    <label>
      {tr({ en: 'Nonlethal', fr: 'Non létaux' })}
      <span class="pair">
        <button onclick={() => addNonlethal(app.character.hp, -1)} aria-label={tr({ en: 'Less nonlethal damage', fr: 'Moins de dégâts non létaux' })}>−</button>
        <input type="number" min="0" bind:value={app.character.hp.nonlethal} />
        <button onclick={() => addNonlethal(app.character.hp, 1)} aria-label={tr({ en: 'More nonlethal damage', fr: 'Plus de dégâts non létaux' })}>+</button>
      </span>
    </label>
    <label>
      {tr({ en: 'Temporary HP', fr: 'PV temporaires' })}
      <input type="number" min="0" bind:value={app.character.hp.temp} />
    </label>
  </div>
  {#if st.text}
    <p class="state state-{st.kind}">{tr(st.text)} <a href={INJURY_URL} target="_blank" rel="noopener">d20srd</a></p>
  {/if}
  {#if !compact}
    <p class="note">
      {tr({
        en: 'Damage uses temporary hit points first; healing also removes as much nonlethal damage.',
        fr: 'Les dégâts entament d’abord les PV temporaires ; les soins retirent aussi autant de dégâts non létaux.',
      })}
    </p>
  {/if}
</div>

<style>
  .hpbox {
    text-align: center;
    min-width: 14rem;
  }
  .title {
    font-family: var(--font-title);
    font-size: 1rem;
    letter-spacing: 0.06em;
    color: var(--ink);
  }
  .now {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: var(--font-num);
    font-size: 1.3em;
    color: var(--ink-soft);
    flex-wrap: wrap;
  }
  .current {
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 1.6em;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .current.low {
    color: var(--danger);
  }
  .temp {
    font-size: 0.75em;
    color: var(--accent);
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(3, 2.9rem);
    gap: 0.3rem;
    justify-content: center;
    margin: 0.5rem 0;
  }
  .compact .buttons {
    grid-template-columns: repeat(6, 2.75rem);
  }
  button {
    min-width: 2.75rem;
    min-height: 2.75rem;
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 0.9rem;
    border: 1px solid var(--rule-strong);
    background: var(--box);
    color: var(--ink);
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  button.dmg {
    color: var(--danger);
  }
  .amount {
    display: flex;
    gap: 0.3rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
  }
  .amount button {
    font-family: var(--font-body);
    font-weight: 600;
    padding: 0 0.5rem;
  }
  input {
    width: 4.5rem;
    font: inherit;
    font-size: 1rem;
    min-height: 2.4rem;
    text-align: center;
    color: var(--ink);
    background: var(--box);
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
  }
  .extra {
    display: flex;
    gap: 0.8rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .extra label {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  .pair {
    display: flex;
    gap: 0.2rem;
  }
  .pair input {
    width: 3.5rem;
  }
  .state {
    margin: 0.4rem 0 0;
    color: var(--danger);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .state-staggered,
  .state-disabled {
    font-weight: 400;
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.8rem;
    margin: 0.4rem 0 0;
  }
</style>
