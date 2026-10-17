# Um, actually… — combat and character core, review of 2026-10-17

**Scope:**
- `src/engine/compute.ts`: abilities, HP, BAB, saves, AC, max Dex, armor check penalty, speed, load, initiative, grapple, skills, attacks, criticals, Power Attack, Combat Expertise, fighting defensively, two-weapon fighting, attacks of opportunity.
- `src/engine/stacking.ts`.
- Conditions and effects: `conditions.json`, `ui/effects.ts`, `ui/TurnBar.svelte`.
- HP handling. The main author is rewriting it right now: the new `engine/hitPoints.ts` and `ui/HitPoints.svelte` are uncommitted and used by both panes. This review audits that working copy.
- The Chikibidouille fixture and `chikibidouille.test.ts`.

**Sources:**
- `sources/srd-v3.5/` (Combat I: injury and death; Carrying, Movement and Exploration);
- `sources/dnd35.db` (barbarian rage);
- official 3.5 FAQ 6/30/2008, pp. 36, 39, 43, 113;
- house rules #1–40 and earlier reviews.

**Method:** the bugs were reproduced with two temporary Vitest files (`tmp-um-combat-a/b`), now deleted. The full suite passes: 277/278. The only failure is another reviewer's temporary file (`tmp-um-classes-dump`, timeout).

## Meaningful

### M1. Um, actually… "Its effects stack": Toughness taken twice gives +3 hp, not +6
- **Rule:** Toughness, "Special: A character may gain this feat multiple times. Its effects stack." ([feats.htm#toughness](https://www.d20srd.org/srd/feats.htm#toughness))
- **Code:** `compute.ts:442-447`. Every feat modifier is pushed with `sourceId: feat:<id>`. Two Toughness picks therefore share one source, and `stacking.ts` keeps only the larger one ("sameSource").
- **Repro:** Chikibidouille with Toughness at levels 6 and 9 → HP **131**, expected **134**. The second +3 is shown as "sameSource".
- **Fix:** make the source id unique per pick (e.g. `feat:toughness#<index>`) for feats that can be taken more than once and stack.

### M2. Um, actually… two negative levels are not one: energy drain can't be applied more than once
- **Rule:** "Each negative level gives a creature the following penalties: –1 penalty on attack rolls, saving throws, skill checks, ability checks; loss of 5 hit points; and –1 to effective level." ([conditionSummary.htm#energyDrained](https://www.d20srd.org/srd/conditionSummary.htm#energyDrained))
- **Code:**
  - `conditions.json:439`: the `perNegativeLevel` flag is read nowhere. The summary tells the player to "apply once per negative level".
  - `compute.ts:561`: every copy of the condition gets the same source, `condition:energy-drained`, so the copies don't stack.
- **Repro:** two Energy Drained conditions at level 8 → HP **107**, greatsword **+14**, Fort **+8**. Expected HP **102**, **+13**, **+7**.
- **Fix:** add a count of negative levels on the effect (like the `userAmount` flag) and multiply the modifiers. Alternatively, give each copy its own source id, for this condition only: fear conditions must keep their own rules.

## Minor

### m1. Overloaded loses the Dex bonus to AC
- **Rule:** "While overloaded in this way, the character loses any Dexterity bonus to AC and can move only 5 feet per round." ([carryingCapacity.htm](https://www.d20srd.org/srd/carryingCapacity.htm), Lifting and Dragging)
- **Code:** `compute.ts:891` sets 5 ft, but `loseDex` (`:894`) ignores `band === 'overloaded'`.
- **Repro:** 700 lb carried → AC **21** (expected **20**), flat-footed AC unchanged.
- **Fix:** `loseDex ||= band === 'overloaded'`.

### m2. A medium or heavy load counts as medium or heavy armor (ranger combat style)
- **Rule:** "A medium or heavy load counts as medium or heavy armor for the purpose of abilities or skills that are restricted by armor." ([carryingCapacity.htm](https://www.d20srd.org/srd/carryingCapacity.htm))
- **Code:** `compute.ts:368-374`. `styleActive` looks only at the worn armor. Barbarian, monk and swordsage do check the load band; the evasion notes don't mention load either.
- **Repro:** ranger 12 (archery), no armor, medium load → style active, Rapid Shot / Manyshot / Improved Precise Shot still granted. Expected: style inactive.
- **Fix:** `styleActive = armorIdx <= 0 && band === 'light'`.

### m3. The reduced speed table isn't linear above 40 ft
- **Rule:** the SRD gives the reduced speed for every base speed: 50 → 35, 60 → 40, 70 → 50, 80 → 55, 90 → 60, 100 → 70 ([carryingCapacity.htm](https://www.d20srd.org/srd/carryingCapacity.htm), Armor and Encumbrance for Other Base Speeds).
- **Code:** `compute.ts:867-868` gives 30-column value + (base − 30): 50 → 40, 60 → 50. Only 20, 30 and 40 come out right.
- **Repro:** druid 10 in wild shape with a medium load:
  - cheetah (50 ft) → **40**, expected **35**;
  - light horse (60 ft) → **50**, expected **40**;
  - tiger (40 ft) → 30, correct.
- **Fix:** a lookup table from the SRD (round down between rows).

### m4. `hpState`: at 0 hp, "disabled" hides "unconscious"
- **Rule:** "When your nonlethal damage exceeds your current hit points, you fall unconscious" ([injuryDeath.htm](https://www.d20srd.org/srd/combat/injuryDeath.htm)). That holds at 0 hp too.
- **Code:** `hitPoints.ts:45` returns `disabled` before testing nonlethal damage (`:46`).
- **Repro:** `hpState(20, {damage: 20, nonlethal: 1, temp: 0})` → `disabled` ("one move or standard action"). Expected: unconscious (helpless).
- **Fix:** test nonlethal > current before the `current === 0` case, or show both states.

### m5. `hpState`: temporary hit points are part of current hit points
- **Rule:** "When a character gains temporary hit points, note his current hit point total. When the temporary hit points go away the character's hit points drop to his current hit point total." ([injuryDeath.htm#temporaryHitPoints](https://www.d20srd.org/srd/combat/injuryDeath.htm)) So temporary hit points raise the hit points that the disabled, dying and nonlethal thresholds compare against.
- **Code:** `hitPoints.ts:40` sets `current = max − damage`, with the comment "temporary ones not included".
- **Repro:**
  - At 0 hp, *aid* gives 8 temporary hp → still `disabled`. Expected: 8 hp, fully functional.
  - 10 hp, 5 temporary, 12 nonlethal → `unconscious`. Expected: 15 > 12, so fine.
- **Fix:** compare against `max − damage + temp` for the states, and keep showing the real current hp beside the temporary ones.

### m6. `hpState` ignores the stable condition
- **Rule:** a stable character no longer loses hit points ([injuryDeath.htm#stableCharactersandRecovery](https://www.d20srd.org/srd/combat/injuryDeath.htm)). Once stable and conscious, he is disabled, even below 0 hp.
- **Code:** `hitPoints.ts:44` shows "Dying: … loses 1 hp per round" whenever hp < 0, even with the Stable condition active.
- **Fix:** pass the active conditions in (stable → "stable, unconscious"), or let a stabilized flag replace the dying text.

### m7. Temporary hit points that run out take other sources' temporary hp with them
- **Rule:** "Temporary hit points from different sources stack, but you must keep track of them separately… Temporary hit points are 'first-in, first-out.'" (3.5 FAQ 6/30/2008, p. 113)
- **Code:** `TurnBar.svelte:49`, `classActions.ts:63` and `ClassFeaturesBlock.svelte:62` subtract the effect's whole grant (`e.tempHp`) from the single pool.
- **Repro:**
  - 12 temporary hp (inspire greatness), take 10 damage → 2 left;
  - add 8 temporary hp (false life, typed in) → 10;
  - the song ends → **0**. Expected **8**.
- **Fix:** track the remainder per effect, damage taken oldest first; at expiry, remove only what is left of that effect.

### m8. Steely resolve's delayed damage skips temporary hit points
- **Rule:** temporary hit points are lost first ([injuryDeath.htm](https://www.d20srd.org/srd/combat/injuryDeath.htm)); the delayed damage is still damage (*Tome of Battle* p. 10).
- **Code:** `TurnBar.svelte:26` and `:84` do `c.hp.damage += pool` instead of `takeDamage(c.hp, pool)`.
- **Fix:** use `takeDamage`. Timing and scope stay with pending house rules #31/#32.

### m9. The "flat-footed" toggle forgets "no attacks of opportunity"
- **Rule:** "A flat-footed character … cannot make attacks of opportunity" ([conditionSummary.htm#flatFooted](https://www.d20srd.org/srd/conditionSummary.htm#flatFooted)); Combat Reflexes is the exception.
- **Code:** `compute.ts:894` and `:751` treat `toggles.situational.flatFooted` like the condition for AC and battle clarity, but only the condition pushes the `noAoO` flag (`:560`).
- **Repro:** without Combat Reflexes:
  - toggle on → flags `[]`;
  - flat-footed condition → `['loseDexToAc', 'noAoO']`.
- **Fix:** push `noAoO` (and `loseDexToAc`) when the toggle is on.

### m10. The ki damage line adds Power Attack ×1 for a one-handed weapon held in two hands
- **Rule:** Power Attack is ×2 "with a one-handed weapon wielded in two hands" ([feats.htm#powerAttack](https://www.d20srd.org/srd/feats.htm#powerAttack)).
- **Code:** `Combat.svelte:371` multiplies by 2 only if `handedness === 'twoHanded'`, while the engine uses the grip (`twoHands`, `compute.ts:1326`).
- **Repro:** a Weapon Master with a bastard sword (exotic, Weapon Focus) held two-handed, Power Attack 3 → "+ 3 Power Attack". Expected: + 6.
- **Fix:** expose the PA factor on `AttackLine`, or use `a.twoHands`.

## Nitpicks
- **n1. Ability scores at 0 aren't turned into states.**
  - Rule ([conditionSummary.htm#abilityDamaged](https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged)):
    - Str 0: helpless;
    - Dex 0: paralyzed;
    - Con 0: dead;
    - Int, Wis or Cha 0: unconscious.
  - The texts say so, but `hpState` and the flags ignore it.
- **n2. The haste cap applies to any positive speed bonus.** `compute.ts:889` caps every positive bonus at the current speed, not only haste's. No data entry is affected today: the only ones are haste +30 and boots +10. A custom +30 effect (e.g. *expeditious retreat*) on a 20-ft character would be cut to +20.
- **n3. Effect durations always count down at the start of *your* turn.** A spell cast by someone else ends on its caster's initiative count ([initiative.htm](https://www.d20srd.org/srd/combat/initiative.htm)). The turn bar's note states the convention, so this is wording only.

## Checked and correct
- **Chikibidouille, rechecked by hand:** every value in `chikibidouille.test.ts` is right.
  - **Level 8:**
    - Str 18, Con 18; HP 112;
    - BAB +8/+3;
    - Fort +9 / Ref +8 / Will +1 (WM 2 = +0/+3/+0);
    - AC 21 / touch 11 / flat-footed 20 (Dodge is situational);
    - ACP −5; speed 20 ft; initiative +3.
  - **Greatsword:** +15/+10, 2d6+8, 19–20/×2, ki 20.
  - **Skills:**
    - Intimidate 8 (7 ranks), Spot 5 and Listen 5 (6 ranks, Wis −1);
    - K. monsters 5, Craft 4, Ride 4 (no ACP), Climb 3, Handle Animal 2;
    - Jump −5.
  - **AoO:** 4.
  - **Tank:** AC 23, Climb 1, Jump −7, short sword +12 / +4.
  - **Level 9:** HP 128, BAB +9/+4, Fort +11, Ref +9 (battle clarity; 8 when flat-footed), greatsword +16/+11.
  - **WM 3 variant:** HP 126, Fort +10, +17/+12.
  - **Effects:** bull's strength 22 / +17 / 11 / Climb 5; fatigued; exhausted replaces fatigued; shaken + sickened = −4; prone toggles; flat-footed 20.
- **Grapple** takes no attack-roll modifiers, Power Attack or Combat Expertise: "A grapple check isn't an attack roll" (FAQ p. 39).
- **Combat Expertise is off while raging:** SRD rage text, "He can use any feat he has except Combat Expertise, item creation feats, and metamagic feats" (`dnd35.db`).
- **Combat Expertise:** stacks with fighting defensively; Tumble doesn't improve it (FAQ p. 36). Its penalty applies to both hands (FAQ p. 39).
- **Two-weapon fighting:** longsword + short sword with the feat → +11/+6 and +11. Off-hand damage ½ Str. The light-weapon, feat and Improved/Greater TWF steps are right.
- **Power Attack:**
  - penalty on light weapons, no damage bonus with them (FAQ p. 43);
  - ×2 when gripped in two hands, ×1 in the off hand;
  - slider max = BAB; Combat Expertise max = min(5, BAB).
- **Criticals:**
  - Improved Critical and keen don't stack;
  - ki critical gives Improved Critical, or +2 if you already have it, applied last;
  - burst dice ×(multiplier − 1).
- **Stacking engine:**
  - same type → best bonus / worst penalty;
  - dodge, circumstance, untyped (house rule #23: racial) stack;
  - same source never stacks;
  - untyped penalties stack (R01).
- **AC:**
  - touch drops armor, shield and natural armor only;
  - flat-footed drops a positive Dex and dodge bonuses but keeps a Dex penalty;
  - helpless / pinned treat Dex as 0;
  - uncanny dodge only against flat-footed. The 2026-10-16 M2 and M3 fixes hold (tests pass).
- **Speed:**
  - worse of armor and load;
  - barbarian fast movement applied before armor;
  - dwarf unaffected;
  - haste +30 capped at double;
  - half speed rounded to 5 ft.
- **Load:**
  - SRD bands, inclusive (R19);
  - Str > 29 ×4;
  - size and quadruped factors;
  - coins 50/lb.
- **Conditions:** all 38 again match the SRD condition summary. For example, panicked has no attack penalty in the English SRD; sickened −2 on weapon damage; deafened −4 initiative; entangled −2 attack, −4 Dex.
- **HP (working copy):**
  - damage now takes temporary hp first;
  - healing also removes nonlethal damage (SRD "Healing Nonlethal Damage");
  - thresholds: disabled 0, dying −1 to −9, dead −10, staggered / unconscious.
  - These fix the committed panes, where the ±hp buttons ignored temporary hp, healing left nonlethal damage, and disabled/dying weren't shown. The remaining gaps are m4–m8.

## Verdict
Chikibidouille's sheet is right to the last point, and the attack, AC, save and skill engines hold up, earlier fixes included.

Before trusting the numbers for other characters, fix:
- **Toughness taken twice (M1)** and **multiple negative levels (M2).**
- **Hit point states:** the new hit-points module is a clear improvement but still misreads 0 hp with nonlethal damage, temporary hp and stable characters (m4–m8).
