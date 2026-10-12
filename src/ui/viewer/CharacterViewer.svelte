<script lang="ts">
  import { onMount } from 'svelte'
  import { tr } from '../../state.svelte'
  import type { CharacterScene } from './scene'

  let { height = '28rem' }: { height?: string } = $props()

  let canvas: HTMLCanvasElement | undefined = $state()
  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let scene: CharacterScene | undefined

  onMount(() => {
    let cancelled = false
    import('./scene')
      .then(({ createScene }) => createScene(canvas!, `${import.meta.env.BASE_URL}models/fenrir-paladin.glb`))
      .then((s) => {
        if (cancelled) s.dispose()
        else {
          scene = s
          status = 'ready'
        }
      })
      .catch(() => (status = 'error'))
    return () => {
      cancelled = true
      scene?.dispose()
    }
  })
</script>

<figure class="viewer" style="height: {height}">
  <canvas bind:this={canvas} aria-label={tr({ en: '3D view of the character', fr: 'Vue 3D du personnage' })}></canvas>
  {#if status === 'loading'}
    <p class="msg">{tr({ en: 'Summoning the paladin…', fr: 'Invocation du paladin…' })}</p>
  {:else if status === 'error'}
    <p class="msg">{tr({ en: '3D view unavailable on this device.', fr: 'Vue 3D indisponible sur cet appareil.' })}</p>
  {:else}
    <button class="reset" onclick={() => scene?.resetView()} title={tr({ en: 'Reset view', fr: 'Recentrer' })}>⟲</button>
  {/if}
  <figcaption>
    <a href="https://sketchfab.com/3d-models/fallen-paladin-in-corrupted-black-plate-armor-df3056caff7e4f079bd4eec0fa9bcd54" target="_blank" rel="noopener"
      >“Fallen Paladin” by Pigcraft</a
    >, CC-BY 4.0 · {tr({ en: 'recolored gold', fr: 'recoloré en or' })}
  </figcaption>
</figure>

<style>
  /* Plate: thin black frame with a hairline inner rule, on a flat neutral backdrop. */
  .viewer {
    position: relative;
    margin: 0;
    width: 100%;
    border: 1.5px solid var(--frame);
    border-radius: 3px;
    overflow: hidden;
    background: var(--paper-2);
  }
  .viewer::after {
    content: '';
    position: absolute;
    inset: 5px;
    border: 1px solid var(--rule-strong);
    border-radius: 1px;
    pointer-events: none;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  }
  .msg {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    font-style: italic;
    color: var(--ink-soft);
  }
  .reset {
    position: absolute;
    right: 0.6rem;
    bottom: 0.6rem;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: 1px solid var(--rule-strong);
    background: var(--box);
    color: var(--ink);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .reset:hover {
    border-color: var(--frame);
  }
  figcaption {
    position: absolute;
    left: 0.8rem;
    bottom: 0.5rem;
    max-width: 60%;
    text-align: left;
    font-size: 0.7rem;
    color: var(--ink-soft);
  }
  figcaption a {
    color: inherit;
  }
</style>
