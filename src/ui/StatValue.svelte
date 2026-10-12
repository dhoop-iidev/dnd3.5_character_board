<script lang="ts">
  import type { I18n } from '../data/types'
  import type { Stat } from '../engine/stacking'
  import { fmt } from '../engine/compute'
  import { openPopup } from './popupState.svelte'

  let {
    stat,
    title,
    signed = true,
    big = false,
    suffix = '',
  }: { stat: () => Stat; title: I18n; signed?: boolean; big?: boolean; suffix?: string } = $props()

  const value = $derived(stat().total)
  const hasSituational = $derived(stat().parts.some((p) => p.condition))
</script>

<button class="stat" class:big onclick={() => openPopup({ title, stat, signed })}>
  {signed ? fmt(value) : value}{suffix}{#if hasSituational}<sup>*</sup>{/if}
</button>

<style>
  .stat {
    font: inherit;
    font-weight: 700;
    min-width: 2.6em;
    min-height: 2.2em;
    padding: 0.15em 0.5em;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--box);
    color: var(--ink);
    cursor: pointer;
  }
  .stat:hover,
  .stat:focus-visible {
    border-color: var(--accent);
    outline: none;
  }
  .big {
    font-size: 1.5em;
  }
  sup {
    color: var(--accent);
  }
</style>
