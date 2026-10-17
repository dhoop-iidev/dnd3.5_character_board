<script lang="ts">
  // Barbarian, monk, paladin and rogue features at the table: rage (start / end, fatigue), smite evil, flurry of blows,
  // sneak attack, abilities with daily or weekly uses and pools (lay on hands, wholeness of body), immunities, notes.
  // https://www.d20srd.org/srd/classes/barbarian.htm, monk.htm, paladin.htm, rogue.htm
  import type { ClassAbility } from '../engine/compute'
  import { app, tr, view } from '../state.svelte'
  import { BARDIC_KEY, endRage, isRaging, newDayClassUses, newWeekClassUses, RAGE_ENCOUNTER_KEY, RAGE_KEY, removeSongs, songEffects, startRage, startSong, stopSong, useBardicMusic } from './classActions'
  import { BARD_URL, type BardicSong } from '../engine/arcane'
  import { openPopup } from './popupState.svelte'
  import { takeDamage } from '../engine/hitPoints'

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
  // Paladin smite evil and crusader smite (ToB p. 11) work the same way at the table.
  const SMITES = { 'smite-evil': 'smite', 'crusader-smite': 'crusaderSmite' } as const
  type SmiteId = keyof typeof SMITES
  const smites = $derived(f.abilities.filter((a): a is ClassAbility & { id: SmiteId } => a.id in SMITES))
  function useSmite(a: ClassAbility & { id: SmiteId }) {
    spend(a, 1)
    app.character.toggles[SMITES[a.id]] = true
  }
  const pools = $derived(f.abilities.filter((a) => !(a.id in SMITES)))

  // Crusader steely resolve (ToB p. 10): damage from attacks goes into the delayed damage pool, up to its cap; the
  // overflow is taken at once. The pool is taken at the end of the turn (Turn bar).
  const steely = $derived(f.steelyResolve)
  let incoming = $state(0)
  function delayDamage(n: number) {
    if (!steely || n <= 0) return
    const m = app.character.martial
    const into = Math.min(n, steely.cap - (m.pool ?? 0))
    m.pool = (m.pool ?? 0) + into
    if (n > into) takeDamage(app.character.hp, n - into, app.character.activeEffects)
    incoming = 0
  }
  function healPool(n: number) {
    const m = app.character.martial
    m.pool = Math.max(0, (m.pool ?? 0) - n)
  }
  // Bardic music: uses per day = bard level; songs need Perform ranks.
  const music = $derived(f.bardicMusic)
  const musicUsed = $derived(c.dailyUsesSpent[BARDIC_KEY] ?? 0)
  const songOf = (id: string) => songEffects(c).find((e) => e.refId === id)
  let greatnessHp = $state(0)
  function addGreatnessHp() {
    const e = songOf('inspire-greatness')
    if (!e || greatnessHp <= 0) return
    if (e.tempHp) app.character.hp.temp = Math.max(0, app.character.hp.temp - e.tempHp)
    e.tempHp = greatnessHp
    app.character.hp.temp += greatnessHp
    greatnessHp = 0
  }
  const songInfo = (x: BardicSong) =>
    openPopup({
      title: x.name,
      lines: [x.text, { en: `Bard level ${x.minLevel}, ${x.ranks} Perform ranks`, fr: `Barde niveau ${x.minLevel}, ${x.ranks} degrés de Représentation` }],
      source: { srdUrl: BARD_URL },
      noteKey: `class:${x.id}`,
    })
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

  {#if music}
    <div class="row">
      <strong>{tr({ en: 'Bardic music', fr: 'Musique de barde' })}</strong>
      <span>{tr({ en: 'Today', fr: 'Aujourd’hui' })} : {music.perDay - musicUsed} / {music.perDay}</span>
      <span class="note">{tr({ en: 'Perform ranks', fr: 'Degrés de Représentation' })} : {music.performRanks}</span>
    </div>
    {#each music.songs as x (x.id)}
      {@const running = songOf(x.id)}
      <div class="row song">
        <button class="link" onclick={() => songInfo(x)}>{tr(x.name)}</button>
        {#if !x.available}
          <span class="note warn">{tr({ en: `needs ${x.ranks} Perform ranks`, fr: `il faut ${x.ranks} degrés de Représentation` })}</span>
        {:else if running}
          {#if running.rounds === undefined}
            <span class="on">{tr({ en: 'singing', fr: 'en train de chanter' })}</span>
            <button onclick={() => stopSong(running)}>{tr({ en: 'Stop (5 more rounds)', fr: 'Arrêter (encore 5 rounds)' })}</button>
          {:else}
            <span class="on">{running.rounds} {tr({ en: 'rd left', fr: 'rd restants' })}</span>
          {/if}
          <button onclick={() => removeSongs(app.character, (e) => e.refId === x.id)}>{tr({ en: 'End', fr: 'Fin' })}</button>
          {#if x.id === 'inspire-greatness'}
            <input type="number" min="0" bind:value={greatnessHp} aria-label={tr({ en: 'Temporary hit points', fr: 'Points de vie temporaires' })} />
            <button disabled={!greatnessHp} onclick={addGreatnessHp}
              >{tr({ en: `Temp. hp (2d10 + ${2 * view.sheet.abilities.con.mod})`, fr: `PV temp. (2d10 + ${2 * view.sheet.abilities.con.mod})` })}</button
            >
            {#if running.tempHp}<span class="note">+{running.tempHp} {tr({ en: 'temp. hp', fr: 'PV temp.' })}</span>{/if}
          {/if}
        {:else if x.effect}
          <button class="go" disabled={musicUsed >= music.perDay} onclick={() => startSong(app.character, x.id)}>{tr({ en: 'Sing', fr: 'Chanter' })}</button>
        {:else if !x.free}
          <button disabled={musicUsed >= music.perDay} onclick={() => useBardicMusic(app.character)}>{tr({ en: 'Use', fr: 'Utiliser' })}</button>
        {/if}
        <span class="note">{tr(x.text)}</span>
      </div>
    {/each}
    <p class="note">
      {tr({
        en: 'Starting a song is a standard action. While singing you can’t cast spells or use scrolls or wands. One song at a time: starting another stops the singing of the first, whose effect lasts 5 more rounds (house rule #35).',
        fr: 'Commencer un chant est une action simple. Tant que vous chantez, pas de sort ni de parchemin ou de baguette. Un chant à la fois : en commencer un autre arrête le premier, dont l’effet dure encore 5 rounds (règle maison n° 35).',
      })}
      <a href={BARD_URL} target="_blank" rel="noopener">d20srd</a>
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
      {#if c.toggles.flurry && s.attacks.some((a) => a.weapon.id === 'quarterstaff')}
        <label class="check">
          <input type="checkbox" bind:checked={app.character.toggles.staffBothEnds} />
          {tr({
            en: 'Both ends of the quarterstaff this round (Power Attack ×1 / none; one end only: ×2)',
            fr: 'Les deux extrémités du bâton ce round (Attaque en puissance ×1 / aucune ; une seule extrémité : ×2)',
          })}
        </label>
      {/if}
    </div>
  {/if}

  {#each smites as smite (smite.id)}
    <div class="row">
      <strong>{tr(smite.name)}</strong>
      <span>{tr({ en: 'Today', fr: 'Aujourd’hui' })} : {smite.max - usedOf(smite)} / {smite.max}</span>
      {#if c.toggles[SMITES[smite.id]]}
        <span class="on">{tr({ en: 'next melee attack', fr: 'prochaine attaque au corps à corps' })}</span>
        <button onclick={() => (app.character.toggles[SMITES[smite.id]] = false)}>{tr({ en: 'Cancel', fr: 'Annuler' })}</button>
      {:else}
        <button class="go" disabled={usedOf(smite) >= smite.max} onclick={() => useSmite(smite)}
          >{tr({ en: 'Smite (this attack)', fr: 'Châtier (cette attaque)' })}</button
        >
      {/if}
      <button class="link" onclick={() => info(smite)}>ⓘ</button>
    </div>
  {/each}

  {#if steely}
    <div class="row">
      <strong>{tr({ en: 'Steely resolve', fr: 'Résolution d’acier' })}</strong>
      <span>{tr({ en: 'Delayed damage', fr: 'Dégâts différés' })} : <strong>{steely.pool}</strong> / {steely.cap}</span>
      {#if steely.furious}<span class="on">{tr({ en: 'Furious counterstrike', fr: 'Riposte furieuse' })} +{steely.furious}</span>{/if}
      <input type="number" min="0" bind:value={incoming} aria-label={tr({ en: 'Damage', fr: 'Dégâts' })} />
      <button class="go" disabled={!incoming} onclick={() => delayDamage(incoming)}>{tr({ en: 'Take (delayed)', fr: 'Subir (différé)' })}</button>
      <button disabled={!incoming || !steely.pool} onclick={() => {
        healPool(incoming)
        incoming = 0
      }}>{tr({ en: 'Heal the pool', fr: 'Soigner la réserve' })}</button>
    </div>
    <p class="note">
      {tr({
        en: 'Damage from attacks goes into the pool up to its cap (the rest is taken at once); the pool is taken at the end of your next turn (Turn bar). Furious counterstrike: + pool ÷ 5 (min. +1, max. +6) on attack and damage during your turn.',
        fr: 'Les dégâts des attaques vont dans la réserve jusqu’à son plafond (le reste est subi aussitôt) ; la réserve est subie à la fin de votre prochain tour (barre de tour). Riposte furieuse : + réserve ÷ 5 (min. +1, max. +6) à l’attaque et aux dégâts pendant votre tour.',
      })}
      <small>Tome of Battle p. 10</small>
    </p>
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
  input[type='number'] {
    width: 4.5rem;
    min-height: 2.4rem;
    font: inherit;
  }
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
