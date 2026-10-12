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
  const SAVES: { id: SaveId; label: I18n }[] = [
    { id: 'fort', label: UI.fort },
    { id: 'ref', label: UI.ref },
    { id: 'will', label: UI.will },
  ]

  const skills = $derived(s.skills.filter((k) => showAllSkills || k.ranks > 0))
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

  const unusable = (featId: string) => view.warnings.some((w) => w.id === `unusable-${featId}`)
  const featLevels = $derived(
    app.character.levels.flatMap((l, i) => l.feats.map((f) => ({ ...f, level: i + 1 }))),
  )
</script>

<div class="grid">
  <section class="box">
    <h3>{tr(UI.abilities)}</h3>
    <table class="abilities">
      <tbody>
        {#each ABILITIES as a (a)}
          <tr>
            <th>{tr(ABILITY_LABEL[a])}</th>
            <td>
              <StatValue
                stat={() => view.sheet.abilities[a].score}
                title={{ en: ABILITY_LABEL[a].en, fr: ABILITY_LABEL[a].fr }}
                signed={false}
              />
            </td>
            <td class="mod">{fmt(s.abilities[a].mod)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <WarningList areas={['abilities']} />
  </section>

  <section class="box">
    <h3>{tr(UI.hp)}</h3>
    <div class="hp">
      <span class="hp-current" class:low={hpCurrent <= s.hpMax.total / 4}>{hpCurrent}</span>
      <span>/</span>
      <StatValue stat={() => view.sheet.hpMax} title={UI.hp} signed={false} />
    </div>
    <div class="hp-buttons">
      {#each [-10, -5, -1] as d (d)}<button onclick={() => adjustHp(d)}>{d}</button>{/each}
      {#each [1, 5, 10] as d (d)}<button onclick={() => adjustHp(d)}>+{d}</button>{/each}
    </div>

    <h3>{tr(UI.ac)}</h3>
    <div class="row3">
      <label>{tr(UI.acShort)} <StatValue stat={() => view.sheet.ac} title={UI.ac} signed={false} big /></label>
      <label>{tr(UI.touch)} <StatValue stat={() => view.sheet.touchAc} title={UI.touch} signed={false} /></label>
      <label>{tr(UI.flatFooted)} <StatValue stat={() => view.sheet.flatFootedAc} title={UI.flatFooted} signed={false} /></label>
    </div>
  </section>

  <section class="box">
    <h3>{tr(UI.saves)}</h3>
    <div class="row3">
      {#each SAVES as sv (sv.id)}
        <label>{tr(sv.label)} <StatValue stat={() => view.sheet.saves[sv.id]} title={sv.label} big /></label>
      {/each}
    </div>
    <dl>
      <dt>{tr(UI.initiative)}</dt>
      <dd><StatValue stat={() => view.sheet.initiative} title={UI.initiative} /></dd>
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
      <dd>{s.maxDex.value === null ? '—' : fmt(s.maxDex.value)} <small>({tr(s.maxDex.from)})</small></dd>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
    gap: 1rem;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .box {
    border: 2px solid var(--ink);
    border-radius: 6px;
    padding: 0.5rem 0.75rem 0.75rem;
    background: var(--paper);
    min-width: 0;
  }
  h3 {
    margin: -0.5rem -0.75rem 0.5rem;
    padding: 0.2rem 0.75rem;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-title);
    font-size: 1rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  h3:not(:first-child) {
    margin-top: 0.75rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.2em 0.3em;
    border-bottom: 1px solid var(--rule);
    text-align: left;
  }
  .num {
    text-align: right;
  }
  .abilities th {
    font-family: var(--font-title);
    width: 4em;
  }
  .mod {
    font-weight: 700;
    font-size: 1.2em;
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
  .row3 {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .row3 label {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.85em;
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
