<script lang="ts">
  // Barbarian, monk, paladin and rogue features at the table: rage (start / end, fatigue), smite evil, flurry of blows,
  // sneak attack, abilities with daily or weekly uses and pools (lay on hands, wholeness of body), immunities, notes.
  // https://www.d20srd.org/srd/classes/barbarian.htm, monk.htm, paladin.htm, rogue.htm
  import type { ClassAbility } from '../engine/compute'
  import { app, tr, view } from '../state.svelte'
  import { endRage, isRaging, newDayClassUses, newWeekClassUses, RAGE_ENCOUNTER_KEY, RAGE_KEY, startRage } from './classActions'
  import { openPopup } from './popupState.svelte'

  const s = $derived(view.sheet)
  const f = $derived(s.classFeatures)
  const c = $derived(app.character)
  const key = (a: ClassAbility) => (a.period === 'week' ? `week:${a.id}` : `class:${a.id}`)
  const usedOf = (a: ClassAbility) => c.dailyUsesSpent[key(a)] ?? 0
  function spend(a: ClassAbility, n: number) {
    app.character.dailyUsesSpent[key(a)] = Math.min(a.max, Math.max(0, usedOf(a) + n))
  }
  let poolAmount = $state<Record<string, number>>({})

  const rage = $derived(f.rage)
  const rageUsed = $derived(c.dailyUsesSpent[RAGE_KEY] ?? 0)
  const raging = $derived(isRaging(c))
  const rageEffect = $derived(c.activeEffects.find((e) => e.kind === 'class' && e.refId === 'rage'))
  const ragedThisEncounter = $derived(!!c.dailyUsesSpent[RAGE_ENCOUNTER_KEY])

  // Smite evil: spend a use and switch the bonus on for this turn's melee attack (turned off at the end of the turn).
  const smite = $derived(f.abilities.find((a) => a.id === 'smite-evil'))
  function useSmite() {
    if (!smite) return
    spend(smite, 1)
    app.character.toggles.smite = true
  }
  const pools = $derived(f.abilities.filter((a) => a.id !== 'smite-evil'))
  const info = (a: ClassAbility) => openPopup({ title: a.name, lines: a.lines, source: a.source, noteKey: `class:${a.id}` })
</script>

<section class="box wide classfeat">
  <h3>{tr({ en: 'Class features', fr: 'Aptitudes de classe' })}</h3>

  {#if rage}
    <div class="row">
      <strong>{tr(rage.name)}</strong>
      <span>{tr({ en: 'Today', fr: 'Aujourd’hui' })} : {rage.perDay - rageUsed} / {rage.perDay}</span>
      {#if raging}
        <span class="on">{tr({ en: 'raging', fr: 'en rage' })} · {rageEffect?.rounds ?? '?'} {tr({ en: 'rd left', fr: 'rd restants' })}</span>
        <button onclick={() => endRage(app.character, rage.tireless)}>{tr({ en: 'End the rage', fr: 'Mettre fin à la rage' })}</button>
      {:else}
        <button
          class="go"
          disabled={!rage.available || rageUsed >= rage.perDay || ragedThisEncounter}
          onclick={() => startRage(app.character, rage.rounds)}
          >{tr({ en: `Rage (${rage.rounds} rounds)`, fr: `Rage (${rage.rounds} rounds)` })}</button
        >
      {/if}
    </div>
    <p class="note">
      {#if !rage.available}<span class="warn">{tr({ en: 'Lawful: no rage (ex-barbarian).', fr: 'Loyal : plus de rage (ancien barbare).' })}</span>{/if}
      {tr({
        en: `+${rage.strCon} Str and Con, +${rage.will} morale on Will saves, −2 AC; 3 + the raged Con modifier rounds; once per encounter. No Cha-, Dex- or Int-based skills (except Balance, Escape Artist, Intimidate, Ride), no Concentration, spells, command-word, spell-trigger or spell-completion items (wands, scrolls), Combat Expertise, item creation or metamagic feats.${rage.tireless ? '' : ' Fatigued for the rest of the encounter afterwards.'}`,
        fr: `+${rage.strCon} For et Con, +${rage.will} de moral aux jets de Volonté, −2 CA ; 3 + modificateur de Con en rage rounds ; une fois par rencontre. Pas de compétence basée sur Cha, Dex ou Int (sauf Équilibre, Évasion, Intimidation, Équitation), ni Concentration, sorts, objets à mot de commande, à potentiel magique ou à fin d’incantation (baguettes, parchemins), Expertise du combat, dons de création ou de métamagie.${rage.tireless ? '' : ' Fatigué ensuite jusqu’à la fin de la rencontre.'}`,
      })}
      {#if ragedThisEncounter && !raging}<em
          >{tr({ en: 'Already raged this encounter.', fr: 'Déjà entré en rage pendant cette rencontre.' })}</em
        >{/if}
      <a href="https://www.d20srd.org/srd/classes/barbarian.htm#rage" target="_blank" rel="noopener">d20srd</a>
    </p>
  {/if}

  {#if f.flurry}
    <div class="row">
      <label class="check">
        <input type="checkbox" bind:checked={app.character.toggles.flurry} disabled={!f.flurry.available} />
        <strong>{tr({ en: 'Flurry of blows', fr: 'Déluge de coups' })}</strong>
      </label>
      <span class="note"
        >{tr({
          en: `full attack, unarmed or monk weapons: ${f.flurry.extra} extra attack(s), ${f.flurry.penalty ? `${f.flurry.penalty} on all attacks this round` : 'no penalty'}`,
          fr: `attaque à outrance, mains nues ou armes de moine : ${f.flurry.extra} attaque(s) supplémentaire(s), ${f.flurry.penalty ? `${f.flurry.penalty} à toutes les attaques du round` : 'sans malus'}`,
        })}{#if !f.flurry.available}
          — <span class="warn"
            >{tr({ en: 'not in armor, with a shield or a medium/heavy load', fr: 'impossible en armure, avec un bouclier ou une charge intermédiaire/lourde' })}</span
          >{/if}</span
      >
    </div>
  {/if}

  {#if smite}
    <div class="row">
      <strong>{tr(smite.name)}</strong>
      <span>{tr({ en: 'Today', fr: 'Aujourd’hui' })} : {smite.max - usedOf(smite)} / {smite.max}</span>
      {#if c.toggles.smite}
        <span class="on">{tr({ en: 'next melee attack', fr: 'prochaine attaque au corps à corps' })}</span>
        <button onclick={() => (app.character.toggles.smite = false)}>{tr({ en: 'Cancel', fr: 'Annuler' })}</button>
      {:else}
        <button class="go" disabled={usedOf(smite) >= smite.max} onclick={useSmite}
          >{tr({ en: 'Smite (this attack)', fr: 'Châtier (cette attaque)' })}</button
        >
      {/if}
      <button class="link" onclick={() => info(smite)}>ⓘ</button>
    </div>
  {/if}

  {#if f.sneakAttack}
    <div class="row">
      <strong>{tr({ en: 'Sneak attack', fr: 'Attaque sournoise' })}</strong>
      <span>+{f.sneakAttack}</span>
      <span class="note"
        >{tr({
          en: 'target denied its Dex bonus or flanked; ranged within 30 ft; not multiplied on a critical; living creatures with a discernible anatomy only',
          fr: 'cible privée de son bonus de Dex ou prise en tenaille ; à distance à 9 m ou moins ; non multiplié sur un critique ; créatures vivantes à l’anatomie discernable seulement',
        })}
        <a href="https://www.d20srd.org/srd/classes/rogue.htm#sneakAttack" target="_blank" rel="noopener">d20srd</a></span
      >
    </div>
  {/if}

  {#each pools as a (a.id)}
    <div class="row">
      <button class="link" onclick={() => info(a)}><strong>{tr(a.name)}</strong></button>
      <span
        >{a.max - usedOf(a)} / {a.max}
        {a.pool ? (a.id === 'empty-body' ? tr({ en: 'rounds', fr: 'rounds' }) : tr({ en: 'hp', fr: 'pv' })) : ''}
        {a.period === 'week' ? tr({ en: 'this week', fr: 'cette semaine' }) : tr({ en: 'today', fr: 'aujourd’hui' })}</span
      >
      {#if a.pool}
        <input type="number" min="1" max={a.max - usedOf(a)} bind:value={poolAmount[a.id]} aria-label={tr(a.name)} />
        <button disabled={usedOf(a) >= a.max} onclick={() => spend(a, Math.max(1, poolAmount[a.id] ?? 1))}
          >{tr({ en: 'Use', fr: 'Utiliser' })}</button
        >
      {:else}
        <button disabled={usedOf(a) >= a.max} onclick={() => spend(a, 1)}>{tr({ en: 'Use', fr: 'Utiliser' })}</button>
      {/if}
      <span class="note">{tr(a.lines[0])}</span>
    </div>
  {/each}

  {#if f.immunities.length || f.spellResistance}
    <p>
      {#if f.immunities.length}<strong>{tr({ en: 'Immune to', fr: 'Immunisé contre' })} :</strong>
        {f.immunities.map((x) => tr(x)).join(', ')}{/if}
      {#if f.spellResistance}<strong>{tr({ en: 'Spell resistance', fr: 'Résistance à la magie' })} :</strong>
        {f.spellResistance}{/if}
    </p>
  {/if}
  {#if f.notes.length}
    <ul class="notes">
      {#each f.notes as n, i (i)}
        <li>
          <button class="link" onclick={() => openPopup({ title: n.name, lines: [n.text], source: n.source })}
            ><strong>{tr(n.name)}</strong></button
          > : {tr(n.text)}
        </li>
      {/each}
    </ul>
  {/if}
  <div class="row">
    <button onclick={() => newDayClassUses(app.character)}>☀ {tr({ en: 'New day', fr: 'Nouveau jour' })}</button>
    {#if f.abilities.some((a) => a.period === 'week')}
      <button onclick={() => newWeekClassUses(app.character)}>{tr({ en: 'New week', fr: 'Nouvelle semaine' })}</button>
    {/if}
  </div>
</section>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  button {
    min-height: 2.6rem;
    padding: 0 0.9rem;
  }
  button.link {
    background: none;
    border: none;
    min-height: 0;
    padding: 0;
    text-decoration: underline dotted var(--accent);
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
  input[type='number'] {
    width: 4.5rem;
    min-height: 2.6rem;
    text-align: center;
  }
  .on,
  .warn {
    color: var(--accent);
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .notes {
    margin: 0.4rem 0;
    padding-left: 1.2rem;
  }
</style>
