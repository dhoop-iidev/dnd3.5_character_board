<script lang="ts">
  // Tome of Battle: what the warblade knows, readies and can learn (house rule #15).
  import { rules } from '../../data/rules'
  import type { ManeuverDef } from '../../data/types'
  import { knownManeuvers, learnBlockers, martialCaps, WARBLADE_RECOVERY } from '../../engine/martial'
  import { app, tr, view } from '../../state.svelte'
  import WarningList from '../WarningList.svelte'
  import { ACTION_LABEL, disciplineName, maneuverName, maneuverPopup, TYPE_LABEL } from '../maneuvers'

  const s = $derived(view.sheet)
  const caps = $derived(s.martial.caps)
  const known = $derived(s.martial.known)
  const knownManeuversOnly = $derived(known.filter((k) => k.type !== 'stance'))
  const knownStances = $derived(known.filter((k) => k.type === 'stance'))
  const martial = $derived(app.character.martial)

  // Character levels taken as warblade (where maneuvers are learned).
  const warbladeLevels = $derived(
    app.character.levels.map((l, i) => ({ l, L: i + 1 })).filter((x) => x.l.classId === 'warblade'),
  )
  let targetLevel = $state(0)
  const level = $derived(targetLevel || warbladeLevels.at(-1)?.L || 0)
  const levelCaps = $derived(level ? martialCaps(app.character, rules, level) : null)
  const prevCaps = $derived(level ? martialCaps(app.character, rules, level - 1) : null)
  const learnedHere = $derived((app.character.levels[level - 1]?.maneuversLearned ?? []).map((id) => rules.maneuvers.get(id)).filter((m): m is ManeuverDef => !!m))
  const slotsManeuvers = $derived((levelCaps?.maneuversKnown ?? 0) - (prevCaps?.maneuversKnown ?? 0))
  const slotsStances = $derived((levelCaps?.stancesKnown ?? 0) - (prevCaps?.stancesKnown ?? 0))
  const knownBefore = $derived(level ? knownManeuvers(app.character, rules, level - 1) : [])

  // Catalog filters
  let discipline = $state('')
  let kind = $state('')
  let onlyLearnable = $state(true)
  const catalog = $derived(
    [...rules.maneuvers.values()]
      .filter((m) => !discipline || m.discipline === discipline)
      .filter((m) => !kind || (kind === 'stance' ? m.type === 'stance' : m.type !== 'stance'))
      .map((m) => ({ m, blockers: levelCaps ? learnBlockers(m, [...knownBefore, ...learnedHere], levelCaps, rules) : ['no warblade level'] }))
      .filter((x) => !onlyLearnable || !x.blockers.length)
      .sort((a, b) => a.m.level - b.m.level || maneuverName(a.m).localeCompare(maneuverName(b.m))),
  )

  function learn(m: ManeuverDef) {
    const entry = app.character.levels[level - 1]
    entry.maneuversLearned = [...(entry.maneuversLearned ?? []), m.id]
  }
  function unlearn(id: string, L: number) {
    const entry = app.character.levels[L - 1]
    entry.maneuversLearned = (entry.maneuversLearned ?? []).filter((x) => x !== id)
    const m = app.character.martial
    m.readied = m.readied.filter((x) => x !== id)
    if (m.stance === id) delete m.stance
  }
  function toggleReadied(id: string) {
    const m = app.character.martial
    if (m.readied.includes(id)) m.readied = m.readied.filter((x) => x !== id)
    else if (m.readied.length < (caps?.maneuversReadied ?? 0)) m.readied = [...m.readied, id]
  }
  const learnedAt = (id: string) =>
    app.character.levels.findIndex((l) => (l.maneuversLearned ?? []).includes(id) || l.maneuverSwap?.to === id) + 1

  // Maneuver swap (warblade 4, 6, 8…; p. 21)
  const swapLevel = $derived(
    warbladeLevels.filter((x) => {
      const n = app.character.levels.slice(0, x.L).filter((l) => l.classId === 'warblade').length
      return n >= 4 && n % 2 === 0
    }),
  )
</script>

{#if !caps}
  <p class="empty">
    {tr({
      en: 'No warblade level yet. Choose the warblade class at a level-up (Progression, General tab) to learn maneuvers.',
      fr: 'Pas encore de niveau de lame de bataille. Choisissez la classe lame de bataille lors d’un passage de niveau (Progression, onglet Général) pour apprendre des manœuvres.',
    })}
  </p>
{:else}
  <div class="grid">
    <section class="box wide">
      <h3>{tr({ en: 'Warblade', fr: 'Lame de bataille (Warblade)' })} {caps.classLevel}</h3>
      <div class="caps">
        <div><span>{tr({ en: 'Initiator level', fr: "Niveau d'initiateur" })}</span><strong>{caps.initiatorLevel}</strong></div>
        <div><span>{tr({ en: 'Highest maneuver level', fr: 'Niveau de manœuvre max' })}</span><strong>{caps.maxManeuverLevel}</strong></div>
        <div><span>{tr({ en: 'Maneuvers known', fr: 'Manœuvres connues' })}</span><strong>{knownManeuversOnly.length} / {caps.maneuversKnown}</strong></div>
        <div><span>{tr({ en: 'Readied', fr: 'Préparées' })}</span><strong>{martial.readied.length} / {caps.maneuversReadied}</strong></div>
        <div><span>{tr({ en: 'Stances known', fr: 'Postures connues' })}</span><strong>{knownStances.length} / {caps.stancesKnown}</strong></div>
      </div>
      <p class="note">
        {tr({ en: 'Initiator level = warblade level + ½ other class levels (rounded down).', fr: "Niveau d'initiateur = niveau de lame de bataille + ½ niveaux des autres classes (arrondi à l'inférieur)." })}
        {tr(WARBLADE_RECOVERY)} <small>Tome of Battle p. 22, 39</small>
      </p>
      <WarningList areas={['maneuvers']} />
    </section>

    <section class="box">
      <h3>{tr({ en: 'Stances', fr: 'Postures' })}</h3>
      <p class="note">{tr({ en: 'Always available; changing stance is a swift action.', fr: 'Toujours disponibles ; changer de posture est une action rapide.' })}</p>
      <ul class="list">
        {#each knownStances as m (m.id)}
          <li>
            <label class="radio">
              <input type="radio" name="stance" checked={martial.stance === m.id} onchange={() => (app.character.martial.stance = m.id)} />
            </label>
            <button class="link" onclick={() => maneuverPopup(m)}>{maneuverName(m)}</button>
            <small>{disciplineName(m.discipline)} · {tr({ en: 'level', fr: 'niv.' })} {m.level} · {tr({ en: 'learned at', fr: 'appris au niv.' })} {learnedAt(m.id)}</small>
            <button class="del" onclick={() => unlearn(m.id, learnedAt(m.id))} aria-label={tr({ en: 'Forget', fr: 'Oublier' })}>✕</button>
          </li>
        {:else}
          <li class="none">{tr({ en: 'No stance known.', fr: 'Aucune posture connue.' })}</li>
        {/each}
        {#if martial.stance}
          <li><button class="plain" onclick={() => delete app.character.martial.stance}>{tr({ en: 'Leave the stance', fr: 'Quitter la posture' })}</button></li>
        {/if}
      </ul>
    </section>

    <section class="box">
      <h3>{tr({ en: 'Maneuvers known', fr: 'Manœuvres connues' })}</h3>
      <p class="note">{tr({ en: 'Tick the readied ones (5 minutes of practice to change them).', fr: 'Cochez celles qui sont préparées (5 minutes d’exercice pour les changer).' })}</p>
      <ul class="list">
        {#each knownManeuversOnly as m (m.id)}
          <li>
            <label class="radio" title={tr({ en: 'Readied', fr: 'Préparée' })}>
              <input type="checkbox" checked={martial.readied.includes(m.id)} onchange={() => toggleReadied(m.id)} />
            </label>
            <button class="link" onclick={() => maneuverPopup(m)}>{maneuverName(m)}</button>
            <small>{disciplineName(m.discipline)} · {tr(TYPE_LABEL[m.type])} · {tr({ en: 'level', fr: 'niv.' })} {m.level} · {tr(ACTION_LABEL[m.action])}</small>
            <button class="del" onclick={() => unlearn(m.id, learnedAt(m.id))} aria-label={tr({ en: 'Forget', fr: 'Oublier' })}>✕</button>
          </li>
        {:else}
          <li class="none">{tr({ en: 'No maneuver known.', fr: 'Aucune manœuvre connue.' })}</li>
        {/each}
      </ul>
    </section>

    <section class="box wide">
      <h3>{tr({ en: 'Learn', fr: 'Apprendre' })}</h3>
      <div class="filters">
        <label>
          {tr({ en: 'At level', fr: 'Au niveau' })}
          <select value={level} onchange={(e) => (targetLevel = Number(e.currentTarget.value))}>
            {#each warbladeLevels as x (x.L)}<option value={x.L}>{x.L}</option>{/each}
          </select>
        </label>
        <label>
          {tr({ en: 'Discipline', fr: 'Discipline' })}
          <select bind:value={discipline}>
            <option value="">{tr({ en: 'all', fr: 'toutes' })}</option>
            {#each [...rules.disciplines.values()] as d (d.id)}<option value={d.id}>{tr(d.name)}</option>{/each}
          </select>
        </label>
        <label>
          {tr({ en: 'Kind', fr: 'Genre' })}
          <select bind:value={kind}>
            <option value="">{tr({ en: 'all', fr: 'tous' })}</option>
            <option value="maneuver">{tr({ en: 'maneuvers', fr: 'manœuvres' })}</option>
            <option value="stance">{tr({ en: 'stances', fr: 'postures' })}</option>
          </select>
        </label>
        <label class="check"><input type="checkbox" bind:checked={onlyLearnable} /> {tr({ en: 'only learnable now', fr: 'seulement apprenables' })}</label>
      </div>
      <p class="note">
        {tr({ en: `Level ${level}: `, fr: `Niveau ${level} : ` })}
        {learnedHere.filter((m) => m.type !== 'stance').length}/{slotsManeuvers} {tr({ en: 'maneuver(s)', fr: 'manœuvre(s)' })},
        {learnedHere.filter((m) => m.type === 'stance').length}/{slotsStances} {tr({ en: 'stance(s)', fr: 'posture(s)' })}
        · {tr({ en: 'max maneuver level', fr: 'niveau de manœuvre max' })} {levelCaps?.maxManeuverLevel}
      </p>
      <table>
        <thead>
          <tr>
            <th>{tr({ en: 'Maneuver', fr: 'Manœuvre' })}</th>
            <th>{tr({ en: 'Lvl', fr: 'Niv.' })}</th>
            <th>{tr({ en: 'Discipline', fr: 'Discipline' })}</th>
            <th>{tr({ en: 'Type', fr: 'Type' })}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each catalog as { m, blockers } (m.id)}
            <tr class:blocked={blockers.length}>
              <td>
                <button class="link" onclick={() => maneuverPopup(m)}>{maneuverName(m)}</button>
                <small class="sum">{tr(m.summary)}</small>
                {#if blockers.length}<small class="why">{blockers.join(' · ')}</small>{/if}
              </td>
              <td>{m.level}</td>
              <td>{disciplineName(m.discipline)}</td>
              <td>{tr(TYPE_LABEL[m.type])}</td>
              <td><button class="learn" onclick={() => learn(m)}>{tr({ en: 'Learn', fr: 'Apprendre' })}</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    {#if swapLevel.length}
      <section class="box wide">
        <h3>{tr({ en: 'Maneuver swap', fr: 'Échange de manœuvre' })}</h3>
        <p class="note">{tr({ en: 'At warblade levels 4, 6, 8…, one known maneuver (not a stance) can be exchanged for another (p. 21).', fr: 'Aux niveaux 4, 6, 8… de lame de bataille, une manœuvre connue (pas une posture) peut être échangée contre une autre (p. 21).' })}</p>
        {#each swapLevel as x (x.L)}
          {@const entry = app.character.levels[x.L - 1]}
          <div class="swap">
            <strong>{tr({ en: 'Level', fr: 'Niveau' })} {x.L}</strong>
            <select value={entry.maneuverSwap?.from ?? ''} onchange={(e) => (entry.maneuverSwap = e.currentTarget.value ? { from: e.currentTarget.value, to: entry.maneuverSwap?.to ?? '' } : undefined)}>
              <option value="">— {tr({ en: 'no swap', fr: 'pas d’échange' })} —</option>
              {#each knownManeuvers(app.character, rules, x.L - 1).filter((k) => k.type !== 'stance') as k (k.id)}<option value={k.id}>{maneuverName(k)}</option>{/each}
            </select>
            {#if entry.maneuverSwap}
              →
              <select bind:value={entry.maneuverSwap.to}>
                <option value="">—</option>
                {#each [...rules.maneuvers.values()].filter((k) => k.type !== 'stance') as k (k.id)}<option value={k.id}>{maneuverName(k)} ({k.level})</option>{/each}
              </select>
            {/if}
          </div>
        {/each}
      </section>
    {/if}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    gap: 1rem;
    align-items: start;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .empty {
    font-style: italic;
  }
  .caps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem 1.6rem;
  }
  .caps div {
    display: flex;
    flex-direction: column;
  }
  .caps span {
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .caps strong {
    font-family: var(--font-num);
    font-size: 1.5rem;
  }
  .note {
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .list li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2rem 0.5rem;
    min-height: 2.8rem;
    border-bottom: 1px solid var(--rule);
  }
  .list small {
    flex-basis: 100%;
    padding-left: 2.6rem;
    color: var(--ink-soft);
  }
  .none {
    font-style: italic;
    color: var(--ink-soft);
  }
  .radio input {
    width: 1.3rem;
    height: 1.3rem;
    margin: 0 0.6rem;
    accent-color: var(--accent);
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
    flex: 1;
  }
  .del,
  .plain,
  .learn {
    font: inherit;
    min-height: 2.4rem;
    min-width: 2.4rem;
    padding: 0 0.6rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .del {
    color: var(--danger);
    border-color: transparent;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: flex-end;
  }
  .filters label {
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
  }
  .filters .check {
    flex-direction: row;
    gap: 0.4rem;
    align-items: center;
    min-height: 2.5rem;
  }
  select {
    font: inherit;
    min-height: 2.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    max-width: 100%;
  }
  td small {
    display: block;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }
  td .why {
    color: var(--danger);
  }
  tr.blocked .link {
    opacity: 0.75;
  }
  .swap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
</style>
