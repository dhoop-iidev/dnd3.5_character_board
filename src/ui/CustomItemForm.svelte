<script lang="ts">
  // Create an item that isn't in the rulebook (campaign loot, heirloom, homebrew magic item).
  // Its modifiers apply when it is worn, like SRD magic items.
  import type { BonusType, ModifierSpec, Slot } from '../data/types'
  import type { ItemLocation } from '../model/character'
  import { SLOTS } from '../i18n/ui'
  import { app, lang, tr } from '../state.svelte'
  import { newUid } from './items'

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

  let open = $state(false)
  let name = $state('')
  let weight = $state(0)
  let cost = $state(0)
  let text = $state('')
  let slot = $state<Slot | ''>('')
  let location = $state<ItemLocation>('pack')
  let mods = $state<ModifierSpec[]>([])

  function addMod() {
    mods.push({ target: 'ac', bonusType: 'deflection', value: 1 })
  }

  function create() {
    if (!name.trim()) return
    // Weight typed in the current language's unit (kg in French, lb in English; house rule #5: kg = lb / 2).
    const weightLb = lang() === 'fr' ? weight * 2 : weight
    app.character.inventory.push({
      uid: newUid(),
      kind: 'custom',
      refId: '',
      name: { en: name, fr: name },
      quantity: 1,
      location: slot ? 'worn' : location,
      custom: {
        weightLb,
        costGp: cost,
        text: { en: text, fr: text },
        modifiers: mods.length ? $state.snapshot(mods) : undefined,
        slot: slot || undefined,
      },
    })
    name = ''
    weight = 0
    cost = 0
    text = ''
    slot = ''
    mods = []
    open = false
  }
</script>

{#if !open}
  <button class="toggle" onclick={() => (open = true)}>＋ {tr({ en: 'Create a custom item', fr: 'Créer un objet personnalisé' })}</button>
{:else}
  <div class="form">
    <label class="wide">{tr({ en: 'Name', fr: 'Nom' })}<input bind:value={name} /></label>
    <label>{tr({ en: 'Weight', fr: 'Poids' })} ({lang() === 'fr' ? 'kg' : 'lb'})<input type="number" min="0" step="0.1" bind:value={weight} /></label>
    <label>{tr({ en: 'Price (gp)', fr: 'Prix (po)' })}<input type="number" min="0" bind:value={cost} /></label>
    <label>
      {tr({ en: 'Body slot (worn)', fr: 'Emplacement (porté)' })}
      <select bind:value={slot}>
        <option value="">— {tr({ en: 'none', fr: 'aucun' })} —</option>
        {#each Object.entries(SLOTS) as [id, label] (id)}<option value={id}>{tr(label)}</option>{/each}
      </select>
    </label>
    {#if !slot}
      <label>
        {tr({ en: 'Where', fr: 'Où' })}
        <select bind:value={location}>
          <option value="carried">{tr({ en: 'Carried', fr: 'Transporté' })}</option>
          <option value="pack">{tr({ en: 'Backpack', fr: 'Sac à dos' })}</option>
          <option value="stored">{tr({ en: 'Stored', fr: 'Entreposé' })}</option>
        </select>
      </label>
    {/if}
    <label class="wide">{tr({ en: 'Description', fr: 'Description' })}<textarea rows="3" bind:value={text}></textarea></label>

    <div class="wide mods">
      <span>{tr({ en: 'Bonuses when worn (optional)', fr: 'Bonus quand il est porté (facultatif)' })}</span>
      {#each mods as m, i (i)}
        <div class="mod">
          <select bind:value={m.target}>
            {#each TARGETS as [id, label] (id)}<option value={id}>{tr(label)}</option>{/each}
          </select>
          <select bind:value={m.bonusType}>
            {#each TYPES as ty (ty)}<option value={ty}>{ty}</option>{/each}
          </select>
          <input type="number" bind:value={m.value} />
          <button onclick={() => mods.splice(i, 1)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
        </div>
      {/each}
      <button onclick={addMod}>＋ {tr({ en: 'Add a bonus', fr: 'Ajouter un bonus' })}</button>
    </div>

    <div class="wide actions">
      <button class="primary" onclick={create} disabled={!name.trim()}>{tr({ en: 'Create', fr: 'Créer' })}</button>
      <button onclick={() => (open = false)}>{tr({ en: 'Cancel', fr: 'Annuler' })}</button>
    </div>
  </div>
{/if}

<style>
  .toggle,
  button {
    font: inherit;
    min-height: 2.6rem;
    padding: 0 0.8rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .toggle {
    margin-top: 0.6rem;
  }
  .primary {
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .form {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.6rem 0.9rem;
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--rule);
  }
  .wide {
    grid-column: 1 / -1;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  input,
  select,
  textarea {
    font: inherit;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink);
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
  }
  textarea {
    padding: 0.5rem;
  }
  .mods {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .mods > span {
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .mod {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .mod input {
    width: 5rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
