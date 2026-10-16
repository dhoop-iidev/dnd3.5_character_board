<script lang="ts">
  // Turn or rebuke undead: uses per day, turning check and damage, the SRD turning table.
  // https://www.d20srd.org/srd/combat/specialAttacks.htm#turnOrRebukeUndead
  import { app, tr, view } from '../state.svelte'
  import StatValue from './StatValue.svelte'

  const t = $derived(view.sheet.turning!)
  const KEY = 'turning'
  const used = $derived(app.character.dailyUsesSpent[KEY] ?? 0)
  const left = $derived(t.usesPerDay.total - used)
  const fmtMax = (m: number, i: number, all: { max: number }[]) =>
    i === 0 ? `≤ ${m}` : m === Infinity ? `${all[i - 1].max + 1}+` : `${all[i - 1].max + 1}–${m}`
  const MODE = {
    turn: { en: 'turn / destroy', fr: 'renvoi / destruction' },
    rebuke: { en: 'rebuke / command', fr: 'intimidation / contrôle' },
    'greater-turning': { en: 'greater turning', fr: 'renvoi suprême' },
  } as Record<string, { en: string; fr: string }>
</script>

<section class="box wide turning">
  <h3>
    {t.mode === 'turn'
      ? tr({ en: 'Turn undead', fr: 'Renvoi des morts-vivants' })
      : tr({ en: 'Rebuke undead', fr: 'Intimidation des morts-vivants' })}
  </h3>
  <div class="row">
    <span>{tr({ en: 'Uses today', fr: 'Utilisations aujourd’hui' })} : <strong>{left} / {t.usesPerDay.total}</strong></span>
    <StatValue stat={() => view.sheet.turning!.usesPerDay} title={{ en: 'Turning uses per day', fr: 'Renvois par jour' }} signed={false} />
    <button disabled={left <= 0} onclick={() => (app.character.dailyUsesSpent[KEY] = used + 1)}>
      {tr({ en: 'Use (standard action)', fr: 'Utiliser (action simple)' })}
    </button>
    <button onclick={() => delete app.character.dailyUsesSpent[KEY]}>☀ {tr({ en: 'New day', fr: 'Nouveau jour' })}</button>
  </div>
  <div class="row">
    <span>{tr({ en: 'Turning check: 1d20', fr: 'Test de renvoi : 1d20' })}</span>
    <StatValue stat={() => view.sheet.turning!.check} title={{ en: 'Turning check', fr: 'Test de renvoi' }} />
    <span>{tr({ en: 'Turning damage (total HD): 2d6', fr: 'Dégâts de renvoi (total de DV) : 2d6' })}</span>
    <StatValue stat={() => view.sheet.turning!.damage} title={{ en: 'Turning damage', fr: 'Dégâts de renvoi' }} />
    <span class="soft">{tr({ en: `turning level ${t.level}`, fr: `niveau de renvoi ${t.level}` })}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>{tr({ en: 'Turning check', fr: 'Test de renvoi' })}</th>
        <th>{tr({ en: 'Most powerful undead affected', fr: 'Mort-vivant le plus puissant affecté' })}</th>
      </tr>
    </thead>
    <tbody>
      {#each t.table as r, i (i)}
        <tr><td>{fmtMax(r.max, i, t.table)}</td><td>{Math.max(0, r.hd)} {tr({ en: 'HD', fr: 'DV' })}</td></tr>
      {/each}
    </tbody>
  </table>
  <p class="soft">
    {t.mode === 'turn'
      ? tr({
          en: `Undead within 60 ft, nearest first. Turned undead flee for 10 rounds; those with at most half your turning level in HD (${Math.floor(t.level / 2)}) are destroyed.`,
          fr: `Morts-vivants à 18 m ou moins, les plus proches d’abord. Les morts-vivants renvoyés fuient pendant 10 rounds ; ceux ayant au plus la moitié de votre niveau de renvoi en DV (${Math.floor(t.level / 2)}) sont détruits.`,
        })
      : tr({
          en: `Undead within 60 ft, nearest first. Rebuked undead cower in awe for 10 rounds (attacks against them +2); those with at most half your turning level in HD (${Math.floor(t.level / 2)}) are commanded instead. Commanded undead: at most ${t.level} HD in total.`,
          fr: `Morts-vivants à 18 m ou moins, les plus proches d’abord. Les morts-vivants intimidés sont recroquevillés pendant 10 rounds (+2 aux attaques contre eux) ; ceux ayant au plus la moitié de votre niveau de renvoi en DV (${Math.floor(t.level / 2)}) sont contrôlés à la place. Morts-vivants contrôlés : ${t.level} DV au total au maximum.`,
        })}
    <a href="https://www.d20srd.org/srd/combat/specialAttacks.htm#turnOrRebukeUndead" target="_blank" rel="noopener">d20srd</a>
  </p>
  {#if t.extra.length}
    <ul class="extra">
      {#each t.extra as x, i (i)}
        <li>
          <strong>{tr(x.name)}</strong> ({x.perDay}/{tr({ en: 'day', fr: 'jour' })}{x.uses.length > 1
            ? tr({ en: ', shared', fr: ', en tout' })
            : ''}) :
          {x.uses.map((u) => `${tr(MODE[u.mode] ?? { en: u.mode, fr: u.mode })} — ${tr(u.creatures)}`).join(' ; ')}
          {#if x.uses.some((u) => u.mode === 'greater-turning') && t.mode === 'rebuke'}
            <em
              >{tr({
                en: '— used in place of a rebuke: the undead that would be rebuked or commanded are destroyed (house rule #26)',
                fr: '— à la place d’une intimidation : les morts-vivants qui seraient intimidés ou contrôlés sont détruits (règle maison n° 26)',
              })}</em
            >
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.8rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  button {
    min-height: 2.6rem;
    padding: 0 0.9rem;
  }
  table {
    border-collapse: collapse;
    margin: 0.4rem 0;
  }
  th,
  td {
    padding: 0.2rem 0.8rem;
    border-bottom: 1px solid var(--rule);
    text-align: left;
  }
  .soft {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .extra {
    margin: 0.4rem 0 0;
    padding-left: 1.2rem;
  }
</style>
