# Rulings: classes and races (generic structure, D&D 3.5 RAW)

Open questions from the um_actually review of 2026-10-15 (`docs/reviews/um_actually-2026-10-15-races-classes.md`), researched 2026-10-16. Summaries in our own words, short quotes only.

## Sources

| Source | Weight |
|---|---|
| SRD 3.5 (d20srd.org, local `sources/srd-v3.5/`) | RAW |
| Official 3.5 FAQ, 6/30/2008 (archived copy: https://web.archive.org/web/2017id_/https://www.d20pfsrd.com/wp-content/uploads/sites/12/2017/01/Main35FAQv06302008.pdf) | official |
| Forums: EN World, Giant in the Playground, Paizo | community |

## C1. Druid/ranger wild empathy: do the levels stack? — **No: use the better one** (medium)
- Druid: d20 + druid level + Cha modifier. Ranger: d20 + ranger level + Cha bonus. Neither has a stacking clause ([druid](https://www.d20srd.org/srd/classes/druid.htm#wildEmpathy), [ranger](https://www.d20srd.org/srd/classes/ranger.htm#wildEmpathy)).
- The animal companion, by contrast, says explicitly that levels stack (FAQ p. 29 gives the druid/ranger sum). Multiclassing gives "all the class features of all his or her classes" with no general merging of same-name features ([multiclass](https://www.d20srd.org/srd/classes/multiclass.htm)).
- FAQ pp. 9–10: evasion from two classes is still just evasion; "You are not able to benefit from multiple sources that have the same name more then once" (AC bonus of monk/swordsage/ninja).
- Optimization guides say the levels stack, without a rule. Paizo threads (same wording, Pathfinder) say no stacking.
- **App:** d20 + the higher of druid or ranger level + Cha. A DM who prefers the sum can make it a house rule.

## C2. Ranger combat-style feats in medium/heavy armor as prerequisites — **legal to pick, unusable while the style is lost** (medium-high)
- The ranger "is treated as having" Rapid Shot / Two-Weapon Fighting… "even if he does not have the normal prerequisites"; "He loses all benefits of his combat style when wearing medium or heavy armor" ([ranger](https://www.d20srd.org/srd/classes/ranger.htm#combatStyle)).
- SRD feats: "A character can't use a feat if he or she has lost a prerequisite" ([feats](https://www.d20srd.org/srd/feats.htm#prerequisites)). FAQ p. 87: losing a bonus feat (Dodge) makes the feats that need it (Mobility, Spring Attack) unusable.
- FAQ pp. 53–54: mithral armor counts one category lighter, so the combat style keeps working in mithral medium armor.
- EN World thread "Ranger combat style feats as prerequisites" (https://www.enworld.org/threads/ranger-combat-style-feats-as-prerequisites.173242/): majority view as above.
- **App:**
  - Feats picked with a combat-style feat as prerequisite (e.g. Two-Weapon Defense) are legal.
  - In medium or heavy armor they stop applying and show a warning "unusable".
  - Exception: if the ranger also took the prerequisite feat normally, nothing is lost.

## C3. Dwarf against a poison spell: +2 or +4? — **pending: house rule #23**
- Dwarf: +2 racial on saves vs poison, and +2 racial on saves vs spells and spell-like effects (two separate traits, [races](https://www.d20srd.org/srd/races.htm#dwarves)).
- PHB p. 171 / SRD "Bonus Types": "With the exception of dodge bonuses, most circumstance bonuses, and racial bonuses, only the better bonus works" ([castingSpells](https://www.d20srd.org/srd/magicOverview/castingSpells.htm#bonusTypes)) → **+4**.
- PHB glossary "stack" ([theBasics](https://www.d20srd.org/srd/theBasics.htm#stacking)) lists only dodge and circumstance; DMG p. 21 "usually a named bonus does not stack with another bonus of the same name" → **+2**.
- No FAQ, Sage or customer-service answer found. Forums split (EN World: https://www.enworld.org/threads/do-racial-bonuses-stack.195972/). Same conflict as rulings-combat-equipment.md R02.
- **App now:** racial bonuses of the same type don't stack (+2). Recommended reading: +4 (PHB p. 171 names racial bonuses). Needs the user's/DM's decision.

## C4. Wild shape — **official errata 2006: works like Alternate Form** (high)
- d20srd and the local SRD still print the pre-errata text ("functions like the polymorph spell"). The **PHB v3.5 errata (02/2006, p. 37)** replaces it: wild shape "functions like the alternate form special ability", each use heals "as if you had rested for a night", and "any gear worn or carried by the druid melds into the new form and becomes nonfunctional" (https://web.archive.org/web/2008id_/http://www.wizards.com:80/dnd/files/PHBErrata02062006.zip).
- **MM v3.5 errata (02/2006), Alternate Form:** the creature "retains the hit points of its original form despite any change to its Constitution" and keeps HD, skill ranks, feats, BAB and base saves; it gains the form's natural weapons, natural armor, movement modes, extraordinary special attacks and Str/Dex/Con (https://web.archive.org/web/2008id_/http://www.wizards.com:80/dnd/files/MM_Errata02062006.zip). The FAQ 6/30/2008 (pp. 15–16) follows the errata: no special qualities of the form; later Con changes (spells, Con damage) do change hit points.
- Wild armor keeps its armor bonus (and enhancement) in wild shape (https://www.d20srd.org/srd/magicItems/magicArmor.htm#wild); other items stop working. Barkskin (a spell) still adds to the form's natural armor.
- Attacks: her BAB + the form's Str (Dex with her own Weapon Finesse) + new size; secondary natural attacks −5 (−2 with her own Multiattack) and ½ Str; a sole natural attack 1½ Str; the form's damage dice.
- **App:** abilities, size modifiers, natural armor, land speed and natural attacks come from the form; hit points are those of her own form; all gear is melded (treated as stored) except wild armor/shields and items the player ticks (DM's choice); the form's feats, special qualities and racial skill bonuses are not applied.
- The form's +8 Climb/Swim from a climb/swim speed: see C5 (house rule #24).

## C5. Wild shape and the +8 Climb/Swim of a climb/swim speed — **decided: house rule #24 (gained)** (medium)
- SRD ties the bonus to the speed: "A creature with a climb speed has a +8 racial bonus on all Climb checks"; a creature with a swim speed "gains a +8 racial bonus on any Swim check to perform a special action or avoid a hazard", can always take 10 and can run while swimming (https://www.d20srd.org/srd/specialAbilities.htm#movementModes, https://www.d20srd.org/srd/skills/swim.htm).
- Errata'd Alternate Form gives the form's movement modes and keeps the original's skill ranks; it says nothing on racial skill modifiers. FAQ p. 88 (racial traits retained, new ones not gained) is about the character's own race. No FAQ entry on swim/climb speeds in wild shape.
- Community: EN World "Druid Wildshape?" (Oct 2006, right after the errata: the +8 comes with the speed); some Paizo posts read the errata as removing all racial skill bonuses.
- **App:** +8 racial on Climb with a climb speed; +8 racial on Swim (situational: special action or hazard) with a swim speed. Other racial skill bonuses of the form (e.g. a cat's Balance) are not gained.

## C6. Multiclass spellcasters (several casting classes) — **RAW** (high)
- SRD, multiclass characters: "The character gains spells from all of his or her spellcasting classes and keeps a separate spell list for each class. If a spell's effect is based on the class level of the caster, the player must keep track of which class's spell list the character is casting the spell from." (https://www.d20srd.org/srd/classes/multiclass.htm)
- So, per class: its own spell list, spells per day (table at that class's level), bonus spells from its own key ability, caster level (= that class's level; ½ for paladin/ranger), save DC (10 + spell level + that class's ability modifier), preparation (or spells known). A spell on two lists (e.g. cure light wounds: cleric 1, druid 1) is prepared separately in each class and cast at that class's spell level and caster level. Domain slots belong to the cleric only; spontaneous cure/inflict converts cleric spells only.
- Turning undead is the special case where levels add: cleric level + (paladin level − 3) from paladin 4 (same SRD page). Summoning: duration = caster level of the class the summon spell is cast from.
- **App:** one Spells section per class (own slots, caster level, DCs, prepared spells keyed by class); a note explains it when there are several; the summons box asks which class casts when several can.

## C7. Dire animals as animal companions: Will save — **their printed good saves (good Will included)** (high)
- SRD: "An animal companion has good Fortitude and Reflex saves" (https://www.d20srd.org/srd/classes/druid.htm#animalCompanion).
- **Official FAQ 3.5 (6/30/2008) p. 14:** "Dire animals use their normal good saves, even after becoming animal companions." The sentence only restates the animal rule.
- **App:** a creature's good or poor saves are read from its printed saves, so bonus HD advance a dire animal's Will as a good save.

## C8. Summoning a creature with an alignment makes the spell that type — **yes (Fiendish dire rat = evil spell)** (medium-high)
- SRD Summon Monster I: "When you use a summoning spell to summon an air, chaotic, earth, evil, fire, good, lawful, or water creature, it is a spell of that type" (https://www.d20srd.org/srd/spells/summonMonsterI.htm). The fiendish template is "always evil"; the summon tables print an alignment for each entry (fiendish dire rat LE).
- SRD cleric: "A cleric can't cast spells of an alignment opposed to his own or his deity's" (https://www.d20srd.org/srd/classes/cleric.htm). The Good/Evil/Law/Chaos domains cast spells of their alignment at +1 caster level.
- Community, 3.5 era: EN World "Summon Monster alignments" (2004, https://enworld.org/threads/summon-monster-alignments.107984) and "Clerics as summoners" (https://www.enworld.org/threads/clerics-as-summoners.357101/). No FAQ entry.
- **App:** the summons box derives the alignment of the summoned creature (printed alignment, or celestial = good, fiendish = evil): a cleric gets a warning when it is opposed to his alignment, and +1 caster level (duration) from a matching alignment domain.

## C9. Animal companion Multiattack band, horse/camel (all natural attacks secondary) — **pending: house rule #25**
- SRD companion: with fewer than three natural attacks, "the animal companion instead gains a second attack with its primary natural weapon, albeit at a –5 penalty" (https://www.d20srd.org/srd/classes/druid.htm#animalCompanion).
- Horses, ponies and camels only have secondary attacks ("herbivorous animals… their natural weapons are treated as secondary attacks", https://www.d20srd.org/srd/monsters/intro.htm). FAQ p. 97: "A secondary natural weapon is always a secondary natural weapon, even when a creature attacks only with that weapon."
- The books don't say what a creature without a primary natural weapon gains. No FAQ; forum discussions are Pathfinder and split.
- **App (strict reading until decided):** 3+ natural attacks → Multiattack (secondary −2); fewer → one more attack with the primary natural weapon at −5 (wolf: bite +x/+x−5); horse/camel → nothing.

## C10. Wild armor in wild shape — **only the armor bonus and its enhancement** (medium-high)
- SRD: the wearer "preserves his armor bonus (and any enhancement bonus) while in a wild shape" (https://www.d20srd.org/srd/magicItems/magicArmor.htm#wild). PHB errata 2006: "any gear worn or carried by the druid melds into the new form and becomes nonfunctional". Other properties (fortification, resistances), max Dex, armor check penalty, spell failure and speed reduction don't apply. FAQ p. 89: wild works with wild shape only.
- Community agreement: GiantITP "[3.5] Wild Armor and Check Penalties?" (https://forums.giantitp.com/archive/index.php/t-265450.html).
- **App:** as implemented (armor bonus + enhancement only).

## C11. Dwarf druid in wild shape: "not slowed by armor or load" — **doesn't apply** (medium-high)
- Wild shape works like Alternate Form (C4), which loses "the movement modes of its original form"; the dwarf trait is about "this speed" (the dwarf's own 20 ft) (https://www.d20srd.org/srd/races.htm#dwarves). FAQ pp. 4–5 and 53 discuss the dwarf's own form only.
- **App:** the form's speeds with the normal load rules.

## C12. Knowledge domain and a homebrew Knowledge skill — **pending: house rule #27**
- SRD Knowledge domain: "Add all Knowledge skills to your list of cleric class skills" (https://www.d20srd.org/srd/spells/clericDomains.htm#knowledge). Official precedent: Knowledge (psionics) is a new Knowledge category picked up by "Knowledge (all skills)" lists (Expanded Psionics Handbook SRD).
- "Connaissances des monstres" is a DM skill (house rule #4) whose class-skill list the DM set (fighter, weapon master, warblade). Whether "all Knowledge" lists (bard, wizard, Knowledge domain) include it is the DM's call.
- **App:** not added until decided.

## C13. Domain slot at a spell level blocked by a low Wisdom — **the slot stays, filled with a lower-level domain spell** (medium)
- Cleric table footnote: the "+1" is the domain spell slot (https://www.d20srd.org/srd/classes/cleric.htm). Spell slots: "A spellcaster who lacks a high enough ability score to cast spells that would otherwise be his or her due still gets the slots but must fill them with spells of lower level" (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#spellSlots).
- **App:** as implemented (the domain slot of a blocked level offers lower, castable domain spells).

## C14. Sun domain greater turning for a cleric who rebukes — **pending: house rule #26**
- SRD Sun: "Once per day, you can perform a greater turning against undead in place of a regular turning… the undead creatures that would be turned are destroyed instead" (https://www.d20srd.org/srd/spells/clericDomains.htm#sun). A cleric who channels negative energy rebukes and never turns; FAQ pp. 10–11: turn or rebuke is fixed. No core "greater rebuking"; books print it explicitly where intended (Eberron Deathless domain).
- **As written:** no effect for a rebuking cleric. **Alternative for the DM:** once per day a greater rebuke, where undead that would be rebuked are commanded instead.
- **App:** shown with a note "no effect as written (pending)".
