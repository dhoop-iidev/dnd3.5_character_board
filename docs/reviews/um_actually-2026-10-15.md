# Um, actually… — review of 2026-10-15 (Tome of Battle / warblade)

Scope: the warblade class and the Tome of Battle features added on 2026-10-15:
- data in `src/data/custom/tob/*.json`: the class, its progression, the disciplines, the 110 maneuvers and Martial Lore;
- `src/engine/martial.ts`;
- the martial parts of `compute.ts`, `validate.ts`, `prereq.ts` and `progression.ts`;
- the UI (`maneuvers.ts`, `ManeuverBlock.svelte`, `panes/Maneuvers.svelte`);
- `docs/rules/rulings-tob.md`, house rules #15–19.

Sources used:
- *Tome of Battle* (the local PDF, printed page numbers);
- the official 3.5 FAQ (6/30/2008, pp. 74–76);
- the SRD (d20srd: scent, overrun);
- the official French SRD for French terms.

Bugs were reproduced with temporary Vitest files (deleted afterwards).

## Meaningful

### M1. Um, actually… a running maneuver doesn't end all at once
Each maneuver gets a single end time: `runningUntil()` (`src/ui/maneuvers.ts:60`) takes it from its longest effect. The engine then applies **every** effect and extra die of that maneuver until that end time, whatever each effect's own duration is. Reproduced cases, all learnable now (initiator level 5):

| Maneuver | Rule | What the app does | Why |
|---|---|---|---|
| **Iron Heart Surge** (p. 68) | "+2 morale bonus on attack rolls until the end of your next turn" | Removes the +2 at the *start* of your next turn: base +2, then 0 after End of turn + Start of turn | the `rounds` duration is filed as `round` |
| **Steely Strike** (p. 69) | "+4 bonus on the attack roll", for the strike only | Keeps the +4 on every attack card until your next turn, including attacks of opportunity | the −4 AC part lasts 1 round, so the whole maneuver is filed as `round` |
| **Rabid Wolf Strike** (p. 88) | +4 attack and +2d6 on the strike | Keeps the +4 and +2d6 until your next turn | same as Steely Strike |
| **Stone Bones** (p. 84) | "If this attack hits, you gain damage reduction 5/adamantine for 1 round" | Removes the DR at "End of my turn", just before enemies act | no `effects`, so it is filed as `endOfTurn` |
| **Iron Bones, Adamantine Bones** | same as Stone Bones | same | same |

- Fix: give each effect its own lifetime:
  - `attack` effects go at End of turn;
  - `round` effects go at Start of next turn;
  - `rounds` / "until end of next turn" effects go at the following End of turn;
  - a maneuver whose only effect is DR counts as `round`.

### M2. Um, actually… conditional maneuver bonuses sneak past "don't stack with each other" (p. 40)
- Rule, p. 40: "Maneuvers or stances that provide bonuses or penalties on attack rolls, damage rolls, saving throws, and other attributes do not stack with each other."
- Code, `compute.ts:250`: `partsFor` turns a situational part's source id into `martial|<condition>`. `stacking.ts` then no longer sees it as coming from the same source.
- Repro: Soaring Raptor Strike (+4 vs a larger foe, toggled on) + Iron Heart Surge (+2 morale) → **+6**, expected **+4**. Lightning Recovery + Steely Strike → +6, expected +4.
- Fix: keep `sourceId: 'martial'` for the stacking check whatever the condition.

### M3. Um, actually… Hunter's Sense smells the wind backwards (level 1 stance, p. 88)
- Rule: SRD [Scent](https://www.d20srd.org/srd/specialAbilities.htm#scent) says: "If the opponent is upwind, the range increases to 60 feet; if downwind, it drops to 15 feet."
- Data (FR and EN): the note says "more downwind".
- Fix: "30 ft.; 60 ft. upwind, 15 ft. downwind" / « 9 m ; 18 m si l'adversaire est dans le sens du vent, 4,50 m s'il est sous le vent ».

## Minor

- **m1. Battle clarity is lost when you're not flat-footed** (p. 22: "As long as you are not flat-footed").
  - Code: `compute.ts:348` treats any lose-Dex flag as flat-footed.
  - Repro: stunned or blinded → Reflex +9 becomes +8.
  - Expected: only the flat-footed state removes it.
- **m2. Uncanny dodge (warblade 2) keeps Dex against every Dex loss** (p. 22: only "flat-footed or struck by an invisible attacker").
  - Code: `compute.ts:492` keeps Dex when stunned or cowering too.
  - Not relevant until warblade 2.
- **m3. Changing stance in the Maneuvers tab doesn't reset the Blood in the Water counter.**
  - `panes/Maneuvers.svelte:103` (radio) and `:113` (Quitter la posture) don't clear `martial.crits`. The Combat block does.
- **m4. Roots of the Mountain (p. 84): two problems with the +10.**
  - The Dex +10 condition names trip only; the book also lists overrun.
  - `check.dex` also feeds initiative (`compute.ts:503`), so this +10 shows up as a toggle in the initiative breakdown.
  - Related: `check.str` (Stonefoot +2, Boulder Roll +4, Roots +10 Str) is read nowhere, so it is never shown.
- **m5. Pouncing Charge (p. 88): the charge modifiers are encoded as maneuver bonuses.**
  - The charge +2 is stored under the shared maneuver source, so it wrongly fails to stack with other maneuver bonuses. It comes from charging, not from the maneuver.
  - The charge −2 AC is a toggle that starts off.
- **m6. Moment of Alacrity (p. 64): encoded as an initiative modifier.**
  - It is a +20 initiative-modifier toggle, which contradicts ruling T8 (place in the order, not modifier). A note alone would be better.
- **m7. Leaping Dragon Stance: the stance's Jump note is out of date.**
  - It still says "+10 ft." / « +3 m ». House rule #18 says +10 on the check. The computed bonus is right.
- **m8. Stone Dragon texts on the ground rule.**
  - They say "usable only while you touch the ground". The book (p. 81) only says Stone Dragon maneuvers can be *initiated* only on the ground. For stances this wrongly suggests a jump ends them.
- **m9. Two notes call official FAQ answers "unofficial customer service"** (FAQ p. 75).
  - Wall of Blades: works against touch attacks.
  - Iron Heart Surge: can't remove instantaneous effects.
  - The Iron Heart Surge note also misses the rest of that FAQ answer: it *can* remove permanent effects, negative levels from one effect, one poison or one disease.
- **m10. Time Stands Still note (p. 66) contradicts p. 43.**
  - The note says haste-type extra attacks are kept. Strikes can't use them (p. 43).
  - Moved to Open questions; irrelevant before initiator level 17.
- **m11. Tactics of the Wolf note says "not computed", but the engine computes it.**
  - It computes ½ initiator level (+2) as a situational toggle.
- **m12. French labels for "boost" and "counter" differ between screens.**
  - The UI says *stimulation* / *riposte*.
  - The maneuver texts also use *amélioration*, *manœuvre de soutien* and *contre*.
  - Pick one term (house rule #16).

## Nitpicks

- **Invented durations:** ten White Raven entries say "Instantaneous" though the book prints no duration line.
- **Area put under "target":** the area of effect sits in the target field for Earthstrike Quake, Fountain of Blood, Bolstering Voice, Leading the Charge, Clarion Call, Swarm Tactics and Lightning Throw, so popups label it "Target".
- **French wording:** White Raven says "attaque **de** corps à corps" (×10); the official term is "attaque **au** corps à corps".
- **Page numbers:**
  - Bonecrusher p. 81 (not 82);
  - Pearl of Black Doubt p. 64 (not 65);
  - Insightful Strike p. 63 (not 64);
  - the Maneuvers tab cites the recovery rule as p. 22, 39 instead of 22, 40.
- **French label for "boost"** on Boulder Roll: « boost ».
- **Missing size limit:** Mountain Avalanche's extra-damage condition leaves out "your size or smaller".
- **Weapon aptitude applies too widely:** it also counts toward prestige-class requirements (`prereq.ts`); the book says feats only. No effect today.
- **Fragile null in `martial.ts`:** the 17+ band has `maxInitiatorLevel: null` and only works through the `?? 9` fallback.
- **Undocumented omissions:**
  - the warblade bonus feat list leaves out the six ToB feats (consistent with #15);
  - the Tiger Claw weapons leave out "claw".
- **Copied text:** no flavor text is copied. A few 13–15-word rules phrases match the book; rephrase the longest (Iron Heart Surge, Lion's Roar) for margin.

## Checked and correct

- **Class:**
  - d12, 4 + Int skill points, class skills including Martial Lore.
  - Proficiencies: simple and martial *melee* weapons, light and medium armor, shields except tower shields.
  - Table 1–3, all 20 levels: base attack, saves, maneuvers known/readied, stances.
  - Bonus feats at levels 5/9/13/17.
- **Class features:**
  - Battle clarity: Int capped at warblade level; +1 now, Ref +9.
  - Battle ardor (3rd); battle cunning (7th, insight bonus on damage).
  - Weapon aptitude: warblade level − 2, stacking with fighter levels for feats.
- **Initiator level:** warblade level + ½ other classes, rounded down. That gives 5, so maneuvers up to 3rd level (Table 3–1).
- **Learning:**
  - Stances count toward maneuver prerequisites.
  - Swap at warblade levels 4/6/8…, never a stance.
  - Readying takes 5 minutes, with no empty slot.
  - Recovery rule text.
  - Stances: swift action, lost when helpless.
  - Boosts end at end of turn.
- **Extra damage:** listed separately and not multiplied on a critical.
- **Maneuver data, all 110 entries:**
  - Stat lines match the book: level, type, discipline, prerequisite count as printed, action, range, target, duration, save and DC.
  - No supernatural maneuver in these five disciplines.
  - Every die and DR value was checked. Examples: Mountain Hammer 2d6, Stone Bones/Iron Bones/Adamantine Bones DR 5/10/20 adamantine, Punishing Stance +1d6 / −2 AC, Bonecrusher +4d6, Blood in the Water +1 per crit.
- **French terms:** intuition, moral, esquive, altération, pris au dépourvu, hébété, étourdi, affaiblissement temporaire, bousculade, renversement, croc-en-jambe, Saut, Acrobaties.

## Open questions (for the user / DM)

1. **Extra dice from a stance and a strike:** do they stack (e.g. Punishing Stance +1d6 with Mountain Hammer +2d6)?
   - Read literally, p. 40 "damage rolls … do not stack" says no.
   - Most tables let them stack, and the app currently does.
2. **Same-level prerequisites:** can a maneuver learned at a level count toward the prerequisite of another learned at the same level?
   - The app says yes, by analogy with the FAQ ruling on feats; the book is silent.
3. **Bolstering Voice / Leading the Attack:** do they also affect you? The data says allies only; Lion's Roar says "you and allies" when it means both.
4. **Prey on the Weak:** do its extra attacks of opportunity count against your per-round limit? The book is silent.
5. **Time Stands Still + haste:** see m10.

## Verdict

The class, its table and the maneuver stat lines are solid, and the computed sheet at warblade 1 (HP, saves, Reflex with battle clarity, initiator level) is right. Don't trust the **Combat block's running maneuver bonuses** until M1 and M2 are fixed: the +2 of Iron Heart Surge, the +4 of Steely Strike and the DR of Stone Bones are all kept or dropped at the wrong moment.

## Resolution (2026-10-15)

- **M1 (fixed):** running maneuvers keep a turn stage, and each effect ends at its own stage:
  - strike bonuses and dice end at the end of your turn;
  - "1 round" effects (−4 AC, Stone Bones DR) end at the start of your next turn;
  - Iron Heart Surge ends at the end of your next turn.
  - Implemented in `engine/martial.ts` `effectEnd`/`advanceManeuvers`, with a turn bar in the Combat pane.
- **M2 (fixed):** situational maneuver bonuses keep the shared `martial` stacking source.
- **M3 (fixed):** Hunter's Sense scent ranges.
- **Minor (fixed):**
  - m1 battle clarity: only flat-footed removes it;
  - m2 uncanny dodge: only against flat-footed;
  - m3 stance change resets the crit counter everywhere;
  - m4 Roots of the Mountain condition, and situational Dex-check bonuses no longer feed initiative;
  - m5 Pouncing Charge: charge modifiers stack, always on;
  - m6 Moment of Alacrity: note only;
  - m7 Leaping Dragon note;
  - m8 Stone Dragon "initiated only on the ground";
  - m9 FAQ notes;
  - m10 Time Stands Still: open question;
  - m11 Tactics of the Wolf note;
  - m12 French terms unified (stimulation / riposte).
- **Nitpicks (fixed):**
  - durations and areas, "attaque au corps à corps", page numbers;
  - Mountain Avalanche size limit; the 17+ band; the closest phrase rephrased.
- **Not changed:**
  - `check.str` is still not displayed anywhere (no Strength-check line on the sheet yet);
  - weapon aptitude for prestige classes has no effect in the data;
  - the ToB feats stay excluded (house rule #15).
- **Open questions answered by the user:** house rules #20–22 (rulings-tob T10–T12).
