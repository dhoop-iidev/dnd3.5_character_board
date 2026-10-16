<script lang="ts">
  import { rules } from '../../data/rules'
  import { ABILITIES, type AbilityId, type ClassFeatureDef, type I18n, type SaveId } from '../../data/types'
  import { fmt } from '../../engine/compute'
  import { unmetPrereqs } from '../../engine/validate'
  import { SUBTYPES, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { fmtDistance } from '../format'
  import { openPopup } from '../popupState.svelte'
  import StatValue from '../StatValue.svelte'
  import WarningList from '../WarningList.svelte'
  import LevelEditor from '../LevelEditor.svelte'
  import Medallion from '../Medallion.svelte'
  import Portraits from '../Portraits.svelte'
  import IdentityCard from '../IdentityCard.svelte'

  const s = $derived(view.sheet)
  let showAllSkills = $state(false)

  const ABILITY_LABEL: Record<AbilityId, I18n> = {
    str: { en: 'STR', fr: 'FOR' },
    dex: { en: 'DEX', fr: 'DEX' },
    con: { en: 'CON', fr: 'CON' },
    int: { en: 'INT', fr: 'INT' },
    wis: { en: 'WIS', fr: 'SAG' },
    cha: { en: 'CHA', fr: 'CHA' },
  }
  const ABILITY_NAME: Record<AbilityId, I18n> = {
    str: { en: 'Strength', fr: 'Force' },
    dex: { en: 'Dexterity', fr: 'Dextérité' },
    con: { en: 'Constitution', fr: 'Constitution' },
    int: { en: 'Intelligence', fr: 'Intelligence' },
    wis: { en: 'Wisdom', fr: 'Sagesse' },
    cha: { en: 'Charisma', fr: 'Charisme' },
  }
  const SAVES: { id: SaveId; label: I18n }[] = [
    { id: 'fort', label: UI.fort },
    { id: 'ref', label: UI.ref },
    { id: 'will', label: UI.will },
  ]

  // Default view: skills with ranks + every class skill of the character's classes.
  const skills = $derived(s.skills.filter((k) => showAllSkills || k.ranks > 0 || k.classSkill))
  const hpCurrent = $derived(s.hpMax.total - app.character.hp.damage)

  function adjustHp(delta: number) {
    const hp = app.character.hp
    hp.damage = Math.max(0, hp.damage - delta)
  }

  function featPopup(featId: string, choice?: string, level?: number) {
    const def = rules.feats.get(featId)
    if (!def) return
    const owned = s.feats.filter((f) => f !== undefined)
    const unmet = unmetPrereqs(def.prereq, s, rules, owned, choice)
    const prereqText = [
      ...Object.entries(def.prereq.abilities ?? {}).map(([a, v]) => `${a.toUpperCase()} ${v}`),
      ...(def.prereq.bab ? [`BBA/BAB +${def.prereq.bab}`] : []),
      ...(def.prereq.feats ?? []).map((f) => tr(rules.feats.get(f.split(':')[0])?.name) || f),
      ...(def.prereq.fighterLevel ? [`${tr(rules.classes.get('fighter')?.name)} ${def.prereq.fighterLevel}`] : []),
    ].join(', ')
    openPopup({
      title: { en: def.name.en + (choice ? ` (${choice})` : ''), fr: def.name.fr + (choice ? ` (${choice})` : '') },
      summary: def.summary,
      lines: [
        ...(level ? [{ en: `Taken at level ${level}`, fr: `Pris au niveau ${level}` }] : []),
        ...(prereqText ? [{ en: `${UI.prerequisites.en}: ${prereqText}`, fr: `${UI.prerequisites.fr} : ${prereqText}` }] : []),
        ...(unmet.length ? [{ en: `Unmet now: ${unmet.map((u) => u.en).join(', ')}`, fr: `Non remplies : ${unmet.map((u) => u.fr).join(', ')}` }] : []),
      ],
      html: def.text,
      source: def.source,
      noteKey: `feat:${featId}`,
    })
  }

  function skillPopup(key: string) {
    const line = s.skills.find((k) => k.key === key)!
    openPopup({
      title: { en: line.def.name.en + (line.subtype ? ` (${SUBTYPES[line.subtype]?.en ?? line.subtype})` : ''), fr: line.def.name.fr + (line.subtype ? ` (${SUBTYPES[line.subtype]?.fr ?? line.subtype})` : '') },
      stat: () => view.sheet.skills.find((k) => k.key === key)!.total,
      lines: [
        ...(line.classSkill ? [UI.classSkill] : []),
        ...(line.def.trainedOnly ? [UI.trainedOnly] : []),
      ],
      html: line.def.text,
      source: line.def.source,
      noteKey: `skill:${key}`,
    })
  }

  // Class features gained so far: the class's feature list when it has one (ranger…), else its table entries
  // (Weapon Master: ki damage, increased multiplier…).
  const features = $derived(
    Object.entries(s.classLevels).flatMap(([classId, n]): { classId: string; level: number; name: I18n; feature?: ClassFeatureDef }[] => {
      const cls = rules.classes.get(classId)
      if (cls?.features?.length)
        return cls.features.filter((f) => f.level <= n).map((f) => ({ classId, level: f.level, name: f.name, feature: f }))
      return (cls?.table ?? [])
        .filter((r) => r.level <= n)
        .flatMap((r) => r.special.filter((f) => f.en !== 'Bonus feat').map((f) => ({ classId, level: r.level, name: f, feature: undefined })))
    }),
  )
  function classPopup(classId: string, feature?: ClassFeatureDef) {
    const cls = rules.classes.get(classId)
    if (feature)
      openPopup({
        title: feature.name,
        html: feature.text,
        source: feature.source,
        noteKey: `feature:${feature.id}`,
        lines: feature.computed ? [] : [{ en: 'Described only: not computed by the app.', fr: 'Décrite seulement : non calculée par l’application.' }],
      })
    else if (cls) openPopup({ title: cls.name, html: cls.text, source: cls.source, noteKey: `class:${classId}` })
  }

  // One-line summary of a class feature (src/data/custom/summaries.json).
  const featureSummary = (f: { classId: string; name: I18n; feature?: ClassFeatureDef }) =>
    rules.summaries.get(f.feature ? `class:${f.classId}:${f.feature.id}` : `classSpecial:${f.classId}:${f.name.en}`)
  const unusable = (featId: string) => view.warnings.some((w) => w.id === `unusable-${featId}`)
  const featLevels = $derived([
    ...app.character.levels.flatMap((l, i) => l.feats.map((f) => ({ ...f, level: i + 1 }))),
    // Feats given by class features (ranger Track, Endurance, combat style…).
    ...s.feats.filter((f) => f.slot === 'granted').map((f) => ({ ...f, level: 0 })),
  ])
</script>

<!-- Hero: abilities | portrait | vital statistics (inspired by ornate character sheets) -->
<section class="hero">
  <div class="col abilities">
    {#each ABILITIES as a (a)}
      <Medallion label={tr(ABILITY_LABEL[a])} sub={fmt(s.abilities[a].mod)} size="sm">
        <StatValue stat={() => view.sheet.abilities[a].score} title={ABILITY_NAME[a]} signed={false} />
      </Medallion>
    {/each}
  </div>

  <div class="portrait">
    <Portraits />
  </div>

  <div class="col vitals">
    <Medallion label={tr(UI.acShort)} size="lg">
      <StatValue stat={() => view.sheet.ac} title={UI.ac} signed={false} />
    </Medallion>
    <div class="pair">
      <Medallion label={tr(UI.touch)} size="sm">
        <StatValue stat={() => view.sheet.touchAc} title={UI.touch} signed={false} />
      </Medallion>
      <Medallion label={tr({ en: 'Flat', fr: 'Dépourvu' })} size="sm">
        <StatValue stat={() => view.sheet.flatFootedAc} title={UI.flatFooted} signed={false} />
      </Medallion>
    </div>
    <Medallion label={tr(UI.initiative)} size="sm">
      <StatValue stat={() => view.sheet.initiative} title={UI.initiative} />
    </Medallion>
    <div class="hp-block">
      <div class="hp-title">{tr(UI.hp)}</div>
      <div class="hp">
        <span class="hp-current" class:low={hpCurrent <= s.hpMax.total / 4}>{hpCurrent}</span>
        <span>/</span>
        <StatValue stat={() => view.sheet.hpMax} title={UI.hp} signed={false} />
      </div>
      <div class="hp-buttons">
        {#each [-10, -5, -1] as d (d)}<button onclick={() => adjustHp(d)}>{d}</button>{/each}
        {#each [1, 5, 10] as d (d)}<button onclick={() => adjustHp(d)}>+{d}</button>{/each}
      </div>
      <div class="hp-extra">
        <label>
          {tr({ en: 'Nonlethal', fr: 'Non létaux' })}
          <input type="number" min="0" bind:value={app.character.hp.nonlethal} />
        </label>
        <label>
          {tr({ en: 'Temporary HP', fr: 'PV temporaires' })}
          <input type="number" min="0" bind:value={app.character.hp.temp} />
        </label>
      </div>
      {#if app.character.hp.nonlethal > 0 && app.character.hp.nonlethal >= hpCurrent}
        <p class="hp-state">
          {app.character.hp.nonlethal === hpCurrent
            ? tr({ en: 'Staggered (nonlethal = current HP)', fr: 'Chancelant (non létaux = PV actuels)' })
            : tr({ en: 'Unconscious (nonlethal > current HP)', fr: 'Inconscient (non létaux > PV actuels)' })}
        </p>
      {/if}
    </div>
  </div>
</section>
<WarningList areas={['abilities']} />

<IdentityCard />

<div class="grid">
  <section class="box">
    <h3>{tr(UI.saves)}</h3>
    <div class="saves">
      {#each SAVES as sv (sv.id)}
        <Medallion label={tr(sv.label)} size="sm">
          <StatValue stat={() => view.sheet.saves[sv.id]} title={sv.label} />
        </Medallion>
      {/each}
    </div>
  </section>

  <section class="box">
    <h3>{tr({ en: 'Combat', fr: 'Combat' })}</h3>
    <dl>
      <dt>{tr(UI.bab)}</dt>
      <dd>
        <StatValue stat={() => view.sheet.bab} title={UI.bab} />
        <span class="iter">{s.iterativeBab.map(fmt).join(' / ')}</span>
      </dd>
      <dt>{tr(UI.grapple)}</dt>
      <dd><StatValue stat={() => view.sheet.grapple} title={UI.grapple} /></dd>
      <dt>{tr(UI.speed)}</dt>
      <dd>{fmtDistance(s.speed.current, lang())} <small>({tr(s.speed.from)})</small></dd>
      <dt>{tr(UI.aoo)}</dt>
      <dd><StatValue stat={() => view.sheet.attacksOfOpportunity} title={UI.aoo} signed={false} /></dd>
      <dt>{tr(UI.armorPenalty)}</dt>
      <dd><StatValue stat={() => view.sheet.armorCheckPenalty} title={UI.armorPenalty} /></dd>
      <dt>{tr(UI.maxDex)}</dt>
      <dd>{s.maxDex.value === null ? '—' : fmt(s.maxDex.value)} <small>({tr(s.maxDex.from)} · {tr({ en: 'AC only', fr: 'CA uniquement' })})</small></dd>
    </dl>
  </section>

  <section class="box wide">
    <h3>{tr(UI.skills)}</h3>
    <label class="toggle"><input type="checkbox" bind:checked={showAllSkills} /> {tr(UI.showAllSkills)}</label>
    <table class="skills">
      <thead>
        <tr><th>{tr(UI.skill)}</th><th></th><th class="num">{tr(UI.ranks)}</th><th class="num">{tr(UI.total)}</th></tr>
      </thead>
      <tbody>
        {#each skills as k (k.key)}
          <tr class:unusable={!k.usable}>
            <td>
              <button class="link" onclick={() => skillPopup(k.key)}>
                {tr(k.def.name)}{k.subtype ? ` (${tr(SUBTYPES[k.subtype]) || k.subtype})` : ''}
              </button>
              <small class="abil">{tr(ABILITY_LABEL[k.def.ability])}</small>
            </td>
            <td title={tr(UI.classSkill)}>{k.classSkill ? '●' : ''}</td>
            <td class="num">{k.ranks || ''}</td>
            <td class="num">
              {#if k.usable}
                <StatValue stat={() => view.sheet.skills.find((x) => x.key === k.key)!.total} title={k.def.name} />
              {:else}
                <small>{tr(UI.untrained)}</small>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <WarningList areas={['skills']} />
  </section>

  <section class="box">
    <h3>{tr(UI.feats)}</h3>
    <ul class="feats">
      {#each featLevels as f (f.featId + f.level)}
        <li class:unusable={unusable(f.featId)}>
          <button class="link" onclick={() => featPopup(f.featId, f.choice, f.level)}>
            {tr(rules.feats.get(f.featId)?.name) || f.featId}{f.choice ? ` (${f.choice})` : ''}
          </button>
          <small>{f.level ? `${tr(UI.level)} ${f.level} · ` : ''}{tr(UI.slot[f.slot])}</small>
          {#if unusable(f.featId)}<small class="badge">{tr(UI.unusable)}</small>{/if}
          {#if rules.feats.get(f.featId)?.summary}<span class="sum">{tr(rules.feats.get(f.featId)!.summary)}</span>{/if}
        </li>
      {/each}
    </ul>
    <WarningList areas={['feats']} />
  </section>

  <section class="box">
    <h3>{tr({ en: 'Racial traits', fr: 'Traits raciaux' })} — {tr(s.race.name)}</h3>
    <ul class="feats">
      {#each s.race.traits as t (t.name.en)}
        <li>
          <button class="link" onclick={() => openPopup({ title: t.name, summary: s.race.name, lines: [t.text], source: s.race.source, noteKey: `race:${s.race.id}:${t.name.en}` })}
            >{tr(t.name)}</button
          >
          {#if rules.summaries.get(`race:${s.race.id}:${t.name.en}`)}<span class="sum">{tr(rules.summaries.get(`race:${s.race.id}:${t.name.en}`))}</span>{/if}
        </li>
      {:else}
        <li><small>{tr({ en: 'Bonus feat and skill points (human).', fr: 'Don et points de compétence en bonus (humain).' })}</small></li>
      {/each}
    </ul>
  </section>

  <section class="box">
    <h3>{tr({ en: 'Class features', fr: 'Capacités de classe' })}</h3>
    <ul class="feats">
      {#each features as f (f.classId + f.level + f.name.en)}
        <li>
          <button class="link" onclick={() => classPopup(f.classId, f.feature)}>{tr(f.name)}</button>
          <small>{tr(rules.classes.get(f.classId)?.name)} {f.level}</small>
          {#if featureSummary(f)}<span class="sum">{tr(featureSummary(f))}</span>{/if}
        </li>
      {:else}
        <li><small>—</small></li>
      {/each}
    </ul>
    {#if s.favoredEnemies.length}
      <p class="extra">
        <strong>{tr({ en: 'Favored enemies', fr: 'Ennemis jurés' })} :</strong>
        {s.favoredEnemies.map((fe) => `${tr(fe.name)} +${fe.bonus}`).join(', ')}
      </p>
    {/if}
    {#if s.combatStyle}
      <p class="extra" class:off={!s.combatStyle.active}>
        <strong>{tr({ en: 'Combat style', fr: 'Style de combat' })} :</strong>
        {tr(s.combatStyle.name)}{s.combatStyle.active ? '' : tr({ en: ' (inactive: medium or heavy armor)', fr: ' (inactif : armure intermédiaire ou lourde)' })}
      </p>
    {/if}
    {#each s.featureStats as fs (fs.id)}
      <p class="extra"><strong>{tr(fs.name)} :</strong> d20 <StatValue stat={() => view.sheet.featureStats.find((x) => x.id === fs.id)!.stat} title={fs.name} /></p>
    {/each}
  </section>

  <div class="wide"><LevelEditor /></div>
</div>

<style>
  .hero {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 1.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }
  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .abilities {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 1rem 0.9rem;
  }
  .pair,
  .saves {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .saves {
    padding: 0.25rem 0 0.25rem;
  }
  .hp-block {
    text-align: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--rule);
  }
  .hp-title {
    font-family: var(--font-title);
    font-size: 1rem;
    letter-spacing: 0.06em;
    color: var(--ink);
  }
  /* Tablet portrait and phones: portrait on top, medallions below. */
  @media (max-width: 52rem) {
    .hero {
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem 1rem;
      align-items: start;
    }
    .portrait {
      grid-column: 1 / -1;
      order: -1;
    }
    .abilities {
      grid-template-columns: repeat(3, auto);
      justify-content: center;
    }
  }
  @media (max-width: 30rem) {
    .hero {
      grid-template-columns: 1fr;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
    grid-auto-flow: row dense;
    align-items: start;
    gap: 1.25rem;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .num {
    text-align: right;
  }
  .hp {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: var(--font-num);
    font-size: 1.3em;
    color: var(--ink-soft);
  }
  .hp-current {
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 1.6em;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .hp-current.low {
    color: var(--danger);
  }
  .hp-buttons {
    display: grid;
    grid-template-columns: repeat(3, 2.9rem);
    gap: 0.3rem;
    justify-content: center;
    margin: 0.5rem 0;
  }
  .hp-buttons button {
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
  .hp-buttons button:hover {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: stretch;
    margin: 0;
  }
  dt,
  dd {
    min-height: 3.1rem;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--rule);
  }
  dt:last-of-type,
  dd:last-of-type {
    border-bottom: none;
  }
  dd {
    margin: 0;
    justify-content: flex-end;
    gap: 0.4rem;
    flex-wrap: wrap;
    text-align: right;
  }
  dd small {
    color: var(--ink-soft);
  }
  .iter {
    color: var(--ink-soft);
    font-family: var(--font-num);
    font-size: 0.85em;
  }
  .link {
    font: inherit;
    background: none;
    border: none;
    padding: 0.25em 0;
    min-height: 2.75rem;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--rule-strong);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.22em;
  }
  .link:hover {
    color: var(--accent);
    text-decoration-color: currentColor;
  }
  .abil {
    color: var(--ink-soft);
    margin-left: 0.4em;
    font-family: var(--font-title);
    letter-spacing: 0.04em;
  }
  .skills td:nth-child(2) {
    width: 2rem;
    text-align: center;
    font-size: 0.6em;
    color: var(--ink);
  }
  .skills td {
    padding-block: 0.15em;
  }
  .toggle {
    display: inline-flex;
    gap: 0.5em;
    align-items: center;
    margin-bottom: 0.4rem;
    min-height: 2.75rem;
    cursor: pointer;
  }
  .toggle input {
    width: 1.15rem;
    height: 1.15rem;
    accent-color: var(--ink);
  }
  .extra {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
  }
  .extra.off {
    color: var(--ink-soft);
  }
  .feats {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .feats li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2em 0.6em;
    align-items: baseline;
    border-bottom: 1px solid var(--rule);
  }
  .feats li:last-child {
    border-bottom: none;
  }
  .feats small {
    color: var(--ink-soft);
  }
  .feats .sum {
    flex-basis: 100%;
    color: var(--ink-soft);
    font-size: 0.88em;
    line-height: 1.3;
    padding-bottom: 0.2em;
    /* Two lines at most; the popup has the full text. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .unusable {
    opacity: 0.7;
  }
  .badge {
    color: var(--danger) !important;
    font-family: var(--font-title);
    letter-spacing: 0.04em;
  }
  small {
    font-size: 0.82em;
  }
  .hp-extra {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
    margin-top: 0.4rem;
  }
  .hp-extra label {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  .hp-extra input {
    width: 5rem;
    font: inherit;
    font-size: 1rem;
    min-height: 2.4rem;
    text-align: center;
    color: var(--ink);
    background: var(--box);
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
  }
  .hp-state {
    margin: 0.3rem 0 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
  :global(.identity) {
    margin: 1rem 0;
  }
</style>
