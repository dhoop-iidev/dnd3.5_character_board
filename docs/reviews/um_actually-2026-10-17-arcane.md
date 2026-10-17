# Um, actually… — review of 2026-10-17 (arcane casters: wizard, sorcerer, bard)

**Scope:**
- **Engine:** `engine/arcane.ts`, `engine/spellLearning.ts`, `engine/spells.ts`, the arcane parts of `compute.ts` and `validate.ts`, the familiar in `creature.ts`, `engine/spellItems.ts` (scrolls and wands, as far as the arcane rules touch them).
- **Data:** wizard, sorcerer and bard in `classes.json`; the bard, sorcerer/wizard and wizard-only levels in `spells.json`; the arcane feats in `feats.json`.
- **UI:** `SpellLearning.svelte`, `panes/Spells.svelte`, `ClassFeaturesBlock.svelte` (bardic music), `panes/Companions.svelte` (familiar).
- **Examples:** `magicienne-niveau-7.json`, `ensorceleur-niveau-6.json`, `barde-niveau-6.json`.
- **Tests:** `arcane.test.ts` and the arcane block of `examples.test.ts`.

**Not audited:** the Improved Familiar code was being edited during the audit (house rule #38 work, uncommitted), so it isn't reviewed here. The committed alignment table matches the SRD.

**Sources:**
- Local SRD 3.5 HTML: `character-classes-ii.html`, `spells/magic-overview.html`, `feats.html`.
- `sources/dnd35.db` (spell, feat).
- The official French SRD (DRS 03a, 03b).
- The official 3.5 FAQ of 6/30/2008: p. 10–11 (bardic music), and the class spell list entry (specialists).
- `docs/house-rules.md`, `docs/rules/rulings-classes.md` C26–C38.

**Method:** every finding was reproduced with a temporary Vitest file (`tmp-um-arcane-*.test.ts`, deleted afterwards) or a Python script on the data. No source, data or doc file was changed.

## Meaningful

### M1. Um, actually… your evoker's *fireball* is DC 18, not 17: Spell Focus and Greater Spell Focus do nothing
- **Rule:** "Add +1 to the Difficulty Class for all saving throws against spells from the school of magic you select." Greater Spell Focus gives another +1, which "stacks with the bonus from Spell Focus".
  - Sources: [feats#spellFocus](https://www.d20srd.org/srd/feats.htm#spellFocus), [feats#greaterSpellFocus](https://www.d20srd.org/srd/feats.htm#greaterSpellFocus).
- **Code:**
  - `src/engine/spells.ts:142`: `dc: (spellLevel) => 10 + spellLevel + mod`. The school is never taken into account.
  - `src/ui/panes/Spells.svelte:225` (spell popup), `:402` and `:487` (slot rows) show that value.
  - `feats.json:2676` (`spell-focus`) and `:1085` (`greater-spell-focus`) have no modifiers, and nothing in `src/engine` or `src/ui` reads them.
- **Repro:** `examples/magicienne-niveau-7.json` has Spell Focus (evocation) at 1st level and Int 18.
  - `compute(...).spellcasting[0].dc(3)` returns **17**.
  - Expected for *fireball*, *lightning bolt* or *scorching ray*: **18** (10 + 3 + 4 + 1).
  - Every save DC shown for her evocation spells is 1 too low.
- **Fix:** make `dc` take the spell's school, `dc(level, schoolId?)`, and add +1 per Spell Focus / Greater Spell Focus whose `choice` matches. Show it as a line in the popup with the feat's source.

### M2. Um, actually… an evoker can't fire a wand of *charm person*: prohibited spells are off her list, wands and scrolls included
- **Rule:**
  - SRD wizard: "Spells of the prohibited school or schools are not available to the wizard, and she can't even cast such spells from scrolls or fire them from wands." ([wizard#schoolSpecialization](https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization))
  - FAQ 6/30/2008: "Spells from a specialist wizard's prohibited schools are not part of his class spell list." So she would need Use Magic Device, like any character without the spell on her list.
- **Code:** `src/engine/spellItems.ts:61–66` builds `lists` and `classesWithList` from `classSpellLevel` only. `usable` (`:77`) never looks at `wizardSchools(char).prohibited`. The prohibited school is only enforced for learning, the spellbook and prepared spells (`validate.ts:262–288`).
- **Repro:** example wizard (evocation; enchantment and illusion prohibited).
  - A wand of *charm person* (enchantment) gives `usable: true`, `onListOf: ['wizard']`, and no Use Magic Device note.
  - A scroll of *color spray* (illusion) gives the same result.
  - Expected: not on her list, Use Magic Device DC 20 (wand) or DC 20 + caster level (scroll).
- **Fix:** in `storedSpellUse`, drop `wizard` from `classesWithList` and `lists` when the spell's `schoolId` is one of the wizard's prohibited schools. Add a note saying "prohibited school".

### M3. Um, actually… Combat Casting is +4 on Concentration when casting defensively; the app gives +0
- **Rule:** "You get a +4 bonus on Concentration checks made to cast a spell or use a spell-like ability while on the defensive or while you are grappling or pinned." ([feats#combatCasting](https://www.d20srd.org/srd/feats.htm#combatCasting))
- **Code:** `feats.json:366` (`combat-casting`) has no `modifiers`, and no engine or UI code handles it. Situational feat bonuses already exist in the data (`dodge`: a modifier with a `condition`), so a conditional `skill.concentration` +4 is all it needs.
- **Repro:** the example wizard and the example bard both took Combat Casting.
  - The wizard's Concentration breakdown has only two parts: `Ranks 10`, `Constitution 2`. Total 12, with no situational +4.
  - Casting defensively (DC 15 + spell level), the player would roll at +12 instead of +16.
- **Fix:** add `modifiers: [{ target: 'skill.concentration', bonusType: 'untyped', value: 4, condition: { en: 'casting defensively, grappling or pinned', fr: '…' } }]` to `combat-casting`.

### M4. Um, actually… drinking *fox's cunning* doesn't make your 1st-level spellbook short by two spells
- **Rule:**
  - "A wizard begins play with a spellbook containing all 0-level wizard spells … plus three 1st-level spells of your choice. For each point of Intelligence bonus the wizard has, the spellbook holds one additional 1st-level spell" ([wizard#spellbooks](https://www.d20srd.org/srd/classes/wizard.htm#spellbooks)).
  - That count is fixed when she starts. A temporary enhancement, active today, can't change what she got at 1st level.
  - The app already follows this for skill points (rulings q3, `progression.ts:60–68`).
- **Code:** `src/engine/spellLearning.ts:60` uses `compute(char, rules, { level: L })`, which keeps today's `activeEffects`, ability damage and worn items. `:69` (`3 + Int mod`) and `castable` (`:61`) are then computed from that sheet.
- **Repro:** example wizard (no warnings).
  - With `activeEffects: [potion-of-foxs-cunning]`, `validate` gains `warning: spells-missing-1 — Level 1: 2 free spellbook spell(s) to choose`.
  - Worn headband of intellect +2: `Level 1: 1 free spellbook spell(s) to choose`.
  - The opposite also happens. Int damage makes earlier picks "too many" or "level not castable yet".
  - The same applies to a sorcerer or bard's Cha (cloak of Charisma, *eagle's splendor*) for the "castable" gate on spells known.
- **Fix:** compute the learning sheet the way `skillBudget` does: no active effects, no ability damage, no enhancement items; inherent bonuses and drain are kept.

## Minor

### m1. Um, actually… the example bard is in a medium load: 20 ft, ACP −3
- **Rule:** Str 10 light load is up to 33 lb; 50 coins weigh 1 lb ([carrying capacity](https://www.d20srd.org/srd/carryingCapacity.htm), [wealth and money](https://www.d20srd.org/srd/equipment/wealthAndMoney.htm)).
- **Data:** `examples/barde-niveau-6.json`.
  - Gear: rapier 2 + shortbow 2 + chain shirt 25 = 29 lb.
  - Coins: 30 sp + 210 gp + 2 pp (`:224`) = 242 coins = 4.84 lb.
  - Total 33.84 lb.
- **Repro:** `validate` gives `warning: load — Load: medium (33.84 lb)`.
  - The sheet shows speed 20 ft and armor check penalty −3 (instead of −1 for the masterwork chain shirt).
  - Tumble 8 instead of 10; Jump −7 (−6 for the speed); Swim −6.
  - The examples test passes only because a load warning isn't actionable. The engine is right; the example just isn't the light-armored bard it's meant to be.
- **Fix:** drop about 50 coins (e.g. 2 pp → 0 and 30 sp → 0, or gp 210 → 160), or give her Str 11. Then add a `speed.current.ft === 30` check in `examples.test.ts`.

### m2. Um, actually… the familiar's master bonus has no "within 1 mile" toggle, though C30 says it does
- **Rule:** the master's special ability applies only "when the master and familiar are within 1 mile of each other" ([sorcererWizard#familiars](https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars)).
- **Code:** `src/engine/compute.ts:605` pushes the master's modifiers with no condition (only the hawk and owl have one, for the light). Ruling C30 (`rulings-classes.md:269`) says "toggle 'familiar within 1 mile'".
- **Repro:** the example wizard's Move Silently is always 5 (Dex 2 + cat 3), whatever the cat is doing. The same holds when the familiar is at −10 hp or worse, since the companion stays in the list.
- **Fix:** add a condition ("familiar within 1 mile") to each master modifier, on by default. Or drop the bonus while the familiar is dead or away. Then make C30 match the code.

### m3. Um, actually… countersong works for *any creature* within 30 ft, foes included
- **Rule:** "Any creature within 30 feet of the bard (including the bard himself) that is affected by a sonic or language-dependent magical attack may use the bard's Perform check result in place of its saving throw if, after the saving throw is rolled, the Perform check result proves to be higher." ([bard#countersong](https://www.d20srd.org/srd/classes/bard.htm#countersong))
- **Code:** `src/engine/arcane.ts:321`, text "allies within 30 ft may use your Perform check instead of their save" (FR "les alliés à 9 m"). It is wrong on two points:
  - It isn't limited to allies (an enemy caught by its own *shout* benefits too).
  - It isn't "instead of": the creature rolls its save and keeps the better result.
- **Fix:** "10 rounds: each creature within 30 ft (you included) hit by a sonic or language-dependent magical attack may use your Perform check result instead of its save, if higher." FR: "chaque créature à 9 m (vous compris)… si le résultat est meilleur".

## Open questions

### Q1. A sorcerer or bard whose Charisma catches up never learns the spells he "missed"
- **Repro:**
  - Setup: sorcerer 1–8, Cha 11, increase to Cha 12 at 8th.
  - Levels 4–7: the new 2nd-level spells are correctly not learnable ("To learn or cast a spell, a sorcerer must have a Charisma score equal to at least 10 + the spell level").
  - At 8th, with Cha 12, `spellLearning(...).newByLevel` is `{0: 1}`.
  - The table says a sorcerer 8 *knows* three 2nd-level spells; the app gives him none, ever. The cause is that `spellLearning.ts:72–78` computes new spells as the difference between two rows of the table, not as table total − spells actually known.
- **Status:** the SRD doesn't say whether the missed spells arrive once the score is high enough. No FAQ entry found. If the DM reads the table as a total (the natural reading of "Spells Known"), compute `newByLevel` as `table[lvl] − known so far at lvl`. Otherwise keep it as is. Worth a `pending` house-rule line.

## Nitpicks
- **n1.** `arcane.ts:143` `hasSomatic`: *binding* has prose components ("…somatic gestures…"), so it is read as having no S component and never risks arcane spell failure. Special-case it, or give it `V, S, M`.
- **n2.** Wizard with Int 10: `spellLearning` asks for 3 + 0 first-level spellbook spells, but `castable` is `[0]`. Every pick is then flagged "level 1 not castable yet", and leaving them empty is flagged "missing". Suppress the free-spell count when level 1 isn't castable.
- **n3.** `SpellLearning.svelte:168`, copying note.
  - It says "Spellcraft DC 15 + spell level … 24 hours".
  - The SRD has three steps: first decipher the writing (Spellcraft DC 20 + level, or *read magic*); then a day of study, ending with the DC 15 + level check; then 24 hours of writing.
  - A failed check can't be retried until she gains a Spellcraft rank, and a scroll is erased on success ([magic overview](https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm#addingSpellsToAWizardsSpellbook)).
- **n4.** `validate.ts:268–271`: a diviner with both `prohibited1` and `prohibited2` set (e.g. from an imported file) isn't flagged. The UI hides the second field, but the check only tests "fewer than".
- **n5.** Spell Penetration / Greater Spell Penetration (`feats.json:2731`): no caster level check is shown anywhere (+2/+4 vs spell resistance). It is "described only", which is fine, but the spell popup could show "caster level check vs SR: 1d20 + CL (+2)".

## Checked and correct
- **Class tables:** bard, sorcerer and wizard spells per day, spells known, BAB and saves match the SRD tables cell by cell.
  - Hit dice, skill points, class skills (bard, wizard: all Knowledge), proficiencies (bard shields except tower).
  - Wizard bonus feats at 5/10/15/20 from the SRD list (item creation, metamagic, Spell Mastery); Scribe Scroll at 1st.
- **Spell lists:** all 605 spells cross-checked against `dnd35.db`; 0 mismatches on the bard, sorcerer/wizard and wizard-only levels (*mnemonic enhancer*, *mage's lucubration*).
  - The 11 db spells absent from the app (*glossolalia*, *probe thoughts*…) are psionic or variant, not core.
- **Bonus spells:** `floor((mod − L)/4) + 1`, none at 0 level, only at levels the class casts.
- **Specialist extra slot:** at every level including 0 (C26); filled only with the specialty school.
- **Spellbook:**
  - All non-prohibited cantrips, plus 3 + Int 1st-level spells, then 2 per level of a castable level.
  - One of the two per level from the specialty school (SRD Magic Overview, C34).
  - Prohibited schools: 2 (diviner 1), never divination.
  - *Read magic* from memory; copy cost 1 page per level (cantrip 1) × 100 gp.
- **Swaps:** sorcerer 4, 6…20 and bard 5, 8, 11…; same level; at least two below the highest castable (C33).
- **Arcane spell failure:**
  - Armor + shield, untyped, stacking; mithral −10% and one category lighter (C35).
  - Bard: none in light armor for bard spells, but the shield still counts (C32).
  - No failure without S or with Still Spell; Silent Spell barred on bard spells.
- **Familiar:**
  - Natural armor, Int, special abilities and spell resistance (master level + 5 from 11th) by master level.
  - Half the master's maximum hp; the master's BAB; the better base save; Dex for melee natural attacks; HD for effects = character level; magical beast for effects.
  - The ten master benefits (untyped); Alertness situational and not doubled.
  - Sorcerer + wizard levels stack. The UI's obtain/dismiss text (24 h, 100 gp; Fort DC 15, 200 XP per level, half on a success; a year and a day) matches.
- **Familiar numbers in the examples:**
  - Cat (wizard 7): hp 21, AC 18/14/16, BAB +3, grapple −9, saves +2/+4/+6, Int 9, claws +7.
  - Raven (sorcerer 6): hp 18, AC 17, Will +7, Int 8.
- **Bardic music:**
  - Uses = bard level; levels and Perform ranks for all nine songs (3/3/3/6/9/12/15/18/21), one Perform skill counts.
  - Fascinate targets 1 + 1 per 3 levels beyond 1st, 90 ft.
  - Inspire courage +1/+2/+3/+4 at 1/8/14/20, morale, weapon attack and damage, saves vs charm and fear.
  - Greatness: +2 competence attack, +1 competence Fortitude, temp hp 2d10 + 2 × Con.
  - Heroics: +4 morale saves, +4 dodge AC.
  - Suggestion DC 10 + ½ bard level + Cha; suggestion and mass suggestion cost no use (FAQ p. 11).
  - Song of freedom at caster level = bard level. No casting, scrolls or wands while singing.
- **Bardic knowledge:** bard level + Int (+2 with 5 ranks of Knowledge (history)).
- **French terms:** checked against DRS 03a/03b: Inspiration vaillante / talentueuse / héroïque / intrépide, Contre-chant, Fascination, Chant de liberté, Lien télépathique, Transfert d'effet magique, Esquive extraordinaire.
- **Example wizard 7:** legal.
  - Free spells: 6 at 1st, then 2 per level, each level with one evocation.
  - Feats: Craft Wondrous Item at CL 5. Skill points 24 + 6 × 2 + 7 × 4.
  - Hp 42, saves 4/4/6, slots 5/6/5/4/3, Spellcraft 16 (synergy).
- **Example sorcerer 6:** legal.
  - Spells known 7/4/2/1 after the *light* → *message* swap at 6th (0-level ≤ 3 − 2).
  - Slots 6/7/6/4, hp 36, initiative +6.
- **Example bard 6:** legal.
  - Spells known 6/4/3, slots 3/4/3, hp 42, saves 3/7/5.
  - Diplomacy 14 (Sense Motive synergy), bardic knowledge 9, suggestion available with Perform 9.
  - Only the load (m1) is off.
- **Tests:** the expected values in `arcane.test.ts` (toad +3 hp, cat at master 5: hp 13, Int 8, Will +4; bardic knowledge 6 → 8; Jade Phoenix Mage CL 6; ASF 20/0/5/15) are right.

## Verdict
Slots, spells known, the spellbook, arcane spell failure, the familiar and bardic music are trustworthy: they match the SRD down to the table cells. Two numbers the player uses at the table are missing: the save DCs of a Spell Focus school (M1) and Combat Casting's +4 (M3). Also, the scroll and wand checks ignore prohibited schools (M2), and temporary buffs leak into past spellbook levels (M4). Fix those four before trusting an evoker's DCs or a defensive cast.
