<script lang="ts">
  // Paper doll: the 3.5 magic item body slots around the character
  // (https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#limitonMagicItemsWorn).
  import { rules } from '../data/rules'
  import type { I18n, Slot } from '../data/types'
  import type { ItemInstance } from '../model/character'
  import { SLOTS } from '../i18n/ui'
  import { app, tr, view } from '../state.svelte'
  import { itemInfo, newUid, norm } from './items'
  import { openPopup } from './popupState.svelte'

  /** Slot boxes; rings has two places. `hint` lists what fits (as on the official sheet). */
  interface SlotBox {
    id: string
    slot: Slot
    hint: I18n
  }
  const LEFT: SlotBox[] = [
    { id: 'head', slot: 'head', hint: { en: 'Helmets, circlets, hats, headbands', fr: 'Casques, diadèmes, chapeaux, bandeaux' } },
    { id: 'eyes', slot: 'eyes', hint: { en: 'Lenses, goggles', fr: 'Lentilles, lunettes' } },
    { id: 'neck', slot: 'neck', hint: { en: 'Amulets, brooches, necklaces, periapts', fr: 'Amulettes, broches, colliers, périaptes' } },
    { id: 'shoulders', slot: 'shoulders', hint: { en: 'Cloaks, capes, mantles', fr: 'Capes, manteaux, mantelets' } },
    { id: 'body', slot: 'body', hint: { en: 'Armor, robes', fr: 'Armures, robes' } },
    { id: 'torso', slot: 'torso', hint: { en: 'Shirts, vests, vestments', fr: 'Chemises, gilets, vêtements' } },
  ]
  const RIGHT: SlotBox[] = [
    { id: 'arms', slot: 'arms', hint: { en: 'Bracers, bracelets', fr: 'Bracelets, brassards' } },
    { id: 'hands', slot: 'hands', hint: { en: 'Gloves, gauntlets', fr: 'Gants, gantelets' } },
    { id: 'ring1', slot: 'ring', hint: { en: 'Ring', fr: 'Anneau' } },
    { id: 'ring2', slot: 'ring', hint: { en: 'Ring', fr: 'Anneau' } },
    { id: 'waist', slot: 'waist', hint: { en: 'Belts, girdles, sashes', fr: 'Ceintures, écharpes' } },
    { id: 'feet', slot: 'feet', hint: { en: 'Boots, shoes, slippers', fr: 'Bottes, chaussures, chaussons' } },
  ]

  /** Which slot an inventory item occupies when worn. */
  function slotOf(item: ItemInstance): Slot | undefined {
    if (item.kind === 'magic') return rules.magicItems.get(item.refId)?.slot
    if (item.kind === 'armor') {
      const cat = rules.armor.get(item.refId)?.category
      return cat === 'shield' || cat === 'tower' ? undefined : 'body'
    }
    if (item.kind === 'gear' && item.refId.endsWith('outfit')) return 'torso'
    if (item.kind === 'custom') return item.custom?.slot
    return undefined
  }

  const worn = $derived(app.character.inventory.filter((i) => i.location === 'worn'))
  function itemsIn(box: SlotBox): ItemInstance | undefined {
    const all = worn.filter((i) => slotOf(i) === box.slot)
    if (box.id === 'ring2') return all[1]
    return all[0]
  }

  // ---- slot picker
  let picking = $state<SlotBox | null>(null)
  let query = $state('')
  const owned = $derived(
    picking ? app.character.inventory.filter((i) => i.location !== 'worn' && slotOf(i) === picking!.slot) : [],
  )
  const catalogForSlot = $derived(
    picking
      ? [...rules.magicItems.values()]
          .filter((m) => m.slot === picking!.slot)
          .filter((m) => !query.trim() || norm(m.name.en).includes(norm(query)) || norm(m.name.fr).includes(norm(query)))
          .sort((a, b) => a.priceGp - b.priceGp)
          .slice(0, 30)
      : [],
  )

  function open(box: SlotBox) {
    const item = itemsIn(box)
    if (item) {
      const info = itemInfo(item)
      openPopup({ title: info.name, summary: info.stats, html: info.text, source: info.source, noteKey: `item:${item.uid}` })
    } else {
      picking = box
      query = ''
    }
  }
  function equip(item: ItemInstance) {
    item.location = 'worn'
    picking = null
  }
  function addAndEquip(refId: string) {
    app.character.inventory.push({ uid: newUid(), kind: 'magic', refId, quantity: 1, location: 'worn' })
    picking = null
  }
  function unequip(item: ItemInstance) {
    item.location = 'pack'
  }

  // ---- weapons and shield of the active loadout
  const loadout = $derived(app.character.loadouts.find((l) => l.id === app.character.activeLoadout) ?? app.character.loadouts[0])
  const inHands = $derived(
    [...loadout.weapons, ...(loadout.shield ? [loadout.shield] : [])]
      .map((uid) => app.character.inventory.find((i) => i.uid === uid))
      .filter((i): i is ItemInstance => !!i),
  )
  const slotWarnings = $derived(view.warnings.filter((w) => w.id.startsWith('slot-')))
</script>

{#snippet slotBox(box: SlotBox, side: 'left' | 'right')}
  {@const item = itemsIn(box)}
  <div class="slot {side}" class:filled={!!item}>
    <button class="frame" onclick={() => open(box)}>
      <span class="name">{item ? tr(itemInfo(item).name) : '—'}</span>
    </button>
    <div class="label">
      <strong>{tr(SLOTS[box.slot])}</strong>
      <small>{tr(box.hint)}</small>
    </div>
    {#if item}
      <button class="off" onclick={() => unequip(item)} title={tr({ en: 'Take off', fr: 'Retirer' })}>⤓</button>
    {/if}
  </div>
{/snippet}

<section class="box doll">
  <h3>{tr({ en: 'Worn items', fr: 'Objets portés' })}</h3>
  <div class="layout">
    <div class="side">
      {#each LEFT as b (b.id)}{@render slotBox(b, 'left')}{/each}
    </div>
    <div class="figure">
      <img
        class="knight"
        src={`${import.meta.env.BASE_URL}images/fenrir-knight.webp`}
        alt={tr({ en: 'Fenrir in his golden full plate', fr: 'Fenrir en harnois doré' })}
      />
    </div>
    <div class="side">
      {#each RIGHT as b (b.id)}{@render slotBox(b, 'right')}{/each}
    </div>
  </div>

  <div class="weapons">
    <strong>{tr({ en: 'In hand', fr: 'En main' })} — {tr(loadout.name)}</strong>
    <div class="row">
      {#each inHands as item (item.uid)}
        {@const info = itemInfo(item)}
        <button
          class="frame weapon"
          onclick={() => openPopup({ title: info.name, summary: info.stats, html: info.text, source: info.source, noteKey: `item:${item.uid}` })}
        >
          <span class="name">{tr(info.name)}</span>
          {#if info.stats}<small>{tr(info.stats)}</small>{/if}
        </button>
      {/each}
    </div>
  </div>

  {#each slotWarnings as w (w.id)}<p class="warn">⛔ {tr(w.message)}</p>{/each}
</section>

{#if picking}
  <div class="picker" role="dialog" aria-modal="true">
    <div class="sheet box">
      <h3>{tr(SLOTS[picking.slot])}</h3>
      {#if owned.length}
        <p class="sub">{tr({ en: 'From your inventory', fr: 'Dans votre inventaire' })}</p>
        <ul>
          {#each owned as item (item.uid)}
            <li><button onclick={() => equip(item)}>⤒ {tr(itemInfo(item).name)}</button></li>
          {/each}
        </ul>
      {/if}
      <p class="sub">{tr({ en: 'Add a magic item (SRD)', fr: 'Ajouter un objet magique (SRD)' })}</p>
      <input type="search" bind:value={query} placeholder={tr({ en: 'Search…', fr: 'Chercher…' })} />
      <ul class="catalog">
        {#each catalogForSlot as m (m.id)}
          <li>
            <button onclick={() => addAndEquip(m.id)}>
              ＋ {tr(m.name)} <small>{m.priceGp.toLocaleString()} {tr({ en: 'gp', fr: 'po' })}</small>
            </button>
          </li>
        {:else}
          <li><small>{tr({ en: 'No SRD item for this slot.', fr: 'Aucun objet du SRD pour cet emplacement.' })}</small></li>
        {/each}
      </ul>
      <button class="close" onclick={() => (picking = null)}>{tr({ en: 'Close', fr: 'Fermer' })}</button>
    </div>
  </div>
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(10rem, 1fr) minmax(0, 1.4fr) minmax(10rem, 1fr);
    gap: 1.25rem;
    align-items: center;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .slot {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.2rem 0.35rem;
    align-items: center;
  }
  /* Short leader line toward the character, like the official sheet. */
  .slot::after {
    content: '';
    position: absolute;
    top: 1.375rem;
    width: 1.25rem;
    height: 1.5px;
    background: var(--frame);
  }
  .left::after {
    right: -1.25rem;
  }
  .right::after {
    left: -1.25rem;
  }
  .label {
    grid-column: 1 / -1;
    line-height: 1.15;
    padding-left: 0.1rem;
  }
  .frame {
    grid-column: 1;
    min-height: 2.75rem;
    padding: 0.3rem 0.7rem;
    text-align: left;
    font: inherit;
    color: var(--ink-soft);
    background: var(--box);
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    cursor: pointer;
  }
  .frame:hover {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  .filled .frame {
    color: var(--ink);
    border: 1.5px solid var(--frame);
    font-weight: 600;
  }
  .name {
    display: block;
  }
  .label strong {
    font-family: var(--font-title);
    font-weight: 400;
    letter-spacing: 0.05em;
    color: var(--ink);
    font-size: 1.1rem;
  }
  .label small {
    display: block;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }
  .off {
    grid-column: 2;
    grid-row: 1;
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .off:hover {
    border-color: var(--frame);
  }
  .weapons {
    margin-top: 1.25rem;
    border-top: 1px solid var(--rule);
    padding-top: 0.75rem;
  }
  .weapons strong {
    font-family: var(--font-title);
    font-weight: 400;
    letter-spacing: 0.05em;
    color: var(--ink);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
  .weapon {
    color: var(--ink);
    border: 1.5px solid var(--frame);
    font-weight: 600;
  }
  .weapon small {
    display: block;
    color: var(--ink-soft);
    font-weight: 400;
    font-size: 0.8rem;
  }
  .warn {
    color: var(--danger);
    margin: 0.5rem 0 0;
  }
  .picker {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    background: rgb(20 17 14 / 0.45);
    padding: 1rem;
  }
  .sheet {
    width: min(32rem, 100%);
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: var(--shadow-pop);
  }
  .sub {
    margin: 0.6rem 0 0.3rem;
    font-family: var(--font-title);
    letter-spacing: 0.05em;
    color: var(--ink-soft);
  }
  .picker ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .picker li button,
  .close {
    width: 100%;
    min-height: 2.75rem;
    text-align: left;
    font: inherit;
    background: none;
    border: none;
    border-bottom: 1px solid var(--rule);
    color: var(--ink);
    cursor: pointer;
  }
  .picker li button:hover {
    background: var(--paper-2);
  }
  .picker small {
    color: var(--ink-soft);
  }
  .picker input {
    width: 100%;
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.6rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  .close {
    margin-top: 0.8rem;
    text-align: center;
    border: 1.5px solid var(--frame);
    border-radius: 4px;
  }
  /* Tablet portrait / phone: character on top, slots in two columns below. */
  @media (max-width: 52rem) {
    .layout {
      grid-template-columns: 1fr 1fr;
    }
    .figure {
      grid-column: 1 / -1;
      order: -1;
    }
    .slot::after {
      display: none;
    }
  }
  @media (max-width: 30rem) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  .figure {
    display: grid;
    place-items: center;
  }
  .knight {
    width: 100%;
    max-height: 38rem;
    object-fit: contain;
  }
</style>
