<script lang="ts">
  // Summoned creatures (Summon Nature's Ally, Summon Monster): pick the spell (and the casting class when several can
  // cast it: the caster level sets the duration), the creature and its template, then track each one's hit points and
  // the rounds left (1 round per caster level, counted down at the start of your turn by the turn bar).
  // https://www.d20srd.org/srd/spells/summonNaturesAllyI.htm, https://www.d20srd.org/srd/spells/summonMonsterI.htm,
  // Augment Summoning: https://www.d20srd.org/srd/feats.htm#augmentSummoning
  import { rules } from '../data/rules'
  import { computeCreature } from '../engine/creature'
  import type { SummonState } from '../model/character'
  import { app, tr, view } from '../state.svelte'
  import CreatureCard from './CreatureCard.svelte'
  import { newUid } from './items'

  const s = $derived(view.sheet)
  // Summon spells the character can cast, per casting class (a druid/ranger casts Summon Nature's Ally from either
  // class, each at its own caster level): the spell is on the class list and the class has a slot of that level.
  const family = (spellId: string) => spellId.replace(/-[ivx]+$/, '')
  const available = $derived(
    rules.summonLists.flatMap((list) => {
      const spell = rules.spells.get(list.spellId)
      if (!spell) return []
      return s.spellcasting
        .filter((sc) => {
          const lvl = spell.level[sc.def.list]
          return lvl !== undefined && sc.slots.some((x) => x.spellLevel === lvl && x.total > 0)
        })
        .map((caster) => ({ key: `${list.spellId}|${caster.classId}`, list, spell, caster }))
    }),
  )
  let choiceKey = $state('')
  let pick = $state('')
  let template = $state('')
  let count = $state(1)
  const chosen = $derived(available.find((a) => a.key === choiceKey) ?? available[0])
  const multiClass = $derived(new Set(available.map((a) => a.caster.classId)).size > 1)
  // A higher list also allows 1d3 creatures of the list just below, 1d4+1 from lower lists (the spell text) — same
  // spell family, same casting class.
  const creatureOptions = $derived(
    chosen
      ? available
          .filter(
            (a) =>
              family(a.list.spellId) === family(chosen.list.spellId) &&
              a.caster.classId === chosen.caster.classId &&
              a.list.level <= chosen.list.level,
          )
          .sort((a, b) => b.list.level - a.list.level)
          .map((a) => ({
            level: a.list.level,
            list: a.list,
            ids: a.list.creatures.filter((id) => rules.creatures.has(id)),
          }))
      : [],
  )
  const picked = $derived.by(() => {
    const [lvl, id] = pick.split('|')
    const list = creatureOptions.find((g) => String(g.level) === lvl)?.list
    return id && list ? { id, list } : undefined
  })
  // Summon Monster: celestial and/or fiendish versions, as the table prints them.
  const templates = $derived(picked?.list.templates?.[picked.id] ?? [])
  const augment = $derived(s.feats.some((f) => f.featId === 'augment-summoning'))

  function summon() {
    if (!chosen || !picked) return
    const rounds = chosen.caster.casterLevel.total
    const list = (app.character.summons ??= [])
    const tpl =
      templates.length === 1 ? templates[0] : templates.includes(template as 'celestial') ? template : templates[0]
    for (let i = 0; i < Math.max(1, count); i++)
      list.push({
        uid: newUid(),
        creatureId: picked.id,
        rounds,
        spellId: chosen.list.spellId,
        augmented: augment,
        maxHp: false,
        damage: 0,
        ...(tpl ? { template: tpl } : {}),
      })
    pick = ''
    count = 1
  }
  const dismiss = (uid: string) => (app.character.summons = (app.character.summons ?? []).filter((x) => x.uid !== uid))
  const sheetOf = (x: SummonState) =>
    computeCreature(rules.creatures.get(x.creatureId)!, {
      augment: x.augmented,
      maxHp: x.maxHp,
      hpManual: x.hpManual,
      template: x.template ? rules.templates.get(x.template) : undefined,
    })
  const TEMPLATE_NAME = { celestial: { en: 'celestial', fr: 'céleste' }, fiendish: { en: 'fiendish', fr: 'fiélon' } }
</script>

{#if available.length || (app.character.summons ?? []).length}
  <section class="box wide summons">
    <h3>{tr({ en: 'Summoned creatures', fr: 'Créatures convoquées' })}</h3>
    {#if available.length}
      <div class="add">
        <select
          value={chosen?.key ?? ''}
          onchange={(e) => {
            choiceKey = e.currentTarget.value
            pick = ''
          }}
          aria-label={tr({ en: 'Spell', fr: 'Sort' })}
        >
          {#each available as a (a.key)}
            <option value={a.key}>{tr(a.spell.name)}{multiClass ? ` (${tr(a.caster.className)})` : ''}</option>
          {/each}
        </select>
        <select bind:value={pick} aria-label={tr({ en: 'Creature', fr: 'Créature' })}>
          <option value="">— {tr({ en: 'creature', fr: 'créature' })} —</option>
          {#each creatureOptions as g (g.level)}
            <optgroup
              label={g.level === chosen?.list.level
                ? tr({ en: '1 creature', fr: '1 créature' })
                : g.level === (chosen?.list.level ?? 0) - 1
                  ? tr({ en: '1d3 creatures (list below)', fr: '1d3 créatures (liste inférieure)' })
                  : tr({ en: '1d4+1 creatures (lower lists)', fr: '1d4+1 créatures (listes inférieures)' })}
            >
              {#each g.ids as id (id)}<option value={`${g.level}|${id}`}
                  >{tr(rules.creatures.get(id)?.name)}{g.list.alignments?.[id]
                    ? ` [${g.list.alignments[id]}]`
                    : ''}</option
                >{/each}
            </optgroup>
          {/each}
        </select>
        {#if templates.length > 1}
          <select bind:value={template} aria-label={tr({ en: 'Template', fr: 'Archétype' })}>
            {#each templates as t (t)}<option value={t}>{tr(TEMPLATE_NAME[t])}</option>{/each}
          </select>
        {:else if templates.length === 1}
          <span class="note">{tr(TEMPLATE_NAME[templates[0]])}</span>
        {/if}
        <label class="count">× <input type="number" min="1" max="5" bind:value={count} /></label>
        <button class="go" onclick={summon} disabled={!picked}>{tr({ en: 'Summon', fr: 'Convoquer' })}</button>
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
            subtitle={`${x.rounds} ${tr({ en: 'rd left', fr: 'rd restants' })}${x.template ? ` · ${tr(TEMPLATE_NAME[x.template as 'celestial'])}` : ''}${x.augmented ? ` · ${tr({ en: 'augmented', fr: 'suprême' })}` : ''}`}
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
