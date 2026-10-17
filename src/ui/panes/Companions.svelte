<script lang="ts">
  // Animal companions (druid; ranger from 4th at half his level): choice of animal, SRD advancement, stat block.
  // https://www.d20srd.org/srd/classes/druid.htm#animalCompanion
  // Sorcerer/wizard familiar: https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars
  import { rules } from '../../data/rules'
  import {
    familiarAdvancement,
    familiarLevel,
    FAMILIAR_URL,
    FAMILIARS,
    IMPROVED_FAMILIAR_URL,
    IMPROVED_FAMILIARS,
    improvedFamiliarCheck,
    isImprovedFamiliar,
    isNewFamiliarKind,
    TEMPLATE_FAMILIARS,
  } from '../../engine/arcane'
  import WarningList from '../WarningList.svelte'
  import { companionAdvancement, companionLevel, computeCreature, paladinMountAdvancement, WAR_TRAINABLE } from '../../engine/creature'
  import type { CompanionState } from '../../model/character'
  import { app, tr, view } from '../../state.svelte'
  import CreatureCard from '../CreatureCard.svelte'
  import { newUid } from '../items'

  // An ex-druid loses her companion (https://www.d20srd.org/srd/classes/druid.htm#exDruids).
  const level = $derived(
    companionLevel(view.sheet.lostClasses.includes('druid') ? { ...view.sheet.classLevels, druid: 0 } : view.sheet.classLevels),
  )
  const options = $derived(
    (rules.companions?.options ?? [])
      .filter((o) => o.minLevel <= level && rules.creatures.has(o.creatureId))
      // An animal on two lists (crocodile: base list and 4th level) keeps its best entry (smallest level adjustment).
      .filter((o, i, all) => all.findIndex((x) => x.creatureId === o.creatureId) === i)
      .map((o) => ({ ...o, def: rules.creatures.get(o.creatureId)! }))
      .sort((a, b) => a.minLevel - b.minLevel || tr(a.def.name).localeCompare(tr(b.def.name))),
  )
  let pick = $state('')

  function add() {
    if (!pick) return
    if (!app.character.companions) app.character.companions = []
    app.character.companions.push({
      uid: newUid(),
      creatureId: pick,
      maxHp: app.character.settings.maxHitDice !== false,
      damage: 0,
    })
    pick = ''
  }
  // Paladin's special mount (5th level): heavy warhorse for a Medium paladin, warpony for a Small one; the table uses
  // the paladin level only (https://www.d20srd.org/srd/classes/paladin.htm#specialMount; 3.5 FAQ p. 9).
  // An ex-paladin loses the mount's service (https://www.d20srd.org/srd/classes/paladin.htm#exPaladins).
  const paladinLevel = $derived(view.sheet.lostClasses.includes('paladin') ? 0 : (view.sheet.classLevels['paladin'] ?? 0))
  const mountRow = $derived(paladinMountAdvancement(paladinLevel))
  const mountDefault = $derived(view.sheet.race.size === 'small' ? 'pony-war' : 'warhorse-heavy')
  const mounts = $derived((app.character.companions ?? []).filter((x) => x.kind === 'mount'))
  const animals = $derived((app.character.companions ?? []).filter((x) => !x.kind))

  // Familiar: sorcerer and wizard levels stack; one familiar at a time.
  const famLevel = $derived(familiarLevel(view.sheet.classLevels))
  const familiars = $derived((app.character.companions ?? []).filter((x) => x.kind === 'familiar'))
  let famPick = $state('')
  // A pick is a creature id, or "<template>:<creature id>" for a celestial or fiendish standard familiar.
  function addFamiliar() {
    if (!famPick) return
    const [template, creatureId] = famPick.includes(':') ? famPick.split(':') : [undefined, famPick]
    ;(app.character.companions ??= []).push({ uid: newUid(), creatureId, kind: 'familiar', maxHp: true, damage: 0, ...(template ? { template } : {}) })
    famPick = ''
  }
  // Improved Familiar (https://www.d20srd.org/srd/feats.htm#improvedFamiliar): more creatures, from an arcane
  // spellcaster level; by alignment (within one step) or by the master's type or subtype (house rule #38).
  const hasImproved = $derived(view.sheet.feats.some((f) => f.featId === 'improved-familiar'))
  const arcaneLevel = $derived(Math.max(0, ...view.sheet.spellcasting.filter((x) => x.def.kind === 'arcane').map((x) => x.casterLevel.total)))
  const checkOf = (id: string, template?: string) =>
    improvedFamiliarCheck(id, { hasFeat: hasImproved, arcaneLevel, alignment: app.character.identity.alignment, template })
  const improvedOptions = $derived([
    ...IMPROVED_FAMILIARS.filter((f) => rules.creatures.has(f.id)).map((f) => {
      const { blockers, check } = checkOf(f.id)
      const cond = [f.alignment, f.subtype && tr(f.subtype)].filter(Boolean).join(' / ')
      return { value: f.id, name: tr(rules.creatures.get(f.id)!.name), cond, level: f.level, why: blockers, check }
    }),
    ...Object.entries(TEMPLATE_FAMILIARS).flatMap(([t, info]) =>
      FAMILIARS.filter((f) => rules.creatures.has(f.id)).map((f) => {
        const { blockers, check } = checkOf(f.id, t)
        const tpl = rules.templates.get(t)?.name
        return { value: `${t}:${f.id}`, name: `${tr(rules.creatures.get(f.id)!.name)} (${tpl ? tr(tpl) : t})`, cond: tr(info.subtype), level: info.level, why: blockers, check }
      }),
    ),
  ])
  const baseSave = (id: 'fort' | 'ref' | 'will') =>
    view.sheet.saves[id].parts.filter((p) => p.bonusType === 'base').reduce((n, p) => n + p.value, 0)
  const familiarSheet = (c: CompanionState) => {
    const improved = isImprovedFamiliar(c.creatureId, c.template)
    const f = familiarAdvancement(famLevel, improved)
    return computeCreature(rules.creatures.get(c.creatureId)!, {
      template: c.template ? rules.templates.get(c.template) : undefined,
      advancement: f?.advancement,
      familiar: f && {
        int: f.int,
        // Total hit points, not temporary ones (the master's maximum).
        masterHp: view.sheet.hpMax.total,
        masterBab: view.sheet.bab.total,
        masterLevel: view.sheet.characterLevel,
        sr: f.sr,
        improved: improved && isNewFamiliarKind(c.creatureId),
      },
      masterBaseSaves: { fort: baseSave('fort'), ref: baseSave('ref'), will: baseSave('will') },
      maxHp: true,
    })
  }
  function addMount() {
    if (!app.character.companions) app.character.companions = []
    app.character.companions.push({
      uid: newUid(),
      creatureId: mountDefault,
      kind: 'mount',
      maxHp: app.character.settings.maxHitDice !== false,
      damage: 0,
    })
  }
  const mountSheet = (c: CompanionState) => {
    const m = paladinMountAdvancement(paladinLevel)
    // Share saving throws: the better of its own base saves and the paladin's
    // (https://www.d20srd.org/srd/classes/paladin.htm#specialMount; FAQ p. 22).
    const base = (id: 'fort' | 'ref' | 'will') => view.sheet.saves[id].parts.filter((p) => p.bonusType === 'base').reduce((n, p) => n + p.value, 0)
    return computeCreature(rules.creatures.get(c.creatureId)!, {
      advancement: m?.advancement,
      mount: m?.mount,
      masterBaseSaves: paladinLevel >= 5 ? { fort: base('fort'), ref: base('ref'), will: base('will') } : undefined,
      maxHp: c.maxHp,
      hpManual: c.hpManual,
    })
  }
  function remove(uid: string) {
    app.character.companions = (app.character.companions ?? []).filter((x) => x.uid !== uid)
  }
  const adjOf = (c: CompanionState) =>
    rules.companions?.options.find((o) => o.creatureId === c.creatureId)?.levelAdjustment ?? 0
  const sheetOf = (c: CompanionState) => {
    const def = rules.creatures.get(c.creatureId)!
    return computeCreature(def, {
      advancement: companionAdvancement(rules, level, adjOf(c)),
      maxHp: c.maxHp,
      hpManual: c.hpManual,
      warTrained: c.warTrained,
    })
  }
</script>

{#if paladinLevel >= 5 || mounts.length}
  <section class="box wide">
    <h3>{tr({ en: 'Special mount (paladin)', fr: 'Monture (paladin)' })}</h3>
    <p class="note">
      {tr({
        en: `Called once per day (full-round action) for 2 hours per paladin level (${2 * paladinLevel} h), in full health; treated as a magical beast. Paladin ${paladinLevel}: ${mountRow ? `+${mountRow.advancement.bonusHD} HD, natural armor +${mountRow.advancement.naturalArmorAdj}, Str +${mountRow.mount.strAdj}, Int ${mountRow.mount.int}` : '—'}${paladinLevel >= 15 ? `, spell resistance ${paladinLevel + 5}` : ''}. If it dies: no new mount for 30 days or until the next paladin level, −1 on attack and weapon damage meanwhile.`,
        fr: `Appelée une fois par jour (action complexe) pour 2 heures par niveau de paladin (${2 * paladinLevel} h), en pleine santé ; considérée comme une créature magique. Paladin ${paladinLevel} : ${mountRow ? `+${mountRow.advancement.bonusHD} DV, armure naturelle +${mountRow.advancement.naturalArmorAdj}, For +${mountRow.mount.strAdj}, Int ${mountRow.mount.int}` : '—'}${paladinLevel >= 15 ? `, résistance à la magie ${paladinLevel + 5}` : ''}. Si elle meurt : pas de nouvelle monture pendant 30 jours ou jusqu’au niveau de paladin suivant, −1 aux jets d’attaque et de dégâts d’arme entre-temps.`,
      })}
      <a href="https://www.d20srd.org/srd/classes/paladin.htm#specialMount" target="_blank" rel="noopener">d20srd</a>
    </p>
    {#if !mounts.length && rules.creatures.has(mountDefault)}
      <button class="addmount" onclick={addMount}
        >＋ {tr(rules.creatures.get(mountDefault)!.name)}</button
      >
    {/if}
  </section>
  {#each mounts as c (c.uid)}
    <section class="box wide">
      <h3>{c.name || tr(rules.creatures.get(c.creatureId)?.name)}</h3>
      {#if rules.creatures.has(c.creatureId)}
        <label class="name">{tr({ en: 'Name', fr: 'Nom' })} <input bind:value={c.name} /></label>
        <CreatureCard state={c} sheet={() => mountSheet(c)} onremove={() => remove(c.uid)} />
      {/if}
    </section>
  {/each}
{/if}

{#if famLevel > 0 || familiars.length}
  <section class="box wide">
    <h3>{tr({ en: 'Familiar', fr: 'Familier' })}</h3>
    <p class="note">
      {tr({
        en: `Master level ${famLevel} (sorcerer + wizard). Half your hit points, your base attack bonus, your base saves when better, your skill ranks when better (with its own ability modifiers); treated as a magical beast; Hit Dice for effects: your character level. Obtaining one takes 24 hours and 100 gp; if it dies or is dismissed: Fortitude DC 15 or lose 200 XP per sorcerer/wizard level (half on a success), no new familiar for a year and a day.`,
        fr: `Niveau du maître ${famLevel} (ensorceleur + magicien). La moitié de vos points de vie, votre bonus de base à l’attaque, vos bonus de base aux jets de sauvegarde s’ils sont meilleurs, vos degrés de maîtrise s’ils sont meilleurs (avec ses propres modificateurs) ; considéré comme une créature magique ; DV pour les effets : votre niveau global. L’obtenir prend 24 heures et 100 po ; s’il meurt ou est renvoyé : Vigueur DD 15 ou perte de 200 PX par niveau d’ensorceleur/magicien (moitié en cas de réussite), pas de nouveau familier avant un an et un jour.`,
      })}
      <a href={FAMILIAR_URL} target="_blank" rel="noopener">d20srd</a>
    </p>
    {#if !familiars.length}
      <div class="add">
        <select bind:value={famPick} aria-label={tr({ en: 'Familiar', fr: 'Familier' })}>
          <option value="">— {tr({ en: 'choose a familiar', fr: 'choisir un familier' })} —</option>
          {#each FAMILIARS.filter((f) => rules.creatures.has(f.id)) as f (f.id)}
            <option value={f.id}>{tr(rules.creatures.get(f.id)!.name)} — {tr(f.text)}</option>
          {/each}
          {#if hasImproved}
            <optgroup label={tr({ en: 'Improved Familiar', fr: 'Familier supérieur' })}>
              {#each improvedOptions as f (f.value)}
                <option value={f.value} disabled={!!f.why.length}
                  >{f.name} — {f.cond}, {tr({ en: 'arcane level', fr: 'niveau profane' })} {f.level}{f.why.length
                    ? ` (${f.why.map((x) => tr(x)).join(', ')})`
                    : ''}</option
                >
              {/each}
            </optgroup>
          {/if}
        </select>
        <button disabled={!famPick} onclick={addFamiliar}>＋ {tr({ en: 'Add', fr: 'Ajouter' })}</button>
      </div>
    {/if}
  </section>
  {#each familiars as c (c.uid)}
    {@const fs = familiarSheet(c)}
    <section class="box wide">
      <h3>{c.name || tr(rules.creatures.get(c.creatureId)?.name)}{c.template ? ` (${tr(rules.templates.get(c.template)?.name ?? { en: c.template, fr: c.template })})` : ''}</h3>
      {#if rules.creatures.has(c.creatureId)}
        <label class="name">{tr({ en: 'Name', fr: 'Nom' })} <input bind:value={c.name} /></label>
        <p class="note">
          <strong>{tr({ en: 'Master’s benefit', fr: 'Avantage du maître' })} :</strong>
          {#if isNewFamiliarKind(c.creatureId)}
            {tr({
              en: 'none besides Alertness (improved familiar: keeps its own type, no speech with animals of its kind)',
              fr: 'aucun en dehors de Vigilance (familier supérieur : garde son type, pas de communication avec les animaux de son espèce)',
            })}
            <a href={IMPROVED_FAMILIAR_URL} target="_blank" rel="noopener">d20srd</a>
          {:else}
            {tr(FAMILIARS.find((f) => f.id === c.creatureId)?.text ?? { en: '—', fr: '—' })}
            {tr({ en: '(within 1 mile; applied to your sheet)', fr: '(à 1,5 km ou moins ; appliqué à votre feuille)' })}
          {/if}
          · {tr({ en: 'HD for effects', fr: 'DV pour les effets' })} {fs.effectHd}
          {#if fs.spellResistance}· {tr({ en: 'SR', fr: 'RM' })} {fs.spellResistance}{/if}
        </p>
        <CreatureCard state={c} sheet={() => familiarSheet(c)} onremove={() => remove(c.uid)} fixedHp specialUrl={FAMILIAR_URL} />
      {/if}
    </section>
  {/each}
  <WarningList areas={['companions']} />
{/if}

{#if level > 0 || animals.length || (paladinLevel < 5 && famLevel === 0)}
<section class="box wide">
  <h3>{tr({ en: 'Animal companion', fr: 'Compagnon animal' })}</h3>
  <p class="note">
    {tr({
      en: `Effective druid level for the companion: ${level} (druid level + ½ ranger level from ranger 4). Alternative animals count as a lower level.`,
      fr: `Niveau de druide effectif pour le compagnon : ${level} (niveau de druide + ½ niveau de rôdeur à partir de rôdeur 4). Les animaux de remplacement comptent comme un niveau inférieur.`,
    })}
    <a href="https://www.d20srd.org/srd/classes/druid.htm#animalCompanion" target="_blank" rel="noopener">d20srd</a>
  </p>
  {#if !rules.creatures.size}
    <p class="note">{tr({ en: 'Creature data not loaded.', fr: 'Données de créatures non chargées.' })}</p>
  {:else if level < 1}
    <p class="note">
      {tr({
        en: 'No animal companion yet (druid 1 or ranger 4).',
        fr: 'Pas encore de compagnon animal (druide 1 ou rôdeur 4).',
      })}
    </p>
  {:else}
    <div class="add">
      <select bind:value={pick} aria-label={tr({ en: 'Animal', fr: 'Animal' })}>
        <option value="">— {tr({ en: 'choose an animal', fr: 'choisir un animal' })} —</option>
        {#each options as o (o.creatureId)}
          <option value={o.creatureId}>
            {tr(o.def.name)}{o.levelAdjustment ? ` (${tr({ en: 'level', fr: 'niveau' })} ${o.levelAdjustment})` : ''}
          </option>
        {/each}
      </select>
      <button onclick={add} disabled={!pick}>＋ {tr({ en: 'Add', fr: 'Ajouter' })}</button>
    </div>
  {/if}
</section>
{/if}

{#each animals as c (c.uid)}
  {@const adv = companionAdvancement(rules, level, adjOf(c))}
  <section class="box wide">
    <h3>{c.name || tr(rules.creatures.get(c.creatureId)?.name)}</h3>
    {#if rules.creatures.has(c.creatureId)}
      <label class="name">{tr({ en: 'Name', fr: 'Nom' })} <input bind:value={c.name} /></label>
      {#if adv}
        <p class="note">
          {tr({
            en: `Advancement: +${adv.bonusHD} HD, natural armor +${adv.naturalArmorAdj}, Str/Dex +${adv.strDexAdj}, ${adv.bonusTricks} bonus trick(s).`,
            fr: `Progression : +${adv.bonusHD} DV, armure naturelle +${adv.naturalArmorAdj}, For/Dex +${adv.strDexAdj}, ${adv.bonusTricks} tour(s) supplémentaire(s).`,
          })}
        </p>
      {:else}
        <p class="note">
          {tr({
            en: 'Too low a level for this alternative animal.',
            fr: 'Niveau trop bas pour cet animal de remplacement.',
          })}
        </p>
      {/if}
      {#if WAR_TRAINABLE.includes(c.creatureId)}
        <label class="trained">
          <input type="checkbox" bind:checked={c.warTrained} />
          {tr({
            en: 'Trained for war (combat riding): hooves are primary attacks (house rule #25)',
            fr: 'Dressé au combat (combat monté) : les sabots sont des attaques principales (règle maison n° 25)',
          })}
        </label>
      {/if}
      <CreatureCard state={c} sheet={() => sheetOf(c)} onremove={() => remove(c.uid)} />
      <label class="tricks">
        {tr({ en: 'Tricks known (Handle Animal)', fr: 'Tours connus (Dressage)' })}
        <input
          value={(c.tricks ?? []).join(', ')}
          onchange={(e) =>
            (c.tricks = e.currentTarget.value
              .split(',')
              .map((x) => x.trim())
              .filter((x) => x))}
          placeholder={tr({ en: 'attack, come, defend…', fr: 'attaquer, au pied, défendre…' })}
        />
      </label>
    {/if}
  </section>
{/each}

<style>
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .add {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  select,
  input {
    min-height: 2.6rem;
    padding: 0 0.5rem;
  }
  .addmount {
    min-height: 2.6rem;
    padding: 0 1rem;
  }
  .add button {
    min-height: 2.6rem;
    padding: 0 1rem;
  }
  .trained {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
    margin: 0.3rem 0;
  }
  .name,
  .tricks {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0.4rem 0;
    font-size: 0.9rem;
  }
</style>
