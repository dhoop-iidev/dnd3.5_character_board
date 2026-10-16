<script lang="ts">
  import { rules } from '../../data/rules'
  import type { BonusType, I18n } from '../../data/types'
  import { fmt } from '../../engine/compute'
  import { FLAGS, UI } from '../../i18n/ui'
  import { app, lang, tr, view } from '../../state.svelte'
  import { fmtDistance } from '../format'
  import { itemInfo, newUid } from '../items'
  import { openPopup } from '../popupState.svelte'
  import StatValue from '../StatValue.svelte'
  import WarningList from '../WarningList.svelte'
  import ManeuverBlock from '../ManeuverBlock.svelte'
  import TurnBar from '../TurnBar.svelte'
  import SummonBlock from '../SummonBlock.svelte'
  import WildShapeBlock from '../WildShapeBlock.svelte'
  import { effectName } from '../effects'

  const s = $derived(view.sheet)
  const c = $derived(app.character)
  const t = $derived(app.character.toggles)
  const loadout = $derived(c.loadouts.find((l) => l.id === c.activeLoadout) ?? c.loadouts[0])
  const hasFeat = (id: string) => s.feats.some((f) => f.featId === id)
  const maxPa = $derived(s.bab.total)
  const maxCe = $derived(Math.min(5, s.bab.total))

  const DAMAGE_TYPES: Record<string, I18n> = {
    slashing: { en: 'slashing', fr: 'tranchant' },
    piercing: { en: 'piercing', fr: 'perforant' },
    bludgeoning: { en: 'bludgeoning', fr: 'contondant' },
  }
  const DR_TYPES: Record<string, I18n> = {
    adamantine: { en: 'adamantine', fr: 'adamantium' },
    'cold iron': { en: 'cold iron', fr: 'fer froid' },
    silver: { en: 'silver', fr: 'argent' },
    magic: { en: 'magic', fr: 'magie' },
  }
  const hpCurrent = $derived(s.hpMax.total - c.hp.damage)
  function adjustHp(delta: number) {
    app.character.hp.damage = Math.max(0, app.character.hp.damage - delta)
  }

  const crit = (range: number, mult: number) => `${range < 20 ? `${range}–20` : '20'}/×${mult}`

  // ---- Weapon Master daily uses (Sword and Fist p.39)
  const used = (id: string) => c.dailyUsesSpent[id] ?? 0
  function spend(id: string, delta: number, max: number) {
    app.character.dailyUsesSpent[id] = Math.min(max, Math.max(0, used(id) + delta))
  }
  function newDay() {
    app.character.dailyUsesSpent = {}
  }

  // ---- loadout editing
  const weapons = $derived(c.inventory.filter((i) => i.kind === 'weapon' && i.location !== 'stored'))
  const shields = $derived(
    c.inventory.filter(
      (i) => i.kind === 'armor' && ['shield', 'tower'].includes(rules.armor.get(i.refId)?.category ?? ''),
    ),
  )
  function toggleGrip(uid: string) {
    const l = app.character.loadouts.find((x) => x.id === loadout.id)!
    const grip = l.twoHanded ?? []
    l.twoHanded = grip.includes(uid) ? grip.filter((w) => w !== uid) : [...grip, uid]
  }
  const meleeInHand = $derived(
    loadout.weapons.filter((uid) => {
      const it = c.inventory.find((i) => i.uid === uid)
      return it && rules.weapons.get(it.refId)?.kind === 'melee'
    }).length,
  )
  function toggleWeapon(uid: string) {
    const l = app.character.loadouts.find((x) => x.id === loadout.id)!
    l.weapons = l.weapons.includes(uid) ? l.weapons.filter((w) => w !== uid) : [...l.weapons, uid]
  }

  // ---- effects
  const conditions = [...rules.conditions.values()].sort((a, b) => tr(a.name).localeCompare(tr(b.name)))
  let conditionToAdd = $state('')
  function addCondition() {
    if (!conditionToAdd) return
    app.character.activeEffects.push({ uid: newUid(), kind: 'condition', refId: conditionToAdd, enabled: true })
    conditionToAdd = ''
  }
  function effectPopup(e: (typeof c.activeEffects)[number]) {
    if (e.kind === 'condition') {
      const d = rules.conditions.get(e.refId ?? '')
      if (d)
        openPopup({ title: d.name, summary: d.summary, html: d.text, source: d.source, noteKey: `condition:${d.id}` })
    } else if (e.kind === 'magic') {
      const d = rules.magicItems.get(e.refId ?? '')
      if (d) openPopup({ title: d.name, summary: d.duration, html: d.text, source: d.source, noteKey: `magic:${d.id}` })
    }
  }
  /** Set or clear an effect's remaining rounds (blank = no set duration). */
  function setRounds(e: (typeof c.activeEffects)[number], v: string) {
    const n = Math.floor(Number(v))
    if (v === '' || !(n > 0)) delete e.rounds
    else e.rounds = n
  }
  function removeEffect(uid: string) {
    app.character.activeEffects = app.character.activeEffects.filter((e) => e.uid !== uid)
  }

  // Custom effect (e.g. poison: −2 Con damage; a bard's song: +1 morale on attacks)
  const TARGETS: { id: string; label: I18n }[] = [
    { id: 'attack.all', label: { en: 'Attack rolls', fr: "Jets d'attaque" } },
    { id: 'damage.all', label: { en: 'Damage', fr: 'Dégâts' } },
    { id: 'ac', label: { en: 'AC', fr: 'CA' } },
    { id: 'save.all', label: { en: 'All saves', fr: 'Tous les jets de sauvegarde' } },
    { id: 'skill.all', label: { en: 'All skills', fr: 'Toutes les compétences' } },
    { id: 'initiative', label: { en: 'Initiative', fr: 'Initiative' } },
    ...(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).flatMap((a) => [
      {
        id: `ability.${a}`,
        label: { en: `${a.toUpperCase()} (bonus/penalty)`, fr: `${a.toUpperCase()} (bonus/malus)` },
      },
      {
        id: `abilityDamage.${a}`,
        label: { en: `${a.toUpperCase()} damage`, fr: `Affaiblissement ${a.toUpperCase()}` },
      },
    ]),
    { id: 'hp.max', label: { en: 'Max HP', fr: 'PV max' } },
    { id: 'speed', label: { en: 'Speed (ft)', fr: 'Vitesse (pieds)' } },
  ]
  const TYPES: BonusType[] = [
    'untyped',
    'enhancement',
    'morale',
    'luck',
    'competence',
    'insight',
    'sacred',
    'profane',
    'resistance',
    'deflection',
    'dodge',
    'circumstance',
    'alchemical',
  ]
  let custom = $state({ name: '', target: 'attack.all', bonusType: 'untyped' as BonusType, value: 1 })
  function addCustom() {
    if (!custom.name.trim()) return
    app.character.activeEffects.push({
      uid: newUid(),
      kind: 'custom',
      enabled: true,
      custom: {
        name: { en: custom.name, fr: custom.name },
        modifiers: [{ target: custom.target, bonusType: custom.bonusType, value: Number(custom.value) }],
      },
    })
    custom = { name: '', target: 'attack.all', bonusType: 'untyped', value: 1 }
  }
</script>

<!-- Quick reference: the combat numbers of the main sheet in one strip. -->
<section class="box summary">
  <h3>{tr({ en: 'At a glance', fr: "En un coup d'œil" })}</h3>
  <div class="strip">
    <div class="cell hp">
      <span>{tr(UI.hpShort)}</span>
      <strong class:low={hpCurrent <= s.hpMax.total / 4}>{hpCurrent}</strong>
      <small
        >/ {s.hpMax.total}{c.hp.nonlethal ? ` · ${c.hp.nonlethal} NL` : ''}{c.hp.temp
          ? ` · +${c.hp.temp} temp`
          : ''}</small
      >
      <div class="hpbtn">
        <button onclick={() => adjustHp(-5)}>−5</button><button onclick={() => adjustHp(-1)}>−1</button>
        <button onclick={() => adjustHp(1)}>+1</button><button onclick={() => adjustHp(5)}>+5</button>
      </div>
    </div>
    <div class="cell">
      <span>{tr(UI.acShort)}</span><StatValue stat={() => view.sheet.ac} title={UI.ac} signed={false} big />
    </div>
    <div class="cell">
      <span>{tr(UI.touch)}</span><StatValue stat={() => view.sheet.touchAc} title={UI.touch} signed={false} />
    </div>
    <div class="cell">
      <span>{tr({ en: 'Flat-footed', fr: 'Dépourvu' })}</span><StatValue
        stat={() => view.sheet.flatFootedAc}
        title={UI.flatFooted}
        signed={false}
      />
    </div>
    <div class="cell">
      <span>{tr(UI.initiative)}</span><StatValue stat={() => view.sheet.initiative} title={UI.initiative} />
    </div>
    <div class="cell"><span>{tr(UI.fort)}</span><StatValue stat={() => view.sheet.saves.fort} title={UI.fort} /></div>
    <div class="cell"><span>{tr(UI.ref)}</span><StatValue stat={() => view.sheet.saves.ref} title={UI.ref} /></div>
    <div class="cell"><span>{tr(UI.will)}</span><StatValue stat={() => view.sheet.saves.will} title={UI.will} /></div>
    <div class="cell">
      <span>{tr({ en: 'BAB', fr: 'BBA' })}</span><StatValue stat={() => view.sheet.bab} title={UI.bab} />
    </div>
    <div class="cell">
      <span>{tr(UI.grapple)}</span><StatValue stat={() => view.sheet.grapple} title={UI.grapple} />
    </div>
    <div class="cell">
      <span>{tr({ en: 'AoO / round', fr: 'AO / round' })}</span><StatValue
        stat={() => view.sheet.attacksOfOpportunity}
        title={UI.aoo}
        signed={false}
      />
    </div>
    <div class="cell">
      <span>{tr(UI.speed)}</span><strong class="plain">{fmtDistance(s.speed.current, lang())}</strong>
    </div>
  </div>
  {#if s.flags.some((f) => FLAGS[f])}<p class="flags">
      {[...new Set(s.flags)]
        .filter((f) => FLAGS[f])
        .map((f) => tr(FLAGS[f]))
        .join(' · ')}
    </p>{/if}
</section>

<TurnBar />

<div class="grid">
  <section class="box">
    <h3>{tr({ en: 'Combat options', fr: 'Options de combat' })}</h3>
    {#if hasFeat('power-attack')}
      <label class="slider">
        <span>{tr({ en: 'Power Attack', fr: 'Attaque en puissance' })} : <strong>{t.powerAttack}</strong></span>
        <input type="range" min="0" max={maxPa} bind:value={app.character.toggles.powerAttack} />
      </label>
    {/if}
    {#if hasFeat('combat-expertise')}
      <label class="slider">
        <span>{tr({ en: 'Combat Expertise', fr: 'Expertise du combat' })} : <strong>{t.combatExpertise}</strong></span>
        <input type="range" min="0" max={maxCe} bind:value={app.character.toggles.combatExpertise} />
      </label>
    {/if}
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.fightingDefensively} disabled={t.totalDefense} />
      {tr({ en: 'Fighting defensively (−4 attack, +2 AC)', fr: 'Combat sur la défensive (−4 attaque, +2 CA)' })}
    </label>
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.totalDefense} disabled={t.fightingDefensively} />
      {tr({ en: 'Total defense (+4 AC, no attack)', fr: 'Défense totale (+4 CA, pas d’attaque)' })}
    </label>
    <label class="check">
      <input type="checkbox" bind:checked={app.character.toggles.situational['flatFooted']} />
      {tr(UI.flatFooted)}
    </label>
    {#if s.feats.some((f) => f.featId === 'rapid-shot')}
      <label class="check">
        <input type="checkbox" bind:checked={app.character.toggles.rapidShot} />
        {tr({
          en: 'Rapid Shot (extra ranged attack, −2 on all)',
          fr: 'Tir rapide (attaque à distance supplémentaire, −2 à toutes)',
        })}
      </label>
    {/if}
  </section>

  <section class="box">
    <h3>{tr({ en: 'Resistances & conditional modifiers', fr: 'Résistances et modificateurs conditionnels' })}</h3>
    <div class="fields">
      <label>
        {tr({ en: 'Damage reduction', fr: 'Réduction des dégâts' })}
        {#each s.damageReduction as d, i (i)}<strong class="dr">{d.value} <small>({tr(d.source)})</small></strong
          >{/each}
        <input bind:value={app.character.defenses.dr} placeholder="—" />
      </label>
      <label
        >{tr({ en: 'Spell resistance', fr: 'Résistance à la magie' })}<input
          bind:value={app.character.defenses.sr}
          placeholder="—"
        /></label
      >
      <label class="wide"
        >{tr({ en: 'Energy resistances', fr: 'Résistances aux énergies' })}<input
          bind:value={app.character.defenses.resistances}
          placeholder="—"
        /></label
      >
      <label class="wide">
        {tr({
          en: 'Conditional modifiers (e.g. +2 vs fear)',
          fr: 'Modificateurs conditionnels (ex. +2 contre la terreur)',
        })}
        <textarea rows="3" bind:value={app.character.conditionalModifiers}></textarea>
      </label>
    </div>
  </section>

  {#if (s.classLevels['druid'] ?? 0) >= 5 || app.character.wildShape}<div class="wide"><WildShapeBlock /></div>{/if}
  {#if s.spellcasting.length || (app.character.summons ?? []).length}<div class="wide"><SummonBlock /></div>{/if}
  {#if s.martial.caps}<div class="wide"><ManeuverBlock /></div>{/if}

  <section class="box wide">
    <h3>{tr({ en: 'Attacks', fr: 'Attaques' })}</h3>
    <div class="attacks">
      {#each s.attacks as a (a.itemUid)}
        <article class="attack" class:choice={a.weaponOfChoice}>
          <h4>
            {tr(a.name)}
            {#if a.weaponOfChoice}<small>★ {tr({ en: 'weapon of choice', fr: 'arme de prédilection' })}</small>{/if}
            {#if a.hand}<small
                >{a.hand === 'primary'
                  ? tr({ en: 'primary hand', fr: 'main directrice' })
                  : tr({ en: 'off hand', fr: 'main non directrice' })}</small
              >{/if}
          </h4>
          <div class="line">
            <span>{tr({ en: 'Attack', fr: 'Attaque' })}</span>
            <StatValue
              stat={() => view.sheet.attacks.find((x) => x.itemUid === a.itemUid)!.attack}
              title={a.name}
              big
            />
            <span class="iter">{a.iterative.map(fmt).join(' / ')}</span>
          </div>
          <div class="line">
            <span>{tr({ en: 'Damage', fr: 'Dégâts' })}</span>
            <strong>{a.damageDice}</strong>
            <StatValue stat={() => view.sheet.attacks.find((x) => x.itemUid === a.itemUid)!.damage} title={a.name} />
            <small>{a.weapon.damageTypes.map((d) => tr(DAMAGE_TYPES[d] ?? { en: d, fr: d })).join(' / ')}</small>
          </div>
          <div class="line">
            <span>{tr({ en: 'Critical', fr: 'Critique' })}</span>
            <strong>{crit(a.critRange, a.critMult.total)}</strong>
            {#if a.critConfirmBonus}<small
                >({tr({ en: 'confirm', fr: 'confirmation' })} +{a.critConfirmBonus}
                {tr({ en: 'battle ardor', fr: 'ardeur au combat' })})</small
              >{/if}
            {#if a.weaponOfChoice && s.weaponMaster.increasedMultiplierPerDay}
              <small>({tr({ en: 'increased multiplier', fr: 'multiplicateur accru' })} : ×{a.critMult.total + 1})</small
              >
            {/if}
          </div>
          {#each a.extraDamage as x, i (i)}
            <div class="line extra">
              <span>+ {x.dice}</span>
              <span
                >{tr(x.type)}{#if x.condition}
                  <em>({tr(x.condition)})</em>{/if} <small>— {tr(x.source)}</small></span
              >
            </div>
          {/each}
          {#each a.critExtraDamage as x, i (i)}
            <div class="line extra">
              <span>{tr({ en: 'On crit', fr: 'Sur critique' })}</span>
              <span>+ {x.dice} {tr(x.type)} <small>— {tr(x.source)}</small></span>
            </div>
          {/each}
          {#if a.bypassDR.length}
            <div class="line extra">
              <span>{tr({ en: 'Overcomes DR', fr: 'Ignore la RD' })}</span>
              <span>{a.bypassDR.map((t) => tr(DR_TYPES[t] ?? { en: t, fr: t })).join(', ')}</span>
            </div>
          {/if}
          {#each a.notes as n, i (i)}
            <div class="line extra"><span>{tr(n.name)}</span><span class="note">{tr(n.text)}</span></div>
          {/each}
          {#if a.weapon.rangeIncrement}
            <div class="line">
              <span>{tr({ en: 'Range increment', fr: 'Facteur de portée' })}</span>
              {fmtDistance(a.weapon.rangeIncrement, lang())}
            </div>
          {/if}
          {#if a.kiDamageMax !== undefined}
            <div class="line">
              <span>{tr({ en: 'Ki damage (max)', fr: 'Dégâts ki (max)' })}</span> <strong>{a.kiDamageMax}</strong>
              {#if t.powerAttack && a.powerAttackAllowed}<small
                  >+ {t.powerAttack * (a.weapon.handedness === 'twoHanded' ? 2 : 1)}
                  {tr({ en: 'Power Attack', fr: 'Attaque en puissance' })}</small
                >{/if}
            </div>
          {/if}
        </article>
      {:else}
        <p>{tr({ en: 'No weapon in hand: tick one below.', fr: 'Aucune arme en main : cochez-en une ci-dessous.' })}</p>
      {/each}
    </div>
    <WarningList areas={['combat']} />
  </section>

  {#if s.weaponMaster.level > 0}
    <section class="box">
      <h3>{tr({ en: 'Weapon Master', fr: "Maître d'armes" })} {s.weaponMaster.level}</h3>
      {#if !s.weaponMaster.active}
        <p class="inactive">
          {tr({
            en: 'Class features suspended: requirements no longer met (Complete Warrior p.16).',
            fr: 'Pouvoirs suspendus : conditions de la classe plus remplies (Complete Warrior p.16).',
          })}
        </p>
      {/if}
      <div class="uses">
        <span>{tr({ en: 'Ki damage', fr: 'Dégâts ki' })}</span>
        <button onclick={() => spend('ki-damage', -1, s.weaponMaster.kiDamagePerDay)}>−</button>
        <strong>{s.weaponMaster.kiDamagePerDay - used('ki-damage')} / {s.weaponMaster.kiDamagePerDay}</strong>
        <button onclick={() => spend('ki-damage', 1, s.weaponMaster.kiDamagePerDay)}
          >{tr({ en: 'Use', fr: 'Utiliser' })}</button
        >
      </div>
      {#if s.weaponMaster.increasedMultiplierPerDay}
        <div class="uses">
          <span>{tr({ en: 'Increased multiplier', fr: 'Multiplicateur accru' })}</span>
          <button onclick={() => spend('increased-multiplier', -1, s.weaponMaster.increasedMultiplierPerDay)}>−</button>
          <strong
            >{s.weaponMaster.increasedMultiplierPerDay - used('increased-multiplier')} / {s.weaponMaster
              .increasedMultiplierPerDay}</strong
          >
          <button onclick={() => spend('increased-multiplier', 1, s.weaponMaster.increasedMultiplierPerDay)}
            >{tr({ en: 'Use', fr: 'Utiliser' })}</button
          >
        </div>
      {/if}
      <p class="note">
        {tr({
          en: 'Ki damage: maximum weapon damage instead of rolling; not on a critical hit; Power Attack is rolled normally. Increased multiplier: declare before rolling damage.',
          fr: "Dégâts ki : dégâts maximum de l'arme au lieu de lancer les dés ; pas sur un coup critique ; l'Attaque en puissance s'ajoute normalement. Multiplicateur accru : à annoncer avant de lancer les dégâts.",
        })}
        <small>Sword and Fist p. 39</small>
      </p>
      <button class="newday" onclick={newDay}
        >☀ {tr({ en: 'New day (reset uses)', fr: 'Nouveau jour (réinitialiser)' })}</button
      >
    </section>
  {/if}

  <section class="box">
    <h3>{tr({ en: 'Active effects', fr: 'Effets actifs' })}</h3>
    <ul class="effects">
      {#each c.activeEffects as e (e.uid)}
        <li class:off={!e.enabled}>
          <input type="checkbox" bind:checked={e.enabled} aria-label={tr(effectName(e))} />
          <button class="link" onclick={() => effectPopup(e)}>{tr(effectName(e))}</button>
          {#if e.kind === 'custom'}<small
              >{e.custom?.modifiers.map((m) => `${m.target} ${fmt(m.value)} (${m.bonusType})`).join(', ')}</small
            >{/if}
          <span
            class="rounds"
            title={tr({
              en: 'Rounds left (blank = no set duration)',
              fr: 'Rounds restants (vide = pas de durée fixée)',
            })}
          >
            {#if e.rounds !== undefined}<button aria-label="−1" onclick={() => setRounds(e, String(e.rounds! - 1))}
                >−</button
              >{/if}
            <input
              type="number"
              min="1"
              inputmode="numeric"
              placeholder="∞"
              value={e.rounds ?? ''}
              onchange={(ev) => setRounds(e, ev.currentTarget.value)}
              aria-label={tr({ en: 'Rounds left', fr: 'Rounds restants' })}
            />
            <small>{tr({ en: 'rd', fr: 'rd' })}</small>
          </span>
          <button class="del" onclick={() => removeEffect(e.uid)} aria-label={tr({ en: 'Remove', fr: 'Retirer' })}
            >✕</button
          >
        </li>
      {:else}
        <li class="none">{tr({ en: 'None', fr: 'Aucun' })}</li>
      {/each}
    </ul>
    <div class="add">
      <select bind:value={conditionToAdd}>
        <option value="">{tr({ en: '— add a condition —', fr: '— ajouter un état —' })}</option>
        {#each conditions as cd (cd.id)}<option value={cd.id}>{tr(cd.name)}</option>{/each}
      </select>
      <button onclick={addCondition} disabled={!conditionToAdd}>＋</button>
    </div>
    <details>
      <summary
        >{tr({ en: 'Custom effect (poison, spell, bonus…)', fr: 'Effet personnalisé (poison, sort, bonus…)' })}</summary
      >
      <div class="custom">
        <input placeholder={tr({ en: 'Name', fr: 'Nom' })} bind:value={custom.name} />
        <select bind:value={custom.target}>
          {#each TARGETS as tg (tg.id)}<option value={tg.id}>{tr(tg.label)}</option>{/each}
        </select>
        <select bind:value={custom.bonusType}>
          {#each TYPES as ty (ty)}<option value={ty}>{ty}</option>{/each}
        </select>
        <input type="number" bind:value={custom.value} />
        <button onclick={addCustom}>＋</button>
      </div>
    </details>
  </section>

  {#if app.character.wildShape}
    <section class="box">
      <h3>{tr({ en: 'Weapons and shield in hand', fr: 'Armes et bouclier en main' })}</h3>
      <p class="note">
        {tr({
          en: 'In wild shape: weapons and shield are melded into the form; the natural attacks of the form are used.',
          fr: 'Sous forme animale : armes et bouclier sont fondus dans la forme ; les attaques naturelles de la forme sont utilisées.',
        })}
      </p>
    </section>
  {:else}
    <section class="box">
      <h3>{tr({ en: 'Weapons and shield in hand', fr: 'Armes et bouclier en main' })}</h3>
      <p class="note">{tr({ en: 'Weapons in hand:', fr: 'Armes en main :' })}</p>
      {#each weapons as w (w.uid)}
        <label class="check">
          <input type="checkbox" checked={loadout.weapons.includes(w.uid)} onchange={() => toggleWeapon(w.uid)} />
          {tr(itemInfo(w).name)}
        </label>
        {#if loadout.weapons.includes(w.uid) && rules.weapons.get(w.refId)?.handedness === 'oneHanded'}
          <label class="check grip">
            <input
              type="checkbox"
              checked={(loadout.twoHanded ?? []).includes(w.uid)}
              onchange={() => toggleGrip(w.uid)}
            />
            {tr({ en: 'held in two hands (Str ×1.5)', fr: 'tenue à deux mains (For ×1,5)' })}
          </label>
        {/if}
      {/each}
      {#if meleeInHand >= 2}
        <label class="check">
          <input
            type="checkbox"
            checked={!!loadout.twoWeapon}
            onchange={(e) =>
              (app.character.loadouts.find((x) => x.id === loadout.id)!.twoWeapon = e.currentTarget.checked)}
          />
          {tr({
            en: 'Fight with two weapons (first ticked = primary hand)',
            fr: 'Combattre à deux armes (la première cochée = main directrice)',
          })}
        </label>
      {/if}
      <label class="field">
        {tr({ en: 'Shield strapped on', fr: 'Bouclier au bras' })}
        <select
          value={loadout.shield ?? ''}
          onchange={(e) => {
            const l = app.character.loadouts.find((x) => x.id === loadout.id)!
            const v = e.currentTarget.value
            if (v) l.shield = v
            else delete l.shield
          }}
        >
          <option value="">—</option>
          {#each shields as sh (sh.uid)}<option value={sh.uid}>{tr(itemInfo(sh).name)}</option>{/each}
        </select>
      </label>
    </section>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
    grid-auto-flow: row dense;
    gap: 1.25rem;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .slider {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.6rem;
  }
  .slider strong {
    font-family: var(--font-num);
  }
  input[type='range'] {
    width: 100%;
    min-height: 2.75rem;
    accent-color: var(--ink);
  }
  .check {
    display: flex;
    gap: 0.6em;
    align-items: center;
    min-height: 2.75rem;
    cursor: pointer;
  }
  .check input {
    flex: none;
    width: 1.2rem;
    height: 1.2rem;
    accent-color: var(--ink);
  }
  .flags {
    color: var(--danger);
    font-size: 0.9em;
  }
  .attacks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    gap: 1rem;
  }
  .attack {
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    padding: 0.6rem 0.85rem 0.4rem;
    background: var(--box);
  }
  .attack.choice {
    border: 1.5px solid var(--frame);
    border-top-width: 3px;
  }
  h4 {
    margin: 0 0 0.3rem;
    padding-bottom: 0.3rem;
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
  }
  h4 small {
    display: block;
    font-family: var(--font-title);
    font-weight: 400;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    color: var(--accent);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
    min-height: 2.9rem;
  }
  .line + .line {
    border-top: 1px solid var(--rule);
  }
  .line > span:first-child {
    min-width: 7em;
    font-family: var(--font-title);
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  .line strong {
    font-family: var(--font-num);
  }
  .iter {
    color: var(--ink-soft);
    font-family: var(--font-num);
    font-size: 0.9em;
  }
  .uses {
    display: flex;
    gap: 0.5em;
    align-items: center;
    min-height: 3rem;
    border-bottom: 1px solid var(--rule);
  }
  .uses span {
    flex: 1;
  }
  .uses strong {
    font-family: var(--font-num);
    min-width: 3.5em;
    text-align: center;
  }
  button {
    font: inherit;
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0 0.7rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    border-color: var(--frame);
    background: var(--paper-2);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .newday {
    margin-top: 0.25rem;
  }
  .note {
    font-size: 0.9em;
    color: var(--ink-soft);
  }
  .effects {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
  }
  .effects li {
    display: flex;
    gap: 0.5em;
    align-items: center;
    border-bottom: 1px solid var(--rule);
    min-height: 2.9rem;
  }
  .effects li input {
    accent-color: var(--ink);
  }
  .rounds {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .rounds input {
    width: 3.6rem;
    min-height: 2.4rem;
    text-align: center;
  }
  .rounds button {
    min-width: 2.4rem;
    min-height: 2.4rem;
  }
  .effects li.off {
    opacity: 0.6;
  }
  .effects small {
    color: var(--ink-soft);
    flex: 1;
  }
  .effects .none {
    font-style: italic;
    color: var(--ink-soft);
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;
    text-decoration-color: var(--rule-strong);
    text-underline-offset: 0.22em;
    text-align: left;
    flex: 1;
  }
  .link:hover:not(:disabled) {
    background: none;
    color: var(--accent);
  }
  .del {
    color: var(--danger);
    border-color: transparent;
  }
  .add,
  .custom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0;
  }
  select,
  .custom input {
    font: inherit;
    min-height: 2.75rem;
    padding: 0 0.5rem;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    max-width: 100%;
  }
  .custom input[type='number'] {
    width: 4.5em;
  }
  .add select {
    flex: 1;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-top: 0.6rem;
    font-family: var(--font-title);
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  .field select {
    font-family: var(--font-body);
    letter-spacing: 0;
  }
  summary {
    cursor: pointer;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    gap: 0.4em;
    list-style: none;
  }
  summary::before {
    content: '+';
    font-family: var(--font-num);
    font-weight: 700;
    width: 1rem;
  }
  details[open] summary::before {
    content: '−';
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .summary {
    margin-bottom: 1.25rem;
  }
  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.1rem;
    align-items: flex-end;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }
  .cell > span {
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .cell.hp strong {
    font-family: var(--font-num);
    font-size: 1.8rem;
    line-height: 1;
  }
  .cell.hp strong.low {
    color: var(--danger);
  }
  .cell .plain {
    font-family: var(--font-num);
    min-height: 2.75rem;
    display: grid;
    place-items: center;
  }
  .hpbtn {
    display: flex;
    gap: 0.2rem;
  }
  .hpbtn button {
    min-width: 2.6rem;
    min-height: 2.4rem;
    padding: 0;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 0.8rem;
  }
  .fields label {
    display: flex;
    flex-direction: column;
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .fields .wide {
    grid-column: 1 / -1;
  }
  .fields input,
  .fields textarea {
    width: 100%;
    min-width: 0;
    font: inherit;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink);
    min-height: 2.5rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--box);
  }
  .grip {
    margin-left: 1.8rem;
    font-size: 0.9em;
  }
  .inactive {
    color: var(--danger);
  }
  .line.extra {
    min-height: 2rem;
    font-size: 0.95em;
    flex-wrap: nowrap;
  }
  .line.extra > span:last-child {
    flex: 1;
    min-width: 0;
  }
  .line.extra small,
  .line.extra em {
    color: var(--ink-soft);
  }
  .line .note {
    flex: 1;
    font-size: 0.9em;
  }
  .dr {
    font-family: var(--font-num);
    color: var(--ink);
  }
</style>
