<script lang="ts">
  import { rules } from '../../data/rules'
  import type { BonusType, I18n } from '../../data/types'
  import { fmt } from '../../engine/compute'
  import { FLAGS, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { fmtDistance } from '../format'
  import { itemInfo, newUid } from '../items'
  import { openPopup } from '../popupState.svelte'
  import StatValue from '../StatValue.svelte'
  import WarningList from '../WarningList.svelte'

  const s = $derived(view.sheet)
  const c = $derived(app.character)
  const t = $derived(app.character.toggles)
  const loadout = $derived(c.loadouts.find((l) => l.id === c.activeLoadout) ?? c.loadouts[0])
  const hasFeat = (id: string) => s.feats.some((f) => f.featId === id)
  const maxPa = $derived(s.bab.total)
  const maxCe = $derived(Math.min(5, s.bab.total))

  const crit = (range: number, mult: number) => `${range < 20 ? `${range}–20` : '20'}/×${mult}`

  // ---- Weapon Master daily uses (Sword and Fist p.39)
  const used = (id: string) => c.dailyUsesSpent[id] ?? 0
  function spend(id: string, delta: number, max: number) {
    app.character.dailyUsesSpent[id] = Math.min(max, Math.max(0, used(id) + delta))
  }
  function newDay() {
    app.character.dailyUsesSpent = {}
  }

  // ---- loadout editing
  const weapons = $derived(c.inventory.filter((i) => i.kind === 'weapon' && i.location !== 'stored'))
  const shields = $derived(
    c.inventory.filter((i) => i.kind === 'armor' && ['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? '')),
  )
  function toggleWeapon(uid: string) {
    const l = app.character.loadouts.find((x) => x.id === loadout.id)!
    l.weapons = l.weapons.includes(uid) ? l.weapons.filter((w) => w !== uid) : [...l.weapons, uid]
  }

  // ---- effects
  const conditions = [...rules.conditions.values()].sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  let conditionToAdd = $state('')
  function addCondition() {
    if (!conditionToAdd) return
    app.character.activeEffects.push({ uid: newUid(), kind: 'condition', refId: conditionToAdd, enabled: true })
    conditionToAdd = ''
  }
  function effectName(e: (typeof c.activeEffects)[number]): I18n {
    if (e.kind === 'condition') return rules.conditions.get(e.refId ?? '')?.name ?? { en: '?', fr: '?' }
    if (e.kind === 'magic') return rules.magicItems.get(e.refId ?? '')?.name ?? { en: '?', fr: '?' }
    return e.custom?.name ?? { en: '?', fr: '?' }
  }
  function effectPopup(e: (typeof c.activeEffects)[number]) {
    if (e.kind === 'condition') {
      const d = rules.conditions.get(e.refId ?? '')
      if (d) openPopup({ title: d.name, summary: d.summary, html: d.text, source: d.source })
    } else if (e.kind === 'magic') {
      const d = rules.magicItems.get(e.refId ?? '')
      if (d) openPopup({ title: d.name, summary: d.duration, html: d.text, source: d.source })
    }
  }
  function removeEffect(uid: string) {
    app.character.activeEffects = app.character.activeEffects.filter((e) => e.uid !== uid)
  }

  // Custom effect (e.g. poison: −2 Con damage; a bard's song: +1 morale on attacks)
  const TARGETS: { id: string; label: I18n }[] = [
    { id: 'attack.all', label: { en: 'Attack rolls', fr: "Jets d'attaque" } },
    { id: 'damage.all', label: { en: 'Damage', fr: 'Dégâts' } },
    { id: 'ac', label: { en: 'AC', fr: 'CA' } },
    { id: 'save.all', label: { en: 'All saves', fr: 'Tous les jets de sauvegarde' } },
    { id: 'skill.all', label: { en: 'All skills', fr: 'Toutes les compétences' } },
    { id: 'initiative', label: { en: 'Initiative', fr: 'Initiative' } },
    ...(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).flatMap((a) => [
      { id: `ability.${a}`, label: { en: `${a.toUpperCase()} (bonus/penalty)`, fr: `${a.toUpperCase()} (bonus/malus)` } },
      { id: `abilityDamage.${a}`, label: { en: `${a.toUpperCase()} damage`, fr: `Affaiblissement ${a.toUpperCase()}` } },
    ]),
    { id: 'hp.max', label: { en: 'Max HP', fr: 'PV max' } },
    { id: 'speed', label: { en: 'Speed (ft)', fr: 'Vitesse (pieds)' } },
  ]
  const TYPES: BonusType[] = ['untyped', 'enhancement', 'morale', 'luck', 'competence', 'insight', 'sacred', 'profane', 'resistance', 'deflection', 'dodge', 'circumstance', 'alchemical']
  let custom = $state({ name: '', target: 'attack.all', bonusType: 'untyped' as BonusType, value: 1 })
  function addCustom() {
    if (!custom.name.trim()) return
    app.character.activeEffects.push({
      uid: newUid(),
      kind: 'custom',
      enabled: true,
      custom: {
        name: { en: custom.name, fr: custom.name },
        modifiers: [{ target: custom.target, bonusType: custom.bonusType, value: Number(custom.value) }],
      },
    })
    custom = { name: '', target: 'attack.all', bonusType: 'untyped', value: 1 }
  }
</script>

<div class="grid">
  <section class="box">
    <h3>{tr({ en: 'Combat options', fr: 'Options de combat' })}</h3>
    {#if hasFeat('power-attack')}
      <label class="slider">
        <span>{tr({ en: 'Power Attack', fr: 'Attaque en puissance' })} : <strong>{t.powerAttack}</strong></span>
        <input type="range" min="0" max={maxPa} bind:value={app.character.toggles.powerAttack} />
      </label>
    {/if}
    {#if hasFeat('combat-expertise')}
      <label class="slider">
        <span>{tr({ en: 'Combat Expertise', fr: 'Expertise du combat' })} : <strong>{t.combatExpertise}</strong></span>
        <input type="range" min="0" max={maxCe} bind:value={app.character.toggles.combatExpertise} />
      </label>
    {/if}
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.fightingDefensively} disabled={t.totalDefense} />
      {tr({ en: 'Fighting defensively (−4 attack, +2 AC)', fr: 'Combat sur la défensive (−4 attaque, +2 CA)' })}
    </label>
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.totalDefense} disabled={t.fightingDefensively} />
      {tr({ en: 'Total defense (+4 AC, no attack)', fr: 'Défense totale (+4 CA, pas d’attaque)' })}
    </label>
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.situational['flatFooted']} />
      {tr(UI.flatFooted)}
    </label>
  </section>

  <section class="box">
    <h3>{tr({ en: 'Defense', fr: 'Défense' })}</h3>
    <div class="row">
      <label>{tr(UI.acShort)} <StatValue stat={() => view.sheet.ac} title={UI.ac} signed={false} big /></label>
      <label>{tr(UI.touch)} <StatValue stat={() => view.sheet.touchAc} title={UI.touch} signed={false} /></label>
      <label>{tr(UI.flatFooted)} <StatValue stat={() => view.sheet.flatFootedAc} title={UI.flatFooted} signed={false} /></label>
    </div>
    <div class="row">
      <label>{tr(UI.fort)} <StatValue stat={() => view.sheet.saves.fort} title={UI.fort} /></label>
      <label>{tr(UI.ref)} <StatValue stat={() => view.sheet.saves.ref} title={UI.ref} /></label>
      <label>{tr(UI.will)} <StatValue stat={() => view.sheet.saves.will} title={UI.will} /></label>
    </div>
    <p>
      {tr(UI.aoo)} : <StatValue stat={() => view.sheet.attacksOfOpportunity} title={UI.aoo} signed={false} />
      · {tr(UI.speed)} : {fmtDistance(s.speed.current, lang())}
    </p>
    {#if s.flags.some((f) => FLAGS[f])}<p class="flags">{[...new Set(s.flags)].filter((f) => FLAGS[f]).map((f) => tr(FLAGS[f])).join(' · ')}</p>{/if}
  </section>

  <section class="box wide">
    <h3>{tr({ en: 'Attacks', fr: 'Attaques' })} — {tr(loadout.name)}</h3>
    <div class="attacks">
      {#each s.attacks as a (a.itemUid)}
        <article class="attack" class:choice={a.weaponOfChoice}>
          <h4>{tr(a.name)} {#if a.weaponOfChoice}<small>★ {tr({ en: 'weapon of choice', fr: 'arme de prédilection' })}</small>{/if}</h4>
          <div class="line">
            <span>{tr({ en: 'Attack', fr: 'Attaque' })}</span>
            <StatValue stat={() => view.sheet.attacks.find((x) => x.itemUid === a.itemUid)!.attack} title={a.name} big />
            <span class="iter">{a.iterative.map(fmt).join(' / ')}</span>
          </div>
          <div class="line">
            <span>{tr({ en: 'Damage', fr: 'Dégâts' })}</span>
            <strong>{a.damageDice}</strong>
            <StatValue stat={() => view.sheet.attacks.find((x) => x.itemUid === a.itemUid)!.damage} title={a.name} />
          </div>
          <div class="line">
            <span>{tr({ en: 'Critical', fr: 'Critique' })}</span>
            <strong>{crit(a.critRange, a.critMult.total)}</strong>
            {#if a.weaponOfChoice && s.weaponMaster.increasedMultiplierPerDay}
              <small>({tr({ en: 'increased multiplier', fr: 'multiplicateur accru' })} : ×{a.critMult.total + 1})</small>
            {/if}
          </div>
          {#if a.weapon.rangeIncrement}
            <div class="line"><span>{tr({ en: 'Range increment', fr: 'Facteur de portée' })}</span> {fmtDistance(a.weapon.rangeIncrement, lang())}</div>
          {/if}
          {#if a.kiDamageMax !== undefined}
            <div class="line"><span>{tr({ en: 'Ki damage (max)', fr: 'Dégâts ki (max)' })}</span> <strong>{a.kiDamageMax}</strong>
              {#if t.powerAttack && a.powerAttackAllowed}<small>+ {t.powerAttack * (a.weapon.handedness === 'twoHanded' ? 2 : 1)} {tr({ en: 'Power Attack', fr: 'Attaque en puissance' })}</small>{/if}
            </div>
          {/if}
        </article>
      {:else}
        <p>{tr({ en: 'No weapon in this loadout.', fr: 'Aucune arme dans cet équipement.' })}</p>
      {/each}
    </div>
    <WarningList areas={['combat']} />
  </section>

  {#if s.weaponMaster.level > 0}
    <section class="box">
      <h3>{tr({ en: 'Weapon Master', fr: "Maître d'armes" })} {s.weaponMaster.level}</h3>
      <div class="uses">
        <span>{tr({ en: 'Ki damage', fr: 'Dégâts ki' })}</span>
        <button onclick={() => spend('ki-damage', -1, s.weaponMaster.kiDamagePerDay)}>−</button>
        <strong>{s.weaponMaster.kiDamagePerDay - used('ki-damage')} / {s.weaponMaster.kiDamagePerDay}</strong>
        <button onclick={() => spend('ki-damage', 1, s.weaponMaster.kiDamagePerDay)}>{tr({ en: 'Use', fr: 'Utiliser' })}</button>
      </div>
      {#if s.weaponMaster.increasedMultiplierPerDay}
        <div class="uses">
          <span>{tr({ en: 'Increased multiplier', fr: 'Multiplicateur accru' })}</span>
          <button onclick={() => spend('increased-multiplier', -1, s.weaponMaster.increasedMultiplierPerDay)}>−</button>
          <strong>{s.weaponMaster.increasedMultiplierPerDay - used('increased-multiplier')} / {s.weaponMaster.increasedMultiplierPerDay}</strong>
          <button onclick={() => spend('increased-multiplier', 1, s.weaponMaster.increasedMultiplierPerDay)}>{tr({ en: 'Use', fr: 'Utiliser' })}</button>
        </div>
      {/if}
      <p class="note">
        {tr({
          en: 'Ki damage: maximum weapon damage instead of rolling; not on a critical hit; Power Attack is rolled normally. Increased multiplier: declare before rolling damage.',
          fr: "Dégâts ki : dégâts maximum de l'arme au lieu de lancer les dés ; pas sur un coup critique ; l'Attaque en puissance s'ajoute normalement. Multiplicateur accru : à annoncer avant de lancer les dégâts.",
        })}
        <small>Sword and Fist p. 39</small>
      </p>
      <button class="newday" onclick={newDay}>☀ {tr({ en: 'New day (reset uses)', fr: 'Nouveau jour (réinitialiser)' })}</button>
    </section>
  {/if}

  <section class="box">
    <h3>{tr({ en: 'Active effects', fr: 'Effets actifs' })}</h3>
    <ul class="effects">
      {#each c.activeEffects as e (e.uid)}
        <li class:off={!e.enabled}>
          <input type="checkbox" bind:checked={e.enabled} aria-label={tr(effectName(e))} />
          <button class="link" onclick={() => effectPopup(e)}>{tr(effectName(e))}</button>
          {#if e.kind === 'custom'}<small>{e.custom?.modifiers.map((m) => `${m.target} ${fmt(m.value)} (${m.bonusType})`).join(', ')}</small>{/if}
          <button class="del" onclick={() => removeEffect(e.uid)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
        </li>
      {:else}
        <li class="none">{tr({ en: 'None', fr: 'Aucun' })}</li>
      {/each}
    </ul>
    <div class="add">
      <select bind:value={conditionToAdd}>
        <option value="">{tr({ en: '— add a condition —', fr: '— ajouter un état —' })}</option>
        {#each conditions as cd (cd.id)}<option value={cd.id}>{tr(cd.name)}</option>{/each}
      </select>
      <button onclick={addCondition} disabled={!conditionToAdd}>＋</button>
    </div>
    <details>
      <summary>{tr({ en: 'Custom effect (poison, spell, bonus…)', fr: 'Effet personnalisé (poison, sort, bonus…)' })}</summary>
      <div class="custom">
        <input placeholder={tr({ en: 'Name', fr: 'Nom' })} bind:value={custom.name} />
        <select bind:value={custom.target}>
          {#each TARGETS as tg (tg.id)}<option value={tg.id}>{tr(tg.label)}</option>{/each}
        </select>
        <select bind:value={custom.bonusType}>
          {#each TYPES as ty (ty)}<option value={ty}>{ty}</option>{/each}
        </select>
        <input type="number" bind:value={custom.value} />
        <button onclick={addCustom}>＋</button>
      </div>
    </details>
  </section>

  <section class="box">
    <h3>{tr({ en: 'Loadout', fr: 'Équipement de combat' })} — {tr(loadout.name)}</h3>
    <p class="note">{tr({ en: 'Weapons in hand:', fr: 'Armes en main :' })}</p>
    {#each weapons as w (w.uid)}
      <label class="check">
        <input type="checkbox" checked={loadout.weapons.includes(w.uid)} onchange={() => toggleWeapon(w.uid)} />
        {tr(itemInfo(w).name)}
      </label>
    {/each}
    <label class="field">
      {tr({ en: 'Shield strapped on', fr: 'Bouclier au bras' })}
      <select
        value={loadout.shield ?? ''}
        onchange={(e) => {
          const l = app.character.loadouts.find((x) => x.id === loadout.id)!
          const v = e.currentTarget.value
          if (v) l.shield = v
          else delete l.shield
        }}
      >
        <option value="">—</option>
        {#each shields as sh (sh.uid)}<option value={sh.uid}>{tr(itemInfo(sh).name)}</option>{/each}
      </select>
    </label>
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
  .slider {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5rem;
  }
  input[type='range'] {
    width: 100%;
    min-height: 2.25rem;
    accent-color: var(--accent);
  }
  .check {
    display: flex;
    gap: 0.5em;
    align-items: center;
    min-height: 2.25rem;
  }
  .check input {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: var(--accent);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .row label {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.85em;
  }
  .flags {
    color: var(--danger);
    font-size: 0.9em;
  }
  .attacks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    gap: 0.75rem;
  }
  .attack {
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 0.5rem;
    background: var(--box);
  }
  .attack.choice {
    border-color: var(--accent);
  }
  h4 {
    margin: 0 0 0.3rem;
    font-family: var(--font-title);
    color: var(--accent);
  }
  h4 small {
    font-family: var(--font-body);
    font-size: 0.75em;
    color: var(--ink-soft);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
    min-height: 2.4rem;
  }
  .line > span:first-child {
    min-width: 6.5em;
    color: var(--ink-soft);
  }
  .iter {
    color: var(--ink-soft);
  }
  .uses {
    display: flex;
    gap: 0.5em;
    align-items: center;
    min-height: 2.6rem;
  }
  .uses span {
    flex: 1;
  }
  button {
    font: inherit;
    min-height: 2.4rem;
    min-width: 2.4rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    cursor: pointer;
  }
  .newday {
    margin-top: 0.5rem;
  }
  .note {
    font-size: 0.9em;
    color: var(--ink-soft);
  }
  .effects {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
  }
  .effects li {
    display: flex;
    gap: 0.5em;
    align-items: center;
    border-bottom: 1px solid var(--rule);
    min-height: 2.6rem;
  }
  .effects li.off {
    opacity: 0.6;
  }
  .effects small {
    color: var(--ink-soft);
    flex: 1;
  }
  .effects .none {
    font-style: italic;
  }
  .link {
    background: none;
    border: none;
    text-decoration: underline dotted var(--accent);
    text-align: left;
    flex: 1;
  }
  .del {
    color: var(--danger);
  }
  .add,
  .custom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.4rem 0;
  }
  select,
  .custom input {
    font: inherit;
    min-height: 2.4rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    max-width: 100%;
  }
  .custom input[type='number'] {
    width: 4.5em;
  }
  .add select {
    flex: 1;
  }
  .field {
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;
  }
  summary {
    cursor: pointer;
    min-height: 2rem;
  }
</style>
