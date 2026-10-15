<script lang="ts">
  // Combat use of maneuvers: initiate (expend + apply effects), stance switch, end of turn, recovery, end of encounter.
  // Tome of Battle pp. 22, 38–40 (house rule #15).
  import { rules } from '../data/rules'
  import type { ManeuverDef } from '../data/types'
  import { WARBLADE_RECOVERY } from '../engine/martial'
  import { app, tr, view } from '../state.svelte'
  import { ACTION_LABEL, maneuverName, maneuverPopup, runningUntil, TYPE_LABEL } from './maneuvers'

  const s = $derived(view.sheet)
  const martial = $derived(app.character.martial)
  const stances = $derived(s.martial.known.filter((k) => k.type === 'stance'))
  const readied = $derived(martial.readied.map((id) => rules.maneuvers.get(id)).filter((m): m is ManeuverDef => !!m))
  const UNTIL = {
    endOfTurn: { en: 'until end of turn', fr: 'jusqu’à la fin du tour' },
    round: { en: 'until your next turn', fr: 'jusqu’à votre prochain tour' },
    encounter: { en: 'this encounter', fr: 'pour la rencontre' },
  }

  function initiate(m: ManeuverDef) {
    const st = app.character.martial
    if (st.expended.includes(m.id)) return
    st.expended = [...st.expended, m.id]
    st.active = [...st.active.filter((a) => a.id !== m.id), { id: m.id, until: runningUntil(m) }]
  }
  function endTurn() {
    app.character.martial.active = app.character.martial.active.filter((a) => a.until !== 'endOfTurn')
  }
  function startOfTurn() {
    app.character.martial.active = app.character.martial.active.filter((a) => a.until === 'encounter')
  }
  function recover() {
    app.character.martial.expended = []
  }
  function endEncounter() {
    app.character.martial.expended = []
    app.character.martial.active = []
  }
</script>

<section class="box wide maneuvers">
  <h3>{tr({ en: 'Maneuvers', fr: 'Manœuvres' })} — {tr({ en: 'initiator level', fr: "niveau d'initiateur" })} {s.martial.caps?.initiatorLevel}</h3>

  <div class="stance">
    <label>
      {tr({ en: 'Stance (swift action)', fr: 'Posture (action rapide)' })}
      <select
        value={martial.stance ?? ''}
        onchange={(e) => {
          const v = e.currentTarget.value
          if (v) app.character.martial.stance = v
          else delete app.character.martial.stance
        }}
      >
        <option value="">— {tr({ en: 'none', fr: 'aucune' })} —</option>
        {#each stances as st (st.id)}<option value={st.id}>{maneuverName(st)}</option>{/each}
      </select>
    </label>
    {#if s.martial.stance}<button class="link" onclick={() => maneuverPopup(s.martial.stance!)}>ⓘ {tr(s.martial.stance.summary)}</button>{/if}
  </div>

  <ul class="readied">
    {#each readied as m (m.id)}
      {@const used = martial.expended.includes(m.id)}
      <li class:used>
        <button class="link" onclick={() => maneuverPopup(m)}>{maneuverName(m)}</button>
        <small>{tr(TYPE_LABEL[m.type])} · {tr(ACTION_LABEL[m.action])} — {tr(m.summary)}</small>
        <button class="go" disabled={used} onclick={() => initiate(m)}>
          {used ? tr({ en: 'Expended', fr: 'Utilisée' }) : tr({ en: 'Initiate', fr: 'Initier' })}
        </button>
      </li>
    {:else}
      <li class="none">{tr({ en: 'No readied maneuver (see the Maneuvers tab).', fr: 'Aucune manœuvre préparée (voir l’onglet Manœuvres).' })}</li>
    {/each}
  </ul>

  {#if martial.active.length}
    <div class="active">
      <strong>{tr({ en: 'Running', fr: 'En cours' })} :</strong>
      {#each martial.active as a (a.id)}
        {@const def = rules.maneuvers.get(a.id)}
        {#if def}
          <span class="chip">
            {maneuverName(def)} <small>({tr(UNTIL[a.until])})</small>
            <button
              aria-label={tr({ en: 'End', fr: 'Terminer' })}
              onclick={() => (app.character.martial.active = martial.active.filter((x) => x.id !== a.id))}>✕</button
            >
          </span>
        {/if}
      {/each}
    </div>
  {/if}

  <div class="actions">
    <button onclick={endTurn}>{tr({ en: 'End of my turn', fr: 'Fin de mon tour' })}</button>
    <button onclick={startOfTurn}>{tr({ en: 'Start of my next turn', fr: 'Début de mon tour suivant' })}</button>
    <button onclick={recover} disabled={!martial.expended.length}>⟳ {tr({ en: 'Recover maneuvers', fr: 'Récupérer les manœuvres' })}</button>
    <button onclick={endEncounter}>{tr({ en: 'End of encounter', fr: 'Fin de la rencontre' })}</button>
  </div>
  <p class="note">{tr(WARBLADE_RECOVERY)} <small>Tome of Battle p. 22, 40</small></p>
  <p class="note">
    {tr({
      en: 'Running maneuvers apply their bonuses to the sheet (attack, damage, AC…) and their extra dice appear on the attack cards. Maneuver and stance bonuses do not stack with each other (p. 40).',
      fr: 'Les manœuvres en cours appliquent leurs bonus à la fiche (attaque, dégâts, CA…) et leurs dés supplémentaires apparaissent sur les cartes d’attaque. Les bonus des manœuvres et postures ne se cumulent pas entre eux (p. 40).',
    })}
  </p>
</section>

<style>
  .stance {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: flex-end;
    margin-bottom: 0.6rem;
  }
  .stance label {
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
  }
  select {
    font: inherit;
    min-height: 2.5rem;
    max-width: 100%;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
  }
  .readied {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .readied li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0 0.6rem;
    align-items: center;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .readied small {
    grid-column: 1;
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
  .readied .go {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .used {
    opacity: 0.55;
  }
  .none {
    font-style: italic;
    color: var(--ink-soft);
  }
  .link {
    font: inherit;
    background: none;
    border: none;
    padding: 0.2em 0;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    text-decoration: underline dotted var(--accent);
  }
  button.go,
  .actions button,
  .chip button {
    font: inherit;
    min-height: 2.6rem;
    padding: 0 0.8rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  button.go:not(:disabled) {
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .active {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin: 0.6rem 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.2rem 0.1rem 0.6rem;
    border: 1.5px solid var(--frame);
    border-radius: 3px;
  }
  .chip small {
    color: var(--ink-soft);
  }
  .chip button {
    min-height: 2.2rem;
    min-width: 2.2rem;
    padding: 0;
    border-color: transparent;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }
  .note {
    font-size: 0.88rem;
    color: var(--ink-soft);
    margin: 0.5rem 0 0;
  }
</style>
