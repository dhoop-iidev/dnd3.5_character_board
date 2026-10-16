<script lang="ts">
  // Druid wild shape: daily uses, legal forms, taking/ending a form, and which items keep working.
  // https://www.d20srd.org/srd/classes/druid.htm#wildShape
  import { rules } from '../data/rules'
  import { app, lang, tr, view } from '../state.svelte'
  import { itemInfo } from './items'
  import { openPopup } from './popupState.svelte'
  import {
    druidLevel,
    ELEMENTAL_KEY,
    endWildShape,
    fmtRounds,
    legalForms,
    startWildShape,
    usesLeft,
    WILD_SHAPE_KEY,
  } from './wildShape'

  const c = $derived(app.character)
  const s = $derived(view.sheet)
  const lvl = $derived(druidLevel(c))
  const animal = $derived(usesLeft(c))
  const elemental = $derived(usesLeft(c, true))
  const forms = $derived(legalForms(c).sort((a, b) => tr(a.name).localeCompare(tr(b.name))))
  const elementals = $derived(legalForms(c, true).sort((a, b) => tr(a.name).localeCompare(tr(b.name))))
  let pick = $state('')
  const pickedElemental = $derived(elementals.some((d) => d.id === pick))
  const form = $derived(s.wildShape?.def)
  const naturalSpell = $derived(s.feats.some((f) => f.featId === 'natural-spell'))
  // Items that can meld: everything carried, worn or in the pack (stored items are not on her).
  const items = $derived(c.inventory.filter((i) => i.location !== 'stored'))

  function take() {
    if (!pick) return
    startWildShape(app.character, pick, pickedElemental)
    pick = ''
  }
  function toggleKeep(uid: string, on: boolean) {
    const ws = app.character.wildShape
    if (!ws) return
    ws.keepItems = on ? [...ws.keepItems, uid] : ws.keepItems.filter((x) => x !== uid)
  }
  function resetUses() {
    delete app.character.dailyUsesSpent[WILD_SHAPE_KEY]
    delete app.character.dailyUsesSpent[ELEMENTAL_KEY]
  }
  function rulesPopup() {
    openPopup({
      title: { en: 'Wild shape', fr: 'Forme animale' },
      lines: [
        { en: 'Official errata (PHB, MM 2006): works like the alternate form ability. She takes the form’s Str, Dex, Con, size, natural armor, natural attacks, movement modes and extraordinary special attacks; she keeps her Int, Wis, Cha, hit points (despite the Con change), base attack, base saves, skill ranks, feats and special qualities — not the form’s feats, special qualities or racial skill bonuses.', fr: 'Errata officiel (Manuel des Joueurs, Manuel des Monstres 2006) : fonctionne comme l’aptitude forme alternative. Elle prend la For, la Dex, la Con, la taille, l’armure naturelle, les attaques naturelles, les modes de déplacement et les attaques spéciales extraordinaires de la forme ; elle garde son Int, sa Sag, son Cha, ses points de vie (malgré le changement de Con), son bonus de base à l’attaque, ses jets de sauvegarde de base, ses degrés de compétence, ses dons et ses particularités — pas les dons, particularités ni bonus raciaux de compétence de la forme.' },
        { en: 'Standard action to change (no attack of opportunity); 1 hour per druid level; each use heals as after a night’s rest. All gear melds and stops working; armor or shield with the wild property keeps its armor bonus.', fr: 'Action simple pour changer (sans attaque d’opportunité) ; 1 heure par niveau de druide ; chaque utilisation soigne comme une nuit de repos. Tout l’équipement se fond dans la forme et ne fonctionne plus ; une armure ou un bouclier sauvage garde son bonus d’armure.' },
        { en: 'She can’t speak: spells with verbal or somatic components need Natural Spell.', fr: 'Elle ne peut pas parler : les sorts à composantes verbales ou gestuelles demandent le don Incantation animale.' },
        { en: 'Elemental forms (16th level): she also gains the elemental’s feats and all its extraordinary, supernatural and spell-like abilities (SRD druid, unchanged by the errata).', fr: 'Formes d’élémentaire (niveau 16) : elle gagne aussi les dons de l’élémentaire et toutes ses aptitudes extraordinaires, surnaturelles et magiques (DRS druide, inchangé par l’errata).' },
      ],
      source: { srdUrl: 'https://www.d20srd.org/srd/classes/druid.htm#wildShape' },
      noteKey: 'feature:wild-shape',
    })
  }
</script>

<section class="box wide wild">
  <h3>{tr({ en: 'Wild shape', fr: 'Forme animale' })}</h3>
  <p class="uses">
    <button class="link" onclick={rulesPopup}>ⓘ {tr({ en: 'Rules', fr: 'Règles' })}</button>
    <span>{tr({ en: 'Uses today', fr: 'Utilisations aujourd’hui' })} : <strong>{animal.left} / {animal.max}</strong></span>
    {#if elemental.max}<span>{tr({ en: 'Elemental', fr: 'Élémentaire' })} : <strong>{elemental.left} / {elemental.max}</strong></span>{/if}
    <span class="soft">{tr({ en: `Max ${lvl} HD`, fr: `${lvl} DV max.` })}</span>
    <button onclick={resetUses}>☀ {tr({ en: 'New day', fr: 'Nouveau jour' })}</button>
  </p>

  {#if !form}
    <div class="take">
      <select bind:value={pick} aria-label={tr({ en: 'Form', fr: 'Forme' })}>
        <option value="">— {tr({ en: 'choose a form', fr: 'choisir une forme' })} —</option>
        <optgroup label={tr({ en: 'Animals', fr: 'Animaux' })}>
          {#each forms as d (d.id)}<option value={d.id}>{tr(d.name)} ({d.hitDice.count} {tr({ en: 'HD', fr: 'DV' })})</option>{/each}
        </optgroup>
        {#if elementals.length}
          <optgroup label={tr({ en: 'Elementals', fr: 'Élémentaires' })}>
            {#each elementals as d (d.id)}<option value={d.id}>{tr(d.name)}</option>{/each}
          </optgroup>
        {/if}
      </select>
      <button
        class="go"
        onclick={take}
        disabled={!pick || (pickedElemental ? elemental.left : animal.left) <= 0}
      >
        {tr({ en: 'Take this form (standard action)', fr: 'Prendre cette forme (action simple)' })}
      </button>
    </div>
    <p class="soft">
      {tr({
        en: 'Your sheet is recalculated in the form; the duration counts down with the turn bar.',
        fr: 'Votre fiche est recalculée sous cette forme ; la durée se décompte avec la barre de tour.',
      })}
    </p>
  {:else}
    <p>
      <strong>{tr(form.name)}</strong>
      · {tr(form.typeText)} · {fmtRounds(c.wildShape?.rounds ?? 0, lang())}
      {tr({ en: 'left', fr: 'restantes' })}
    </p>
    {#if c.wildShape?.elemental}
      <p class="soft">
        {tr({ en: 'Elemental: its feats', fr: 'Élémentaire : ses dons' })} ({tr(form.feats)})
        {tr({ en: 'and all its abilities apply', fr: 'et toutes ses aptitudes s’appliquent' })} :
        {[tr(form.specialAttacks), tr(form.specialQualities)].filter((x) => x && x !== '—').join(' · ')}
        <button
          class="link"
          onclick={() => openPopup({ title: form.name, html: form.specialAbilities, source: form.source })}
          >ⓘ {tr({ en: 'details', fr: 'détails' })}</button
        >
      </p>
    {:else if form.specialAttacks.en && form.specialAttacks.en !== '—'}
      <p class="soft">{tr({ en: 'Extraordinary special attacks', fr: 'Attaques spéciales extraordinaires' })} : {tr(form.specialAttacks)}</p>
    {/if}
    {#if !naturalSpell && s.spellcasting.length}
      <p class="warn">
        {tr({
          en: 'Without Natural Spell: no spells with verbal or somatic components in this form (most spells).',
          fr: 'Sans le don Incantation animale : aucun sort à composante verbale ou gestuelle sous cette forme (la plupart des sorts).',
        })}
      </p>
    {/if}
    <details open>
      <summary>{tr({ en: 'Equipment: melded or still working', fr: 'Équipement : fondu ou toujours actif' })}</summary>
      <ul class="items">
        {#each items as it (it.uid)}
          <li>
            <label class="check">
              <input
                type="checkbox"
                checked={c.wildShape?.keepItems.includes(it.uid)}
                onchange={(e) => toggleKeep(it.uid, e.currentTarget.checked)}
              />
              {tr(itemInfo(it).name)}
            </label>
          </li>
        {:else}
          <li class="soft">—</li>
        {/each}
      </ul>
      <p class="soft">
        {tr({
          en: 'By the rules all gear melds and stops working (no armor, weapon or item bonus); armor and shields with the wild property stay ticked. Tick an item only if your DM lets it work.',
          fr: 'Selon les règles, tout l’équipement se fond et ne fonctionne plus (ni armure, ni arme, ni bonus d’objet) ; les armures et boucliers sauvages restent cochés. Ne cochez un objet que si votre MJ l’autorise.',
        })}
      </p>
    </details>
    <button class="go end" onclick={() => endWildShape(app.character)}>
      {tr({ en: 'Return to her own form (standard action)', fr: 'Reprendre sa forme (action simple)' })}
    </button>
  {/if}
</section>

<style>
  .uses {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
    margin: 0 0 0.6rem;
  }
  .take {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  select {
    min-height: 2.6rem;
    max-width: 100%;
  }
  button {
    min-height: 2.6rem;
    padding: 0 0.9rem;
  }
  .go {
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .go:disabled {
    background: var(--paper-2);
    color: var(--ink-soft);
    border-color: var(--rule);
  }
  .end {
    margin-top: 0.6rem;
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    min-height: 0;
    text-decoration: underline dotted var(--accent);
  }
  .soft {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .warn {
    color: var(--accent);
  }
  .items {
    list-style: none;
    margin: 0.4rem 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
    gap: 0.2rem 1rem;
  }
  .check {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    min-height: 2.4rem;
  }
  summary {
    cursor: pointer;
    font-family: var(--font-title);
    margin: 0.4rem 0;
  }
</style>
