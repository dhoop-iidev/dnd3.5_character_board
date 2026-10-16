<script lang="ts">
  // Combat use of maneuvers: initiate (expend + apply effects), stance switch, end of turn, recovery, end of encounter.
  // Tome of Battle pp. 22, 38–40 (house rule #15).
  import { rules } from '../data/rules'
  import type { ManeuverDef } from '../data/types'
  import { crusaderDraw, crusaderGranted, maneuverEnd, readiedOf, RECOVERY, setStance } from '../engine/martial'
  import { app, tr, view } from '../state.svelte'
  import { ACTION_LABEL, maneuverName, maneuverPopup, TYPE_LABEL } from './maneuvers'

  const s = $derived(view.sheet)
  const martial = $derived(app.character.martial)
  const stances = $derived(s.martial.known.filter((k) => k.type === 'stance'))
  const def = (id: string) => rules.maneuvers.get(id)
  // One group per martial progression: readied, expended and recovery are tracked per class (p. 40).
  const groups = $derived(
    s.martial.all.map((caps) => ({
      caps,
      name: rules.classes.get(caps.classId)?.name ?? { en: caps.classId, fr: caps.classId },
      readied: readiedOf(app.character, rules, caps.classId).map(def).filter((m): m is ManeuverDef => !!m),
    })),
  )
  const crusaderLevel = $derived(s.classLevels['crusader'] ?? 0)
  /** When a running maneuver stops, from its current turn stage (engine/martial.ts). */
  function untilLabel(def: ManeuverDef, stage: number) {
    const end = maneuverEnd(def)
    if (end === Infinity) return { en: 'this encounter', fr: 'pour la rencontre' }
    if (end - stage <= 1 && stage % 2 === 0) return { en: 'until the end of your turn', fr: 'jusqu’à la fin de votre tour' }
    if (end - stage <= 1) return { en: 'until your next turn', fr: 'jusqu’à votre prochain tour' }
    return { en: 'until the end of your next turn', fr: 'jusqu’à la fin de votre prochain tour' }
  }

  /** Crusader: only granted maneuvers can be initiated (once the encounter's draw is made). */
  const withheld = (classId: string, id: string) => classId === 'crusader' && !(martial.granted ?? []).includes(id)
  function initiate(m: ManeuverDef) {
    const st = app.character.martial
    if (st.expended.includes(m.id)) return
    st.expended = [...st.expended, m.id]
    st.active = [...st.active.filter((a) => a.id !== m.id), { id: m.id, stage: 0 }]
  }
  function recoverAll(ids: string[]) {
    app.character.martial.expended = martial.expended.filter((id) => !ids.includes(id))
  }
  function recoverOne(id: string) {
    app.character.martial.expended = martial.expended.filter((x) => x !== id)
  }
  function drawCrusader(ids: string[]) {
    crusaderDraw(app.character.martial, ids, crusaderGranted(rules, crusaderLevel))
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
          setStance(app.character.martial, e.currentTarget.value || undefined)
        }}
      >
        <option value="">— {tr({ en: 'none', fr: 'aucune' })} —</option>
        {#each stances as st (st.id)}<option value={st.id}>{maneuverName(st)}</option>{/each}
      </select>
    </label>
    {#if s.martial.stance}<button class="link" onclick={() => maneuverPopup(s.martial.stance!)}>ⓘ {tr(s.martial.stance.summary)}</button>{/if}
  </div>
  {#if s.martial.stance?.effects?.some((e) => e.valueFrom === 'critCount')}
    {@const n = martial.crits ?? 0}
    <div class="crits">
      <span>{tr({ en: 'Critical hits scored', fr: 'Coups critiques portés' })} : <strong>{n}</strong> (+{n})</span>
      <button aria-label="−" disabled={!n} onclick={() => (app.character.martial.crits = n - 1)}>−</button>
      <button aria-label="+" onclick={() => (app.character.martial.crits = n + 1)}>+</button>
      <button disabled={!n} onclick={() => delete app.character.martial.crits}>
        {tr({ en: '1 minute without a critical: reset', fr: '1 minute sans critique : remise à zéro' })}
      </button>
    </div>
  {/if}

  {#each groups as g (g.caps.classId)}
    {@const ids = g.readied.map((m) => m.id)}
    {@const expended = ids.filter((id) => martial.expended.includes(id))}
    {#if groups.length > 1}<h4>{tr(g.name)} — {tr({ en: 'initiator level', fr: "niveau d'initiateur" })} {g.caps.initiatorLevel}</h4>{/if}
    {#if g.caps.classId === 'crusader'}
      <div class="actions">
        <button class="go" disabled={!ids.length} onclick={() => drawCrusader(ids)}>
          🂠 {martial.granted
            ? tr({ en: 'New draw', fr: 'Nouveau tirage' })
            : tr({ en: `Start of encounter: draw ${crusaderGranted(rules, crusaderLevel)} granted`, fr: `Début de rencontre : tirer ${crusaderGranted(rules, crusaderLevel)} accordées` })}
        </button>
        {#if martial.granted}<small>{tr({ en: 'End of each turn: one more is granted (Turn bar).', fr: 'Fin de chaque tour : une de plus est accordée (barre de tour).' })}</small>{/if}
      </div>
    {/if}
    <ul class="readied">
      {#each g.readied as m (m.id)}
        {@const used = martial.expended.includes(m.id)}
        {@const held = withheld(g.caps.classId, m.id)}
        <li class:used={used || held}>
          <button class="link" onclick={() => maneuverPopup(m)}>{maneuverName(m)}</button>
          <small>{tr(TYPE_LABEL[m.type])} · {tr(ACTION_LABEL[m.action])} — {tr(m.summary)}</small>
          {#if used && g.caps.classId === 'swordsage'}
            <button onclick={() => recoverOne(m.id)} title={tr(RECOVERY.swordsage)}>⟳ {tr({ en: 'Recover', fr: 'Récupérer' })}</button>
          {:else}
            <button class="go" disabled={used || held} onclick={() => initiate(m)}>
              {used ? tr({ en: 'Expended', fr: 'Utilisée' }) : held ? tr({ en: 'Withheld', fr: 'Retenue' }) : tr({ en: 'Initiate', fr: 'Initier' })}
            </button>
          {/if}
        </li>
      {:else}
        <li class="none">{tr({ en: 'No readied maneuver (see the Maneuvers tab).', fr: 'Aucune manœuvre préparée (voir l’onglet Manœuvres).' })}</li>
      {/each}
    </ul>
    {#if g.caps.classId === 'warblade'}
      <div class="actions">
        <button onclick={() => recoverAll(ids)} disabled={!expended.length}>⟳ {tr({ en: 'Recover maneuvers', fr: 'Récupérer les manœuvres' })}</button>
      </div>
    {/if}
    <p class="note">{tr(RECOVERY[g.caps.classId])} <small>Tome of Battle p. {g.caps.classId === 'crusader' ? 10 : g.caps.classId === 'swordsage' ? 16 : 22}, 40</small></p>
  {/each}

  {#if martial.active.length}
    <div class="active">
      <strong>{tr({ en: 'Running', fr: 'En cours' })} :</strong>
      {#each martial.active as a (a.id)}
        {@const d = def(a.id)}
        {#if d}
          <span class="chip">
            {maneuverName(d)} <small>({tr(untilLabel(d, a.stage))})</small>
            <button
              aria-label={tr({ en: 'End', fr: 'Terminer' })}
              onclick={() => (app.character.martial.active = martial.active.filter((x) => x.id !== a.id))}>✕</button
            >
          </span>
        {/if}
      {/each}
    </div>
  {/if}

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
  .crits {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  .crits button {
    min-width: 2.6rem;
  }
  h4 {
    margin: 0.8rem 0 0.3rem;
    font-family: var(--font-title);
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
  /* Expended: dimmed but still readable in both themes. */
  .used > :global(*) {
    opacity: 0.75;
  }
  .used .link {
    text-decoration: line-through;
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
  .crits button,
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
