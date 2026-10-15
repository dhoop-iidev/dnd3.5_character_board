<script lang="ts">
  // Stat block of a companion or summoned creature: hit points (maximum dice or entered), AC, attacks, saves…
  // Every computed value opens its breakdown. Stat blocks: SRD monsters (https://www.d20srd.org/srd/monsters/).
  import type { I18n } from '../data/types'
  import { ftToDistance } from '../engine/compute'
  import type { CreatureSheet } from '../engine/creature'
  import type { CreatureState } from '../model/character'
  import { lang, tr } from '../state.svelte'
  import { fmtDistance } from './format'
  import { openPopup } from './popupState.svelte'
  import StatValue from './StatValue.svelte'

  let {
    state,
    sheet,
    subtitle,
    onremove,
    removeLabel,
  }: {
    state: CreatureState
    sheet: () => CreatureSheet
    subtitle?: string
    onremove?: () => void
    removeLabel?: I18n
  } = $props()

  const s = $derived(sheet())
  const d = $derived(s.def)
  const hpLeft = $derived(s.hpMax.total - state.damage)
  const ABBR = {
    str: ['STR', 'FOR'],
    dex: ['DEX', 'DEX'],
    con: ['CON', 'CON'],
    int: ['INT', 'INT'],
    wis: ['WIS', 'SAG'],
    cha: ['CHA', 'CHA'],
  } as const
  const ab = (a: keyof typeof ABBR) => ABBR[a][lang() === 'fr' ? 1 : 0]

  function info() {
    openPopup({
      title: d.name,
      summary: d.typeText,
      lines: [
        { en: `CR ${d.cr} · ${d.alignment.en}`, fr: `FP ${d.cr} · ${d.alignment.fr}` },
        ...(d.specialAttacks.en
          ? [{ en: `Special attacks: ${d.specialAttacks.en}`, fr: `Attaques spéciales : ${d.specialAttacks.fr}` }]
          : []),
        ...(d.specialQualities.en
          ? [{ en: `Special qualities: ${d.specialQualities.en}`, fr: `Particularités : ${d.specialQualities.fr}` }]
          : []),
        ...(d.skills.en ? [{ en: `Skills: ${d.skills.en}`, fr: `Compétences : ${d.skills.fr}` }] : []),
        ...(d.feats.en ? [{ en: `Feats: ${d.feats.en}`, fr: `Dons : ${d.feats.fr}` }] : []),
      ],
      html: { en: d.text.en + d.specialAbilities.en, fr: d.text.fr + d.specialAbilities.fr },
      source: d.source,
      noteKey: `creature:${d.id}`,
    })
  }
  const speedText = $derived(
    [
      fmtDistance(ftToDistance(d.speed.land), lang()),
      ...(d.speed.fly
        ? [
            `${tr({ en: 'fly', fr: 'vol' })} ${fmtDistance(ftToDistance(d.speed.fly), lang())}${d.speed.flyManeuver ? ` (${d.speed.flyManeuver})` : ''}`,
          ]
        : []),
      ...(d.speed.swim ? [`${tr({ en: 'swim', fr: 'nage' })} ${fmtDistance(ftToDistance(d.speed.swim), lang())}`] : []),
      ...(d.speed.climb
        ? [`${tr({ en: 'climb', fr: 'escalade' })} ${fmtDistance(ftToDistance(d.speed.climb), lang())}`]
        : []),
      ...(d.speed.burrow
        ? [`${tr({ en: 'burrow', fr: 'creusement' })} ${fmtDistance(ftToDistance(d.speed.burrow), lang())}`]
        : []),
    ].join(', '),
  )
</script>

<article class="creature">
  <header>
    <div>
      <button class="link name" onclick={info}>{state.name || tr(d.name)}</button>
      <small
        >{state.name ? `${tr(d.name)} · ` : ''}{tr(d.typeText)} · {s.hitDice}
        {tr({ en: 'HD', fr: 'DV' })}{subtitle ? ` · ${subtitle}` : ''}</small
      >
    </div>
    {#if onremove}<button class="del" onclick={onremove} aria-label={tr(removeLabel ?? { en: 'Remove', fr: 'Retirer' })}
        >✕</button
      >{/if}
  </header>

  <div class="hp">
    <span class="hpnow" class:low={hpLeft <= 0}>{hpLeft}</span>
    <span>/</span>
    <StatValue
      stat={() => sheet().hpMax}
      title={{ en: `${d.name.en}: hit points`, fr: `${d.name.fr} : points de vie` }}
      signed={false}
    />
    <span class="pv">{tr({ en: 'hp', fr: 'pv' })}</span>
    <div class="dmg">
      {#each [-5, -1, 1, 5] as n (n)}
        <button onclick={() => (state.damage = Math.max(0, state.damage - n))}>{n > 0 ? `+${n}` : `−${-n}`}</button>
      {/each}
    </div>
    <label class="check">
      <input type="checkbox" bind:checked={state.maxHp} />
      {tr({ en: 'max hit dice', fr: 'dés de vie max' })}
    </label>
    {#if !state.maxHp}
      <label class="manual">
        {tr({ en: 'hp entered', fr: 'pv saisis' })}
        <input
          type="number"
          min="1"
          placeholder={String(state.hpManual === undefined ? s.hpMax.total : d.hp)}
          value={state.hpManual ?? ''}
          onchange={(e) => {
            const v = Number(e.currentTarget.value)
            if (e.currentTarget.value === '' || !v) delete state.hpManual
            else state.hpManual = v
          }}
        />
      </label>
    {/if}
  </div>

  <div class="stats">
    <div>
      <small>{tr({ en: 'AC', fr: 'CA' })}</small><StatValue
        stat={() => sheet().ac}
        title={{ en: 'AC', fr: 'CA' }}
        signed={false}
      />
    </div>
    <div>
      <small>{tr({ en: 'Touch', fr: 'Contact' })}</small><StatValue
        stat={() => sheet().touch}
        title={{ en: 'Touch AC', fr: 'CA de contact' }}
        signed={false}
      />
    </div>
    <div>
      <small>{tr({ en: 'Flat-f.', fr: 'Dépourvu' })}</small><StatValue
        stat={() => sheet().flatFooted}
        title={{ en: 'Flat-footed AC', fr: 'CA pris au dépourvu' }}
        signed={false}
      />
    </div>
    <div>
      <small>{tr({ en: 'Init.', fr: 'Init.' })}</small><StatValue
        stat={() => sheet().initiative}
        title={{ en: 'Initiative', fr: 'Initiative' }}
      />
    </div>
    <div>
      <small>{tr({ en: 'Fort', fr: 'Vig' })}</small><StatValue
        stat={() => sheet().saves.fort}
        title={{ en: 'Fortitude', fr: 'Vigueur' }}
      />
    </div>
    <div>
      <small>{tr({ en: 'Ref', fr: 'Réf' })}</small><StatValue
        stat={() => sheet().saves.ref}
        title={{ en: 'Reflex', fr: 'Réflexes' }}
      />
    </div>
    <div>
      <small>{tr({ en: 'Will', fr: 'Vol' })}</small><StatValue
        stat={() => sheet().saves.will}
        title={{ en: 'Will', fr: 'Volonté' }}
      />
    </div>
    <div>
      <small>{tr({ en: 'BAB', fr: 'BBA' })}</small><StatValue
        stat={() => sheet().bab}
        title={{ en: 'Base attack bonus', fr: 'Bonus de base à l’attaque' }}
      />
    </div>
    <div>
      <small>{tr({ en: 'Grapple', fr: 'Lutte' })}</small><StatValue
        stat={() => sheet().grapple}
        title={{ en: 'Grapple', fr: 'Lutte' }}
      />
    </div>
  </div>

  <ul class="attacks">
    {#each s.attacks as a, i (i)}
      <li>
        <span>{a.attack.count > 1 ? `${a.attack.count} × ` : ''}{tr(a.attack.name)}</span>
        <StatValue stat={() => sheet().attacks[i].bonus} title={a.attack.name} />
        <span class="dmg-text"
          >{a.damage}{a.attack.extra ? ` ${tr(a.attack.extra)}` : ''}{a.attack.critical
            ? ` · ${a.attack.critical}`
            : ''}</span
        >
        <small
          >{a.attack.kind === 'melee'
            ? tr({ en: 'melee', fr: 'corps à corps' })
            : a.attack.kind === 'touch'
              ? tr({ en: 'melee touch', fr: 'contact' })
              : a.attack.kind === 'rangedTouch'
                ? tr({ en: 'ranged touch', fr: 'contact à distance' })
                : tr({ en: 'ranged', fr: 'distance' })}{a.attack.role === 'secondary'
            ? ` · ${tr({ en: 'secondary', fr: 'secondaire' })}`
            : ''}</small
        >
      </li>
    {/each}
  </ul>

  <p class="line">
    {#each ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const as a (a)}
      <span>{ab(a)} {s.abilities[a].score ?? '—'}</span>
    {/each}
  </p>
  <p class="line">
    <small
      >{tr({ en: 'Speed', fr: 'Vitesse' })}
      {speedText} · {tr({ en: 'space/reach', fr: 'espace/allonge' })}
      {fmtDistance(ftToDistance(d.space), lang())} / {fmtDistance(ftToDistance(d.reach), lang())}</small
    >
  </p>
  {#if d.specialAttacks.en || d.specialQualities.en}
    <p class="line"><small>{[tr(d.specialAttacks), tr(d.specialQualities)].filter((x) => x).join(' · ')}</small></p>
  {/if}
  {#if s.special.length}
    <p class="line">
      {#each s.special as sp (sp.id)}
        <button
          class="link chip"
          onclick={() =>
            openPopup({
              title: sp.name,
              html: sp.text,
              source: { srdUrl: 'https://www.d20srd.org/srd/classes/druid.htm#animalCompanion' },
            })}>{tr(sp.name)}</button
        >
      {/each}
    </p>
  {/if}
</article>

<style>
  .creature {
    border: 1.5px solid var(--frame);
    border-radius: 4px;
    padding: 0.6rem 0.8rem;
    background: var(--box);
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: flex-start;
  }
  header small {
    display: block;
    color: var(--ink-soft);
  }
  .name {
    font-family: var(--font-title);
    font-size: 1.1rem;
    font-weight: 700;
  }
  .link {
    background: none;
    border: none;
    padding: 0.1em 0;
    text-align: left;
    text-decoration: underline dotted var(--accent);
  }
  .del {
    min-width: 2.4rem;
    min-height: 2.4rem;
    color: var(--accent);
    border-color: transparent;
  }
  .hp {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin: 0.5rem 0;
  }
  .hpnow {
    font-family: var(--font-num);
    font-size: 1.6rem;
    font-weight: 700;
  }
  .hpnow.low {
    color: var(--accent);
  }
  .pv {
    color: var(--ink-soft);
    margin-right: 0.4rem;
  }
  .dmg {
    display: inline-flex;
    gap: 0.25rem;
  }
  .dmg button {
    min-width: 2.4rem;
    min-height: 2.4rem;
  }
  .check,
  .manual {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .manual input {
    width: 4.5rem;
    min-height: 2.4rem;
    text-align: center;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
  }
  .stats div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stats small {
    color: var(--ink-soft);
    font-size: 0.8rem;
  }
  .attacks {
    list-style: none;
    margin: 0.5rem 0;
    padding: 0;
  }
  .attacks li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    border-bottom: 1px solid var(--rule);
    padding: 0.2rem 0;
  }
  .attacks small {
    color: var(--ink-soft);
  }
  .dmg-text {
    font-family: var(--font-num);
  }
  .line {
    margin: 0.3rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.8rem;
  }
  .line small {
    color: var(--ink-soft);
  }
  .chip {
    font-size: 0.9rem;
  }
</style>
