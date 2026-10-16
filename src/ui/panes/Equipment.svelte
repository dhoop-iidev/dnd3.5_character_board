<script lang="ts">
  import type { I18n } from '../../data/types'
  import type { ItemInstance, ItemLocation } from '../../model/character'
  import { SLOTS, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { rules } from '../../data/rules'
  import { fmtWeight } from '../format'
  import { catalog, itemInfo, newUid, norm } from '../items'
  import { openPopup } from '../popupState.svelte'
  import WarningList from '../WarningList.svelte'
  import CustomItemForm from '../CustomItemForm.svelte'
  import ItemUpgrades from '../ItemUpgrades.svelte'
  import EquipmentDoll from '../EquipmentDoll.svelte'
  import ItemSpells from '../ItemSpells.svelte'
  import { isMagicItem } from '../../engine/spellItems'

  // Items whose stored-spell editor is open.
  let spellEditor = $state<Record<string, boolean>>({})

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
      noteKey: `item:${item.uid}`,
    })
  }

  const fmtGp = (n: number) => `${n.toLocaleString(lang() === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 })} ${lang() === 'fr' ? 'po' : 'gp'}`
</script>

<div class="grid">
  <EquipmentDoll />

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
    <p class="total">
      {tr({ en: 'Lift over head', fr: 'Soulever au-dessus de la tête' })} {fmtWeight(load.limits.heavy, lang())} ·
      {tr({ en: 'lift off the ground', fr: 'soulever du sol' })} {fmtWeight({ lb: load.limits.heavy.lb * 2, kg: load.limits.heavy.kg * 2 }, lang())} ·
      {tr({ en: 'push or drag', fr: 'pousser ou tirer' })} {fmtWeight({ lb: load.limits.heavy.lb * 5, kg: load.limits.heavy.kg * 5 }, lang())}
      <a href="https://www.d20srd.org/srd/carryingCapacity.htm#liftingandDragging" target="_blank" rel="noopener">d20srd</a>
    </p>
    <p class="total">{tr({ en: 'Total value of items', fr: 'Valeur totale des objets' })} : {fmtGp(totalGp)}</p>
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
    <CustomItemForm />
  </section>

  <section class="box wide">
    <h3>{tr({ en: 'Money', fr: 'Argent' })}</h3>
    <div class="money">
      {#each [['pp', 'pp', 'pp'], ['gp', 'gp', 'po'], ['sp', 'sp', "pa"], ['cp', 'cp', 'pc']] as const as [key, en, fr] (key)}
        <label>{tr({ en, fr })}<input type="number" min="0" bind:value={app.character.money[key]} /></label>
      {/each}
      <p class="total">
        = {fmtGp(app.character.money.pp * 10 + app.character.money.gp + app.character.money.sp / 10 + app.character.money.cp / 100)}
        · {tr({ en: 'coins weigh 50 per lb (counted in the load)', fr: 'les pièces pèsent 100 au kg (comptées dans la charge)' })}
      </p>
      <label class="other">
        {tr({ en: 'Gems, art and other wealth', fr: 'Gemmes, objets d’art et autres richesses' })}
        <textarea rows="2" bind:value={app.character.money.other}></textarea>
      </label>
    </div>
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
              <tr class:magic={isMagicItem(item)}>
                <td>
                  {#if isMagicItem(item)}<span class="arcane" title={tr({ en: 'Magic item', fr: 'Objet magique' })}>✦</span>{/if}
                  <button class="link" onclick={() => details(item)}>{tr(info.name)}</button>
                  {#if info.stats}<small>{tr(info.stats)}</small>{/if}
                  {#if info.slot}<small class="slot">{tr(SLOTS[info.slot]) || info.slot}</small>{/if}
                  {#if item.kind === 'weapon' || item.kind === 'armor'}<ItemUpgrades {item} />{/if}
                  {#if item.spells?.length}
                    <small class="spells"
                      >{item.spells.map((x) => tr(rules.spells.get(x.spellId)?.name)).join(', ')}{item.charges
                        ? ` · ${item.charges.left}/${item.charges.max} ${tr({ en: 'charges', fr: 'charges' })}`
                        : ''}</small
                    >
                  {/if}
                  {#if spellEditor[item.uid]}<ItemSpells {item} />{/if}
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
                  <button
                    class="spellbtn"
                    class:on={spellEditor[item.uid]}
                    class:has={!!item.spells?.length}
                    onclick={() => (spellEditor[item.uid] = !spellEditor[item.uid])}
                    title={tr({ en: 'Spells stored in this item', fr: 'Sorts stockés dans cet objet' })}
                    aria-label={tr({ en: 'Spells stored in this item', fr: 'Sorts stockés dans cet objet' })}>✦</button
                  >
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
  tr.magic td:first-child {
    box-shadow: inset 3px 0 0 var(--arcane);
  }
  .arcane {
    margin-right: 0.2rem;
  }
  small.spells {
    display: block;
    color: var(--arcane);
  }
  /* Stored-spell editor: discreet on ordinary gear, tinted on items that hold spells. */
  .spellbtn {
    border-color: transparent;
    background: none;
    color: var(--rule-strong);
    font-size: 0.85rem;
  }
  .spellbtn.has {
    color: var(--arcane);
  }
  .spellbtn.on {
    border-color: var(--rule-strong);
    color: var(--arcane);
  }
  .grid {
    display: grid;
    gap: 1.25rem;
  }
  .load {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: baseline;
  }
  .load strong {
    font-family: var(--font-num);
    font-size: 1.5em;
  }
  .band {
    font-family: var(--font-title);
    letter-spacing: 0.06em;
    font-size: 1.1em;
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
    height: 0.6rem;
    margin: 0.6rem 0;
    border: 1px solid var(--frame);
    background: var(--box);
    border-radius: 1px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--ink);
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
    width: 1px;
    background: var(--ink-soft);
  }
  .total {
    margin: 0;
    font-size: 0.9em;
    color: var(--ink-soft);
  }
  input[type='search'] {
    width: 100%;
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.7rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  .results {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .results button,
  .actions button,
  .qty button {
    font: inherit;
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0 0.6rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    cursor: pointer;
  }
  .results button:hover,
  .actions button:hover,
  .qty button:hover {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  .results small {
    color: var(--ink-soft);
    font-style: italic;
  }
  td {
    vertical-align: middle;
  }
  .num {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
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
    min-height: 2.75rem;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--rule-strong);
    text-underline-offset: 0.22em;
  }
  .link:hover {
    color: var(--accent);
  }
  select {
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.4rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    max-width: 11rem;
  }
  .quality {
    min-height: 2.25rem;
    font-size: 0.85em;
    margin: 0.1em 0 0.3em;
  }
  .actions {
    white-space: nowrap;
    text-align: right;
  }
  .del {
    color: var(--danger) !important;
    border-color: transparent !important;
  }
  .money {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: flex-end;
  }
  .money label {
    display: flex;
    flex-direction: column;
    font-family: var(--font-title);
  }
  .money input {
    width: 6.5rem;
    font: inherit;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
  }
  .money .other {
    flex-basis: 100%;
  }
  .money textarea {
    font: inherit;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
    color: var(--ink);
  }
</style>
