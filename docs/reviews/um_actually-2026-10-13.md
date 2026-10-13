# Um, actually… — review of 2026-10-13

Scope: rules engine (`src/engine/compute.ts`, `stacking.ts`, `validate.ts`, `progression.ts`, `prereq.ts`), data (`src/data/srd/*.json`, `src/data/custom/*.json`, `src/data/characters/fenrir.json`), the reference tests (`src/engine/__tests__/*.test.ts`) and the rule docs (`docs/rules/*.md`, `docs/character-baseline.md`). The UI (`src/ui/**`, `src/App.svelte`) was not audited this time because another session was editing it in parallel.

Sources used: `sources/dnd35.db` (Andargor SRD: skill, feat, equipment, spell tables), `sources/srd-v3.5/basic-rules-and-legal/*.html` (skills I/II, equipment, combat I, feats, special abilities and conditions), `books/Sword & Fist.pdf` pp. 38–39 (Weapon Master table and features), `docs/house-rules.md`, `docs/rules/rulings-character.md`, `docs/rules/rulings-combat-equipment.md`, d20srd.org anchors.

Method: every repro below was run with the engine itself, using a temporary Vitest file under `src/engine/__tests__/` (now deleted), or with Python on the JSON and SQLite data. The full suite still passes (3 files, 42 tests).

Counts: **1 Meaningful, 10 Minor, 4 Nitpicks.**

---

## Meaningful

### M1. Um, actually… full plate slows you down, and Jump *notices*: Fenrir's Jump is −5, not +1
- **Rule:** "Your Jump check is modified by your speed. … If your speed is less than 30 feet, you take a −6 penalty for every 10 feet of speed less than 30 feet." [d20srd Jump](https://www.d20srd.org/srd/skills/jump.htm) (local copy: `sources/dnd35.db`, `skill.full_text` for Jump; `skills-ii.html`). For armor, the speed listed in the table *is* your speed: "Medium or heavy armor slows the wearer down. The number on Table: Armor and Shields is the character's speed while wearing the armor." [d20srd armor#speed](https://www.d20srd.org/srd/equipment/armor.htm#speed). *Haste* backs this up: its +30 ft "affects the creature's jumping distance as normal for increased speed" [d20srd haste](https://www.d20srd.org/srd/spells/haste.htm). So Jump follows your current speed, not your racial base speed.
- **Code:** `src/engine/compute.ts:434-463` builds skill totals from ranks, ability, armor check penalty, synergies, feats and effects. No part uses `speedFt`, which is computed above it (`compute.ts:341-354`). The expected values repeat the omission: `src/engine/__tests__/fenrir.test.ts:58` (`jump` = 1) and `:69` (tank = −1), `docs/rules/skills.md:94`, `docs/rules/combat.md:135` and `docs/character-baseline.md:6,18,33,63` ("Jump 2 + 4 − 5 = +1").
- **Repro:** Fenrir at level 8 in full plate +2, speed 20 ft (the engine agrees: `speed.current = {ft: 20, m: 6}`). The app shows Jump **+1** (2 ranks + Str 4 − ACP 5). Expected: **−5** (+1 − 6 for 20 ft). In tank mode it shows **−1**; expected **−7**. A medium or heavy load (20 ft) has the same effect, and a haste or boots of striding effect would need +4 per 10 ft above 30.
- **Fix:** add a "Speed" part to Jump: `+4 × floor((speed − 30)/10)` if speed > 30, `−6 × ceil((30 − speed)/10)` if speed < 30, with source `skills/jump.htm`. Then update the test, `skills.md:94`, `combat.md:135` and the baseline note. The baseline +1 came from the 2017 sheet; the player should tell the DM that the sheet missed this.

---

## Minor

### m1. Um, actually… initiative *is* a Dexterity check, so "−2 on ability checks" reaches it
- **Rule:** "An initiative check is a Dexterity check." [d20srd initiative](https://www.d20srd.org/srd/combat/initiative.htm#initiativeChecks). Shaken: "−2 penalty on attack rolls, saving throws, skill checks, and ability checks" [conditionSummary#shaken](https://www.d20srd.org/srd/conditionSummary.htm#shaken). Sickened, frightened, panicked, energy drained and the luckstone use the same wording.
- **Code:** `compute.ts:400` gives `initiative = Dex + partsFor(['initiative'])`. No code reads the `check.str` … `check.cha` targets in `conditions.json` or the luckstone in `magic-items.json`: they never reach any number.
- **Repro:** Fenrir L8 + shaken → initiative **+3**, expected **+1**. Sickened gives the same result.
- **Fix:** include `check.dex` in the initiative parts. Consider a small "ability checks" block (Str check for doors, and so on) so the other `check.*` modifiers are shown somewhere.

### m2. Um, actually… a helpless (or pinned) target has Dex **0**, not just "no Dex bonus"
- **Rule:** "A helpless target is treated as having a Dexterity of 0 (−5 modifier)." [conditionSummary#helpless](https://www.d20srd.org/srd/conditionSummary.htm#helpless). Already researched: rulings R14 (helpless) and R15 (pinned: Dex 0 for AC, RC p. 35). Paralyzed: Str and Dex 0.
- **Code:** in `conditions.json`, `dexZeroForAc` and `strDexZero` are UI badges only. `compute.ts:357,393-397` only strips a *positive* Dex part.
- **Repro:** Fenrir L8 + helpless → AC **20**; expected **15** (10 + armor 10 − 5), or **11** vs melee. Pinned → **20**, expected **15**. Paralyzed → Str still **18**, expected 0.
- **Fix:** when a `dexZeroForAc` or `strDexZero` flag is active, replace the Dex part with −5 (and for paralyzed, set Str and Dex to 0).

### m3. Um, actually… javelins and slings *do* add Strength, and crossbows ignore it entirely
- **Rule:** "When you hit with a melee or thrown weapon, including a sling, add your Strength modifier to the damage result. A Strength penalty, but not a bonus, applies on attacks made with a bow that is not a composite bow." [combatStatistics#strengthBonus](https://www.d20srd.org/srd/combat/combatStatistics.htm#strengthBonus). The project's own `docs/rules/combat.md:42` says this correctly (crossbows: no Str).
- **Code:** `compute.ts:507`, `if (!melee && strMod > 0) strDmg = 0`, treats every `kind: 'ranged'` weapon like a plain bow. Composite bows' Str rating isn't modeled (R08). Separately, `docs/rules/equipment.md:97` puts the sling under "penalty only (bonus never)", which is wrong.
- **Repro:** Str 18: javelin damage **+0**, expected **+4**. Sling **+0**, expected **+4**. With Str 6, a light crossbow shows **−2**, expected **0**. The longbow (Fenrir's only ranged weapon) is right: +0, and −2 at Str 6.
- **Fix:** add a `rangedKind: thrown | projectile` field (planned in `equipment.md:29`). Thrown weapons and slings get the full modifier, bows the penalty only (composite: bonus up to the rating), crossbows nothing.

### m4. Um, actually… Power Attack's penalty still hits light-weapon attacks, and unarmed strikes *do* get the damage
- **Rule:** "You can't add the bonus from Power Attack to the damage dealt with a light weapon (except with unarmed strikes or natural weapon attacks), even though the penalty on attack rolls still applies." [feats#powerAttack](https://www.d20srd.org/srd/feats.htm#powerAttack). `docs/rules/feats.md:154` agrees.
- **Code:** `compute.ts:491` sets `powerAttackAllowed = false` for `light` and `unarmed`, which drops both the penalty and the bonus. There is also no "one-handed weapon held in two hands" grip, so a longsword or bastard sword in two hands never gets Str ×1.5 or PA ×2 (`compute.ts:506,517`).
- **Repro:** Power Attack 3 + fighting defensively. Dagger attack **+8**, expected **+5**. Unarmed strike damage **+4**, expected **+7**. The longsword, greatsword and short sword (tank, PA 0) lines are right.
- **Fix:** always apply −N to every melee line when PA is on. Add the damage only for non-light weapons and unarmed strikes. Add a two-hands grip toggle for one-handed weapons.

### m5. Um, actually… fighting defensively costs −4 on *all* attacks, and Tumble 5 ranks makes it +3
- **Rule:** "You can choose to fight defensively when attacking. If you do so, you take a −4 penalty on all attacks in a round to gain a +2 dodge bonus to AC." [actionsInCombat#fightDefensively](https://www.d20srd.org/srd/combat/actionsInCombat.htm#fightDefensively). Tumble: "If you have 5 or more ranks in Tumble, you gain a +3 dodge bonus to AC when fighting defensively … +6 … total defense" [skills/tumble](https://www.d20srd.org/srd/skills/tumble.htm). Rulings R16 already records the Tumble part.
- **Code:** `compute.ts:496` applies −4 only `if (melee …)`. `compute.ts:388-391` hard-codes +2 and +4 with no Tumble check.
- **Repro:** fighting defensively, longbow attack **+11**, expected **+7**. A Fenrir variant with 5.5 Tumble ranks, fighting defensively → AC **23**, expected **24**.
- **Fix:** remove the `melee` guard for fighting defensively (Combat Expertise rightly stays melee-only). Use +3 / +6 when Tumble ranks ≥ 5.

### m6. Um, actually… *haste* caps at twice your normal speed, and enhancement bonuses to speed don't stack
- **Rule:** movement modes "increase by 30 feet, to a maximum of twice the subject's normal speed … This increase counts as an enhancement bonus." [spells/haste](https://www.d20srd.org/srd/spells/haste.htm). Same-type bonuses don't stack: [theBasics#stacking](https://www.d20srd.org/srd/theBasics.htm#stacking).
- **Code:** `compute.ts:352`, `speedFt += sumTarget('speed')`, is a raw sum that ignores bonus types and has no cap. The extra attack on a full attack from *haste* isn't reflected in `iterative` either.
- **Repro:** Fenrir L8 in full plate (20 ft) + potion of haste → **50 ft**, expected **40 ft**. Haste + boots of striding and springing would give +40 instead of +30.
- **Fix:** resolve speed modifiers through `resolve()` and apply the haste cap (2× the armor/load-adjusted speed). Show the hasted extra attack.

### m7. Um, actually… the build checker and the level editor disagree with your own rulings Q3 and Q6
- **Rule:** Q6 (FAQ, gloves of Dexterity): a feat may be taken using an ability raised by a magic item. Q3 point 5: enhancement bonuses to Int don't give skill points. [headbandofIntellect](https://www.d20srd.org/srd/magicItems/wondrousItems.htm#headbandofIntellect)
- **Code:** `validate.ts:35-43` (`permanent()`) removes **all** magic items before checking prerequisites, so a feat that relies on an item is reported as an error. `progression.ts:54-57` (`skillBudget`, used by the level editor) keeps worn magic items, so a headband adds skill points.
- **Repro:** Dex 13 + worn gloves of Dexterity +2 (Dex 15), Two-Weapon Fighting at L9 → validator error "DEX 15 (has 13)" (expected: no error, per Q6). Worn headband of intellect +2 → level-9 budget **5**, expected **4**.
- **Fix:** for prerequisites, keep worn items and drop only temporary effects (spells stay "interpretation", DM). For skill points, ignore enhancement-type Int bonuses (both callers).

### m8. Um, actually… a penalty you only *warn* about isn't applied
- **Rule:** nonproficient weapon −4 on attack rolls ([combatModifiers#weaponArmorAndShieldProficiency](https://www.d20srd.org/srd/combat/combatModifiers.htm)). Nonproficient armor: ACP to attack rolls and Str/Dex checks (rulings R24). Tower shield: "−2 penalty on attack rolls because of the shield's encumbrance" ([armor#towerShield](https://www.d20srd.org/srd/equipment/armor.htm#towerShield)).
- **Code:** `validate.ts:191-193` prints "(−4 attack)", but `compute.ts:481-499` never adds it. Neither the armor nonproficiency nor the tower shield penalty appears anywhere.
- **Repro:** bastard sword (exotic, one-handed) → attack **+12** with a "−4" warning; expected **+8**. Tower shield in tank mode → short sword **+12**, expected **+10**. Also note: a bastard sword held two-handed is a martial weapon, so with no grip model the check would wrongly flag it there.
- **Fix:** add these as untyped penalty parts when the condition holds (they stack, per R01).

### m9. Um, actually… a Weapon Master who loses his requirements loses his features too
- **Rule:** *Complete Warrior* p. 16 / FAQ (rulings Q6): while a prestige requirement is unmet, the character "loses all class features and special abilities of the class".
- **Code:** `validate.ts:171-178` warns "Weapon Master class features lost…", but `compute.ts:478,489,541` still applies Superior Weapon Focus and ki damage.
- **Repro:** Fenrir L9 with 4 Dex damage (Dex 12): the warning fires, but the greatsword still shows **+17** and ki damage **20**. Expected: **+16**, and no ki damage line.
- **Fix:** compute the same "requirements met" flag and gate `weaponOfChoice` features on it.

### m10. Um, actually… "Arme de prédilection supérieure" is *Greater* Weapon Focus in the French books
- **Rule:** the official French name of Greater Weapon Focus is "Arme de prédilection supérieure" (`feats.json`, from the French SRD).
- **Code:** `compute.ts:490` labels the Weapon Master's *Superior* Weapon Focus "Arme de prédilection supérieure", while `weapon-master.json` says "Arme de prédilection suprême". Likewise `compute.ts:412` says "Attaques réflexes supérieures", while the JSON says "suprêmes".
- **Repro:** French breakdown of Fenrir's L9 greatsword attack: the line reads "Arme de prédilection supérieure +1". A French-speaking DM would read that as a feat Fenrir doesn't have (it needs Fighter 8).
- **Fix:** use the names from `weapon-master.json` in both labels.

---

## Nitpicks

- **n1.** `compute.ts:386,494`: the Combat Expertise toggle isn't gated on owning the feat (Power Attack is). Without the feat, CE 2 still gives AC **23**. The UI slider limits the value but doesn't check the feat.
- **n2.** `feats.json` `greater-spell-focus`: `prereq` is `{}`. SRD: Spell Focus in the same school ([feats#greaterSpellFocus](https://www.d20srd.org/srd/feats.htm#greaterSpellFocus)). No effect on a fighter.
- **n3.** `skills.json` `speak-language` has `ability: "int"`. The SRD (and `dnd35.db`) say "None". This adds a meaningless Int modifier to the line.
- **n4.** `prereq.ts` ignores `proficiency: "$choice"` (Weapon Focus, Improved Critical, Weapon Master…). No effect on a fighter with simple and martial weapons.

---

## Checked and correct

- **Ability modifiers**, ability damage/drain floors (Q7), enhancement non-stacking (bull's strength + amulet).
- **HP** (house rule #9, retroactive Con): 112 at L8 and 126 at L9 are right.
- **BAB and iteratives** (a second attack only from +6; +8/+3 and +9/+4). Saves are summed per class: Fighter table and WM table checked against *Sword and Fist* p. 39 (L1 +1/+0/+2/+0 … L10 +10/+3/+7/+3); Fenrir Fort +9 / Ref +8 / Will +1 at L8.
- **AC**: full plate +2 = 10, max Dex +1, touch 11, flat-footed 20 (dodge stripped, a Dex penalty would stay), shield 23. Masterwork ACP `min(0, acp+1)` (R25). (Armor + shield) vs load (house rule #13). Swim ×2 ACP (SRD Swim "double the normal armor check penalty").
- **Speed**: worse of armor and load. Carrying capacity: all 29 rows match the SRD, kg = lb/2 everywhere (house rule #5), ×4 per +10 Str. Band limits are inclusive (R19). Fenrir's load (~97.6 lb ≤ 100) is light.
- **Weapons**: all 70 entries' damage, crit, weight and category spot-checked against `dnd35.db`. Armor: all 18 entries (bonus, max Dex, ACP, speed, weight).
- **Greatsword +2**: +15/+10, 2d6+8 (Str ×1.5 floored), 19–20/×2. Ki damage 20 matches the book's own example method (max dice + normal modifiers; Power Attack not maximized). Superior Weapon Focus at WM 3 → +17/+12. Ki critical ordering matches the book ("applied last").
- **Power Attack**: ×2 two-handed; Combat Expertise is melee-only, max 5 / BAB (UI slider).
- **AoO**: 1 + Dex (Combat Reflexes, not capped by armor) = 4. Superior Combat Reflexes = house rule #12.
- **Skills**: key ability, trained-only and ACP for all 45 skills match `dnd35.db`. The synergy list is complete (all 26 SRD pairs, situational ones as toggles). Half ranks don't add. Class skill from any class for max ranks (Q5). Rank cost by the class taken at that level (Q4). Fenrir's totals other than Jump are right (Intimidate 8, Spot 5, Listen 5, K. monsters 5, Craft 4, Ride 4 — no ACP on Ride in 3.5 — Climb 3/1, Handle Animal 2).
- **Skill points** ((2+1)×4+4 = 16 at L1, then 4), and the unspent 2 + 4 points at L5–L6 are correctly flagged.
- **Feats**: every prerequisite in `feats.json` checked against the SRD (except n2). The fighter bonus list is complete and exact. Feat slots: 1st + every 3, human L1, fighter 1/2/4/6/8…, deity (#3). Ability increases at 4/8. XP table `1000·n(n−1)/2`.
- **Spring Attack** is unusable in heavy armor (SRD text in `dnd35.db`) but still counts as a prerequisite (R10/Q11).
- **WM prerequisites** at entry (L7: BAB +6, Intimidate 7 ranks, all feats, Dex 16, masterwork greatsword).
- **Stacking engine**: typed best/worst; dodge, circumstance and untyped stack; same source never stacks; untyped penalties stack (R01).
- **Conditions**: all 38 SRD conditions present, modifiers matching the condition summary (exhausted replaces fatigued, panicked > frightened > shaken, prone ±4 split, R31 exhausted can't run).
- **Magic items**: bonus types (amulet/bracers/rings/cloaks/belts/gloves/potions), slots (armor = body, robe = body, vest = torso, per DMG p. 214), amulet of health +2 = 4,000 gp.
- **Gear weights** used by Fenrir (backpack 2, pouch ½, waterskin 4, hook 4, flask 1½, outfit 5, potion 1/10 lb).

## Open questions

- **M1, possible counter-reading:** some tables read Jump's "your speed" as base land speed. The SRD text, the armor "Speed" definition and *haste*'s jump note all point to current speed. The *Rules Compendium* wording could not be checked offline. If the DM prefers the base-speed reading, it must go into `house-rules.md` as a confirmed entry. Otherwise the RAW value is −5.
- **Worn clothing weight:** the traveler's outfit (5 lb) is counted in the load. I found no SRD line exempting the worn outfit, so I'm not reporting it. If the PHB has such a sentence, it would move Fenrir from 97.6 lb to 92.6 lb (still light).

## Verdict

For Fenrir as built (greatsword loadout, no conditions), every number at the table is right except **Jump, which should be −5 (−7 in tank mode)**. The engine's weak spots are the less common situations: conditions that zero Dex or penalize ability checks, thrown and crossbow damage, Power Attack with light weapons, fighting defensively at range, and *haste*. Check those by hand until they are fixed.


---

## Resolution (2026-10-13)

All findings fixed on the user's request; each has a test in `src/engine/__tests__/review-fixes.test.ts`.

- **M1** Jump speed modifier added (SRD reading confirmed by the user). Fenrir: Jump −5 (tank −7). Steps counted per full 10 ft.
- **m1** initiative includes ability-check modifiers (`check.dex`).
- **m2** helpless/pinned: Dex 0 (−5) for AC; paralyzed: Str and Dex 0.
- **m3** Str on damage by family: thrown and sling full, bow penalty only (composite ratings still not modeled), crossbow none.
- **m4** Power Attack penalty on every melee attack; damage only for non-light weapons and unarmed strikes; new two-hands grip option for one-handed weapons (loadout editor).
- **m5** fighting defensively −4 on all attacks; Tumble 5 ranks → +3 / +6 dodge.
- **m6** speed bonuses stacked by type, haste capped at twice the normal speed; haste's extra attack shown (`attack.extra`).
- **m7** worn items count for prerequisites; enhancement bonuses to Int give no skill points.
- **m8** nonproficient weapon −4, nonproficient armor/shield ACP on attacks, tower shield −2 applied to totals.
- **m9** Weapon Master features suspended while its ability requirements are unmet.
- **m10** French labels: "Arme de prédilection suprême", "Attaques réflexes suprêmes".
- **n1** Combat Expertise needs the feat; **n2** Greater Spell Focus requires Spell Focus (same school); **n3** Speak Language has no key ability; **n4** weapon proficiency checked in prerequisites.
- Open question "worn clothing": counted in the load (user's decision).
