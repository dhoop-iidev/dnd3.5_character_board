# Um, actually… — review of 2026-10-17 (other classes and character building)

**Scope:**
- **Classes:** cleric (domains, spontaneous casting, turning), druid (companion, wild shape), ranger, paladin, barbarian, monk, rogue and fighter.
- **Building:** progression (skill points, feat slots, class bonus feats), prerequisites at the level taken, prestige entry, alignment and multiclass rules, the multiclass XP penalty.
- **Data:** class tables (`classes.json`) and races (`races.json`).
- **Examples:** druid 10, cleric 15, ranger 12, dwarf fighter 10, barbarian 8, monk 8, paladin 8, rogue 10.
- **Out of scope:** Tome of Battle content and the arcane casters.

**Sources:**
- `sources/dnd35.db` (`class`, `class_table`, `feat`);
- the local SRD HTML (`character-classes-i.html`, `feats.html`, `races.html`, `basics-and-ability-scores.html`, `magic-items-v-wondrous-items.html`);
- the official French SRD (DRS 05);
- the official 3.5 FAQ of 6/30/2008;
- house rules #1–#40 and rulings C1–C38.

**Method:**
- Every class table was diffed by script against `dnd35.db`: BAB, saves, spells per day, hit die, skill points and class skills.
- Every example was dumped through the engine (temporary Vitest files `tmp-um-classes-*.test.ts`, now deleted) and checked by hand.
- Each finding below was reproduced with the engine. Nothing in the source was changed.

**Previous reports:** the fixes from 2026-10-15 (races, classes) and 2026-10-16 (full review, barbarian/monk/paladin/rogue) still hold. The regression tests pass (130 tests in `examples`, `classes-bmpr`, `review-2026-10-16`, `generic` and `progression`). One earlier fix was undone by a later commit: M1 below.

## Meaningful

### M1. Um, actually… a cleric can't choose his domains any more: the cleric's 1st-level choices disappeared
- **Rule:** "a cleric chooses two domains… A good cleric… channels positive energy… an evil cleric channels negative energy… a neutral cleric… must choose" ([cleric.htm#domains](https://www.d20srd.org/srd/classes/cleric.htm#domains), [#spontaneousCasting](https://www.d20srd.org/srd/classes/cleric.htm#spontaneousCasting)).
- **Code:** `src/engine/classChoices.ts` (`choicesAt`, around lines 25–60).
  - Commit `ddc6fd2` (wizard, sorcerer and bard) replaced the cleric-1 branch, along with the swordsage discipline-focus branch, when it rewrote the wizard branch. That branch held domain 1, domain 2, energy, and the deity weapon for War.
  - Nothing else writes `domain1`, `domain2`, `channel` or `deityWeapon`. The Spells pane still says "choose two domains at cleric 1 (Progression)", but the Progression editor (`LevelEditor.svelte`) only shows `choicesAt`.
  - The checks in `validate.ts:422` (`choice-missing` / `choice-invalid`) are now silent for clerics.
  - The `generic.test.ts:266` test ("rule checks accept two different domains") now passes without testing anything.
- **Repro (engine):**
  - `choicesAt(pretre-niveau-15, 1)` returns `[]`. Expected: `domain1`, `domain2`, `channel`.
  - The same cleric with empty choices and alignment NE:
    - 0 domains;
    - turning mode `turn` and spontaneous *cure* spells (expected: rebuke and *inflict*);
    - domain slots still counted (6/8/8/7/…);
    - no warning about the missing domains or energy.
  - The examples still work only because their JSON already holds the choices.
- **Fix:** restore the cleric-1 branch (and the swordsage focus at 1/4/8/12/16, which is ToB but was removed in the same commit). Add a `choicesAt` regression test for both.

### M2. Um, actually… druids don't wear metal, and the app lets a druid cast in a breastplate behind a steel shield
- **Rule:** "Druids are proficient with light and medium armor but are prohibited from wearing metal armor; thus, they may wear only padded, leather, or hide armor… must use only wooden [shields]. A druid who wears prohibited armor or carries a prohibited shield is unable to cast druid spells or use any of her supernatural or spell-like class abilities while doing so and for 24 hours thereafter." ([druid.htm#weaponandArmorProficiency](https://www.d20srd.org/srd/classes/druid.htm); local `character-classes-i.html`)
- **Code:**
  - `src/data/srd/armor.json` has no metal/wood flag.
  - `src/engine/validate.ts:552-558` checks proficiency only.
  - `compute.ts` (spellcasting, wild shape) never looks at the armor material.
- **Repro:** `druide-niveau-10` with hide → breastplate and light wooden shield → heavy steel shield:
  - spells per day stay 6/6/5/4/4/3;
  - the only warning is `load`.
  - Expected: a warning that druid spells and supernatural/spell-like abilities (wild shape) are unusable while it is worn and for 24 hours after.
- **Fix:**
  - add `metal: boolean` to the armor data (wooden shields, padded, leather, studded leather and hide are not metal; mithral and adamantine are);
  - add a validate warning for druid levels;
  - optionally mark druid spellcasting and wild shape as suspended.

### M3. Um, actually… the cleric example wears a Phylactery of Undead Turning that does nothing (and the test expects it to)
- **Rule:** "allowing him to [turn undead] as if his class level were four levels higher than it actually is" ([wondrousItems.htm#phylacteryofUndeadTurning](https://www.d20srd.org/srd/magicItems/wondrousItems.htm#phylacteryofUndeadTurning); the item is [good] and says "turn").
- **Code:**
  - `src/engine/compute.ts:1575`: `turningLevel = clericLevel + paladinTurning + improvedTurning`, with no item term.
  - The item in `magic-items.json` has no modifiers: it is text only.
  - `examples/pretre-niveau-15.json` wears it.
  - `src/engine/__tests__/examples.test.ts:117` expects turning level 16.
- **Repro:** `pretre-niveau-15` (cleric 15 + Improved Turning, phylactery worn):
  - **got:** turning level 16, damage 2d6+18, destroys ≤ 8 HD;
  - **expected:** turning level 20, damage 2d6+22, the table moved up by 4, destroys ≤ 10 HD.
- **Fix:**
  - add a "turning level" item effect, +4 for a positive-energy turner, and apply it in compute;
  - correct the example's test expectation to 20.
  - The same gap exists for the *monk's belt* (m6).

## Minor

### m1. Um, actually… a druid in wild shape fails his own feat prerequisites in the build check
- **Rule:** prerequisites are judged at the level the feat is taken. Wild shape is a temporary form whose physical scores replace the druid's ([druid.htm#wildShape](https://www.d20srd.org/srd/classes/druid.htm#wildShape), errata C4). Losing a prerequisite only makes the feat unusable for now (ruling Q6). The app already has an informative `unusable-` warning for that.
- **Code:** `src/engine/validate.ts:50` `permanent()` clears effects, ability damage and toggles, but not `wildShape`.
  - So every `compute(perm, { level })` uses the form's Str/Dex/Con and treats the melded items as stored.
  - This affects feat prerequisites, prestige entry and skill budgets.
- **Repro:** `druide-niveau-10` with Dodge at level 3 (Dex 14), then `startWildShape('rhinoceros')`:
  - **got:** an actionable **error** "Level 3: Dodge prerequisites not met: DEX 13 (has 10)";
  - **expected:** no build error. At most the informative "Dodge can't be used" warning.
- **Fix:** `permanent()` should also drop `wildShape` (and, later, any other temporary form).

### m2. Um, actually… Exotic Weapon Proficiency (bastard sword) needs Str 13, and nobody checks it
- **Rule:** "Prerequisite: Base attack bonus +1 (plus Str 13 for bastard sword or dwarven waraxe)." ([feats.htm#exoticWeaponProficiency](https://www.d20srd.org/srd/feats.htm#exoticWeaponProficiency))
- **Code:**
  - The Str 13 condition is stored only as `prereq.other` text.
  - `src/engine/prereq.ts` (the `other` loop, around line 105) handles turning, race, wild shape, wizard level and caster level, but not this one.
- **Repro:** the dwarf fighter example rebuilt with Str 10, plus Exotic Weapon Proficiency (bastard sword) at level 9:
  - no warning for it (Power Attack and Cleave are flagged);
  - `featOptions(…, 9, 'general')` lists EWP with `unmet: []`.
  - Expected: "STR 13 (has 10)".
- **Fix:** model it as data, e.g. `abilitiesIfChoice: { "bastard-sword": { str: 13 }, "dwarven-waraxe": { str: 13 } }`, or match the `other` text in `prereq.ts`.

### m3. Um, actually… granted feats count for feat prerequisites but not for prestige class entry
- **Rule:** a class feature that gives a feat ("gains Improved Unarmed Strike as a bonus feat", War domain Weapon Focus, ranger style feats) means the character has that feat. The app itself counts granted feats for feat prerequisites (review of 2026-10-15, M6).
- **Code:** `src/engine/validate.ts:85` and `src/engine/progression.ts:150` pass only the chosen feats (`feats` / `levels.flatMap(l => l.feats)`), without `sheet.feats` granted ones.
- **Repro:** `moine-niveau-8` + a Shadow Sun Ninja level. Both `classOptions` and `validate` list "Improved Unarmed Strike" among the unmet requirements, though the monk has it.
- **Same gap elsewhere:**
  - a War-domain cleric's Weapon Focus for the Weapon Master;
  - ranger style feats for any requirement.
- **Fix:** pass `[...feats, ...before.feats.filter(f => f.slot === 'granted'), ...before.inactiveStyleFeats]`, as the feat check already does.

### m4. Um, actually… three examples speak a language they can't know
- **Rule:**
  - "A character who has an Intelligence bonus at 1st level speaks other languages as well, one extra language per point of Intelligence bonus as a starting character." ([races.htm](https://www.d20srd.org/srd/races.htm); local `races.html`)
  - Class languages (cleric: Celestial…; druid: Sylvan) only widen the *list*.
  - Druidic is free for a druid. More languages need Speak Language ranks.
- **Code:** no language check in `validate.ts`; `identity.languages` is free text.
- **Repro:**

| Example | Int | Languages | Problem |
|---|---|---|---|
| `druide-niveau-10` (human) | 10 | Commun, Druidique, Sylvestre | Sylvan needs an Int bonus |
| `pretre-niveau-15` (human) | 10 | Commun, Céleste | no bonus language |
| `rodeur-niveau-12` (elf) | 12 | Commun, Elfe, Sylvestre, Gnoll | 2 bonus languages for +1 |

  None of them has Speak Language ranks.
- **Fix:**
  - correct the three examples: drop Sylvan, Celestial and Gnoll, or raise Int, or buy Speak Language;
  - optionally add an info check: automatic + Int bonus at 1st level + Speak Language ranks (+ Druidic).

### m5. Um, actually… a dagger or throwing axe can be thrown, but the app only shows the melee line
- **Rule:** "Thrown weapons… you apply your Dexterity modifier to attack rolls" (ranged attack). Point Blank Shot, Precise Shot and the halfling's +1 on thrown weapons apply to them ([combatStatistics.htm#attackBonus](https://www.d20srd.org/srd/combat/combatStatistics.htm#attackBonus), [races.htm#halflings](https://www.d20srd.org/srd/races.htm#halflings)).
- **Code:** `src/engine/compute.ts:1174`.
  - `family` is `melee` for every `kind: 'melee'` weapon. Club, dagger, light hammer, sai, shortspear, spear, throwing axe and trident all have a range increment.
  - Their thrown use never gets a line, so `attack.thrown` and the halfling +1 never apply to them.
- **Repro:**
  - `guerriere-niveau-10`, throwing axes: only "15/10" is shown (melee, Str). Thrown: BAB 10 + Dex 1 = **+11/+6**.
  - `roublard-niveau-10`, masterwork dagger: only melee 15/10. Thrown: 7 + 6 + 1 size + 1 mw + 1 halfling = **+16/+11**, and Point Blank Shot within 30 ft adds +1 attack and +1 damage.
- **Fix:** for melee weapons with a `rangeIncrement`, add a second "thrown" attack line: Dex to attack, the `attack.ranged` and `attack.thrown` parts, full Str to damage, no Power Attack.

### m6. Um, actually… the monk's belt doesn't make a monk five levels better either
- **Rule:** "The wearer's AC and unarmed damage is treated as a monk of five levels higher… If the character is not a monk, she gains the AC and unarmed damage of a 5th-level monk." It also grants one extra stunning attack per day with Stunning Fist ([wondrousItems.htm#beltMonks](https://www.d20srd.org/srd/magicItems/wondrousItems.htm#beltMonks)).
- **Code:** `belt-monks` in `magic-items.json` is text only. `compute.ts` (monk AC bonus, `monkUnarmedDice`, Stunning Fist uses) never reads it.
- **Repro (code reading: nothing in `src/engine` or `src/ui` references `belt-monks`):** `moine-niveau-8` + the belt worn:
  - **got:** unarmed 1d10, monk AC bonus +5 (Wis 4 + 1), Stunning Fist uses 8;
  - **expected:** unarmed 2d6 (as monk 13), AC bonus +6 (Wis 4 + 2), 9 Stunning Fist uses.
- **Fix:** add an "effective monk level +5 for AC and unarmed damage" effect (and a +1 Stunning Fist use), the same mechanism as M3.

### m7. Um, actually… the Good domain's +1 caster level works on all of a cleric's spells
- **Rule:** official 3.5 FAQ (6/30/2008, p. 75): "Unless the domain's granted power specifically states that it applies only to a limited range of spells, the bonus applies to all spells the cleric casts, regardless of their source."
- **Code:** `src/ui/panes/Spells.svelte:211`: `sc.classId === 'cleric' ? domainCasterLevelBonus(…) : 0`. The same restriction is in `SummonBlock.svelte` (`chosen?.caster.classId === 'cleric'`).
- **Repro (code reading, the UI branch is explicit):** a cleric 1 (Knowledge domain) / wizard 5 opens a wizard divination spell. Expected: caster level 6; got 5. The same applies to a Good-domain cleric/druid's *summon nature's ally* of a celestial creature.
- **Fix:** apply `domainCasterLevelBonus` for every casting class of a character with domains.

## Nitpicks (4)
1. **Augment Summoning French name:** "Convocation suprême" in `creature.ts:155` and `SummonBlock.svelte:193`. The official DRS 05 name, which `feats.json` already uses, is "Amélioration des créatures convoquées".
2. **Ranger evasion:** the ranger's evasion (9th) isn't in the Evasion note built for monks and rogues (`compute.ts:1655`). It stays visible as a "described only" table feature.
3. **Class picker:** `classOptions` (`progression.ts:149`) offers base classes with an empty `unmet` even when they are blocked. Examples: lawful → barbarian or bard, non-neutral → druid, a monk or paladin who has multiclassed. `validate` flags this only after the level is taken.
4. **Companion tricks:** the druid and ranger examples have no Handle Animal ranks, yet their companions know 6 tricks. The bonus tricks are 2 (effective level 4) and 3 (effective level 6). The rest can only have been taught by someone else ([handleAnimal.htm](https://www.d20srd.org/srd/skills/handleAnimal.htm): untrained, "can't teach, rear, or train animals"). Worth a line in the examples' notes.

## Checked and correct
- **Class tables:** all 11 base classes have BAB, Fort/Ref/Will, spells per day (levels 1–20), hit die, skill points and class skills identical to `dnd35.db`.
- **Class data:**
  - proficiencies (druid and monk lists, rogue, wizard);
  - bonus feat levels: fighter 1, 2, 4…20; monk 1/2/6 with their pairs, prerequisites ignored; wizard 5/10/15/20 with metamagic, item creation and Spell Mastery;
  - granted feats: Track, Endurance, monk Improved Unarmed Strike, Scribe Scroll, the ranger styles at 2/6/11.
- **Feat prerequisites (`feats.json`):** checked one by one against the SRD; apart from m2, all match, including the item-creation caster levels.
- **Progression:**
  - skill points (minimum 1, ×4 at 1st, human +4/+1, permanent Int);
  - rank cost by the class taken at that level; maximum ranks for class and cross-class skills;
  - feat slots at 1, 3, 6…, the human feat, ability increases every 4 levels;
  - prerequisites at the level taken, with earlier picks of the same level;
  - prestige requirements judged on the level before.
- **Alignment and multiclass:**
  - class alignments: barbarian and bard nonlawful, druid neutral on one axis, monk lawful, paladin LG;
  - ex-class effects; monk and paladin can't return after multiclassing;
  - multiclass XP penalty (favored class or the highest class for "any", prestige classes ignored).
- **Class features:**
  - rage (uses, +4/+6/+8, Will +2/+3/+4, 3 + raged Con rounds); damage reduction 1–5; trap sense stacking; uncanny dodge and improved uncanny dodge level sums;
  - monk unarmed dice for every size, flurry, ki strike, slow fall, AC bonus, fast movement, wholeness, quivering palm DC, Stunning Fist uses;
  - smite (uses, first attack only, Cha bonus only), lay on hands, remove disease, paladin turning at level − 3, the mount table;
  - sneak attack.
- **Cleric:**
  - turning uses, check, damage and table, Improved and Extra Turning, the 60 ft range, the destroy and command limits;
  - domain turning pools; the domain data (class skills, +1 caster levels, War feats);
  - spontaneous cure/inflict by the prepared spell's level.
- **Druid and ranger:**
  - companion advancement table and alternative lists with their level adjustments;
  - companion level = druid + ½ ranger from ranger 4 (FAQ p. 29);
  - bonus HD gains;
  - wild shape uses, sizes, plants at 12th, HD ≤ druid level, duration, healing;
  - Natural Spell prerequisite; favored enemy choices and increases.
- **Races:** all 7 (ability adjustments, sizes, speeds, conditional bonuses, favored classes, human feat and skill points, halfling thrown/sling +1).
- **Examples:** every sheet number was recomputed by hand and matches, apart from M3 (cleric turning) and m4 (languages).

| Example | Attack | AC | Saves | Other |
|---|---|---|---|---|
| Barbarian 8 | greataxe +14/+9, 1d12+7 | 19 | — | speed 30 ft with fast movement in a breastplate |
| Druid 10 | — | 20/13/18 | — | slots 6/6/5/4/4/3; Survival 20 (aboveground synergy situational) |
| Fighter 10 | waraxe +19/+14, 1d10+9 | 26 | — | Jump 6 (speed 20 ft: −6) |
| Monk 8 | unarmed 1d10 +10/+5 | 19/17/17 | — | Jump 23 |
| Paladin 8 | longsword +13/+8 | 22 | 11/5/6 | 2/0 spells; turning 5/day at 2d6+7 |
| Cleric 15 | — | 26 | 14/7/18 | slots 6/8/8/7/6/6/5/3/2 |
| Ranger 12 | bow +21/+16/+11 | 24 | — | mithral chain shirt: max Dex +6 |
| Rogue 10 | short sword +15/+10 | 23/18/23 | — | Hide 28; sneak attack 5d6 |

  All examples have the exact XP for their level.

## Open questions
None new. The house rules and rulings in scope (#23, #25–#29, C1–C25) were followed and not re-litigated.

## Verdict
The class tables, feat rules and the eight examples' combat numbers can be trusted at the table. The rule checks have gaps around class-specific restrictions:
- **Fix first:** M1 (no way to choose a cleric's domains or energy, since commit `ddc6fd2`).
- **Then:** M2 (druid metal armor) and M3 (the cleric example's turning level should be 20, not 16).
