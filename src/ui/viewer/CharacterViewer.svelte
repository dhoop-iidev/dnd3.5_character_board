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
  .viewer {
    position: relative;
    margin: 0;
    width: 100%;
    border-radius: 50% 50% 8px 8px / 18% 18% 8px 8px;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 50% 40%, rgb(255 236 190 / 0.55), transparent 65%),
      radial-gradient(ellipse at 50% 100%, rgb(60 40 20 / 0.35), transparent 60%);
    box-shadow:
      inset 0 0 0 2px var(--gold),
      inset 0 0 0 5px var(--paper),
      inset 0 0 0 6px var(--gold-dark),
      inset 0 0 2.5rem rgb(60 35 10 / 0.35);
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
    bottom: 0.8rem;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    border: 1px solid var(--gold-dark);
    background: var(--box);
    color: var(--ink);
    font-size: 1.2rem;
    cursor: pointer;
  }
  figcaption {
    position: absolute;
    right: 0.8rem;
    top: 0.5rem;
    max-width: 45%;
    text-align: right;
    font-size: 0.7rem;
    color: var(--ink-soft);
  }
  figcaption a {
    color: inherit;
  }
</style>
