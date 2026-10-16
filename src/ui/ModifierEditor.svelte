<script lang="ts">
  // Bonus rows of a custom item or weapon: target, bonus type, value, and an optional condition ("vs fear"), which
  // makes the bonus situational (switched on in its breakdown popup, like the SRD conditional bonuses).
  import type { BonusType, ModifierSpec } from '../data/types'
  import { tr } from '../state.svelte'

  let { mods = $bindable() }: { mods: ModifierSpec[] } = $props()

  const TARGETS = [
    ['attack.all', { en: 'Attack rolls', fr: "Jets d'attaque" }],
    ['damage.all', { en: 'Damage', fr: 'Dégâts' }],
    ['ac', { en: 'AC', fr: 'CA' }],
    ['save.all', { en: 'All saves', fr: 'Tous les jets de sauvegarde' }],
    ['save.fort', { en: 'Fortitude', fr: 'Vigueur' }],
    ['save.ref', { en: 'Reflex', fr: 'Réflexes' }],
    ['save.will', { en: 'Will', fr: 'Volonté' }],
    ['initiative', { en: 'Initiative', fr: 'Initiative' }],
    ['skill.all', { en: 'All skills', fr: 'Toutes les compétences' }],
    ['ability.str', { en: 'Strength', fr: 'Force' }],
    ['ability.dex', { en: 'Dexterity', fr: 'Dextérité' }],
    ['ability.con', { en: 'Constitution', fr: 'Constitution' }],
    ['ability.int', { en: 'Intelligence', fr: 'Intelligence' }],
    ['ability.wis', { en: 'Wisdom', fr: 'Sagesse' }],
    ['ability.cha', { en: 'Charisma', fr: 'Charisme' }],
    ['hp.max', { en: 'Max HP', fr: 'PV max' }],
    ['speed', { en: 'Speed (ft)', fr: 'Vitesse (pieds)' }],
  ] as const
  const TYPES: BonusType[] = ['enhancement', 'deflection', 'resistance', 'luck', 'insight', 'competence', 'morale', 'sacred', 'profane', 'naturalArmor', 'armor', 'shield', 'dodge', 'circumstance', 'untyped']

  function add() {
    mods.push({ target: 'ac', bonusType: 'deflection', value: 1 })
  }
  function setCondition(m: ModifierSpec, v: string) {
    if (v.trim()) m.condition = { en: v, fr: v }
    else delete m.condition
  }
</script>

<div class="mods">
  {#each mods as m, i (i)}
    <div class="mod">
      <select bind:value={m.target} aria-label={tr({ en: 'Applies to', fr: 'S’applique à' })}>
        {#each TARGETS as [id, label] (id)}<option value={id}>{tr(label)}</option>{/each}
      </select>
      <select bind:value={m.bonusType} aria-label={tr({ en: 'Bonus type', fr: 'Type de bonus' })}>
        {#each TYPES as ty (ty)}<option value={ty}>{ty}</option>{/each}
      </select>
      <input type="number" bind:value={m.value} aria-label={tr({ en: 'Value', fr: 'Valeur' })} />
      <input
        class="cond"
        value={tr(m.condition ?? { en: '', fr: '' })}
        onchange={(e) => setCondition(m, e.currentTarget.value)}
        placeholder={tr({ en: 'condition (optional): vs fear…', fr: 'condition (facultatif) : contre la terreur…' })}
      />
      <button onclick={() => mods.splice(i, 1)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
    </div>
  {/each}
  <button onclick={add}>＋ {tr({ en: 'Add a bonus', fr: 'Ajouter un bonus' })}</button>
</div>

<style>
  .mods {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
  }
  .mod {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  select,
  input,
  button {
    min-height: 2.4rem;
    font: inherit;
  }
  input[type='number'] {
    width: 4.5rem;
  }
  .cond {
    min-width: 14rem;
  }
</style>
