# Conditions, ability damage, poison, disease, energy drain (3.5 SRD)

D&D **3.5** only (no 5e conditions such as "poisoned", "restrained", "exhaustion levels"). These entries become the app's preset **effects**.
- EN: https://www.d20srd.org/srd/conditionSummary.htm (anchor per condition, e.g. `#blinded`)
- Combat modifier tables: https://www.d20srd.org/srd/combat/combatModifiers.htm#tableAttackRollModifiers , #tableArmorClassModifiers
- Special abilities (ability loss, disease, energy drain, fear, poison…): https://www.d20srd.org/srd/specialAbilities.htm
- FR: https://regles-donjons-dragons.com/page1549.html "Etats préjudiciables" (one page per condition, pages 1550–1587). All French condition names below were verified there.

General rule: if several conditions apply, apply them all; if some effects can't combine, apply the most severe (https://www.d20srd.org/srd/conditionSummary.htm). Condition penalties are **untyped** (they stack with each other), except where the SRD says otherwise (fear escalates instead of stacking, see §3).

## 0. Effect vocabulary

Numeric change: `{ "target", "value", "bonusType" }`. Non-numeric: `{ "flag", ... }`.

| target | meaning |
|---|---|
| `ability.str` … `ability.cha` | penalty/bonus to the ability **score** (modifier recomputed) |
| `ability.X.damage`, `ability.X.drain` | ability damage / drain points (score − points) |
| `ability.X.setTo` | effective score forced to a value (e.g. 0) |
| `attack.all`, `attack.melee`, `attack.ranged` | attack rolls |
| `damage.weapon` | weapon damage rolls |
| `ac.total`, `ac.vsMelee`, `ac.vsRanged` | Armor Class |
| `save.all` | Fort, Ref, Will |
| `skill.all`, `skill.<name>`, `skill.strOrDexBased` | skill checks |
| `abilityCheck.all` | ability checks |
| `initiative` | initiative checks |
| `speed.multiplier` | ×0.5 = half speed |
| `hp.max`, `effectiveLevel` | hit points, effective level |

| flag | meaning |
|---|---|
| `loseDexToAC` | Dex bonus to AC (and dodge bonuses) lost |
| `dexModAs-5` | Dex treated as 0 (−5) for AC |
| `noActions`, `singleMoveOrStandard`, `singleMoveOnly` | action limits |
| `cannotRun`, `cannotCharge`, `noAoO`, `noThreaten`, `dropHeld`, `mustFlee`, `helpless`, `unconscious` | as named |
| `autoFail: [checks]` | automatic failures |
| `opponentsConcealment: 50` | miss chance against all opponents |
| `spellFailure: { verbal: 20 }` | spell failure chance |

---

## 1. Condition list

### Ability Damaged / Affaibli de façon temporaire
https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged — FR https://regles-donjons-dragons.com/page1550.html
Temporary loss of score points; returns 1 point/day per ability (unless noted). See §2.
```json
{ "id": "abilityDamaged", "changes": [ { "target": "ability.X.damage", "value": "n", "bonusType": "damage" } ], "recovery": "1/day per ability" }
```

### Ability Drained / Diminué de façon permanente
https://www.d20srd.org/srd/conditionSummary.htm#abilityDrained — FR page1557. Permanent loss; only magic restores. See §2.
```json
{ "id": "abilityDrained", "changes": [ { "target": "ability.X.drain", "value": "n", "bonusType": "drain" } ], "recovery": "magic only" }
```

### Blinded / Aveuglé
https://www.d20srd.org/srd/conditionSummary.htm#blinded — FR page1554
−2 AC, loses Dex bonus to AC, half speed, −4 on Search and on *most* Str- and Dex-based skill checks; vision checks (Spot, reading) fail; all opponents have total concealment (50 % miss). Long-term blindness: some drawbacks can be overcome (DM).
Which skills "most" covers — Still open (DM call; recommended default given): see rulings-combat-equipment.md#r30-blinded-most-strength--and-dexterity-based-skill-checks
```json
{ "id": "blinded", "name": { "en": "Blinded", "fr": "Aveuglé" }, "changes": [
  { "target": "ac.total", "value": -2, "bonusType": "untyped" },
  { "flag": "loseDexToAC" },
  { "target": "speed.multiplier", "value": 0.5, "bonusType": "multiplier" },
  { "target": "skill.search", "value": -4, "bonusType": "untyped" },
  { "target": "skill.strOrDexBased", "value": -4, "bonusType": "untyped", "note": "'most' — see rulings-combat-equipment.md#r30-blinded-most-strength--and-dexterity-based-skill-checks" },
  { "flag": "autoFail", "checks": ["skill.spot", "reading"] },
  { "flag": "opponentsConcealment", "value": 50 } ] }
```

### Blown Away / Emporté par le vent
https://www.d20srd.org/srd/conditionSummary.htm#blownAway — FR page1560. On the ground: knocked down, rolls 1d4 × 10 ft (1d4 × 3 m), 1d4 nonlethal per 10 ft. Flying: blown back 2d6 × 10 ft, 2d6 nonlethal. No stat change (narrative + prone).

### Checked / Stoppé
https://www.d20srd.org/srd/conditionSummary.htm#checked — FR page1586. Can't move forward against a force (wind). No stat change.

### Confused / Confus
https://www.d20srd.org/srd/conditionSummary.htm#confused — FR page1556. d% each turn: 01–10 attack caster, 11–20 act normally, 21–50 babble, 51–70 flee caster, 71–100 attack nearest. Attacked → attacks the attacker next turn. No AoO except against a creature it is already attacking. No stat change; the app can offer the d% roll.

### Cowering / Recroquevillé sur soi-même
https://www.d20srd.org/srd/conditionSummary.htm#cowering — FR page1580
```json
{ "id": "cowering", "name": { "en": "Cowering", "fr": "Recroquevillé sur soi-même" }, "changes": [
  { "flag": "noActions" }, { "target": "ac.total", "value": -2, "bonusType": "untyped" }, { "flag": "loseDexToAC" } ] }
```

### Dazed / Hébété
https://www.d20srd.org/srd/conditionSummary.htm#dazed — FR page1567. No actions; no AC penalty; usually 1 round.
```json
{ "id": "dazed", "name": { "en": "Dazed", "fr": "Hébété" }, "changes": [ { "flag": "noActions" } ], "defaultDuration": { "rounds": 1 } }
```

### Dazzled / Ébloui
https://www.d20srd.org/srd/conditionSummary.htm#dazzled — FR page1558
```json
{ "id": "dazzled", "name": { "en": "Dazzled", "fr": "Ébloui" }, "changes": [
  { "target": "attack.all", "value": -1, "bonusType": "untyped" },
  { "target": "skill.search", "value": -1, "bonusType": "untyped" },
  { "target": "skill.spot", "value": -1, "bonusType": "untyped" } ] }
```

### Dead / Mort
https://www.d20srd.org/srd/conditionSummary.htm#dead — FR page1573. HP −10, or Con 0, or killed outright. State, not a modifier.
CHECK: current HP ≤ −10 or Con (after damage/drain) = 0 → show "dead".

### Deafened / Assourdi
https://www.d20srd.org/srd/conditionSummary.htm#deafened — FR page1552
```json
{ "id": "deafened", "name": { "en": "Deafened", "fr": "Assourdi" }, "changes": [
  { "target": "initiative", "value": -4, "bonusType": "untyped" },
  { "flag": "autoFail", "checks": ["skill.listen"] },
  { "flag": "spellFailure", "verbal": 20 } ] }
```

### Disabled / Hors de combat
https://www.d20srd.org/srd/conditionSummary.htm#disabled — FR page1568. HP = 0 (or negative but stable and conscious). Single move or standard action per round; half speed; a standard (or strenuous) action deals 1 damage afterwards.
```json
{ "id": "disabled", "name": { "en": "Disabled", "fr": "Hors de combat" }, "changes": [
  { "flag": "singleMoveOrStandard" }, { "target": "speed.multiplier", "value": 0.5, "bonusType": "multiplier" },
  { "flag": "strenuousActionDeals1Damage" } ], "autoWhen": "hp == 0" }
```

### Dying / Mourant
https://www.d20srd.org/srd/conditionSummary.htm#dying — FR page1574. HP −1 to −9; unconscious; each round 10 % to stabilize, else −1 HP. Timing of the first roll — Resolved: see rulings-combat-equipment.md#r13-dying-when-the-stabilization-roll-starts
```json
{ "id": "dying", "name": { "en": "Dying", "fr": "Mourant" }, "changes": [ { "flag": "unconscious" }, { "flag": "helpless" }, { "flag": "noActions" } ],
  "autoWhen": "-10 < hp < 0 && !stable", "perRound": "10% stabilize else hp -1" }
```

### Energy Drained / Vidé de son énergie
https://www.d20srd.org/srd/conditionSummary.htm#energyDrained — FR page1587. Negative levels; see §5.

### Entangled / Enchevêtré
https://www.d20srd.org/srd/conditionSummary.htm#entangled — FR page1561. Half speed, can't run or charge, −2 on attack rolls, −4 Dex; casting needs Concentration DC 15 + spell level. (Anchored bonds: can't move at all.)
```json
{ "id": "entangled", "name": { "en": "Entangled", "fr": "Enchevêtré" }, "changes": [
  { "target": "speed.multiplier", "value": 0.5, "bonusType": "multiplier" },
  { "flag": "cannotRun" }, { "flag": "cannotCharge" },
  { "target": "attack.all", "value": -2, "bonusType": "untyped" },
  { "target": "ability.dex", "value": -4, "bonusType": "untyped" } ] }
```

### Exhausted / Épuisé
https://www.d20srd.org/srd/conditionSummary.htm#exhausted — FR page1562. Half speed, −6 Str, −6 Dex. 1 hour of complete rest → fatigued. Replaces fatigued (doesn't add to it).
Can't run or charge (Rules Compendium) — Resolved: see rulings-combat-equipment.md#r31-exhausted-cant-run-or-charge
```json
{ "id": "exhausted", "name": { "en": "Exhausted", "fr": "Épuisé" }, "replaces": "fatigued", "changes": [
  { "target": "speed.multiplier", "value": 0.5, "bonusType": "multiplier" },
  { "target": "ability.str", "value": -6, "bonusType": "untyped" },
  { "target": "ability.dex", "value": -6, "bonusType": "untyped" } ], "recovery": "1 h rest → fatigued" }
```

### Fascinated / Fasciné
https://www.d20srd.org/srd/conditionSummary.htm#fascinated — FR page1564. Takes no actions other than paying attention; −4 on skill checks made as reactions (Listen, Spot). New save on a potential threat; an obvious threat breaks it; an ally can shake it free (standard action).
```json
{ "id": "fascinated", "name": { "en": "Fascinated", "fr": "Fasciné" }, "changes": [
  { "flag": "noActions" },
  { "target": "skill.listen", "value": -4, "bonusType": "untyped" },
  { "target": "skill.spot", "value": -4, "bonusType": "untyped" } ] }
```

### Fatigued / Fatigué
https://www.d20srd.org/srd/conditionSummary.htm#fatigued — FR page1565. Can't run or charge, −2 Str, −2 Dex. Something that would fatigue again → exhausted. 8 hours of complete rest removes it. Also caused by sleeping in medium/heavy armor (`equipment.md`).
```json
{ "id": "fatigued", "name": { "en": "Fatigued", "fr": "Fatigué" }, "changes": [
  { "flag": "cannotRun" }, { "flag": "cannotCharge" },
  { "target": "ability.str", "value": -2, "bonusType": "untyped" },
  { "target": "ability.dex", "value": -2, "bonusType": "untyped" } ], "escalatesTo": "exhausted", "recovery": "8 h rest" }
```

### Flat-Footed / Pris au dépourvu
https://www.d20srd.org/srd/conditionSummary.htm#flatFooted — FR page1579. Hasn't acted yet in combat: loses Dex bonus to AC, can't make attacks of opportunity.
```json
{ "id": "flatFooted", "name": { "en": "Flat-footed", "fr": "Pris au dépourvu" }, "changes": [ { "flag": "loseDexToAC" }, { "flag": "noAoO" } ] }
```

### Frightened / Effrayé
https://www.d20srd.org/srd/conditionSummary.htm#frightened — FR page1559. Flees the source if possible; −2 on attack rolls, saves, skill checks, ability checks. Fear level 2 (§3).
```json
{ "id": "frightened", "name": { "en": "Frightened", "fr": "Effrayé" }, "fearLevel": 2, "changes": [
  { "flag": "mustFlee" },
  { "target": "attack.all", "value": -2, "bonusType": "untyped" },
  { "target": "save.all", "value": -2, "bonusType": "untyped" },
  { "target": "skill.all", "value": -2, "bonusType": "untyped" },
  { "target": "abilityCheck.all", "value": -2, "bonusType": "untyped" } ] }
```

### Grappling / Agrippé
https://www.d20srd.org/srd/conditionSummary.htm#grappling — FR page1551 ; details https://www.d20srd.org/srd/combat/specialAttacks.htm#grapplingConsequences
Doesn't threaten squares; loses Dex bonus to AC vs opponents it isn't grappling; can't move normally. Attacks while grappling: unarmed, natural or **light** weapon only, at −4; no two-weapon attacks (https://www.d20srd.org/srd/combat/specialAttacks.htm#attackYourOpponent). The greatsword can't be used in a grapple.
```json
{ "id": "grappling", "name": { "en": "Grappling", "fr": "Agrippé" }, "changes": [
  { "flag": "noThreaten" },
  { "flag": "loseDexToAC", "against": "non-grappling opponents" },
  { "flag": "noNormalMovement" },
  { "target": "attack.all", "value": -4, "bonusType": "untyped", "when": "attacking a grappled opponent with a light/unarmed/natural weapon" },
  { "flag": "onlyLightWeapons" } ] }
```

### Helpless / Sans défense
https://www.d20srd.org/srd/conditionSummary.htm#helpless — FR page1583 ; https://www.d20srd.org/srd/combat/combatModifiers.htm#helplessDefenders
Dex treated as 0 (−5); melee attacks against it +4 (AC −4 vs melee; one effect, apply once — see rulings-combat-equipment.md#r14-helpless-ac-4-vs-melee-or-attacker-4), ranged no bonus; sneak attack; coup de grace (full-round, auto-crit, Fort DC 10 + damage or die; provokes AoO).
```json
{ "id": "helpless", "name": { "en": "Helpless", "fr": "Sans défense" }, "changes": [
  { "target": "ability.dex.setTo", "value": 0, "bonusType": "override" },
  { "target": "ac.vsMelee", "value": -4, "bonusType": "untyped" },
  { "flag": "coupDeGraceAllowed" } ] }
```

### Incorporeal / Intangible
https://www.d20srd.org/srd/conditionSummary.htm#incorporeal — FR page1571. Immune to nonmagical attacks. Not relevant for the character.

### Invisible / Invisible
https://www.d20srd.org/srd/conditionSummary.htm#invisible ; https://www.d20srd.org/srd/specialAbilities.htm#invisibility — FR page1572
+2 on attack rolls against sighted opponents, ignores their Dex bonus to AC; total concealment (50 % miss) against attackers; not vs blind/nonsighted creatures. (Potion of invisibility: `magic-items.md`.)
```json
{ "id": "invisible", "name": { "en": "Invisible", "fr": "Invisible" }, "changes": [
  { "target": "attack.all", "value": 2, "bonusType": "untyped", "when": "vs sighted opponents" },
  { "flag": "targetLosesDexToAC" },
  { "flag": "concealmentAgainstAttackers", "value": 50 } ] }
```

### Knocked Down / Renversé
https://www.d20srd.org/srd/conditionSummary.htm#knockedDown — FR page1581. Wind: on the ground → prone; flying → blown back 1d6 × 10 ft. Apply `prone`.

### Nauseated / Nauséeux
https://www.d20srd.org/srd/conditionSummary.htm#nauseated — FR page1575. Can't attack, cast, concentrate on spells or do anything needing attention; only a single move action per turn.
```json
{ "id": "nauseated", "name": { "en": "Nauseated", "fr": "Nauséeux" }, "changes": [ { "flag": "singleMoveOnly" }, { "flag": "cannotAttack" }, { "flag": "cannotCast" } ] }
```

### Panicked / Paniqué
https://www.d20srd.org/srd/conditionSummary.htm#panicked — FR page1576. Drops what it holds, flees at top speed along a random path, no other actions; −2 on saves, skill checks, ability checks; cornered → cowers. Fear level 3 (§3).
```json
{ "id": "panicked", "name": { "en": "Panicked", "fr": "Paniqué" }, "fearLevel": 3, "changes": [
  { "flag": "dropHeld" }, { "flag": "mustFlee" },
  { "target": "save.all", "value": -2, "bonusType": "untyped" },
  { "target": "skill.all", "value": -2, "bonusType": "untyped" },
  { "target": "abilityCheck.all", "value": -2, "bonusType": "untyped" } ] }
```

### Paralyzed / Paralysé
https://www.d20srd.org/srd/conditionSummary.htm#paralyzed ; https://www.d20srd.org/srd/specialAbilities.htm#paralysis — FR page1577 (the French site's page for "Paralysé" shows the "Paniqué" text by mistake; use the FR special-ability page https://regles-donjons-dragons.com/page2153.html). Effective Str 0 and Dex 0, helpless, only purely mental actions. A flying winged creature falls; a swimmer may drown. Allies/enemies can move through its square (counts as 2 squares).
```json
{ "id": "paralyzed", "name": { "en": "Paralyzed", "fr": "Paralysé" }, "includes": ["helpless"], "changes": [
  { "target": "ability.str.setTo", "value": 0, "bonusType": "override" },
  { "target": "ability.dex.setTo", "value": 0, "bonusType": "override" },
  { "flag": "mentalActionsOnly" } ] }
```

### Petrified / Pétrifié
https://www.d20srd.org/srd/conditionSummary.htm#petrified — FR page1578. Turned to stone; considered unconscious. `includes: ["unconscious"]`.

### Pinned / Immobilisé (en situation de lutte)
https://www.d20srd.org/srd/conditionSummary.htm#pinned ; https://www.d20srd.org/srd/combat/specialAttacks.htm#ifYourePinnedbyanOpponent — FR page1569
Held immobile (not helpless) for 1 round; −4 AC against opponents other than the pinner; may be unable to speak; can try to escape (opposed grapple check or Escape Artist).
```json
{ "id": "pinned", "name": { "en": "Pinned", "fr": "Immobilisé (en situation de lutte)" }, "includes": ["grappling"], "changes": [
  { "target": "ac.total", "value": -4, "bonusType": "untyped", "when": "vs opponents other than the pinner" },
  { "flag": "immobile" } ] }
```
Pinned AC (table vs text, Dex 0) — Resolved: see rulings-combat-equipment.md#r15-pinned-and-grappling-ac

### Prone / À terre
https://www.d20srd.org/srd/conditionSummary.htm#prone — FR page1553. −4 on melee attacks; can't use ranged weapons except crossbows (and shuriken, per the attack table); AC +4 vs ranged, −4 vs melee. Standing up: move action, provokes AoO.
```json
{ "id": "prone", "name": { "en": "Prone", "fr": "À terre" }, "changes": [
  { "target": "attack.melee", "value": -4, "bonusType": "untyped" },
  { "flag": "noRangedExcept", "weapons": ["crossbow", "shuriken"] },
  { "target": "ac.vsRanged", "value": 4, "bonusType": "untyped" },
  { "target": "ac.vsMelee", "value": -4, "bonusType": "untyped" } ] }
```
CHECK: prone + longbow → warning "can't shoot a bow while prone".

### Shaken / Secoué
https://www.d20srd.org/srd/conditionSummary.htm#shaken — FR page1584. −2 on attack rolls, saves, skill checks, ability checks. Fear level 1 (§3).
```json
{ "id": "shaken", "name": { "en": "Shaken", "fr": "Secoué" }, "fearLevel": 1, "changes": [
  { "target": "attack.all", "value": -2, "bonusType": "untyped" },
  { "target": "save.all", "value": -2, "bonusType": "untyped" },
  { "target": "skill.all", "value": -2, "bonusType": "untyped" },
  { "target": "abilityCheck.all", "value": -2, "bonusType": "untyped" } ] }
```

### Sickened / Fiévreux
https://www.d20srd.org/srd/conditionSummary.htm#sickened — FR page1566. −2 on attack rolls, weapon damage rolls, saves, skill checks, ability checks.
```json
{ "id": "sickened", "name": { "en": "Sickened", "fr": "Fiévreux" }, "changes": [
  { "target": "attack.all", "value": -2, "bonusType": "untyped" },
  { "target": "damage.weapon", "value": -2, "bonusType": "untyped" },
  { "target": "save.all", "value": -2, "bonusType": "untyped" },
  { "target": "skill.all", "value": -2, "bonusType": "untyped" },
  { "target": "abilityCheck.all", "value": -2, "bonusType": "untyped" } ] }
```

### Stable / Stable
https://www.d20srd.org/srd/conditionSummary.htm#stable — FR page1585. Negative HP, no longer dying, unconscious. Aided: no more HP loss, 10 %/hour to become conscious and disabled. Unaided: each hour 10 % conscious & disabled, else −1 HP.

### Staggered / Chancelant
https://www.d20srd.org/srd/conditionSummary.htm#staggered — FR page1555. Nonlethal damage = current HP exactly: single move or standard action per round. Nonlethal > HP → unconscious.
```json
{ "id": "staggered", "name": { "en": "Staggered", "fr": "Chancelant" }, "changes": [ { "flag": "singleMoveOrStandard" } ], "autoWhen": "nonlethal == hpCurrent" }
```

### Stunned / Étourdi
https://www.d20srd.org/srd/conditionSummary.htm#stunned — FR page1563. Drops everything held, no actions, −2 AC, loses Dex bonus to AC.
```json
{ "id": "stunned", "name": { "en": "Stunned", "fr": "Étourdi" }, "changes": [
  { "flag": "dropHeld" }, { "flag": "noActions" },
  { "target": "ac.total", "value": -2, "bonusType": "untyped" }, { "flag": "loseDexToAC" } ] }
```

### Turned / Renvoyé (ou repoussé)
https://www.d20srd.org/srd/conditionSummary.htm#turned — FR page1582. Undead only: flee 10 rounds; cornered → cower. Not for the character.

### Unconscious / Inconscient
https://www.d20srd.org/srd/conditionSummary.htm#unconscious — FR page1570. Knocked out and helpless: HP −1 to −9, or nonlethal > current HP.
```json
{ "id": "unconscious", "name": { "en": "Unconscious", "fr": "Inconscient" }, "includes": ["helpless"], "changes": [ { "flag": "noActions" } ] }
```

CHECK (automatic states from HP): HP 0 → disabled; −1…−9 → dying (or stable); ≤ −10 → dead; nonlethal = HP → staggered; nonlethal > HP → unconscious. Source: https://www.d20srd.org/srd/combat/injuryandDeath.htm#effectsofHitPointDamage , #staggeredandUnconscious
Massive damage (same page, #massiveDamage): one attack of 50+ damage that doesn't kill → Fort DC 15 or die (prompt, not automatic).

---

## 2. Ability damage, drain and score 0

Sources: https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss , #abilityDamage , #abilityDrain ; FR https://regles-donjons-dragons.com/page2121.html (affaiblissement temporaire / diminution permanente)

- **Damage** (temporary): returns **1 point per night of rest (8 h)** per ability (**2 per day of complete bed rest**); *lesser restoration* / *restoration* also heal it (https://www.d20srd.org/srd/combat/injuryandDeath.htm#healingAbilityDamage).
- **Drain** (permanent): only *restoration*-type magic. A draining creature gains 5 temp HP (10 on a crit).
- Critical hit with an ability damage/drain attack: double the amount.
- Score can't go below 0. At 0: Str → helpless on the ground; Dex → motionless, helpless; **Con → dead**; Int → unconscious (coma); Wis → deep sleep, helpless; Cha → catatonic, helpless.
- **Con drop**: lose 1 HP per HD per point of Con modifier lost; HP can't drop below 1 per HD from Con loss.
- Ability **penalties** (fatigue, entangled…) are different from damage: they vanish when the cause ends.

```json
{ "rule": "abilityScoreEffective",
  "formula": "base + increases + max(enhancement…) + otherBonuses + penalties - damage - drain, min 0",
  "atZero": { "str": ["helpless"], "dex": ["helpless", "immobile"], "con": ["dead"], "int": ["unconscious", "helpless"], "wis": ["unconscious", "helpless"], "cha": ["unconscious", "helpless"] },
  "conHpRule": "hp.max changes by (deltaConMod * HD), floor 1 HP per HD",
  "srdUrl": "https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss" }
```
CHECK: damage/drain points per ability shown in the breakdown with their own source line; recovery button "+1 day" (1 point, or 2 with bed rest).

## 3. Fear escalation

Source: https://www.d20srd.org/srd/specialAbilities.htm#fear — FR "Terreur" https://regles-donjons-dragons.com/page2171.html
Fear effects are cumulative by **escalating**, not by adding penalties: shaken + shaken → frightened; shaken + frightened → panicked; frightened + shaken/frightened → panicked.

```json
{ "rule": "fearEscalation", "levels": { "shaken": 1, "frightened": 2, "panicked": 3 },
  "table": { "shaken+shaken": "frightened", "shaken+frightened": "panicked", "frightened+shaken": "panicked", "frightened+frightened": "panicked" },
  "srdUrl": "https://www.d20srd.org/srd/specialAbilities.htm#fear" }
```
CHECK: never show two fear conditions at once; replace by the escalated one.

## 4. Poison and disease

### 4.1 Poison / Poison/venin
Source: https://www.d20srd.org/srd/specialAbilities.htm#poison — FR https://regles-donjons-dragons.com/page2159.html (FR terms: *effet initial*, *effet secondaire*; delivery: contact, ingestion, inhalation, blessure)

- Exposure → **Fortitude save** vs DC. Fail → **initial damage** (usually ability damage).
- **1 minute later**: second Fort save (same DC) → fail = **secondary damage**.
- Natural poison DC = 10 + ½ creature's racial HD + its Con modifier.
- Ability damage marked * on the table = permanent **drain**. Paralysis from poison lasts 2d6 minutes; unconsciousness 1d3 hours (unless stated).
- Delivery: contact (touch; works even if DR stops the damage), ingested, inhaled (10-ft cube), injury (needs a wound; DR that stops all damage stops it).
- Using poison: 5 % chance to poison yourself when applying; natural 1 on attack with a poisoned weapon → Reflex DC 15 or poison yourself.

```json
{ "id": "poison", "model": {
    "name": { "en": "", "fr": "" }, "delivery": "contact|ingested|inhaled|injury", "saveDC": 0,
    "initial": [ { "target": "ability.con.damage", "value": "1d6" } ],
    "secondary": [ { "target": "ability.con.damage", "value": "1d6" } ],
    "secondaryDelay": { "minutes": 1 }, "price": { "gp": 0 } },
  "examples": [
    { "name": "Medium spider venom", "delivery": "injury", "saveDC": 14, "initial": "1d4 Str", "secondary": "1d4 Str", "price": 150 },
    { "name": "Black adder venom", "delivery": "injury", "saveDC": 11, "initial": "1d6 Con", "secondary": "1d6 Con", "price": 120 },
    { "name": "Wyvern poison", "delivery": "injury", "saveDC": 17, "initial": "2d6 Con", "secondary": "2d6 Con", "price": 3000 } ],
  "srdUrl": "https://www.d20srd.org/srd/specialAbilities.htm#tablePoisons" }
```
The app should let the user enter a rolled result (ability damage) after each failed save; the full table is at the URL above.

### 4.2 Disease / Maladies
Source: https://www.d20srd.org/srd/specialAbilities.htm#disease — FR https://regles-donjons-dragons.com/page2145.html (FR: incubation, effet)

- Exposure → Fort save vs DC; success = no effect. Fail → ability damage after the **incubation** period, then **once per day** a Fort save to avoid more damage.
- **Two successful saves in a row** → recovered (devil chills: three; mummy rot: saves never cure, only magic).
- Natural recovery of ability damage (1/day) still happens during a disease. Heal check can replace the save (if higher; patient rested 8 h).

| Disease | Infection | DC | Incubation | Damage | Note |
|---|---|---|---|---|---|
| Blinding sickness | ingested | 16 | 1d3 days | 1d4 Str | 2+ damage → Fort or permanently blinded |
| Cackle fever | inhaled | 16 | 1 day | 1d6 Wis | |
| Demon fever | injury | 18 | 1 day | 1d6 Con | on damage, save or 1 point is drain |
| Devil chills | injury | 14 | 1d4 days | 1d4 Str | 3 saves in a row to recover |
| Filth fever | injury | 12 | 1d3 days | 1d3 Dex, 1d3 Con | |
| Mindfire | inhaled | 12 | 1 day | 1d4 Int | |
| Mummy rot | contact | 20 | 1 day | 1d6 Con | saves don't cure; magic only |
| Red ache | injury | 15 | 1d3 days | 1d6 Str | |
| Shakes | contact | 13 | 1 day | 1d8 Dex | |
| Slimy doom | contact | 14 | 1 day | 1d4 Con | on damage, save or 1 point is drain |

```json
{ "id": "disease", "model": { "infection": "", "saveDC": 0, "incubation": "", "dailyDamage": [], "savesToRecover": 2, "curableBySaves": true },
  "srdUrl": "https://www.d20srd.org/srd/specialAbilities.htm#tableDiseases" }
```

## 5. Energy drain and negative levels

Sources: https://www.d20srd.org/srd/specialAbilities.htm#energyDrainAndNegativeLevels , #levelLoss ; https://www.d20srd.org/srd/conditionSummary.htm#energyDrained — FR https://regles-donjons-dragons.com/page2120.html (Absorption d'énergie), page1587 (Vidé de son énergie), page2157 (Perte de niveau)

Per negative level (*niveau négatif*):
```json
{ "id": "negativeLevel", "name": { "en": "Negative level", "fr": "Niveau négatif" }, "stackable": true, "changes": [
  { "target": "attack.all", "value": -1, "bonusType": "untyped" },
  { "target": "save.all", "value": -1, "bonusType": "untyped" },
  { "target": "skill.all", "value": -1, "bonusType": "untyped" },
  { "target": "abilityCheck.all", "value": -1, "bonusType": "untyped" },
  { "target": "hp.max", "value": -5, "bonusType": "untyped" },
  { "target": "effectiveLevel", "value": -1, "bonusType": "untyped" } ],
  "srdUrl": "https://www.d20srd.org/srd/specialAbilities.htm#energyDrainAndNegativeLevels" }
```
- Critical hit with energy drain: twice the negative levels. The drainer gains 5 temp HP per level (10 on crit), not from spells.
- Spellcasters also lose a highest-level spell/slot (not relevant to the fighter).
- After **24 hours**: Fort save per negative level (DC 10 + ½ drainer's racial HD + its Cha mod); success → removed; failure → removed **and the character loses a real level** (level loss: lose 1 HD, BAB/saves/class features, the feat/ability increase/skill ranks of that level; XP set to the middle of the previous level).
- Negative levels ≥ character level (or drained below level 1) → **dead**.

CHECK: number of negative levels ≥ total character level → "dead" warning.
CHECK: a failed 24-hour save → prompt the user to remove the last level from the level-by-level record (the app never deletes it silently).

---

## 6. Stacking reminders for these presets

- Untyped condition penalties from **different** conditions stack (e.g. shaken −2 + sickened −2 = −4 on attacks). Source: https://www.d20srd.org/srd/theBasics.htm#stacking
- The same condition applied twice doesn't stack (same source); fear escalates instead (§3); exhausted replaces fatigued.
- Conditions that remove the Dex bonus also remove dodge bonuses (Dodge feat), except when the cap comes only from armor (https://www.d20srd.org/srd/theBasics.htm#dodgeBonus).
