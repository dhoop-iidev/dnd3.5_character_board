<script lang="ts">
  import type { I18n } from '../../data/types'
  import type { ItemInstance, ItemLocation } from '../../model/character'
  import { SLOTS, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { fmtWeight } from '../format'
  import { catalog, itemInfo, newUid, norm } from '../items'
  import { openPopup } from '../popupState.svelte'
  import WarningList from '../WarningList.svelte'

  const LOCATIONS: { id: ItemLocation; label: I18n }[] = [
    { id: 'worn', label: { en: 'Worn', fr: 'Porté' } },
    { id: 'carried', label: { en: 'Carried (hands, belt)', fr: 'Transporté (mains, ceinture)' } },
    { id: 'pack', label: { en: 'Backpack', fr: 'Sac à dos' } },
    { id: 'stored', label: { en: 'Stored (not carried)', fr: 'Entreposé (non transporté)' } },
  ]

  const load = $derived(view.sheet.load)
  const pct = $derived(Math.min(100, (load.carried.lb / load.limits.heavy.lb) * 100))
  const totalGp = $derived(app.character.inventory.reduce((s, i) => s + itemInfo(i).costGp * i.quantity, 0))

  let query = $state('')
  const results = $derived(
    query.trim().length < 2
      ? []
      : catalog
          .filter((c) => norm(c.name.en).includes(norm(query)) || norm(c.name.fr).includes(norm(query)))
          .slice(0, 12),
  )

  function add(kind: ItemInstance['kind'], refId: string) {
    app.character.inventory.push({ uid: newUid(), kind, refId, quantity: 1, location: 'pack' })
    query = ''
  }

  function remove(uid: string) {
    const c = app.character
    c.inventory = c.inventory.filter((i) => i.uid !== uid)
    for (const l of c.loadouts) {
      l.weapons = l.weapons.filter((w) => w !== uid)
      if (l.shield === uid) delete l.shield
    }
  }

  function setQty(item: ItemInstance, delta: number) {
    item.quantity = Math.max(0, item.quantity + delta)
    if (item.quantity === 0) remove(item.uid)
  }

  /** Drinking a potion: one fewer in the inventory, and its effect becomes active. */
  function drink(item: ItemInstance) {
    app.character.activeEffects.push({ uid: newUid(), kind: 'magic', refId: item.refId, enabled: true })
    setQty(item, -1)
  }

  function details(item: ItemInstance) {
    const info = itemInfo(item)
    openPopup({
      title: info.name,
      summary: info.stats,
      lines: [
        { en: `Weight ${fmtWeight(info.weight, 'en')} · ${info.costGp} gp`, fr: `Poids ${fmtWeight(info.weight, 'fr')} · ${info.costGp} po` },
        ...(info.slot ? [{ en: `Slot: ${SLOTS[info.slot]?.en ?? info.slot}`, fr: `Emplacement : ${SLOTS[info.slot]?.fr ?? info.slot}` }] : []),
      ],
      html: info.text,
      source: info.source,
    })
  }

  const fmtGp = (n: number) => `${n.toLocaleString(lang() === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 })} ${lang() === 'fr' ? 'po' : 'gp'}`
</script>

<div class="grid">
  <section class="box wide">
    <h3>{tr(UI.load)}</h3>
    <div class="load">
      <strong>{fmtWeight(load.carried, lang())}</strong>
      <span class="band {load.band}">{tr(UI.loadBand[load.band])}</span>
      <span class="limits">
        {tr(UI.loadBand.light)} ≤ {fmtWeight(load.limits.light, lang())} ·
        {tr(UI.loadBand.medium)} ≤ {fmtWeight(load.limits.medium, lang())} ·
        {tr(UI.loadBand.heavy)} ≤ {fmtWeight(load.limits.heavy, lang())}
      </span>
    </div>
    <div class="bar" role="meter" aria-valuenow={load.carried.lb} aria-valuemin={0} aria-valuemax={load.limits.heavy.lb}>
      <div class="fill {load.band}" style="width: {pct}%"></div>
      <div class="mark" style="left: {(load.limits.light.lb / load.limits.heavy.lb) * 100}%"></div>
      <div class="mark" style="left: {(load.limits.medium.lb / load.limits.heavy.lb) * 100}%"></div>
    </div>
    <p class="total">{tr({ en: 'Total value', fr: 'Valeur totale' })} : {fmtGp(totalGp)}</p>
    <WarningList areas={['inventory']} />
  </section>

  <section class="box wide">
    <h3>{tr({ en: 'Add an item', fr: 'Ajouter un objet' })}</h3>
    <input
      type="search"
      bind:value={query}
      placeholder={tr({ en: 'Search weapons, armor, gear, magic items…', fr: 'Chercher armes, armures, matériel, objets magiques…' })}
    />
    {#if results.length}
      <ul class="results">
        {#each results as r (r.kind + r.id)}
          <li><button onclick={() => add(r.kind, r.id)}>＋ {tr(r.name)} <small>{r.kind}</small></button></li>
        {/each}
      </ul>
    {/if}
  </section>

  {#each LOCATIONS as loc (loc.id)}
    {@const items = app.character.inventory.filter((i) => i.location === loc.id)}
    {#if items.length}
      <section class="box wide">
        <h3>{tr(loc.label)}</h3>
        <table>
          <thead>
            <tr>
              <th>{tr({ en: 'Item', fr: 'Objet' })}</th>
              <th class="num">{tr({ en: 'Qty', fr: 'Qté' })}</th>
              <th class="num">{tr({ en: 'Weight', fr: 'Poids' })}</th>
              <th class="num">{tr({ en: 'Price', fr: 'Prix' })}</th>
              <th>{tr({ en: 'Where', fr: 'Où' })}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each items as item (item.uid)}
              {@const info = itemInfo(item)}
              <tr>
                <td>
                  <button class="link" onclick={() => details(item)}>{tr(info.name)}</button>
                  {#if info.stats}<small>{tr(info.stats)}</small>{/if}
                  {#if info.slot}<small class="slot">{tr(SLOTS[info.slot]) || info.slot}</small>{/if}
                  {#if item.kind === 'weapon' || item.kind === 'armor'}
                    <select
                      class="quality"
                      value={item.enhancement ? `+${item.enhancement}` : item.masterwork ? 'mw' : ''}
                      onchange={(e) => {
                        const v = e.currentTarget.value
                        item.masterwork = v !== ''
                        item.enhancement = v.startsWith('+') ? Number(v.slice(1)) : undefined
                      }}
                    >
                      <option value="">{tr({ en: 'normal', fr: 'normal' })}</option>
                      <option value="mw">{tr({ en: 'masterwork', fr: 'de maître' })}</option>
                      {#each [1, 2, 3, 4, 5] as n (n)}<option value={`+${n}`}>+{n}</option>{/each}
                    </select>
                  {/if}
                </td>
                <td class="num qty">
                  <button onclick={() => setQty(item, -1)} aria-label="−1">−</button>
                  {item.quantity}
                  <button onclick={() => setQty(item, 1)} aria-label="+1">+</button>
                </td>
                <td class="num">{fmtWeight({ lb: info.weight.lb * item.quantity, kg: info.weight.kg * item.quantity }, lang())}</td>
                <td class="num">{fmtGp(info.costGp)}</td>
                <td>
                  <select bind:value={item.location}>
                    {#each LOCATIONS as l (l.id)}<option value={l.id}>{tr(l.label)}</option>{/each}
                  </select>
                </td>
                <td class="actions">
                  {#if info.isPotion}
                    <button onclick={() => drink(item)}>{tr({ en: 'Drink', fr: 'Boire' })}</button>
                  {/if}
                  <button class="del" onclick={() => remove(item.uid)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  {/each}
</div>

<style>
  .grid {
    display: grid;
    gap: 1rem;
  }
  .box {
    border: 2px solid var(--ink);
    border-radius: 6px;
    padding: 0.5rem 0.75rem 0.75rem;
    background: var(--paper);
    min-width: 0;
    overflow-x: auto;
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
  .load {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: baseline;
  }
  .load strong {
    font-size: 1.5em;
  }
  .band {
    font-weight: 700;
    text-transform: uppercase;
  }
  .band.medium,
  .band.heavy {
    color: var(--warn);
  }
  .band.overloaded {
    color: var(--danger);
  }
  .limits {
    color: var(--ink-soft);
    font-size: 0.9em;
  }
  .bar {
    position: relative;
    height: 0.8rem;
    margin: 0.5rem 0;
    border: 1px solid var(--rule);
    background: var(--box);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--ink-soft);
  }
  .fill.medium,
  .fill.heavy {
    background: var(--warn);
  }
  .fill.overloaded {
    background: var(--danger);
  }
  .mark {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--accent);
  }
  .total {
    margin: 0;
    font-size: 0.9em;
  }
  input[type='search'] {
    width: 100%;
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.6rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
  }
  .results {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .results button,
  .actions button,
  .qty button {
    font: inherit;
    min-height: 2.4rem;
    min-width: 2.4rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    cursor: pointer;
  }
  .results small {
    color: var(--ink-soft);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.2em 0.3em;
    border-bottom: 1px solid var(--rule);
    text-align: left;
    vertical-align: middle;
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
  td small {
    display: block;
    color: var(--ink-soft);
    font-size: 0.8em;
  }
  .slot {
    font-style: italic;
  }
  .link {
    font: inherit;
    background: none;
    border: none;
    padding: 0.25em 0;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    text-decoration: underline dotted var(--accent);
  }
  select {
    font: inherit;
    min-height: 2.4rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    max-width: 11rem;
  }
  .quality {
    min-height: 2rem;
    font-size: 0.85em;
    margin-top: 0.2em;
  }
  .actions {
    white-space: nowrap;
    text-align: right;
  }
  .del {
    color: var(--danger) !important;
  }
</style>
