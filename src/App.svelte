<script lang="ts">
  import { rules } from './data/rules'
  import fenrir from './data/characters/fenrir.json'
  import type { Character } from './model/character'
  import { compute } from './engine/compute'

  // Placeholder until milestone 2 (General pane).
  const sheet = compute(fenrir as unknown as Character, rules)
</script>

<main>
  <h1>{fenrir.identity.name}</h1>
  <p>HP {sheet.hpMax.total} · AC {sheet.ac.total} · BAB +{sheet.bab.total}</p>
</main>
