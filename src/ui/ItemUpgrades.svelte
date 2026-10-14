<script lang="ts">
  // Quality, special material and magic special abilities of a weapon, armor or shield.
  import { rules } from '../data/rules'
  import type { ItemInstance } from '../model/character'
  import { tr } from '../state.svelte'
  import { openPopup } from './popupState.svelte'

  let { item }: { item: ItemInstance } = $props()

  const isWeapon = $derived(item.kind === 'weapon')
  const weapon = $derived(isWeapon ? rules.weapons.get(item.refId) : undefined)
  const armorDef = $derived(item.kind === 'armor' ? rules.armor.get(item.refId) : undefined)
  const isShield = $derived(armorDef?.category === 'shield' || armorDef?.category === 'tower')
  const target = $derived<'melee' | 'ranged' | 'armor' | 'shield'>(
    isWeapon ? (weapon?.kind === 'ranged' ? 'ranged' : 'melee') : isShield ? 'shield' : 'armor',
  )
  const materials = $derived(
    [...rules.materials.values()].filter((m) => m.appliesTo.includes(isWeapon ? 'weapon' : isShield ? 'shield' : 'armor')),
  )
  const properties = $derived(
    [...rules.itemProperties.values()]
      .filter((p) => p.appliesTo.includes(target))
      .sort((a, b) => a.bonusEquivalent - b.bonusEquivalent || tr(a.name).localeCompare(tr(b.name))),
  )
  const chosen = $derived(item.properties ?? [])
  const totalBonus = $derived(
    (item.enhancement ?? 0) + chosen.reduce((s, id) => s + (rules.itemProperties.get(id)?.bonusEquivalent ?? 0), 0),
  )

  let open = $state(false)

  function setQuality(v: string) {
    item.masterwork = v !== ''
    item.enhancement = v.startsWith('+') ? Number(v.slice(1)) : undefined
  }
  function setMaterial(v: string) {
    if (v) item.material = v
    else delete item.material
  }
  function toggleProperty(id: string) {
    const list = item.properties ?? []
    item.properties = list.includes(id) ? list.filter((p) => p !== id) : [...list, id]
    if (!item.properties.length) delete item.properties
  }
  function info(id: string) {
    const p = rules.itemProperties.get(id)
    if (p) openPopup({ title: p.name, summary: p.effects.notes, html: p.text, source: p.source, noteKey: `property:${p.id}` })
  }
</script>

<div class="upgrades">
  <select
    value={item.enhancement ? `+${item.enhancement}` : item.masterwork ? 'mw' : ''}
    onchange={(e) => setQuality(e.currentTarget.value)}
    aria-label={tr({ en: 'Quality', fr: 'Qualité' })}
  >
    <option value="">{tr({ en: 'normal', fr: 'normal' })}</option>
    <option value="mw">{tr({ en: 'masterwork', fr: 'de maître' })}</option>
    {#each [1, 2, 3, 4, 5] as n (n)}<option value={`+${n}`}>+{n}</option>{/each}
  </select>
  {#if materials.length}
    <select value={item.material ?? ''} onchange={(e) => setMaterial(e.currentTarget.value)} aria-label={tr({ en: 'Material', fr: 'Matériau' })}>
      <option value="">{tr({ en: 'standard material', fr: 'matériau standard' })}</option>
      {#each materials as m (m.id)}<option value={m.id}>{tr(m.name)}</option>{/each}
    </select>
  {/if}
  {#if properties.length}
    <button class="props" onclick={() => (open = !open)} aria-expanded={open}>
      {chosen.length
        ? chosen.map((id) => tr(rules.itemProperties.get(id)?.name)).join(', ')
        : tr({ en: '+ special abilities', fr: '+ propriétés spéciales' })}
    </button>
  {/if}
  {#if totalBonus > 0 && chosen.length}<small>{tr({ en: 'total bonus', fr: 'bonus total' })} +{totalBonus}</small>{/if}
</div>

{#if open}
  <ul class="list">
    {#each properties as p (p.id)}
      <li>
        <label>
          <input type="checkbox" checked={chosen.includes(p.id)} onchange={() => toggleProperty(p.id)} />
          {tr(p.name)}
          <small>{p.bonusEquivalent ? `+${p.bonusEquivalent}` : `${p.flatPriceGp?.toLocaleString()} ${tr({ en: 'gp', fr: 'po' })}`}</small>
        </label>
        <button class="info" onclick={() => info(p.id)} aria-label={tr({ en: 'Details', fr: 'Détails' })}>ⓘ</button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .upgrades {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    margin-top: 0.25rem;
  }
  select,
  .props,
  .info {
    font: inherit;
    font-size: 0.85rem;
    min-height: 2.2rem;
    padding: 0 0.4rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .props {
    max-width: 16rem;
    text-align: left;
  }
  small {
    color: var(--ink-soft);
    font-size: 0.8rem;
  }
  .list {
    list-style: none;
    margin: 0.3rem 0 0;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    max-height: 16rem;
    overflow-y: auto;
    columns: 2 14rem;
  }
  .list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.3rem;
    break-inside: avoid;
  }
  .list label {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    min-height: 2.2rem;
  }
  .info {
    min-width: 2.2rem;
    border-color: transparent;
    background: transparent;
  }
</style>
