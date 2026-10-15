# Um, actually… — review of 2026-10-15 (races, classes, ranger, spells)

## Scope

The generic race and class structure from commit 6792076:
- the 7 races and the 11 class tables;
- the ranger;
- spellcasting and the turn bar.

The full druid spell list added afterwards was not reviewed, only built and validated.

## Sources

- SRD 3.5: local `sources/srd-v3.5/`, `sources/dnd35.db`, and d20srd.org;
- the official French SRD (DRS 02, 03a/b, 21, 22).

Each bug was reproduced with a temporary Vitest file, deleted afterwards. The fixes are covered by `src/engine/__tests__/generic.test.ts`.

**Chikibidouille's numbers are unchanged by every finding.**

## Meaningful (all fixed)

| # | Finding | Rule | Fix |
|---|---|---|---|
| M1 | Racial weapon proficiencies (elf longsword, dwarf waraxe) were ignored by the rule checks and feat prerequisites. The attack line was right, but a warning and a "prerequisites not met" appeared anyway. | [races.htm](https://www.d20srd.org/srd/races.htm) | One proficiency helper (`engine/proficiency.ts`), used by the attack line, the rule checks and the prerequisites. |
| M2 | Weapon and armor proficiency feats never granted proficiency. | [feats.htm#exoticWeaponProficiency](https://www.d20srd.org/srd/feats.htm#exoticWeaponProficiency) | Same helper: Simple, Martial and Exotic Weapon Proficiency, Armor Proficiency (light/medium/heavy), Shield and Tower Shield Proficiency. |
| M3 | Wizards and monks had no bonus-feat slots. | [wizard.htm](https://www.d20srd.org/srd/classes/wizard.htm#bonusFeats), [monk.htm#bonusFeat](https://www.d20srd.org/srd/classes/monk.htm#bonusFeat) | Wizard: 5/10/15/20, choosing metamagic, item creation or Spell Mastery. Monk: 1/2/6, from that level's pair, prerequisites ignored. |
| M4 | Divine grace, barbarian and monk fast movement, and the monk AC bonus were not computed. | paladin/barbarian/monk pages | All computed, with their armor/load conditions. Also added: trap sense (situational, stacking between classes), indomitable will (situational), and uncanny dodge for barbarian 2 and rogue 4. |
| M5 | Clerics had no domain slot. | [cleric.htm#domains](https://www.d20srd.org/srd/classes/cleric.htm) | +1 slot per spell level from 1st. A specialist wizard also gets +1 slot per level once a school is chosen (new wizard 1st-level choice). |
| M6 | Granted feats (Track, Endurance, combat style) didn't count as feat prerequisites: Diehard was refused to a ranger 3. | [ranger.htm#endurance](https://www.d20srd.org/srd/classes/ranger.htm#endurance) | Granted feats count in the rule checks and the feat picker, and are no longer offered again. |
| M7 | Effect durations were counted down at the end of your turn, so they lost the enemies' turns. | [initiative.htm](https://www.d20srd.org/srd/combat/initiative.htm): a duration ends "just before the same initiative count that they began on" | Counted down at "Start of my next turn", including for effects switched off. |
| M8 | A low key ability removed the spell slots. | [castingSpells.htm#spellSlots](https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots): "still gets the slots but must fill them with spells of lower level" | Slots kept, without bonus spells. Any slot can hold a spell of its level or lower. |

## Minor (all fixed)

- **Favored enemy damage range:** the "ranged: within 30 ft." limit was a 3.0 leftover and is removed.
- **Wild empathy:** it now gets the +2 synergy from 5 ranks of Handle Animal.
- **Leftover class choices:** choices left on a non-ranger level, or on a ranger level where none is due, are now ignored.
- **"Described only" labels:** features the app computes are no longer marked "described only" (wild empathy, spells, divine grace, fast movement…).
- **Greater magic fang summary:** +1 per **four** caster levels.
- **Animal growth (French summary):** "et les DV" removed, a 3.0 leftover.
- **Half-orc:** minimum Int 3 is applied.
- **Gnome:** the +2 now applies to Craft (alchemy) only.
- **Halfling:** the +1 applies automatically with thrown weapons and slings, not bows. Small and Fearless traits added.
- **New characters:** they start with their race's automatic languages.
- **Unknown race:** now flagged, instead of silently using the human rules.
- **Two-weapon fighting:** no Str ×1.5 in two-weapon fighting, and a two-handed weapon gets an error.
- **Spell popup:** no DC shown for "Saving Throw: None".
- **Ranger combat style (French text):** "arme intermédiaire ou lourde" corrected to "armure" (typo in DRS 03b).

## Not changed (known limits)

- **Monk:** flurry of blows, unarmed damage and the table's other columns.
- **Double weapons:** urgrosh, hooked hammer, two-bladed sword… are not modelled.
- **Rogue:** the special ability choices.
- **Wizard:** prohibited schools, and the specialist slot isn't restricted to the specialty school.
- **Spell components:** shown only in English (V, S, DF).

## Open questions — researched 2026-10-16 (docs/rules/rulings-classes.md)

- **Q1 → C1:** wild empathy levels don't stack; the app uses the higher class level.
- **Q2 → C2:** combat-style feats count for picking feats; in medium or heavy armor the dependent feats stop working, with a warning.
- **Q3 → C3:** pending house rule #23 (dwarf +2 or +4).

## Original open questions

1. **Wild empathy for a druid/ranger multiclass:** the app adds both class levels. The SRD doesn't say.
2. **Combat-style feats in medium armor:** do they still count as feat prerequisites while the style is inactive? The app counts them only while the style is active.
3. **Dwarf vs a poison spell:** +2 vs poison and +2 vs spells are the same type, so the app keeps only one. A ruling is only needed if it comes up.

## Verdict

**Trustworthy:**
- races, class tables, spells per day, DCs;
- ranger favored enemy and combat style;
- two-weapon fighting and Small size.

**Partly modelled:** monk unarmed combat, double weapons, rogue special abilities.
