<script lang="ts">
  // Turn tracker: round counter, end of my turn (effect durations count down, maneuvers advance), start of my next
  // turn, end of the encounter. Durations in rounds: https://www.d20srd.org/srd/combat/initiative.htm
  import { rules } from '../data/rules'
  import { advanceManeuvers, crusaderEndTurn, crusaderGranted, readiedOf } from '../engine/martial'
  import { app, tr, view } from '../state.svelte'
  import { endRage, RAGE_ENCOUNTER_KEY } from './classActions'
  import { takeDamage } from '../engine/hitPoints'
  import { effectName } from './effects'

  let message = $state('')

  function endTurn() {
    const c = app.character
    const notes: string[] = []
    if (c.martial) {
      advanceManeuvers(c.martial, rules, 'endOfTurn')
      // Crusader (ToB pp. 9–10): one withheld maneuver granted, or recovery and a new draw when none is left.
      const crusader = view.sheet.classLevels['crusader'] ?? 0
      if (crusader) {
        const r = crusaderEndTurn(c.martial, readiedOf(c, rules, 'crusader'), crusaderGranted(rules, crusader))
        if (r === 'granted') notes.push(tr({ en: 'one maneuver granted', fr: 'une manœuvre accordée' }))
        if (r === 'recovered') notes.push(tr({ en: 'crusader maneuvers recovered, new draw', fr: 'manœuvres de croisé récupérées, nouveau tirage' }))
      }
      // Steely resolve (ToB p. 10): the delayed damage is taken at the end of the turn.
      if (c.martial.pool) {
        takeDamage(c.hp, c.martial.pool, c.activeEffects)
        notes.push(tr({ en: `${c.martial.pool} delayed damage taken`, fr: `${c.martial.pool} dégâts différés subis` }))
        c.martial.pool = 0
      }
    }
    // Smite applies to one attack: switched off after the turn.
    c.toggles.smite = false
    c.toggles.crusaderSmite = false
    message = notes.join(' · ')
  }
  // A duration in rounds ends just before the initiative count it began on: count it down when your next turn starts
  // (also while switched off: a duration keeps running).
  function startTurn() {
    const c = app.character
    c.round = (c.round ?? 1) + 1
    const expired: string[] = []
    let rageOver = false
    for (const e of c.activeEffects) {
      if (e.rounds === undefined) continue
      e.rounds -= 1
      if (e.rounds <= 0) {
        expired.push(tr(effectName(e)))
        if (e.kind === 'class' && e.refId === 'rage') rageOver = true
        if (e.tempHp) c.hp.temp = Math.max(0, c.hp.temp - e.tempHp)
      }
    }
    c.activeEffects = c.activeEffects.filter((e) => e.rounds === undefined || e.rounds > 0)
    // The end of a rage leaves the barbarian fatigued for the encounter (not from 17th level: tireless rage).
    if (rageOver) endRage(c, view.sheet.classFeatures.rage?.tireless ?? false)
    // Summoned creatures: 1 round per caster level, gone when it runs out.
    for (const x of c.summons ?? []) {
      x.rounds -= 1
      if (x.rounds <= 0) expired.push(tr(rules.creatures.get(x.creatureId)?.name ?? { en: '?', fr: '?' }))
    }
    if (c.summons) c.summons = c.summons.filter((x) => x.rounds > 0)
    // Wild shape: 1 hour per druid level.
    if (c.wildShape) {
      c.wildShape.rounds -= 1
      if (c.wildShape.rounds <= 0) {
        expired.push(tr({ en: 'wild shape', fr: 'forme animale' }))
        delete c.wildShape
      }
    }
    if (c.martial) advanceManeuvers(c.martial, rules, 'startOfTurn')
    message = expired.length ? tr({ en: 'Ended: ', fr: 'Terminé : ' }) + expired.join(', ') : ''
  }
  function endEncounter() {
    const c = app.character
    delete c.round
    c.summons = []
    // Effects that last the encounter (fatigue after a rage) end; rage is allowed again in the next encounter.
    c.activeEffects = c.activeEffects.filter((e) => !e.encounter)
    delete c.dailyUsesSpent[RAGE_ENCOUNTER_KEY]
    if (c.martial) {
      c.martial.expended = []
      c.martial.active = []
      delete c.martial.granted
      // Delayed damage still pending is taken when the encounter ends.
      if (c.martial.pool) takeDamage(c.hp, c.martial.pool, c.activeEffects)
      delete c.martial.pool
    }
    message = tr({
      en: 'Encounter over: maneuvers recovered, running maneuvers ended.',
      fr: 'Rencontre terminée : manœuvres récupérées, manœuvres en cours terminées.',
    })
  }
</script>

<section class="box wide turn">
  <h3>{tr({ en: 'Turn', fr: 'Tour' })}</h3>
  <div class="row">
    <span class="round">{tr({ en: 'Round', fr: 'Round' })} <strong>{app.character.round ?? 1}</strong></span>
    <button class="main" onclick={endTurn}>⏵ {tr({ en: 'End of my turn', fr: 'Fin de mon tour' })}</button>
    <button onclick={startTurn}>{tr({ en: 'Start of my next turn', fr: 'Début de mon tour suivant' })}</button>
    <button onclick={endEncounter}>{tr({ en: 'End of encounter', fr: 'Fin de la rencontre' })}</button>
    {#if message}<span class="msg" role="status">{message}</span>{/if}
  </div>
  <p class="note">
    {tr({
      en: 'End of my turn: strike bonuses end. Start of my next turn: effects with a duration lose 1 round (removed at 0), as a duration ends just before the initiative count it began on.',
      fr: 'Fin de mon tour : les bonus des frappes se terminent. Début de mon tour suivant : les effets avec une durée perdent 1 round (retirés à 0), car une durée prend fin juste avant le rang d’initiative où elle a commencé.',
    })}
  </p>
</section>

<style>
  /* Same spacing as the grid of boxes below it. */
  .turn {
    margin-bottom: 1.25rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .round {
    font-family: var(--font-title);
    margin-right: 0.5rem;
  }
  .round strong {
    font-family: var(--font-num);
    font-size: 1.4rem;
  }
  button {
    min-height: 2.75rem;
    padding: 0 0.9rem;
  }
  button.main {
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .msg {
    color: var(--accent);
  }
  .note {
    font-size: 0.88rem;
    color: var(--ink-soft);
    margin: 0.5rem 0 0;
  }
</style>
