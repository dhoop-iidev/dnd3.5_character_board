<script lang="ts">
  // Spells learned level by level (bard and sorcerer spells known, wizard free spellbook spells), the spell swap
  // (sorcerer 4, 6, 8…; bard 5, 8, 11…) and the wizard's copied spells.
  // https://www.d20srd.org/srd/classes/bard.htm#bardSpells, sorcerer.htm#sorcererSpells, wizard.htm#spellbooks
  import { rules } from '../data/rules'
  import type { SpellDef } from '../data/types'
  import { copyCost, knownCaps, listLevel, spellbook, wizardSchools } from '../engine/arcane'
  import { castingLevelAt, knownUpTo, learningProblems, spellLearning, spellOwner, swapProblems } from '../engine/spellLearning'
  import type { Spellcasting } from '../engine/spells'
  import { app, tr } from '../state.svelte'

  let { sc, onspell }: { sc: Spellcasting; onspell: (sp: SpellDef) => void } = $props()

  const wizard = $derived(sc.classId === 'wizard')
  // Character levels where this class learns spells (its own levels and prestige levels advancing it).
  const levels = $derived(
    app.character.levels.map((_, i) => i + 1).filter((L) => spellOwner(app.character, rules, L) === sc.classId),
  )
  let picked = $state(0)
  const L = $derived(levels.includes(picked) ? picked : (levels.at(-1) ?? 0))
  const x = $derived(L ? spellLearning(app.character, rules, L) : undefined)
  const problems = $derived(x ? learningProblems(rules, x) : [])
  const entry = $derived(app.character.levels[L - 1])

  const byName = (a: SpellDef, b: SpellDef) => tr(a.name).localeCompare(tr(b.name))
  const lvlOf = (id: string) => listLevel(rules, sc.classId, id) ?? 0
  /** Spells that can be added at the shown level, grouped by spell level. */
  const options = $derived.by(() => {
    if (!x) return []
    const taken = new Set([...x.knownBefore, ...x.learned])
    const levelsOk = x.castable.filter((l) => (x.onlyLevel === undefined ? true : l === x.onlyLevel) && (!x.newByLevel || x.newByLevel[l]))
    return levelsOk
      .map((l) => ({
        level: l,
        spells: [...rules.spells.values()]
          .filter((sp) => lvlOf(sp.id) === l && listLevel(rules, sc.classId, sp.id) !== undefined && !taken.has(sp.id) && !x.prohibited.includes(sp.schoolId ?? ''))
          .sort(byName),
      }))
      .filter((g) => g.spells.length && !(wizard && g.level === 0))
  })
  function learn(id: string) {
    if (!id || !entry) return
    entry.spellsLearned = [...(entry.spellsLearned ?? []), id]
  }
  function unlearn(id: string) {
    if (!entry) return
    entry.spellsLearned = (entry.spellsLearned ?? []).filter((s) => s !== id)
    if (!entry.spellsLearned.length) delete entry.spellsLearned
  }

  // ---- swap
  const swapFrom = $derived(x?.swap ? x.knownBefore.filter((id) => lvlOf(id) <= x.highest - 2) : [])
  function setSwap(patch: Partial<{ from: string; to: string }>) {
    if (!entry) return
    const s = { from: entry.spellSwap?.from ?? '', to: entry.spellSwap?.to ?? '', ...patch }
    if (patch.from !== undefined) s.to = ''
    if (!s.from) delete entry.spellSwap
    else entry.spellSwap = s
  }
  const swapTo = $derived(
    x && entry?.spellSwap?.from
      ? [...rules.spells.values()]
          .filter((sp) => listLevel(rules, sc.classId, sp.id) === lvlOf(entry.spellSwap!.from) && !x.knownBefore.includes(sp.id) && !x.learned.includes(sp.id))
          .sort(byName)
      : [],
  )
  const swapIssues = $derived(x && entry?.spellSwap?.from && entry.spellSwap.to ? swapProblems(rules, x, entry.spellSwap) : [])

  // ---- now: spells known by level (bard, sorcerer) or the spellbook (wizard)
  const known = $derived(knownUpTo(app.character, rules, sc.classId))
  const caps = $derived(knownCaps(rules, sc.classId, castingLevelAt(app.character, rules, sc.classId, app.character.levels.length)))
  const book = $derived(wizard ? spellbook(app.character, rules, known) : [])
  const schools = $derived(wizard ? wizardSchools(app.character) : { prohibited: [] as string[] })

  // ---- wizard: copy a spell (from a scroll or another spellbook)
  let copyPick = $state('')
  const copyOptions = $derived(
    wizard
      ? sc.slots
          .filter((sl) => !sl.blocked && sl.spellLevel > 0)
          .map((sl) => ({
            level: sl.spellLevel,
            spells: [...rules.spells.values()]
              .filter((sp) => listLevel(rules, 'wizard', sp.id) === sl.spellLevel && !book.some((e) => e.id === sp.id) && !schools.prohibited.includes(sp.schoolId ?? ''))
              .sort(byName),
          }))
          .filter((g) => g.spells.length)
      : [],
  )
  function copy() {
    if (!copyPick) return
    const st = ((app.character.spells ??= {})['wizard'] ??= { prepared: {} })
    st.spellbook = [...(st.spellbook ?? []), copyPick]
    copyPick = ''
  }
  function uncopy(id: string) {
    const st = app.character.spells?.['wizard']
    if (st?.spellbook) st.spellbook = st.spellbook.filter((s) => s !== id)
  }
  const SCHOOL: Record<string, { en: string; fr: string }> = {
    abjuration: { en: 'abjuration', fr: 'abjuration' },
    conjuration: { en: 'conjuration', fr: 'invocation' },
    divination: { en: 'divination', fr: 'divination' },
    enchantment: { en: 'enchantment', fr: 'enchantement' },
    evocation: { en: 'evocation', fr: 'évocation' },
    illusion: { en: 'illusion', fr: 'illusion' },
    necromancy: { en: 'necromancy', fr: 'nécromancie' },
    transmutation: { en: 'transmutation', fr: 'transmutation' },
  }
</script>

<div class="learning">
  {#if wizard}
    <h4>{tr({ en: 'Spellbook', fr: 'Grimoire' })} <small>· {book.length} {tr({ en: 'spells', fr: 'sorts' })}</small></h4>
    {#if schools.specialty || schools.prohibited.length}
      <p class="note">
        {tr({ en: 'Specialty', fr: 'Spécialité' })} : <strong>{schools.specialty ? tr(SCHOOL[schools.specialty]) : '—'}</strong>
        · {tr({ en: 'prohibited', fr: 'interdites' })} :
        <strong>{schools.prohibited.map((p) => tr(SCHOOL[p])).join(', ') || '—'}</strong>
        {tr({ en: '(can’t be learned, prepared, or used from scrolls and wands)', fr: '(ni apprises, ni préparées, ni utilisées depuis parchemins et baguettes)' })}
      </p>
    {/if}
    {#each Array.from(new Set(book.map((e) => e.level))) as lvl (lvl)}
      <p class="booklvl">
        <strong>{tr({ en: 'Level', fr: 'Niveau' })} {lvl}</strong> :
        {#each book.filter((e) => e.level === lvl) as e, k (e.id)}
          {@const sp = rules.spells.get(e.id)!}
          {k ? ', ' : ''}<button class="link school-{sp.schoolId}" onclick={() => onspell(sp)}>{tr(sp.name)}</button
          >{#if e.how === 'copied'}<button class="x" onclick={() => uncopy(e.id)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>{/if}
        {/each}
      </p>
    {/each}
    <div class="row">
      <select bind:value={copyPick} aria-label={tr({ en: 'Copy a spell', fr: 'Copier un sort' })}>
        <option value="">— {tr({ en: 'copy a spell (scroll, other spellbook)', fr: 'copier un sort (parchemin, autre grimoire)' })} —</option>
        {#each copyOptions as g (g.level)}
          <optgroup label={`${tr({ en: 'Level', fr: 'Niveau' })} ${g.level} · ${copyCost(g.level).pages} p. · ${copyCost(g.level).gp} ${tr({ en: 'gp', fr: 'po' })}`}>
            {#each g.spells as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
          </optgroup>
        {/each}
      </select>
      <button disabled={!copyPick} onclick={copy}>＋ {tr({ en: 'Copy', fr: 'Copier' })}</button>
    </div>
    <p class="note">
      {tr({
        en: 'Copying: Spellcraft DC 15 + spell level to understand it (a specialist +2 for her school), 24 hours, 1 page per spell level (0-level: 1), 100 gp per page. Read magic can always be prepared from memory.',
        fr: 'Copie : Art de la magie DD 15 + niveau du sort pour le comprendre (+2 pour un spécialiste dans son école), 24 heures, 1 page par niveau de sort (niveau 0 : 1), 100 po par page. Lecture de la magie se prépare toujours de mémoire.',
      })}
      <a href="https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm#addingSpellsToAWizardsSpellbook" target="_blank" rel="noopener">d20srd</a>
    </p>
  {:else}
    <h4>{tr({ en: 'Spells known', fr: 'Sorts connus' })}</h4>
    <p class="known">
      {#each caps as cap, lvl (lvl)}
        {#if cap !== null && cap !== undefined}
          {@const mine = known.filter((id) => lvlOf(id) === lvl)}
          <span class:short={mine.length < cap}
            >{tr({ en: 'Level', fr: 'Niv.' })} {lvl} : {mine.length} / {cap}</span
          >
        {/if}
      {/each}
    </p>
  {/if}

  {#if levels.length}
    <h4>
      {wizard ? tr({ en: 'Free spells per level', fr: 'Sorts gratuits par niveau' }) : tr({ en: 'Learned at level', fr: 'Appris au niveau' })}
      <select bind:value={picked} aria-label={tr({ en: 'Character level', fr: 'Niveau de personnage' })}>
        {#each levels as l (l)}<option value={l}>{l} ({tr(rules.classes.get(app.character.levels[l - 1].classId)?.name ?? { en: '', fr: '' })})</option>{/each}
      </select>
    </h4>
    {#if x}
      <p class="note">
        {#if x.free !== undefined}
          {x.onlyLevel
            ? tr({ en: `${x.free} 1st-level spells (3 + Int modifier); all 0-level spells are in the book.`, fr: `${x.free} sorts du niveau 1 (3 + modificateur d’Int) ; tous les sorts de niveau 0 sont dans le grimoire.` })
            : tr({ en: `${x.free} spells of levels you can cast (up to ${x.highest}).`, fr: `${x.free} sorts de niveaux que vous pouvez lancer (jusqu’au ${x.highest}).` })}
        {:else if x.newByLevel}
          {tr({ en: 'New spells known', fr: 'Nouveaux sorts connus' })} :
          {Object.entries(x.newByLevel).map(([l, n]) => `${n} × ${tr({ en: 'level', fr: 'niv.' })} ${l}`).join(', ') || '—'}
        {/if}
      </p>
      <ul class="chips">
        {#each x.learned as id (id)}
          {@const sp = rules.spells.get(id)}
          <li class="school-row school-{sp?.schoolId ?? 'none'}">
            {#if sp}<button class="link" onclick={() => onspell(sp)}>{tr(sp.name)}</button> <small>{lvlOf(id)}</small>{:else}{id}{/if}
            <button class="x" onclick={() => unlearn(id)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
          </li>
        {/each}
      </ul>
      {#if options.length}
        <select value="" onchange={(e) => learn(e.currentTarget.value)} aria-label={tr({ en: 'Learn a spell', fr: 'Apprendre un sort' })}>
          <option value="">— {tr({ en: 'learn a spell', fr: 'apprendre un sort' })} —</option>
          {#each options as g (g.level)}
            <optgroup label={`${tr({ en: 'Level', fr: 'Niveau' })} ${g.level}`}>
              {#each g.spells as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
            </optgroup>
          {/each}
        </select>
      {/if}
      {#if x.swap}
        <div class="row swap">
          <span>{tr({ en: 'Exchange a spell known', fr: 'Échanger un sort connu' })} :</span>
          <select value={entry?.spellSwap?.from ?? ''} onchange={(e) => setSwap({ from: e.currentTarget.value })}>
            <option value="">— {tr({ en: 'none', fr: 'aucun' })} —</option>
            {#each swapFrom as id (id)}<option value={id}>{tr(rules.spells.get(id)?.name)} ({lvlOf(id)})</option>{/each}
          </select>
          {#if entry?.spellSwap?.from}
            →
            <select value={entry.spellSwap.to} onchange={(e) => setSwap({ to: e.currentTarget.value })}>
              <option value="">—</option>
              {#each swapTo as sp (sp.id)}<option value={sp.id}>{tr(sp.name)}</option>{/each}
            </select>
          {/if}
        </div>
        <p class="note">
          {tr({
            en: `Same spell level, at least two levels below the highest you can cast (${x.highest}); one exchange at this level.`,
            fr: `Même niveau de sort, au moins deux niveaux sous le plus haut que vous pouvez lancer (${x.highest}) ; un seul échange à ce niveau.`,
          })}
        </p>
        {#each swapIssues as p, k (k)}<p class="warn">{tr(p)}</p>{/each}
      {/if}
      {#each problems as p, k (k)}<p class="warn">{tr({ en: p.en, fr: p.fr })}</p>{/each}
    {/if}
  {/if}
</div>

<style>
  .learning {
    border-top: 1px solid var(--rule);
    margin-top: 0.8rem;
    padding-top: 0.4rem;
  }
  h4 {
    margin: 0.6rem 0 0.3rem;
    font-family: var(--font-title);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  h4 small {
    color: var(--ink-soft);
    font-family: var(--font-body);
    font-weight: 400;
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .warn {
    color: var(--danger);
    font-size: 0.9rem;
    margin: 0.2rem 0;
  }
  .known {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
  }
  .known .short {
    color: var(--accent);
    font-weight: 600;
  }
  .booklvl {
    margin: 0.2rem 0;
    line-height: 1.7;
  }
  .chips {
    list-style: none;
    padding: 0;
    margin: 0.3rem 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chips li {
    padding: 0.15rem 0.3rem 0.15rem 0.6rem;
    border-radius: 2px;
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin: 0.4rem 0;
  }
  select {
    min-height: 2.6rem;
    max-width: 100%;
  }
  .link {
    background: none;
    border: none;
    padding: 0.2em 0;
    text-align: left;
    text-decoration: underline dotted var(--accent);
    color: inherit;
  }
  .x {
    background: none;
    border: none;
    color: var(--ink-soft);
    min-width: 2rem;
    min-height: 2rem;
  }
  button:not(.link):not(.x) {
    min-height: 2.6rem;
    padding: 0 0.8rem;
  }
</style>
