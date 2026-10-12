<script lang="ts">
  // Round gold medallion (ability scores, AC, HP…) in the style of ornate character sheets.
  import type { Snippet } from 'svelte'

  let { label, sub, size = 'md', children }: { label: string; sub?: string; size?: 'sm' | 'md' | 'lg'; children: Snippet } = $props()
</script>

<div class="medallion {size}">
  <div class="ring">{@render children()}</div>
  <div class="ribbon">{label}</div>
  {#if sub !== undefined}<div class="sub">{sub}</div>{/if}
</div>

<style>
  .medallion {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: var(--d);
    --d: 5.6rem;
  }
  .sm {
    --d: 4.6rem;
  }
  .lg {
    --d: 6.8rem;
  }
  .ring {
    width: var(--d);
    height: var(--d);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 45%, var(--box) 55%, transparent 56%),
      conic-gradient(from 200deg, var(--gold-dark), var(--gold-light), var(--gold), var(--gold-dark), var(--gold-light), var(--gold-dark));
    box-shadow:
      inset 0 0 0 calc(var(--d) * 0.07) transparent,
      0 2px 4px rgb(40 20 5 / 0.45),
      inset 0 0 0.6rem rgb(60 35 10 / 0.35);
    font-family: var(--font-num);
  }
  /* Values inside the ring: StatValue buttons lose their box. */
  .ring :global(.stat) {
    border: none;
    background: transparent;
    font-family: var(--font-num);
    font-size: calc(var(--d) * 0.3);
    min-width: 0;
  }
  .ribbon {
    margin-top: -0.7rem;
    padding: 0.05rem 0.6rem;
    font-family: var(--font-title);
    font-size: 0.85rem;
    white-space: nowrap;
    color: var(--gold-light);
    background: linear-gradient(180deg, var(--accent), var(--accent-dark));
    border: 1px solid var(--gold);
    border-radius: 3px;
    z-index: 1;
  }
  .sub {
    margin-top: 0.15rem;
    font-family: var(--font-num);
    font-weight: 700;
    font-size: 1rem;
  }
</style>
