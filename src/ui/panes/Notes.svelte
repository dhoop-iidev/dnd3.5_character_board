<script lang="ts">
  import { app, lang, tr } from '../../state.svelte'
  import { newUid, norm } from '../items'

  let query = $state('')
  const notes = $derived(
    [...app.character.notes]
      .filter((n) => !query.trim() || norm(n.title + ' ' + n.body).includes(norm(query)))
      .sort((a, b) => b.date.localeCompare(a.date)),
  )

  function add() {
    app.character.notes.push({ id: newUid(), date: new Date().toISOString().slice(0, 10), title: '', body: '' })
  }

  function remove(id: string) {
    const n = app.character.notes.find((x) => x.id === id)
    const label = tr({ en: 'Delete this note?', fr: 'Supprimer cette note ?' })
    if (n && (n.body.trim() || n.title.trim()) && !confirm(label)) return
    app.character.notes = app.character.notes.filter((x) => x.id !== id)
  }
</script>

<div class="bar">
  <button class="add" onclick={add}>＋ {tr({ en: 'New note', fr: 'Nouvelle note' })}</button>
  <input type="search" bind:value={query} placeholder={tr({ en: 'Search notes…', fr: 'Chercher dans les notes…' })} />
</div>

{#each notes as n (n.id)}
  {@const note = app.character.notes.find((x) => x.id === n.id)!}
  <article class="note">
    <header>
      <input type="date" bind:value={note.date} />
      <input class="title" bind:value={note.title} placeholder={tr({ en: 'Title (session, place…)', fr: 'Titre (séance, lieu…)' })} />
      <button class="del" onclick={() => remove(n.id)} aria-label={tr({ en: 'Delete', fr: 'Supprimer' })}>✕</button>
    </header>
    <textarea
      bind:value={note.body}
      rows="6"
      lang={lang()}
      placeholder={tr({ en: 'What happened, NPCs, loot, quests…', fr: 'Ce qui s’est passé, PNJ, butin, quêtes…' })}
    ></textarea>
  </article>
{:else}
  <p class="empty">{tr({ en: 'No notes yet.', fr: 'Pas encore de notes.' })}</p>
{/each}

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .bar input {
    flex: 1;
    min-width: 12rem;
  }
  input,
  textarea,
  button {
    font: inherit;
    background: var(--box);
    color: var(--ink);
    border: 1px solid var(--rule);
    border-radius: 4px;
    min-height: 2.6rem;
    padding: 0 0.6rem;
  }
  button {
    cursor: pointer;
  }
  .add {
    border-color: var(--accent);
  }
  .note {
    border: 2px solid var(--ink);
    border-radius: 6px;
    padding: 0.5rem;
    margin-bottom: 1rem;
    background: var(--paper);
  }
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .title {
    flex: 1;
    min-width: 10rem;
    font-family: var(--font-title);
  }
  textarea {
    width: 100%;
    padding: 0.5rem;
    resize: vertical;
    line-height: 1.4;
  }
  .del {
    color: var(--danger);
  }
  .empty {
    font-style: italic;
  }
</style>
