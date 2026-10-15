<script lang="ts">
  // Identity block of the official sheet: editable in place.
  import { rules } from '../data/rules'
  import { levelForXp, xpForLevel } from '../engine/progression'
  import { app, lang, tr, view } from '../state.svelte'

  const id = $derived(app.character.identity)
  const level = $derived(app.character.levels.length)
  const next = $derived(xpForLevel(level + 1))
  const prev = $derived(xpForLevel(level))
  const pct = $derived(Math.max(0, Math.min(100, ((app.character.xp - prev) / (next - prev)) * 100)))
  const ready = $derived(levelForXp(app.character.xp) > level)
  const fmtN = (n: number) => n.toLocaleString(lang() === 'fr' ? 'fr-FR' : 'en-US')

  function setLanguages(text: string) {
    app.character.identity.languages = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
</script>

<section class="box identity">
  <h3>{tr({ en: 'Identity', fr: 'Identité' })}</h3>
  <div class="fields">
    <label class="half">{tr({ en: 'Name', fr: 'Nom' })}<input class="name" bind:value={app.character.identity.name} /></label>
    <label class="half">{tr({ en: 'Title', fr: 'Titre' })}<input bind:value={app.character.identity.title} placeholder={tr({ en: 'e.g. Knight of the Realm', fr: 'ex. Chevalier du royaume' })} /></label>
    <label>{tr({ en: 'Player', fr: 'Joueur' })}<input bind:value={app.character.identity.player} /></label>
    <label
      >{tr({ en: 'Race', fr: 'Race' })}
      <select bind:value={app.character.identity.race}>
        {#each [...rules.races.values()] as r (r.id)}<option value={r.id}>{tr(r.name)}</option>{/each}
        {#if !rules.races.has(app.character.identity.race)}<option value={app.character.identity.race}>{app.character.identity.race}</option>{/if}
      </select></label
    >
    <label>{tr({ en: 'Size', fr: 'Catégorie de taille' })}<input
        value={view.sheet.race.size === 'small' ? tr({ en: 'Small (+1)', fr: 'Petite (+1)' }) : tr({ en: 'Medium (+0)', fr: 'Moyenne (+0)' })}
        disabled
      /></label>
    <label>{tr({ en: 'Alignment', fr: 'Alignement' })}<input bind:value={app.character.identity.alignment} /></label>
    <label>{tr({ en: 'Deity', fr: 'Dieu' })}<input bind:value={app.character.identity.deity} /></label>
    <label>{tr({ en: 'Gender', fr: 'Sexe' })}<input bind:value={app.character.identity.gender} /></label>
    <label>{tr({ en: 'Age', fr: 'Âge' })}<input type="number" bind:value={app.character.identity.age} /></label>
    <label
      >{tr({ en: 'Height (m)', fr: 'Taille (m)' })}<input type="number" step="0.01" bind:value={app.character.identity.height.m} /></label
    >
    <label>{tr({ en: 'Weight (kg)', fr: 'Poids (kg)' })}<input type="number" bind:value={app.character.identity.weight.kg} /></label>
    <label>{tr({ en: 'Eyes', fr: 'Yeux' })}<input bind:value={app.character.identity.eyes} /></label>
    <label>{tr({ en: 'Hair', fr: 'Cheveux' })}<input bind:value={app.character.identity.hair} /></label>
    <label>{tr({ en: 'Skin', fr: 'Peau' })}<input bind:value={app.character.identity.skin} /></label>
    <label>{tr({ en: 'Homeland', fr: 'Région natale' })}<input bind:value={app.character.identity.homeland} /></label>
    <label>{tr({ en: 'Campaign', fr: 'Campagne' })}<input bind:value={app.character.identity.campaign} /></label>
    <label class="wide">{tr({ en: 'Languages (comma-separated)', fr: 'Langues (séparées par des virgules)' })}<input value={id.languages?.join(', ') ?? ''} onchange={(e) => setLanguages(e.currentTarget.value)} /></label>
  </div>

  <div class="xp">
    <div class="xp-line">
      <span>XP <strong>{fmtN(app.character.xp)}</strong> / {fmtN(next)}</span>
      <span>{tr({ en: 'Level', fr: 'Niveau' })} {view.sheet.characterLevel}</span>
    </div>
    <div class="bar" role="meter" aria-valuenow={app.character.xp} aria-valuemin={prev} aria-valuemax={next}>
      <div class="fill" style="width: {pct}%"></div>
    </div>
    {#if ready}<p class="ready">{tr({ en: 'Level up available — see Progression below.', fr: 'Niveau supérieur disponible — voir Progression plus bas.' })}</p>{/if}
  </div>
</section>

<style>
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: 0.5rem 0.75rem;
  }
  label {
    display: flex;
    flex-direction: column;
    font-family: var(--font-title);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .wide {
    grid-column: 1 / -1;
  }
  .half {
    grid-column: span 2;
  }
  .name {
    font-family: var(--font-num);
    font-weight: 700;
  }
  input,
  select {
    font: inherit;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink);
    min-height: 2.4rem;
    padding: 0 0.4rem;
    border: none;
    border-bottom: 1px solid var(--rule-strong);
    background: transparent;
  }
  input:disabled {
    color: var(--ink);
    border-bottom-style: dotted;
  }
  .xp {
    margin-top: 0.9rem;
  }
  .xp-line {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-title);
  }
  .bar {
    height: 0.5rem;
    margin-top: 0.3rem;
    border: 1px solid var(--frame);
    border-radius: 2px;
  }
  .fill {
    height: 100%;
    background: var(--frame);
  }
  .ready {
    margin: 0.4rem 0 0;
    color: var(--accent);
  }
</style>
