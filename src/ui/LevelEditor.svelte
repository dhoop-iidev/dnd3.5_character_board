<script lang="ts">
  // Progression: XP, level-up (choice of class), and per-level choices (skill ranks, feats, ability increase).
  // Never blocks: illegal choices stay possible and show up as rule warnings (CLAUDE.md).
  import { rules } from '../data/rules'
  import { ABILITIES, type AbilityId, type I18n } from '../data/types'
  import type { FeatPick, FeatSlot } from '../model/character'
  import {
    classOptions,
    featOptions,
    featSlotsAt,
    isAbilityIncreaseLevel,
    levelForXp,
    ranksAt,
    skillBudget,
    xpForLevel,
  } from '../engine/progression'
  import { choicesAt } from '../engine/classChoices'
  import { SUBTYPES, UI } from '../i18n/ui'
  import { app, lang, tr } from '../state.svelte'
  import WarningList from './WarningList.svelte'

  const ABBR: Record<AbilityId, I18n> = {
    str: { en: 'STR', fr: 'FOR' },
    dex: { en: 'DEX', fr: 'DEX' },
    con: { en: 'CON', fr: 'CON' },
    int: { en: 'INT', fr: 'INT' },
    wis: { en: 'WIS', fr: 'SAG' },
    cha: { en: 'CHA', fr: 'CHA' },
  }
  const SLOT_ORDER: FeatSlot[] = ['race', 'general', 'class', 'deity']

  const c = $derived(app.character)
  const level = $derived(c.levels.length)
  const xpLevel = $derived(levelForXp(c.xp))
  const pending = $derived(Math.max(0, xpLevel - level))
  const nextAt = $derived(xpForLevel(level + 1))
  const fmtN = (n: number) => n.toLocaleString(lang() === 'fr' ? 'fr-FR' : 'en-US')

  let open = $state<number | null>(null)
  let showAllSkills = $state(false)

  // ---- level up / down
  function addLevel(classId: string) {
    app.character.levels.push({ classId, skillRanks: {}, feats: [] })
    open = app.character.levels.length
  }
  function removeLastLevel() {
    const msg = tr({ en: `Remove level ${level} and its choices?`, fr: `Retirer le niveau ${level} et ses choix ?` })
    if (level > 1 && confirm(msg)) {
      app.character.levels.pop()
      if (open && open > app.character.levels.length) open = null
    }
  }
  function setBase(a: AbilityId, delta: number) {
    app.character.baseAbilities[a] = Math.max(1, app.character.baseAbilities[a] + delta)
  }

  // ---- skills of one level
  function skillRows(L: number) {
    const entry = c.levels[L - 1]
    const cls = rules.classes.get(entry.classId)
    const keys = new Set<string>()
    for (const k of Object.keys(entry.skillRanks)) keys.add(k)
    for (const l of c.levels.slice(0, L)) for (const k of Object.keys(l.skillRanks)) keys.add(k)
    for (const s of rules.skills.values())
      if (!s.hasSubtypes && (showAllSkills || cls?.classSkills.includes(s.id))) keys.add(s.id)
    return [...keys]
      .map((key) => {
        const [id, sub] = key.split(':')
        const def = rules.skills.get(id)
        return def ? { key, id, def, sub } : null
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => tr(a.def.name).localeCompare(tr(b.def.name)))
  }
  function changeRanks(L: number, key: string, dir: 1 | -1) {
    const budget = skillBudget(c, rules, L)
    const id = key.split(':')[0]
    // One skill point buys 1 rank in a class skill, ½ rank in a cross-class skill.
    const step = budget.costPerRank(id) === 1 ? 1 : 0.5
    const ranks = app.character.levels[L - 1].skillRanks
    const next = Math.max(0, (ranks[key] ?? 0) + dir * step)
    if (next === 0) delete ranks[key]
    else ranks[key] = next
  }

  // ---- feats of one level
  function slotPicks(L: number, slot: FeatSlot): (FeatPick | undefined)[] {
    const picks = c.levels[L - 1].feats.filter((f) => f.slot === slot)
    const expected = slot === 'deity' || slot === 'granted' ? picks.length : featSlotsAt(c, rules, L)[slot]
    return Array.from({ length: Math.max(expected, picks.length) }, (_, i) => picks[i])
  }
  function setFeat(L: number, slot: FeatSlot, current: FeatPick | undefined, featId: string) {
    const feats = app.character.levels[L - 1].feats
    if (current) {
      const idx = feats.indexOf(current)
      const target = feats[idx]
      if (!featId) feats.splice(idx, 1)
      else if (target.featId !== featId) {
        target.featId = featId
        delete target.choice
      }
    } else if (featId) feats.push({ featId, slot })
  }
  const weaponChoices = [...rules.weapons.values()].sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  const skillChoices = [...rules.skills.values()].sort((a, b) => tr(a.name).localeCompare(tr(b.name)))

  const SLOT_LABEL: Record<FeatSlot, I18n> = UI.slot
</script>

<section class="box wide progression">
  <h3>{tr({ en: 'Progression', fr: 'Progression' })}</h3>

  <div class="top">
    <label class="xp">
      <span>{tr({ en: 'Experience points', fr: "Points d'expérience" })}</span>
      <input type="number" min="0" step="100" bind:value={app.character.xp} />
    </label>
    <p class="next">
      {tr(UI.level)} {level}
      · {tr({ en: 'next level at', fr: 'niveau suivant à' })} <strong>{fmtN(nextAt)}</strong> XP
      {#if c.xp < xpForLevel(level)}
        <br /><em>{tr({ en: `XP below level ${level} (${fmtN(xpForLevel(level))}).`, fr: `XP inférieurs au niveau ${level} (${fmtN(xpForLevel(level))}).` })}</em>
      {/if}
    </p>
    {#if level > 1}
      <button class="ghost" onclick={removeLastLevel}>− {tr({ en: 'Remove last level', fr: 'Retirer le dernier niveau' })}</button>
    {/if}
  </div>

  {#if pending}
    <div class="levelup" role="status">
      <strong>
        {tr({
          en: `Level ${level + 1} available${pending > 1 ? ` (+${pending - 1} more)` : ''}! Choose the class:`,
          fr: `Niveau ${level + 1} disponible${pending > 1 ? ` (+${pending - 1} ensuite)` : ''} ! Choisir la classe :`,
        })}
      </strong>
      <div class="classes">
        {#each classOptions(c, rules) as opt (opt.id)}
          <button onclick={() => addLevel(opt.id)} title={opt.unmet.length ? opt.unmet.join(', ') : ''}>
            {tr(rules.classes.get(opt.id)?.name)}
            {#if opt.unmet.length}<small>⚠ {tr({ en: 'requirements not met', fr: 'conditions non remplies' })}</small>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="base">
    <span class="label">{tr({ en: 'Base scores (before level increases)', fr: 'Valeurs de base (avant augmentations)' })}</span>
    <div class="abilities">
      {#each ABILITIES as a (a)}
        <div class="stepper">
          <span>{tr(ABBR[a])}</span>
          <button onclick={() => setBase(a, -1)} aria-label="−1">−</button>
          <strong>{c.baseAbilities[a]}</strong>
          <button onclick={() => setBase(a, 1)} aria-label="+1">+</button>
        </div>
      {/each}
    </div>
  </div>

  <ol class="levels">
    {#each c.levels as entry, i (i)}
      {@const L = i + 1}
      {@const budget = skillBudget(c, rules, L)}
      {@const slots = featSlotsAt(c, rules, L)}
      {@const missingFeats = slots.general + slots.race + slots.class - entry.feats.filter((f) => f.slot !== 'deity').length}
      <li class:open={open === L}>
        <button class="row" onclick={() => (open = open === L ? null : L)} aria-expanded={open === L}>
          <span class="lvl">{L}</span>
          <span class="cls">{tr(rules.classes.get(entry.classId)?.name)}{entry.abilityIncrease ? ` · +1 ${tr(ABBR[entry.abilityIncrease])}` : ''}</span>
          <span class="feats">{entry.feats.map((f) => tr(rules.feats.get(f.featId)?.name)).join(', ')}</span>
          <span class="status">
            {#if budget.spent !== budget.available}<span class="todo">{budget.available - budget.spent} pts</span>{/if}
            {#if missingFeats > 0}<span class="todo">{tr({ en: 'feat', fr: 'don' })}</span>{/if}
            {#if choicesAt(c, rules, L).some((ch) => !entry.classChoices?.[ch.key])}<span class="todo">{tr({ en: 'choice', fr: 'choix' })}</span>{/if}
            {#if (isAbilityIncreaseLevel(L) && !entry.abilityIncrease)}<span class="todo">+1</span>{/if}
            {#if budget.spent === budget.available && missingFeats <= 0 && (!isAbilityIncreaseLevel(L) || entry.abilityIncrease)}✓{/if}
          </span>
        </button>

        {#if open === L}
          <div class="editor">
            <div class="fields">
              <label>
                {tr(UI.class)}
                <select bind:value={app.character.levels[i].classId}>
                  {#each [...rules.classes.values()] as cls (cls.id)}<option value={cls.id}>{tr(cls.name)}</option>{/each}
                </select>
              </label>
              {#if isAbilityIncreaseLevel(L) || entry.abilityIncrease}
                <label>
                  {tr({ en: 'Ability increase', fr: 'Augmentation de caractéristique' })}
                  <select
                    value={entry.abilityIncrease ?? ''}
                    onchange={(e) => {
                      const v = e.currentTarget.value as AbilityId | ''
                      if (v) app.character.levels[i].abilityIncrease = v
                      else delete app.character.levels[i].abilityIncrease
                    }}
                  >
                    <option value="">—</option>
                    {#each ABILITIES as a (a)}<option value={a}>+1 {tr(ABBR[a])}</option>{/each}
                  </select>
                </label>
              {/if}
            </div>

            <h4>{tr(UI.feats)}</h4>
            {#each SLOT_ORDER as slot (slot)}
              {#each slotPicks(L, slot) as pick, j (slot + j)}
                {@const options = featOptions(c, rules, L, slot, pick)}
                {@const def = pick && rules.feats.get(pick.featId)}
                <div class="feat">
                  <span class="slot">{tr(SLOT_LABEL[slot])}</span>
                  <select value={pick?.featId ?? ''} onchange={(e) => setFeat(L, slot, pick, e.currentTarget.value)}>
                    <option value="">— {tr({ en: 'choose', fr: 'choisir' })} —</option>
                    {#each options.filter((o) => !o.unmet.length || o.def.id === pick?.featId) as o (o.def.id)}
                      <option value={o.def.id}>{tr(o.def.name)}{o.unmet.length ? ' ⚠' : ''}</option>
                    {/each}
                    <optgroup label={tr({ en: 'Prerequisites not met', fr: 'Conditions non remplies' })}>
                      {#each options.filter((o) => o.unmet.length && o.def.id !== pick?.featId) as o (o.def.id)}
                        <option value={o.def.id}>{tr(o.def.name)} ({o.unmet.join(', ')})</option>
                      {/each}
                    </optgroup>
                  </select>
                  {#if pick && def?.choice === 'weapon'}
                    <select bind:value={pick.choice}>
                      <option value={undefined}>— {tr({ en: 'weapon', fr: 'arme' })} —</option>
                      {#each weaponChoices as wpn (wpn.id)}<option value={wpn.id}>{tr(wpn.name)}</option>{/each}
                    </select>
                  {:else if pick && def?.choice === 'skill'}
                    <select bind:value={pick.choice}>
                      <option value={undefined}>— {tr(UI.skill)} —</option>
                      {#each skillChoices as sk (sk.id)}<option value={sk.id}>{tr(sk.name)}</option>{/each}
                    </select>
                  {/if}
                </div>
              {/each}
            {/each}

            {#each choicesAt(c, rules, L) as ch (ch.key)}
              <div class="feat">
                <span class="slot">{tr({ en: 'class feature', fr: 'aptitude de classe' })}</span>
                <label class="choice">
                  {tr(ch.label)}
                  <select
                    value={entry.classChoices?.[ch.key] ?? ''}
                    onchange={(e) => {
                      const v = e.currentTarget.value
                      const lvl = app.character.levels[i]
                      lvl.classChoices ??= {}
                      if (v) lvl.classChoices[ch.key] = v
                      else delete lvl.classChoices[ch.key]
                    }}
                  >
                    <option value="">— {tr({ en: 'choose', fr: 'choisir' })} —</option>
                    {#each ch.options as o (o.id)}<option value={o.id}>{tr(o.name)}</option>{/each}
                  </select>
                </label>
                <a href={ch.srdUrl} target="_blank" rel="noopener">d20srd</a>
              </div>
            {/each}

            <h4>
              {tr(UI.skills)} —
              <span class:over={budget.spent > budget.available}>
                {budget.spent} / {budget.available} {tr({ en: 'points', fr: 'points' })}
              </span>
            </h4>
            <label class="toggle"><input type="checkbox" bind:checked={showAllSkills} /> {tr(UI.showAllSkills)}</label>
            <table class="skills">
              <thead>
                <tr>
                  <th>{tr(UI.skill)}</th>
                  <th class="num">{tr({ en: 'Cost', fr: 'Coût' })}</th>
                  <th class="num">{tr({ en: 'Total / max', fr: 'Total / max' })}</th>
                  <th class="num">{tr({ en: 'This level', fr: 'Ce niveau' })}</th>
                </tr>
              </thead>
              <tbody>
                {#each skillRows(L) as row (row.key)}
                  {@const here = entry.skillRanks[row.key] ?? 0}
                  {@const total = ranksAt(c, row.key, L)}
                  {@const max = budget.maxRanks(row.id)}
                  {@const cost = budget.costPerRank(row.id)}
                  <tr>
                    <td>{tr(row.def.name)}{row.sub ? ` (${tr(SUBTYPES[row.sub]) || row.sub})` : ''}</td>
                    <td class="num">{cost === 1 ? '1' : '2'}</td>
                    <td class="num" class:over={total > max}>{total} / {max}</td>
                    <td class="num stepcell">
                      <button onclick={() => changeRanks(L, row.key, -1)} disabled={here <= 0} aria-label="−">−</button>
                      <strong>{here || '·'}</strong>
                      <button
                        onclick={() => changeRanks(L, row.key, 1)}
                        disabled={budget.spent + 1 > budget.available || total + (cost === 1 ? 1 : 0.5) > max}
                        aria-label="+">+</button
                      >
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </li>
    {/each}
  </ol>
  <WarningList areas={['levels']} />
</section>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.2rem;
    align-items: flex-end;
  }
  .xp {
    display: flex;
    flex-direction: column;
    font-size: 0.85em;
  }
  .xp input {
    font: inherit;
    font-size: 1.15rem;
    width: 9rem;
    min-height: 2.6rem;
    padding: 0 0.5rem;
  }
  .next {
    margin: 0;
    flex: 1;
  }
  .levelup {
    margin: 0.8rem 0;
    padding: 0.6rem 0.8rem;
    border: 2px solid var(--accent);
    border-radius: 4px;
  }
  .classes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
  .classes button {
    min-height: 2.8rem;
    padding: 0.2rem 1rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .classes small {
    display: block;
    font-weight: 400;
    font-size: 0.75rem;
  }
  .base {
    margin: 0.8rem 0;
  }
  .label {
    font-size: 0.85em;
  }
  .abilities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.9rem;
    margin-top: 0.3rem;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .stepper span {
    width: 2.5em;
    font-size: 0.85em;
  }
  .stepper strong {
    min-width: 1.6em;
    text-align: center;
  }
  .stepper button,
  .stepcell button,
  .ghost {
    min-width: 2.4rem;
    min-height: 2.4rem;
    font: inherit;
    cursor: pointer;
  }
  .ghost {
    padding: 0 0.8rem;
  }
  .levels {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 2.2rem minmax(7rem, auto) 1fr auto;
    gap: 0.6rem;
    align-items: center;
    width: 100%;
    min-height: 2.8rem;
    padding: 0.2rem 0.3rem;
    font: inherit;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
  }
  .lvl {
    font-weight: 700;
    text-align: center;
  }
  .feats {
    font-size: 0.9em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    display: flex;
    gap: 0.3rem;
    white-space: nowrap;
  }
  .todo {
    font-size: 0.8em;
    padding: 0 0.4em;
    border: 1px solid var(--accent);
    color: var(--accent);
    border-radius: 3px;
  }
  .editor {
    padding: 0.4rem 0.4rem 0.8rem 2.8rem;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.2rem;
  }
  .fields label {
    display: flex;
    flex-direction: column;
    font-size: 0.85em;
  }
  select {
    font: inherit;
    min-height: 2.5rem;
    max-width: 100%;
  }
  h4 {
    margin: 0.9rem 0 0.3rem;
    font-weight: 600;
  }
  .feat {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.3rem;
  }
  .choice {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .feat .slot {
    width: 9rem;
    font-size: 0.85em;
  }
  .over {
    color: var(--danger);
    font-weight: 700;
  }
  .toggle {
    display: inline-flex;
    gap: 0.4em;
    align-items: center;
    min-height: 2rem;
  }
  .num {
    text-align: right;
  }
  .stepcell {
    white-space: nowrap;
  }
  .stepcell strong {
    display: inline-block;
    min-width: 1.6em;
    text-align: center;
  }
  @media (max-width: 40rem) {
    .row {
      grid-template-columns: 2rem 1fr auto;
    }
    .feats {
      display: none;
    }
    .editor {
      padding-left: 0.4rem;
    }
  }
</style>
