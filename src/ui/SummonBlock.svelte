<script lang="ts">
  // Summoned creatures (Summon Nature's Ally): pick the spell and the creature, then track each one's hit points and the
  // rounds left (1 round per caster level, counted down at the start of your turn by the turn bar).
  // https://www.d20srd.org/srd/spells/summonNaturesAllyI.htm, Augment Summoning: https://www.d20srd.org/srd/feats.htm#augmentSummoning
  import { rules } from '../data/rules'
  import { computeCreature } from '../engine/creature'
  import type { SummonState } from '../model/character'
  import { app, tr, view } from '../state.svelte'
  import CreatureCard from './CreatureCard.svelte'
  import { newUid } from './items'

  const s = $derived(view.sheet)
  // Summon lists the character can cast: spell level on one of its class lists, with a spell slot for it.
  const available = $derived(
    rules.summonLists
      .map((list) => {
        const spell = rules.spells.get(list.spellId)
        const caster = s.spellcasting.find((sc) => {
          const lvl = spell?.level[sc.def.list]
          return lvl !== undefined && sc.slots.some((x) => x.spellLevel === lvl && x.total > 0)
        })
        return caster && spell ? { list, spell, caster } : undefined
      })
      .filter((x) => !!x),
  )
  let listIdx = $state(0)
  let creatureId = $state('')
  let count = $state(1)
  const chosen = $derived(available[listIdx])
  // A higher list also allows 1d3 creatures of the list just below, 1d4+1 from lower lists (the spell text).
  const creatureOptions = $derived(
    chosen
      ? available
          .filter((a) => a.list.spellId.startsWith('summon') && a.list.level <= chosen.list.level)
          .sort((a, b) => b.list.level - a.list.level)
          .map((a) => ({ level: a.list.level, ids: a.list.creatures.filter((id) => rules.creatures.has(id)) }))
      : [],
  )
  const augment = $derived(s.feats.some((f) => f.featId === 'augment-summoning'))

  function summon() {
    if (!chosen || !creatureId) return
    const rounds = chosen.caster.casterLevel.total
    const list = (app.character.summons ??= [])
    for (let i = 0; i < Math.max(1, count); i++)
      list.push({
        uid: newUid(),
        creatureId,
        rounds,
        spellId: chosen.list.spellId,
        augmented: augment,
        maxHp: false,
        damage: 0,
      })
    creatureId = ''
    count = 1
  }
  const dismiss = (uid: string) => (app.character.summons = (app.character.summons ?? []).filter((x) => x.uid !== uid))
  const sheetOf = (x: SummonState) =>
    computeCreature(rules.creatures.get(x.creatureId)!, { augment: x.augmented, maxHp: x.maxHp, hpManual: x.hpManual })
</script>

{#if available.length || (app.character.summons ?? []).length}
  <section class="box wide summons">
    <h3>{tr({ en: 'Summoned creatures', fr: 'Créatures convoquées' })}</h3>
    {#if available.length}
      <div class="add">
        <select bind:value={listIdx} aria-label={tr({ en: 'Spell', fr: 'Sort' })}>
          {#each available as a, i (a.list.spellId)}<option value={i}>{tr(a.spell.name)}</option>{/each}
        </select>
        <select bind:value={creatureId} aria-label={tr({ en: 'Creature', fr: 'Créature' })}>
          <option value="">— {tr({ en: 'creature', fr: 'créature' })} —</option>
          {#each creatureOptions as g (g.level)}
            <optgroup
              label={g.level === chosen?.list.level
                ? tr({ en: '1 creature', fr: '1 créature' })
                : g.level === (chosen?.list.level ?? 0) - 1
                  ? tr({ en: '1d3 creatures (list below)', fr: '1d3 créatures (liste inférieure)' })
                  : tr({ en: '1d4+1 creatures (lower lists)', fr: '1d4+1 créatures (listes inférieures)' })}
            >
              {#each g.ids as id (id)}<option value={id}>{tr(rules.creatures.get(id)?.name)}</option>{/each}
            </optgroup>
          {/each}
        </select>
        <label class="count">× <input type="number" min="1" max="5" bind:value={count} /></label>
        <button class="go" onclick={summon} disabled={!creatureId}>{tr({ en: 'Summon', fr: 'Convoquer' })}</button>
      </div>
      <p class="note">
        {tr({
          en: `Duration: 1 round per caster level (${chosen?.caster.casterLevel.total ?? 0}), counted down at the start of your turn.${augment ? ' Augment Summoning: +4 Str and Con.' : ''}`,
          fr: `Durée : 1 round par niveau de lanceur (${chosen?.caster.casterLevel.total ?? 0}), décompté au début de votre tour.${augment ? ' Convocation suprême : +4 For et Con.' : ''}`,
        })}
      </p>
    {/if}
    <div class="cards">
      {#each app.character.summons ?? [] as x (x.uid)}
        {#if rules.creatures.has(x.creatureId)}
          <CreatureCard
            state={x}
            sheet={() => sheetOf(x)}
            subtitle={`${x.rounds} ${tr({ en: 'rd left', fr: 'rd restants' })}${x.augmented ? ` · ${tr({ en: 'augmented', fr: 'suprême' })}` : ''}`}
            onremove={() => dismiss(x.uid)}
            removeLabel={{ en: 'Dismiss', fr: 'Renvoyer' }}
          />
        {/if}
      {:else}
        <p class="note">{tr({ en: 'No creature summoned.', fr: 'Aucune créature convoquée.' })}</p>
      {/each}
    </div>
  </section>
{/if}

<style>
  .add {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  select,
  input {
    min-height: 2.6rem;
    padding: 0 0.5rem;
  }
  .count input {
    width: 3.5rem;
    text-align: center;
  }
  .go {
    min-height: 2.6rem;
    padding: 0 1rem;
    background: var(--frame);
    color: var(--on-frame);
    border-color: var(--frame);
  }
  .go:disabled {
    background: var(--paper-2);
    color: var(--ink-soft);
    border-color: var(--rule);
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    gap: 0.8rem;
    margin-top: 0.6rem;
  }
</style>
