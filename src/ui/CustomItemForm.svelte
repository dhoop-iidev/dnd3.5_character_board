<script lang="ts">
  // Create an item that isn't in the rulebook:
  // - an object (campaign loot, heirloom, homebrew magic item): its bonuses apply when worn;
  // - a weapon: a base weapon (proficiency, damage, critical) with its own name, description, quality, material, damage
  //   or critical overrides, and bonuses while wielded (special abilities can be added afterwards in the list);
  // - a spell item: scroll, potion, oil, wand or staff, priced with the SRD formulas
  //   (https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm).
  // Spells can also be added later to any item (weapon, ring…) from its row in the list.
  import { rules } from '../data/rules'
  import type { ModifierSpec, Slot, SpellDef } from '../data/types'
  import { defaultSpellLevel, minCasterLevel, SPELL_ITEM_TYPES, spellItemPrice } from '../engine/spellItems'
  import type { ItemLocation, SpellItemType, StoredSpell } from '../model/character'
  import { SLOTS } from '../i18n/ui'
  import { app, lang, tr } from '../state.svelte'
  import { newUid } from './items'
  import ModifierEditor from './ModifierEditor.svelte'
  import SpellPicker from './SpellPicker.svelte'

  type Mode = 'object' | 'weapon' | 'spells'
  let mode = $state<Mode | ''>('')
  let name = $state('')
  let weight = $state(0)
  let cost = $state(0)
  let text = $state('')
  let slot = $state<Slot | ''>('')
  let location = $state<ItemLocation>('carried')
  let mods = $state<ModifierSpec[]>([])

  // ---- weapon
  const baseWeapons = $derived([...rules.weapons.values()].sort((a, b) => tr(a.name).localeCompare(tr(b.name))))
  let baseId = $state('longsword')
  const base = $derived(rules.weapons.get(baseId))
  let quality = $state('')
  let material = $state('')
  let damage = $state('')
  let critRange = $state<number | ''>('')
  let critMult = $state<number | ''>('')
  let costAuto = $state(true)
  let weightAuto = $state(true)
  const weaponMaterials = $derived([...rules.materials.values()].filter((m) => m.appliesTo.includes('weapon')))
  // Default price: the base weapon + masterwork 300 gp + enhancement² × 2,000 gp (special abilities added later).
  const enh = $derived(quality.startsWith('+') ? Number(quality.slice(1)) : 0)
  const autoCost = $derived(
    (base?.costGp ?? 0) + (enh ? enh * enh * 2000 + 300 : quality === 'mw' ? 300 : 0) + (material ? (rules.materials.get(material)?.price.weapon ?? 0) : 0),
  )

  // ---- spell item
  let spellType = $state<SpellItemType>('scroll')
  let stored = $state<StoredSpell[]>([])
  let cl = $state(1)
  const typeDef = $derived(SPELL_ITEM_TYPES[spellType])
  function pickSpell(sp: SpellDef) {
    const level = defaultSpellLevel(sp)
    const t = SPELL_ITEM_TYPES[spellType]
    if (!t.multi) stored = []
    stored.push({
      spellId: sp.id,
      level,
      casterLevel: Math.max(t.minCasterLevel ?? 1, minCasterLevel(level), spellType === 'staff' ? cl : 0),
      activation: t.activation,
      uses: t.uses,
      ...(t.uses === 'charges' ? { cost: 1 } : {}),
    })
  }
  const spellPrice = $derived(spellItemPrice(spellType, stored))
  const autoName = $derived(
    stored.length === 1
      ? `${tr(typeDef.name)} ${lang() === 'fr' ? 'de' : 'of'} ${tr(rules.spells.get(stored[0].spellId)?.name)}`
      : tr(typeDef.name),
  )

  function reset() {
    name = ''
    weight = 0
    cost = 0
    text = ''
    slot = ''
    mods = []
    quality = ''
    material = ''
    damage = ''
    critRange = ''
    critMult = ''
    costAuto = true
    weightAuto = true
    stored = []
    mode = ''
  }

  // Weight typed in the current language's unit (kg in French, lb in English; house rule #5: kg = lb / 2).
  const toLb = (w: number) => (lang() === 'fr' ? w * 2 : w)

  function create() {
    const inv = app.character.inventory
    if (mode === 'object' && name.trim())
      inv.push({
        uid: newUid(),
        kind: 'custom',
        refId: '',
        name: { en: name, fr: name },
        quantity: 1,
        location: slot ? 'worn' : location,
        custom: { weightLb: toLb(weight), costGp: cost, text: { en: text, fr: text }, modifiers: mods.length ? $state.snapshot(mods) : undefined, slot: slot || undefined },
      })
    if (mode === 'weapon' && base) {
      const n = name.trim() || tr(base.name)
      inv.push({
        uid: newUid(),
        kind: 'weapon',
        refId: base.id,
        name: { en: n, fr: n },
        quantity: 1,
        location: 'worn',
        ...(quality === 'mw' ? { masterwork: true } : {}),
        ...(enh ? { enhancement: enh } : {}),
        ...(material ? { material } : {}),
        custom: {
          weightLb: weightAuto ? base.weight.lb : toLb(weight),
          costGp: costAuto ? autoCost : cost,
          text: { en: text, fr: text },
          modifiers: mods.length ? $state.snapshot(mods) : undefined,
          ...(damage.trim() ? { damage: damage.trim() } : {}),
          ...(critRange ? { critRange: Number(critRange) } : {}),
          ...(critMult ? { critMult: Number(critMult) } : {}),
        },
      })
    }
    if (mode === 'spells' && stored.length) {
      const t = SPELL_ITEM_TYPES[spellType]
      const n = name.trim() || autoName
      inv.push({
        uid: newUid(),
        kind: 'custom',
        refId: '',
        name: { en: n, fr: n },
        quantity: 1,
        location: spellType === 'staff' ? 'worn' : 'carried',
        spellItem: spellType,
        spells: $state.snapshot(stored),
        ...(t.charges ? { charges: { left: t.charges, max: t.charges } } : {}),
        custom: { weightLb: t.weightLb, costGp: spellPrice, text: { en: text, fr: text } },
      })
    }
    reset()
  }
</script>

{#if !mode}
  <div class="starts">
    <button class="toggle" onclick={() => (mode = 'object')}>＋ {tr({ en: 'Custom object', fr: 'Objet personnalisé' })}</button>
    <button class="toggle" onclick={() => (mode = 'weapon')}>＋ {tr({ en: 'Custom weapon', fr: 'Arme personnalisée' })}</button>
    <button class="toggle" onclick={() => (mode = 'spells')}
      >＋ {tr({ en: 'Scroll, potion, wand, staff', fr: 'Parchemin, potion, baguette, bâton' })}</button
    >
  </div>
{:else}
  <div class="form">
    {#if mode === 'weapon'}
      <label class="wide">
        {tr({ en: 'Base weapon (proficiency, handedness, damage, critical)', fr: 'Arme de base (maniement, mains, dégâts, critique)' })}
        <select bind:value={baseId}>
          {#each baseWeapons as w (w.id)}<option value={w.id}>{tr(w.name)} — {w.damage.M}, {w.critRange < 20 ? `${w.critRange}–20` : '20'}/×{w.critMult}</option>{/each}
        </select>
      </label>
    {/if}
    {#if mode === 'spells'}
      <label>
        {tr({ en: 'Type', fr: 'Type' })}
        <select bind:value={spellType} onchange={() => (stored = [])}>
          {#each Object.entries(SPELL_ITEM_TYPES) as [id, t] (id)}<option value={id}>{tr(t.name)}</option>{/each}
        </select>
      </label>
      {#if spellType === 'staff'}
        <label
          >{tr({ en: 'Caster level (all spells, min. 8)', fr: 'Niveau de lanceur (tous les sorts, 8 min.)' })}<input
            type="number"
            min="8"
            bind:value={cl}
            onchange={() => stored.forEach((s) => (s.casterLevel = Math.max(8, cl)))}
          /></label
        >
      {/if}
      <div class="wide spells">
        <span
          >{tr({
            en: `Spells (${typeDef.multi ? 'one or more' : 'one'}, up to level ${typeDef.maxLevel})`,
            fr: `Sorts (${typeDef.multi ? 'un ou plusieurs' : 'un seul'}, niveau ${typeDef.maxLevel} max.)`,
          })}</span
        >
        {#each stored as s, i (i)}
          {@const sp = rules.spells.get(s.spellId)}
          <div class="stored school-row school-{sp?.schoolId}">
            <strong>{tr(sp?.name)}</strong>
            <label class="inline">{tr({ en: 'level', fr: 'niveau' })}<input type="number" min="0" max="9" bind:value={s.level} /></label>
            <label class="inline">{tr({ en: 'caster level', fr: 'NLS' })}<input type="number" min="1" max="20" bind:value={s.casterLevel} /></label>
            {#if spellType === 'staff'}
              <label class="inline"
                >{tr({ en: 'charges per use', fr: 'charges par utilisation' })}<select bind:value={s.cost}
                  ><option value={1}>1</option><option value={2}>2 ({tr({ en: 'half price', fr: 'moitié prix' })})</option></select
                ></label
              >
            {/if}
            <button onclick={() => stored.splice(i, 1)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}>✕</button>
          </div>
        {/each}
        {#if typeDef.multi || !stored.length}<SpellPicker onpick={pickSpell} maxLevel={typeDef.maxLevel} />{/if}
        {#if stored.length}
          <p class="note">
            {tr({ en: 'Market price (SRD formula)', fr: 'Prix de vente (formule du DRS)' })} : {spellPrice.toLocaleString()}
            {tr({ en: 'gp', fr: 'po' })}{typeDef.charges ? ` · ${typeDef.charges} ${tr({ en: 'charges', fr: 'charges' })}` : ''}
            <a href="https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm" target="_blank" rel="noopener">d20srd</a>
          </p>
        {/if}
      </div>
    {/if}

    <label class="wide"
      >{tr({ en: 'Name', fr: 'Nom' })}<input
        bind:value={name}
        placeholder={mode === 'weapon' ? tr(base?.name) : mode === 'spells' ? autoName : ''}
      /></label
    >

    {#if mode === 'weapon'}
      <label>
        {tr({ en: 'Quality', fr: 'Qualité' })}
        <select bind:value={quality}>
          <option value="">{tr({ en: 'normal', fr: 'normal' })}</option>
          <option value="mw">{tr({ en: 'masterwork', fr: 'de maître' })}</option>
          {#each [1, 2, 3, 4, 5] as n (n)}<option value={`+${n}`}>+{n}</option>{/each}
        </select>
      </label>
      <label>
        {tr({ en: 'Material', fr: 'Matériau' })}
        <select bind:value={material}>
          <option value="">—</option>
          {#each weaponMaterials as m (m.id)}<option value={m.id}>{tr(m.name)}</option>{/each}
        </select>
      </label>
      <label
        >{tr({ en: 'Damage (blank = base)', fr: 'Dégâts (vide = arme de base)' })}<input bind:value={damage} placeholder={base?.damage.M} /></label
      >
      <label
        >{tr({ en: 'Threat range from', fr: 'Critique à partir de' })}<input type="number" min="15" max="20" bind:value={critRange} placeholder={String(base?.critRange ?? 20)} /></label
      >
      <label
        >{tr({ en: 'Critical multiplier', fr: 'Multiplicateur de critique' })}<input type="number" min="2" max="4" bind:value={critMult} placeholder={String(base?.critMult ?? 2)} /></label
      >
      <label class="check"><input type="checkbox" bind:checked={costAuto} /> {tr({ en: `Price from the rules (${autoCost} gp)`, fr: `Prix selon les règles (${autoCost} po)` })}</label>
      {#if !costAuto}<label>{tr({ en: 'Price (gp)', fr: 'Prix (po)' })}<input type="number" min="0" bind:value={cost} /></label>{/if}
      <label class="check"><input type="checkbox" bind:checked={weightAuto} /> {tr({ en: 'Weight of the base weapon', fr: 'Poids de l’arme de base' })}</label>
      {#if !weightAuto}<label>{tr({ en: 'Weight', fr: 'Poids' })} ({lang() === 'fr' ? 'kg' : 'lb'})<input type="number" min="0" step="0.1" bind:value={weight} /></label>{/if}
    {/if}

    {#if mode === 'object'}
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
            <option value="worn">{tr({ en: 'Worn (on the body)', fr: 'Porté (sur soi)' })}</option>
            <option value="carried">{tr({ en: 'Carried (backpack)', fr: 'Transporté (sac à dos)' })}</option>
            <option value="stored">{tr({ en: 'Stored', fr: 'Entreposé' })}</option>
          </select>
        </label>
      {/if}
    {/if}

    <label class="wide">{tr({ en: 'Description', fr: 'Description' })}<textarea rows="3" bind:value={text}></textarea></label>

    {#if mode !== 'spells'}
      <div class="wide">
        <span class="lbl"
          >{mode === 'weapon'
            ? tr({ en: 'Bonuses while wielded (optional)', fr: 'Bonus quand elle est en main (facultatif)' })
            : tr({ en: 'Bonuses when worn (optional)', fr: 'Bonus quand il est porté (facultatif)' })}</span
        >
        <ModifierEditor bind:mods />
      </div>
    {/if}
    {#if mode === 'weapon'}
      <p class="wide note">
        {tr({
          en: 'After creating it: special abilities (holy, keen…) with the weapon’s quality menu, and stored spells (daylight 3/day…) with its ✦ button.',
          fr: 'Après la création : propriétés spéciales (sainte, acérée…) avec le menu de qualité de l’arme, et sorts stockés (lumière du jour 3/jour…) avec son bouton ✦.',
        })}
      </p>
    {/if}

    <div class="wide actions">
      <button
        class="primary"
        onclick={create}
        disabled={(mode === 'object' && !name.trim()) || (mode === 'spells' && !stored.length)}>{tr({ en: 'Create', fr: 'Créer' })}</button
      >
      <button onclick={reset}>{tr({ en: 'Cancel', fr: 'Annuler' })}</button>
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
  .starts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  .spells {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .spells > span,
  .lbl {
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .stored {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding: 0.3rem 0.5rem;
  }
  label.inline {
    flex-direction: row;
    align-items: center;
  }
  label.inline input {
    width: 4rem;
  }
  label.check {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }
  .note {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
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
  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
