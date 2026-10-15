<script lang="ts">
  // Turn tracker: round counter, end of my turn (effect durations count down, maneuvers advance), start of my next
  // turn, end of the encounter. Durations in rounds: https://www.d20srd.org/srd/combat/initiative.htm
  import { rules } from '../data/rules'
  import { advanceManeuvers } from '../engine/martial'
  import { app, tr } from '../state.svelte'
  import { effectName } from './effects'

  let message = $state('')

  function endTurn() {
    const c = app.character
    if (c.martial) advanceManeuvers(c.martial, rules, 'endOfTurn')
    message = ''
  }
  // A duration in rounds ends just before the initiative count it began on: count it down when your next turn starts
  // (also while switched off: a duration keeps running).
  function startTurn() {
    const c = app.character
    c.round = (c.round ?? 1) + 1
    const expired: string[] = []
    for (const e of c.activeEffects) {
      if (e.rounds === undefined) continue
      e.rounds -= 1
      if (e.rounds <= 0) expired.push(tr(effectName(e)))
    }
    c.activeEffects = c.activeEffects.filter((e) => e.rounds === undefined || e.rounds > 0)
    if (c.martial) advanceManeuvers(c.martial, rules, 'startOfTurn')
    message = expired.length ? tr({ en: 'Ended: ', fr: 'Terminé : ' }) + expired.join(', ') : ''
  }
  function endEncounter() {
    const c = app.character
    delete c.round
    if (c.martial) {
      c.martial.expended = []
      c.martial.active = []
    }
    message = tr({
      en: 'Encounter over: maneuvers recovered, running maneuvers ended.',
      fr: 'Rencontre terminée : manœuvres récupérées, manœuvres en cours terminées.',
    })
  }
</script>

<section class="box wide turn">
  <h3>{tr({ en: 'Turn', fr: 'Tour' })}</h3>
  <div class="row">
    <span class="round">{tr({ en: 'Round', fr: 'Round' })} <strong>{app.character.round ?? 1}</strong></span>
    <button class="main" onclick={endTurn}>⏵ {tr({ en: 'End of my turn', fr: 'Fin de mon tour' })}</button>
    <button onclick={startTurn}>{tr({ en: 'Start of my next turn', fr: 'Début de mon tour suivant' })}</button>
    <button onclick={endEncounter}>{tr({ en: 'End of encounter', fr: 'Fin de la rencontre' })}</button>
    {#if message}<span class="msg" role="status">{message}</span>{/if}
  </div>
  <p class="note">
    {tr({
      en: 'End of my turn: strike bonuses end. Start of my next turn: effects with a duration lose 1 round (removed at 0), as a duration ends just before the initiative count it began on.',
      fr: 'Fin de mon tour : les bonus des frappes se terminent. Début de mon tour suivant : les effets avec une durée perdent 1 round (retirés à 0), car une durée prend fin juste avant le rang d’initiative où elle a commencé.',
    })}
  </p>
</section>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .round {
    font-family: var(--font-title);
    margin-right: 0.5rem;
  }
  .round strong {
    font-family: var(--font-num);
    font-size: 1.4rem;
  }
  button {
    min-height: 2.75rem;
    padding: 0 0.9rem;
  }
  button.main {
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .msg {
    color: var(--accent);
  }
  .note {
    font-size: 0.88rem;
    color: var(--ink-soft);
    margin: 0.5rem 0 0;
  }
</style>
