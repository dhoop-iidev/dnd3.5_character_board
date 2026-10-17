# Um, actually… review of 2026-10-17 (metamagic, Spell Mastery, Improved Familiar, mithral proficiency)

Scope: today's features only. `src/engine/metamagic.ts`; the metamagic, Spell Mastery and familiar checks in `validate.ts`; `spellLearning.ts` (Spell Mastery); `arcane.ts` (Improved Familiar, familiar advancement); `creature.ts` (familiar type text); the familiar part of `compute.ts`; the 7 new creatures in `creatures.json`; the UI in `Spells.svelte`, `SpellLearning.svelte` and `Companions.svelte`; the mithral proficiency change (`compute.ts`, `validate.ts`); `metamagic.test.ts`.
Not reported because they are being implemented in parallel: house rules #38 (type/subtype table), #39 (familiar Int) and #40 (metamagic in a slot the key ability is too low for).

Sources used: `sources/dnd35.db` (feat and monster tables), `sources/srd-v3.5/` (magic overview, special abilities), the official French SRD (`DRS 05 (dons)`, `DRS 20 (magie)`, `DRS 35–39` monsters), the 3.5 FAQ of 6/30/2008 (pp. 37–38, 52–54), `docs/house-rules.md`, `docs/rules/rulings-classes.md` C35–C38.
Repro: a temporary Vitest file (`tmp-um-meta-repro.test.ts`, now deleted) that called `metamagicProblems`, `spontaneousCastingTime`, `validate`, `compute`, `computeCreature` and `improvedFamiliarCheck`, plus Python scans of `spells.json` and `creatures.json` against the DB and the French RTF.

## Meaningful

None. Slot adjustments, Heighten (actual level, save DC), the same-feat-twice ban, Quicken for spontaneous casters, Silent for bard spells, full-round casting for spontaneous metamagic, Still Spell and arcane spell failure, Spell Mastery counts, improved familiar levels and alignment steps, and mithral proficiency all give the right number or verdict in normal play.

## Minor

### m1. Um, actually… fog cloud *spreads*, so Widen Spell works on it
- Rule: "Spread: Some effects, notably clouds and fogs, spread out from a point of origin…" ([magic overview, Effect](https://www.d20srd.org/srd/magicOverview/spellDescriptions.htm#effect)). Widen Spell: "You can alter a burst, emanation, line, or spread shaped spell to increase its area" ([Widen Spell](https://www.d20srd.org/srd/feats.htm#widenSpell)).
- Code: `src/engine/metamagic.ts:106`. It only reads the `area` field. Many spread or burst spells give their shape under `effect` or `target`.
- Repro: `metamagicProblems(fog-cloud | stinking-cloud | cloudkill | web | confusion, {metamagic:['widen-spell']})` returns `noEffect: "Widen Spell: no burst, emanation, line or spread area"`. Expected: no message. The data scan finds 22 such spells: acid fog, cloudkill, fog cloud, incendiary cloud, mind fog, obscuring mist, solid fog, stinking cloud (cloud/fog "spreads", in `effect`); web, hypnotic, rainbow and scintillating pattern ("…-radius spread", in `effect`); confusion, holy/unholy aura, cloak of chaos, shield of law ("…radius burst", in `target`); the area options of dispel magic and shatter; gust of wind ("line-shaped", in `effect`).
- Fix: test `area`, `effect` and `target` with `/\b(burst|emanation|line|spread|spreads)\b/` (and "line-shaped").

### m2. A Fire, Air or Magic domain spell in its domain slot gets a false "slot too low" error
- Rule: a cleric's domain slot holds a domain spell, cast at its domain level. The UI already does this (`Spells.svelte` `baseLevel(…, domainSlot)` and "In a domain slot the spell is cast at its domain level").
- Code: `src/engine/validate.ts:481`. `base = own ?? domain` always prefers the cleric-list level, even for the domain slot (`j >= total − extra`).
- Repro: cleric 5 (Air + Sun) with Extend Spell. Extended *wind wall* (Air 2, Clr 3) in the 3rd-level domain slot: the UI allows it (2 + 1 = 3), but validate returns the error "Wind Wall with metamagic needs a level 4 slot (prepared in a level 3 slot)". Other spells with the same problem: antimagic field (Magic/Protection 6, Clr 8), earthquake (Earth 7, Clr 8), locate object (Travel 2, Clr 3).
- Fix: in validate, for the extra slot (`j >= slot.total − slot.extra` of the cleric's `sc.slots`), use the lowest domain level as `base`, the same way as `baseLevel`.

### m3. Um, actually… a fighter can't take Improved Familiar
- Rule: Prerequisites: "Ability to acquire a new familiar, compatible alignment, sufficiently high level" ([Improved Familiar](https://www.d20srd.org/srd/feats.htm#improvedFamiliar)).
- Code: `src/engine/prereq.ts:105–118`. The "other" prerequisites handle Wizard level 1 (Spell Mastery), caster level and others, but not "Ability to acquire a new familiar". The familiar check in `validate.ts` only runs when a familiar exists.
- Repro: fighter 1 with `improved-familiar` → no feat warning at all. For comparison, a fighter with `spell-mastery` gets `prereq-spell-mastery-1`.
- Fix: in `unmetPrereqs`, flag `/^Ability to acquire a new familiar/` when `familiarLevel(sheet.classLevels) === 0`.

### m4. Spell resistance overlaps, it doesn't replace: a pseudodragon familiar keeps SR 19
- Rule: "Spell resistance does not stack. It overlaps." ([special abilities](https://www.d20srd.org/srd/specialAbilities.htm#spellResistance)). The pseudodragon has SR 19 (stat block); a familiar gains SR = master level + 5 from 11th.
- Code: `src/engine/creature.ts:322` (`spellResistance: fam?.sr`). `Companions.svelte:229` then shows "SR 16".
- Repro: `computeCreature(pseudodragon, familiar {masterLevel 11, sr 16, improved})` → `spellResistance` 16. Expected 19 (the higher one). The stat block's 19 only appears in the special-qualities text.
- Fix: take the max of `fam.sr` and the SR parsed from `specialQualities.en` (/spell resistance (\d+)/), or add a numeric `sr` to `CreatureDef`.

### m5. Mithral's own note still says "not for proficiency"
- Rule: FAQ 6/30/2008 pp. 53–54: mithral armor is "treated as one category lighter for all purposes, including proficiency" (rulings C35, the app's own ruling).
- Code: `src/data/custom/materials.json:110` (en and fr). It says "…for movement and other limitations…, not for proficiency" / "pas pour la formation". The engine now does the opposite.
- Repro: read the mithral material note in the item popup: it contradicts the computed attack penalty (none for a rogue in a mithral breastplate).
- Fix: replace with "for every purpose, proficiency included (FAQ); a mithral shield keeps its category" and its French equivalent.

### m6. "Quintessence" is Maximize Spell, not Heighten Spell (wrong French feat names in the checks)
- Rule: official French SRD (`DRS 05 (dons)`): Heighten Spell = **Augmentation d'intensité**, Maximize Spell = **Quintessence des sorts**, Widen Spell = **Extension de zone d'effet**. Area shapes (`DRS 20 (magie)`): burst = **rayonnement**, spread = **étendue**.
- Code: `src/engine/metamagic.ts:109` and `:111` ("Quintessence : choisir un niveau…", "Quintessence : 9e niveau au maximum"), and `:107` ("Extension de zone : pas de zone en explosion…").
- Repro: `metamagicProblems(magic missile, 1, {metamagic:['heighten-spell']})` in French gives "Quintessence : choisir un niveau supérieur à celui du sort".
- Fix: use `metamagicName(rules, id).fr` in these messages (feats.json already has the official names), and "rayonnement" instead of "explosion".

### m7. Spontaneous cure/inflict with metamagic is not offered (FAQ allows it)
- Rule: "You can apply a metamagic feat to a spontaneous spell, but when you do so, the spell takes at least a full-round action to cast" (FAQ 6/30/2008, General Spell Questions, about the cleric's cure conversion). Quicken is then forbidden ([Quicken Spell, Special](https://www.d20srd.org/srd/feats.htm#quickenSpell)).
- Code: `src/ui/panes/Spells.svelte:566–575`. The "cure instead" select has no metamagic choice, and its popup shows no full-round casting time. The `spontaneous` parameter of `metamagicProblems` mentions "a cleric's cure/inflict", but nothing passes it.
- Repro: cleric with Empower Spell → "cure instead" offers only plain cure spells of the prepared level or lower. There is no way to cast an empowered cure light wounds from a 3rd-level slot.
- Fix: optional. Add the metamagic chips to the conversion, with `spontaneous: true` (no Quicken, full-round action) and slot level = cure level + adjustments ≤ the slot.

### m8. French imp stat block: two fire resistances
- Rule: Imp: "fire resistance 5" (`dnd35.db` monster, [imp](https://www.d20srd.org/srd/monsters/devil.htm#imp)).
- Code: `src/data/srd/creatures.json:10774` (imp `specialQualities.fr`): "…résistance au feu (20), réduction des dégâts…, résistance au feu (5)…". The French SRD has this typo too, but the app shows a wrong number to a French reader.
- Fix: drop "résistance au feu (20)" (house data correction; English is authoritative).

## Nitpicks

1. `metamagic.ts:65`: "3 full rounds" (regenerate) isn't recognized as longer than a full round (`\d+ rounds` misses "full"). It has no effect today: regenerate is cleric 7 / druid 9, so a quickened one needs a slot above 9th, and no spontaneous caster has it.
2. `metamagic.ts:102`: Enlarge Spell on *levitate* ("Personal or close") is reported as "no effect". It works on the close option.
3. `creatures.json`: the homunculus French skills are "—" (the French SRD omits the line). Translate: "Détection +4, Discrétion +14, Perception auditive +4".
4. `creatures.json`: the quasit French SQ adds "télépathie (30 m)", which isn't in the English SRD stat block (FR SRD divergence).
5. `creatures.json`: the pseudodragon's reach is stored as 0. The stat block says "0 ft. (5 ft. with tail)".
6. `arcane.ts:248–249` and `Companions.svelte` picker: in French, alignments show as English codes (LE, NG, CE). Official French abbreviations: LM, NB, CM…
7. `feats.json` improved-familiar: the French `summary` is just the name ("Familier supérieur").
8. Spell Mastery (`SpellLearning.svelte:174`): a later pick can choose a spell already mastered by an earlier pick (it wastes a pick, with no warning).
9. Spontaneous bar Heighten select (`Spells.svelte:421`): it lists every slot level, including levels ≤ the spell's, and defaults to 1. "Cast" is then disabled with a tooltip. It would be clearer to list only higher levels.

## Checked and correct
- Slot adjustments: Empower +2, Enlarge +1, Extend +1, Maximize +3, Quicken +4, Silent +1, Still +1, Widen +3 (each matches the `dnd35.db` feat text). They add up. Heighten raises the actual level, and the DC uses it (`actualLevel`, `sc.dc(dcLevel)`). Other feats leave the DC at the original level (FAQ p. 37 "doesn't actually change the spell's level").
- The same feat can't be applied twice. Heighten needs a level above the spell's and at most 9th. A slot above the class maximum is illegal.
- Quicken: illegal when spontaneous (feat Special), illegal for 10-minute or longer casting times, allowed for 1 round (C36). The popup shows "1 free action" (3.5 SRD wording).
- Spontaneous metamagic: one full-round action however many feats (FAQ p. 37). A longer casting time gets one extra full-round action. The "Cast" button takes the lowest free slot of the raised level or higher.
- Silent Spell can't be used on bard spells (chip disabled, rule check). Spells without V get an info message. Still Spell removes ASF in the popup, and a spell without S says so.
- Extend: an info message for instantaneous, permanent or concentration durations. Durations with a number ("concentration, up to…") aren't flagged.
- Prepared metamagic UI: only feats the character has, and only those that keep the spell within its slot. A metamagic spell in a higher slot is allowed. Locked once cast.
- Wizard bonus feat list (5/10/15/20): the nine metamagic feats, the item creation feats and Spell Mastery (SRD wizard).
- Spell Mastery: prerequisite Wizard 1 is checked (`prereq.ts:113`). Picks = Int modifier at the level taken. They must be in the spellbook at that level. "Without my spellbook" limits preparation to read magic and the mastered spells, in both the UI and the rule check.
- Improved Familiar (alignment table): levels 5 (shocker lizard, stirge) and 7 (formian worker, imp, pseudodragon, quasit). One step on each axis is computed correctly (CN master → NG pseudodragon allowed; LE → NG refused). No "speak with animals of its kind". A non-animal improved familiar keeps its own type (no "magical beast for effects"). Alertness only for the master, and no other master's benefit (C38).
- The 7 creatures match `dnd35.db` line by line: HD, hp, initiative, speeds and maneuverability, AC/touch/flat-footed, BAB/grapple, attacks and damage, space/reach, saves, abilities, skills, feats, SQ, alignment. French names match the official French SRD: Ouvrier formien, Homoncule, Diablotin, Pseudo-dragon, Quasit, Lézard voltaïque, Strige.
- Mithral: body armor counts one category lighter for proficiency (attack penalty and warning). A barbarian in mithral full plate (medium) is fine. A rogue in a mithral breastplate is proficient. A mithral heavy shield stays heavy, so the rogue still gets `armor-prof-hs`, as FAQ p. 52 says. A wizard in a mithral chain shirt is still nonproficient (light), but the attack penalty is 0 because the ACP is 0. The ranger combat style uses the shifted category.
- `metamagic.test.ts`: the expected values are right (9 tests pass).

## Open questions
- **"Arcane spellcaster level" for Improved Familiar with sorcerer + wizard levels.** The app uses the highest arcane caster level: sorcerer 3 / wizard 4 is blocked from a pseudodragon ("arcane spellcaster level 7"). Yet for familiars, sorcerer and wizard levels stack ([familiars](https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars)). The feat text doesn't say which applies, and no FAQ entry was found. This also covers bard levels: a bard 7 / wizard 1 currently qualifies for a 7th-level improved familiar. DM decision.
- **Celestial/fiendish familiar template numbers.** SR (HD + 5), DR and resistances use the creature's own HD. Familiar rules say "for effects related to number of Hit Dice, use the master's character level" if higher. Whether the template's HD bands count as such an effect isn't settled by any source found.

## Verdict
The metamagic numbers you'd use at the table are right: slot levels, heightened DCs, casting times and the Quicken, Silent and Still restrictions. So are the Spell Mastery counts, the improved familiar list and the mithral proficiency rule. The faults are false "no effect" or "slot too low" messages (Widen on clouds and fogs, domain-slot metamagic), a missing feat prerequisite, a lower SR shown for a pseudodragon familiar, and some wrong French terms.
