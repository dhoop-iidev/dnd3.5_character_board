<script lang="ts">
  import { rules } from '../../data/rules'
  import { ABILITIES, type AbilityId, type I18n, type SaveId } from '../../data/types'
  import { fmt } from '../../engine/compute'
  import { unmetPrereqs } from '../../engine/validate'
  import { SUBTYPES, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { fmtDistance } from '../format'
  import { openPopup } from '../popupState.svelte'
  import StatValue from '../StatValue.svelte'
  import WarningList from '../WarningList.svelte'
  import Medallion from '../Medallion.svelte'
  import CharacterViewer from '../viewer/CharacterViewer.svelte'

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
    })
  }

  // Class features gained so far (class tables, e.g. Weapon Master: ki damage, increased multiplier…).
  const features = $derived(
    Object.entries(s.classLevels).flatMap(([classId, n]) => {
      const cls = rules.classes.get(classId)
      return (cls?.table ?? [])
        .filter((r) => r.level <= n)
        .flatMap((r) => r.special.filter((f) => f.en !== 'Bonus feat').map((f) => ({ classId, level: r.level, name: f })))
    }),
  )
  function classPopup(classId: string) {
    const cls = rules.classes.get(classId)
    if (cls) openPopup({ title: cls.name, html: cls.text, source: cls.source })
  }

  const unusable = (featId: string) => view.warnings.some((w) => w.id === `unusable-${featId}`)
  const featLevels = $derived(
    app.character.levels.flatMap((l, i) => l.feats.map((f) => ({ ...f, level: i + 1 }))),
  )
</script>

<!-- Hero: abilities | 3D portrait | vital statistics (inspired by ornate character sheets) -->
<section class="hero">
  <div class="col abilities">
    {#each ABILITIES as a (a)}
      <Medallion label={tr(ABILITY_LABEL[a])} sub={fmt(s.abilities[a].mod)} size="sm">
        <StatValue stat={() => view.sheet.abilities[a].score} title={ABILITY_NAME[a]} signed={false} />
      </Medallion>
    {/each}
  </div>

  <div class="portrait">
    <CharacterViewer height="clamp(22rem, 52vw, 34rem)" />
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
    </div>
  </div>
</section>
<WarningList areas={['abilities']} />

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
          <small>{tr(UI.level)} {f.level} · {tr(UI.slot[f.slot])}</small>
          {#if unusable(f.featId)}<small class="badge">{tr(UI.unusable)}</small>{/if}
        </li>
      {/each}
    </ul>
    <WarningList areas={['feats']} />
  </section>

  <section class="box">
    <h3>{tr({ en: 'Class features', fr: 'Capacités de classe' })}</h3>
    <ul class="feats">
      {#each features as f (f.classId + f.level + f.name.en)}
        <li>
          <button class="link" onclick={() => classPopup(f.classId)}>{tr(f.name)}</button>
          <small>{tr(rules.classes.get(f.classId)?.name)} {f.level}</small>
        </li>
      {:else}
        <li><small>—</small></li>
      {/each}
    </ul>
  </section>

  <section class="box">
    <h3>{tr(UI.levels)}</h3>
    <table class="levels">
      <thead><tr><th>{tr(UI.level)}</th><th>{tr(UI.class)}</th><th>{tr(UI.feats)}</th></tr></thead>
      <tbody>
        {#each app.character.levels as l, i (i)}
          <tr>
            <td>{i + 1}</td>
            <td>{tr(rules.classes.get(l.classId)?.name)}{l.abilityIncrease ? ` (+1 ${tr(ABILITY_LABEL[l.abilityIncrease])})` : ''}</td>
            <td>{l.feats.map((f) => tr(rules.feats.get(f.featId)?.name)).join(', ')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <WarningList areas={['levels']} />
  </section>
</div>

<style>
  .hero {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }
  .abilities {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 0.7rem 0.6rem;
  }
  .pair,
  .saves {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .hp-block {
    text-align: center;
  }
  .hp-title {
    font-family: var(--font-title);
    color: var(--accent);
    font-size: 1.1rem;
  }
  /* Tablet portrait and phones: portrait on top, medallions below. */
  @media (max-width: 52rem) {
    .hero {
      grid-template-columns: 1fr 1fr;
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
    gap: 1rem;
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
    gap: 0.5rem;
    font-size: 1.4em;
  }
  .hp-current {
    font-weight: 700;
    font-size: 1.5em;
  }
  .hp-current.low {
    color: var(--danger);
  }
  .hp-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0.4rem 0;
  }
  .hp-buttons button {
    min-width: 2.75rem;
    min-height: 2.5rem;
    font: inherit;
    border: 1px solid var(--rule);
    background: var(--box);
    color: var(--ink);
    border-radius: 4px;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3rem 0.5rem;
    align-items: center;
    margin: 0.75rem 0 0;
  }
  dd {
    margin: 0;
    text-align: right;
  }
  .iter {
    margin-left: 0.3em;
    color: var(--ink-soft);
  }
  .link {
    font: inherit;
    background: none;
    border: none;
    padding: 0.25em 0;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    text-decoration: underline dotted var(--accent);
  }
  .abil {
    color: var(--ink-soft);
    margin-left: 0.3em;
  }
  .toggle {
    display: inline-flex;
    gap: 0.4em;
    align-items: center;
    margin-bottom: 0.4rem;
    min-height: 2rem;
  }
  .feats {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .feats li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em;
    align-items: baseline;
    border-bottom: 1px solid var(--rule);
  }
  .feats small {
    color: var(--ink-soft);
  }
  .unusable {
    opacity: 0.75;
  }
  .badge {
    color: var(--danger) !important;
    font-weight: 700;
  }
  small {
    font-size: 0.8em;
  }
</style>
