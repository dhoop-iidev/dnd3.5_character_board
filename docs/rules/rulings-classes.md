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
- SRD Sun: "Once per day, you can perform a greater turning against undead in place of a regular turning… the undead creatures that would be turned are destroyed instead" (https://www.d20srd.org/srd/spells/clericDomains.htm#sun). A cleric who channels negative energy rebukes; but PHB p. 159 / SRD: "Regardless of the effect, the general term for the activity is 'turning'" (corrected 2026-10-16, see C25). FAQ pp. 10–11: turn or rebuke is fixed. No core "greater rebuking"; books print it explicitly where intended (Eberron Deathless domain).
- **As written:** no effect for a rebuking cleric. **Alternative for the DM:** once per day a greater rebuke, where undead that would be rebuked are commanded instead.
- **App:** shown with a note "no effect as written (pending)".

## C15. Monk flurry of blows — **total BAB, monk-level penalty and extra attacks** (high)
- SRD: "one extra attack in a round at her highest base attack bonus, but this attack takes a −2 penalty, as does each other attack made that round" (https://www.d20srd.org/srd/classes/monk.htm#flurryofBlows). FAQ 6/30/2008 p. 21: a multiclass example uses the total BAB.
- FAQ pp. 19–21: flurry combines with two-weapon fighting (penalties stack) and Rapid Shot (shuriken); natural weapons and non-monk weapons (gauntlet) can't be part of it. Quarterstaff (SRD monk text, not the FAQ): Str ×1, and "each end counts as a separate weapon for the purpose of using the flurry of blows ability". Power Attack with it: house rule #29 (pending). Haste's extra attack: allowed by the wording (full attack), no official ruling.
- **App:** a flurry toggle; the monk's unarmed strike and monk weapons get the penalty and the extra attack(s); other weapons are flagged. Lost in armor, with a shield or a medium/heavy load.

## C16. Monk unarmed strike — **light weapon, Power Attack ×1, amulet of mighty fists, size table** (high)
- SRD equipment: "An unarmed strike is always considered a light weapon." Power Attack: no bonus with a light weapon "except with unarmed strikes or natural weapon attacks" (https://www.d20srd.org/srd/feats.htm#powerAttack). FAQ p. 21: the amulet of mighty fists applies to the monk's unarmed strike. SRD Table: Small or Large Monk Unarmed Damage.
- **App:** the unarmed strike is always an attack for a monk (no item needed), with the monk damage by level and size, ki strike, the amulet's enhancement, no nonproficiency penalty.

## C17. Barbarian rage — **Str/Con bonuses untyped, Will bonus morale; once per encounter** (high)
- SRD: "+4 bonus to Strength, a +4 bonus to Constitution, and a +2 morale bonus on Will saves… −2 penalty to Armor Class… 3 + the character's (newly improved) Constitution modifier… A barbarian can fly into a rage only once per encounter" (https://www.d20srd.org/srd/classes/barbarian.htm#rage). Morale Str/Con is the Pathfinder rule, not 3.5. FAQ p. 10: rage doesn't end when the barbarian falls unconscious.
- **App:** a timed effect (rounds counted by the turn bar); at its end, fatigued until the end of the encounter (not from 17th level). Skills that can't be used are marked; Combat Expertise is switched off. Stacking with the *rage* spell (morale) follows the bonus types; DM may rule it the same effect.

## C18. Paladin — **smite melee only, class level only for smite/lay on hands/mount** (high)
- SRD smite evil: "one normal melee attack… Charisma bonus (if any)… 1 extra point of damage per paladin level" (https://www.d20srd.org/srd/classes/paladin.htm#smiteEvil). FAQ p. 9: smite, lay on hands and the mount use paladin level. Mount Int is set (not added), Str adjustment added; a Small paladin gets a warpony.
- Smite damage on a critical hit: **pending house rule #28** (the books don't settle whether this flat extra damage is multiplied).

## C19. Rogue — **sneak attack on every qualifying attack; special abilities** (high)
- FAQ p. 24: every attack that qualifies (iteratives, Rapid Shot) deals sneak attack damage; ranged within 30 ft; not multiplied on a critical.
- Special abilities: only skill mastery says it can be taken again; "Feat: A rogue may gain a bonus feat in place of a special ability" — any feat, prerequisites apply; each special ability can be replaced by a feat, so the feat option can recur (https://www.d20srd.org/srd/classes/rogue.htm#specialAbilities).
- Uncanny dodge from two classes: improved uncanny dodge, barbarian and rogue levels stack (SRD barbarian); evasion from two classes does not improve (FAQ p. 9).

## C20. Alignment and multiclass restrictions — **RAW** (high)
- Barbarian, bard: any nonlawful; druid: neutral on one axis; monk: any lawful; paladin: lawful good. Out of alignment: no new level; ex-paladin loses spells and abilities, a lawful barbarian can't rage, an ex-druid loses spells (monk keeps abilities). Monk and paladin: no new level of the class after a level in another class (SRD Ex-Monks, Ex-Paladins).
- **App:** warnings under Levels; ex-paladin and ex-druid spells, divine grace, paladin turning and smite are removed while out of alignment (an unknown alignment keeps everything).

## C21. Warblade uncanny dodge and improved uncanny dodge — **as the barbarian's, levels stack** (high)
- *Tome of Battle* p. 22: uncanny dodge at 2nd, improved uncanny dodge at 6th, "See the barbarian class feature (PH 26) for more information". The barbarian text: uncanny dodge from a second class gives improved uncanny dodge, and the levels of the classes that grant uncanny dodge stack (https://www.d20srd.org/srd/classes/barbarian.htm#improvedUncannyDodge).
- **App:** barbarian (2+), rogue (4+) and warblade (2+) levels stack for the flanking threshold; two such classes give improved uncanny dodge.

## C22. Review fixes of 2026-10-16 (classes) — **RAW, see docs/reviews/um_actually-2026-10-16-classes.md**
- Smite evil applies to one attack (first of a full attack); a lance is one-handed while mounted; the mount shares the paladin's better base saves (FAQ p. 22); monk fast movement is an enhancement bonus (no stacking with boots of striding and springing or haste) and is lost with a shield; a fatigued barbarian whose rage ends becomes exhausted; Weapon Finesse is used only when better than Str after the shield's penalty; an ex-druid loses wild empathy, wild shape and the companion; Small characters' gear (backpack, bedroll, rations, outfits…) weighs a quarter, ammunition half (Table: Goods and Services).

## C23. Smite evil damage on a critical hit — **multiplied (flat damage)** (medium-high)
- SRD Multiplying Damage: "Exception: Extra damage dice over and above a weapon's normal damage are never multiplied" (https://www.d20srd.org/srd/combat/combatStatistics.htm#multiplyingDamage). The broader Critical Hits sentence ("Extra damage over and above…") is the only argument against. *Rules Compendium* p. 40 (as quoted on EN World, https://www.enworld.org/threads/does-damage-from-a-bane-weapon-get-increased-on-a-crit.259958/) names precision damage and energy dice only. FAQ p. 24 (sneak attack dice) and p. 16 (rider effects) concern dice and riders, not flat bonuses. Community: EN World "Critical Smite" (https://www.enworld.org/threads/critical-smite.37311/).
- **App:** the +paladin level is shown on the first attack, "multiplied on a critical". House rule #28 closed.

## C24. Weapon Finesse with a nonproficient shield — **the shield penalty applies once** (high)
- FAQ 6/30/2008 p. 51: the armor check penalty for nonproficiency "overrides the normal armor check penalty", applying an equal penalty on Str and Dex checks and attack rolls. Weapon Finesse ("If you carry a shield, its armor check penalty applies to your attack rolls") puts the same penalty from the same item on the attack: once. FAQ p. 23: different penalties for different reasons stack; this is one penalty.
- **App:** with a nonproficient shield, only the nonproficiency penalty applies; with a proficient one, Finesse adds the shield's penalty. House rule #30 closed.

## C25. Deep dive of the open questions (2026-10-16) — **texts and common understanding; all still DM decisions**

**Method:** five parallel searches.
- **Local SRD copies:** English RTF, English HTML and French DRS. All three are the 3.5 SRD; the French DRS keeps a few 3.0 sentences.
- **Official sources:** `dnd35.db`, PHB errata, the official FAQ of 6/30/2008, the 3.0→3.5 conversion guide.
- ***Rules Compendium*:** quoted from forums, not checked on a scan.
- **Forums:** EN World, rpg.stackexchange, Usenet, Min/Max, and GiantITP when reachable. Pathfinder only as contrast.

### #29 Quarterstaff in a flurry: Power Attack
**Texts**
- **Monk:** "Strength bonus (not Str bonus x 1-1/2 or x 1/2)… whether she wields a weapon in one or both hands".
- **Monk:** "each end counts as a separate weapon for the purpose of using the flurry of blows ability". This covers flurry eligibility only.
- **Power Attack** (https://www.d20srd.org/srd/feats.htm#powerAttack): "(Normally, you treat a double weapon as a one-handed weapon and a light weapon. If you choose to use a double weapon like a two-handed weapon, attacking with only one end of it in a round, you treat it as a two-handed weapon.)"
- **FAQ p. 54:** a double weapon "follows the normal rules" either way.
- **FAQ p. 68:** a single attack with a double weapon is two-handed.

**Community** (split; everyone agrees on Str ×1)
- EN World 2005: leaned ×1 (https://www.enworld.org/threads/monk-flurry-two-handed-weapon-power-attack.126552/).
- Usenet 2005: unresolved (https://groups.google.com/g/rec.games.frp.dnd/c/seGrAcjtQmQ).
- EN World 2007, Hypersmurf: ×2, undisputed (https://www.enworld.org/threads/strength-power-attack-and-quarterstaffs.190434/).

**Strongest reading (~60%): judged per round.**
- One end only that round: ×2.
- Both ends: ×1 on one end, nothing on the other. Which end is "light" in a flurry with no off hand is unclear.

### #23 Dwarf against a poison spell
**For +4**
- PHB p. 171 / SRD Magic Overview: "With the exception of dodge bonuses, most circumstance bonuses, and racial bonuses, only the better bonus works".
- The same sentence is reprinted in the *Expanded Psionics Handbook* and the French DRS 20.
- The dwarf has two separate traits.

**For +2**
- PHB glossary "stack": only dodge and circumstance bonuses stack.
- DMG p. 21.
- *Rules Compendium* p. 21: "Bonuses that have identical types don't stack, except for dodge bonuses and some circumstance bonuses". The RC claims precedence over older books.
- SRD demilich: "(this overlaps with the previous racial bonus gained by the lich; it does not stack)".
- The designers avoided the case elsewhere: the svirfneblin and duergar traits "replace" the older bonus.

**Community** (split; no FAQ, errata or Sage Advice)
- rpg.stackexchange 2019: the accepted answer says "RAW, we have a mess" and stacks them at that table (https://rpg.stackexchange.com/questions/157146/do-racial-bonuses-stack).
- EN World 2007/2008 moderators: they stack (https://www.enworld.org/threads/do-racial-bonuses-stack.195972/).

**Assessment:** about 50/50. "Specific beats general" gives +4; "the latest book wins" gives +2.

### #25 Horse, pony or camel companion at the Multiattack band
**Texts**
- **Companion:** "…gains a second attack with its primary natural weapon, albeit at a –5 penalty".
- **Animals:** "A noncombative herbivore uses its natural weapons as a secondary attack".
- **Horse:** "A horse not trained for war does not normally use its hooves to attack". The pony has the same note; the camel has no such condition.
- **Primary weapon:** chosen "usually by virtue of the creature's physiology, training, or innate talent".
- **FAQ p. 97:** "A secondary natural weapon is always a secondary natural weapon".

**Community** (thin)
- EN World 2003 (Diirk, FireLance): a horse taught the combat tricks loses the −5 (https://www.enworld.org/threads/druid-and-warhorse-animal-companion.72429/).
- Pathfinder later rewrote the clause to "one of its natural weapons", which confirms the 3.5 gap.

**Assessment**
- The books are silent (high confidence).
- The strict reading gives nothing (medium-high).
- For horses, the training route is the option closest to the books (medium).

### #26 Sun domain for a rebuking cleric
**Texts**
- **3.5 Sun domain:** "…in place of a regular turning… the undead creatures that would be turned are destroyed instead".
- **PHB p. 159:** "Regardless of the effect, the general term for the activity is 'turning'".
- **Evil clerics:** "Undead that would be turned are rebuked instead".
- **Official 3.0 SRD:** "(or rebuking)… turned (or rebuked or commanded) are destroyed instead".
- **French DRS 21 (3.5):** "s'utilise comme une tentative de renvoi, d'intimidation ou de contrôle des morts-vivants, sauf que les créatures affectées sont automatiquement détruites". This is word for word the 3.0 text, probably carried over: the French DRS has other 3.0 leftovers.

**Deities**
- The PHB has only Pelor (NG) with the Sun domain.
- A neutral cleric of a LN Sun god may choose negative energy (Amaunator, *Lost Empires of Faerûn*).
- Eberron allows clerics of any alignment.

**Community:** no consensus. Mostly "it does nothing / not intended", with "commanded" as a house rule. Nobody cited the 3.0 or French wording.

**Assessment:** destroyed ~55% (3.0 SRD + French DRS), no effect ~25%, commanded ~20%.

### #27 Homebrew Knowledge skill
**Texts**
- **Knowledge skill:** "Like the Craft and Profession skills, Knowledge actually encompasses a number of unrelated skills… Below are listed typical fields of study". The list is open.
- **French DRS 04:** "Vous pouvez en inventer d'autres".
- **Knowledge domain:** "Add all Knowledge skills".

**Precedents**
- The 3.0→3.5 conversion guide names every class that gained Knowledge (dungeoneering), except the bard and the wizard: they got it automatically through "all Knowledge".
- The psion lists "Knowledge (all skills, taken individually)*", while the other psionic classes name Knowledge (psionics) explicitly.

**Community**
- "All Knowledge" covers every category in play, e.g. the bard and Knowledge (psionics) on EN World (https://www.enworld.org/threads/creating-a-warmind.134711/). No dissent found.
- A 2003 preview of 3.5 said: "There's no Knowledge (monsters) skill". Monster lore was split by creature type on purpose.

**Assessment**
- As a Knowledge category, it is a class skill for the bard, the wizard and the Knowledge domain (~85%).
- The DM may keep it fighter-only, as an explicit house rule.
- Overlap with the SRD split by type: suggest it as an alternative check, never added on top, possibly limited to combat information.

### C25 decisions (2026-10-16)
- #26: destroyed (the DM). #23: +4 (SRD first in the authority order). #25: training route (horse/pony trained for war: primary hooves). #27: class skill for the all-Knowledge classes. #29: per round (one end ×2, both ends ×1 / none). Implemented with tests in `src/engine/__tests__/house-rules-23-29.test.ts`.

## C26. Specialist wizard extra spell at 0 level — **yes, every spell level the wizard can cast, 0 included** (medium-high)
- SRD wizard: "A specialist wizard can prepare one additional spell of her specialty school per spell level each day" (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization). French DRS 03b: "un sort supplémentaire de son école pour chaque niveau de sort auquel il a accès". 0-level spells are a spell level (Table: The Wizard has a 0 column).
- Contrast: the cleric domain spell is explicitly "at each spell level he can cast, from 1st on up" (https://www.d20srd.org/srd/classes/cleric.htm#domains); the wizard text has no such limit. The SRD spell points variant also says "one extra spell from the chosen school of each spell level that he can cast" (https://www.d20srd.org/srd/variant/magic/spellPoints.htm).
- No FAQ (6/30/2008), errata or *Rules Compendium* entry found either way. The "from 1st on up" wording quoted on forums for wizards is Pathfinder's rewrite, not 3.5.
- **App:** a specialist gets +1 slot at 0 level and at every level she can cast, filled only with a spell of the specialty school.

## C27. Sorcerer or bard casting a lower-level spell with a higher-level slot — **allowed; the spell keeps its own level** (high)
- SRD Arcane Spells, Spell Slots: "A spellcaster always has the option to fill a higher-level spell slot with a lower-level spell" (https://www.d20srd.org/srd/magicOverview/spellsArcane.htm#spellSlots). It says "a spellcaster", not "a wizard".
- FAQ 6/30/2008 p. 37 (reserve feats): a spontaneous caster benefits "as long as [he] knows an appropriate spell and has at least one unused spell slot of that spell's level or higher". The same answer: the slot's level is not the spell's level (save DC, dispel and level-dependent effects use the spell's real level; only Heighten Spell changes it).
- Community agrees (EN World 2007, https://www.enworld.org/threads/can-a-sorcerer-use-a-higher-level-slot-to-cast-a-lower-level-spell.187283/).
- **App:** when casting a sorcerer or bard spell, offer to spend any unused slot of its level or higher; DC and effects stay at the spell's level.

## C28. Inspire greatness — **only the listed benefits; the temporary hit points end with the effect** (medium)
- SRD: "2 bonus Hit Dice (d10s), the commensurate number of temporary hit points (apply the target's Constitution modifier, if any, to these bonus Hit Dice), a +2 competence bonus on attack rolls, and a +1 competence bonus on Fortitude saves. The bonus Hit Dice count as regular Hit Dice for determining the effect of spells that are Hit Dice dependant" (https://www.d20srd.org/srd/classes/bard.htm#inspireGreatness).
- Reading: the +2 attack and +1 Fortitude are what two good-progression Hit Dice would give, written out as competence bonuses; the only other use the text gives the bonus Hit Dice is HD-dependent spells (*sleep*, *color spray*…). So no extra base attack bonus, base saves, feats or skill points. No FAQ, errata or *Rules Compendium* answer; an EN World minority view grants BAB/saves/feats (https://www.enworld.org/threads/inspire-greatness-bonus-hit-dice.224011/), unsupported by the enumerated text.
- Temporary hit points: 2d10 + 2 × Con modifier. SRD Temporary Hit Points: "When the temporary hit points go away the character's hit points drop to his current hit point total" (https://www.d20srd.org/srd/combat/injuryAndDeath.htm#temporaryHitPoints). They last as long as the effect (while the target hears the song + 5 rounds), are lost first, and a second inspire greatness doesn't add to them (same effect, best only).
- FAQ p. 10: a raging bard can still use inspire greatness. Competence bonuses don't stack with other competence bonuses (bonus-types.md).
- **App:** an effect with +2 competence attack, +1 competence Fortitude, temporary hp entered by the player (2d10 + 2 × Con); the +2 HD shown as text (HD-dependent spells only); removing the effect removes the remaining temporary hp.

## C29. Inspire courage — **all weapon damage (ranged, unarmed, natural); no casting while singing; two songs at once: DM decision** (high / DM decision)
- SRD: "+1 morale bonus on saving throws against charm and fear effects and a +1 morale bonus on attack and weapon damage rolls" (https://www.d20srd.org/srd/classes/bard.htm#inspireCourage). Weapon damage, with no melee restriction: ranged and thrown weapons count. The unarmed strike is a light simple weapon (https://www.d20srd.org/srd/equipment/weapons.htm); natural weapons are weapons (https://www.d20srd.org/srd/typesSubtypesAbilities.htm#naturalWeapons). Not spells: FAQ p. 27 says eldritch blast is not "weapon damage" for inspire courage because "it's not a weapon"; the same goes for rays and *magic missile*.
- Casting: SRD bardic music: "Even while using bardic music that doesn't require concentration, a bard cannot cast spells, activate magic items by spell completion (such as scrolls), or activate magic items by magic word (such as wands)" (https://www.d20srd.org/srd/classes/bard.htm#bardicMusic). FAQ p. 11: maintaining a song needs no action ("probably safest to describe it as a free action"). So the bard stops singing, his allies keep the bonus for 5 more rounds, and he can cast meanwhile.
- Two songs maintained at once (e.g. courage + greatness): **the books don't say.** Each start is a standard action and one daily use; starting a new song while the old one's 5-round tail runs gives both for up to 5 rounds under any reading. Options: (a) one song sung at a time, the previous one lingers 5 rounds (EN World s-dub/Nifft; Pathfinder later wrote this down); (b) several songs maintained together, each costing a use (EN World Artoomis). Thread: https://www.enworld.org/threads/inspire-courage-greatness-heriocs.224906/. No FAQ or *Rules Compendium* answer found. **DM decision.**
- **App:** the morale bonus applies to every weapon attack and weapon damage roll (melee, ranged, thrown, unarmed, natural), not to spells; while a song is marked as sung, spellcasting, scrolls and wands are flagged; the 5-round tail is counted by the turn bar. Two songs at once: follow the pending house rule.

## C30. Familiar details — **untyped master bonuses; Alertness once; maximum hp; master's ranks as they are; sorcerer + wizard levels** (high; (c) medium-high)
- (a) The master's bonuses (rat +2 Fortitude, weasel +2 Reflex, cat +3 Move Silently, toad +3 hit points…) name no type, so they are untyped: "A bonus that isn't named stacks with any bonus" (https://www.d20srd.org/srd/magicOverview/castingSpells.htm#bonusTypes). They apply only within 1 mile. The toad's +3 raises maximum hp (not temporary hp).
- (b) Alertness: "While a familiar is within arm's reach, the master gains the Alertness feat" (https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars). SRD feats: "If a character has the same feat more than once, its benefits do not stack unless indicated otherwise" (https://www.d20srd.org/srd/feats.htm). A master who already has Alertness gains nothing more.
- (c) Hit points: "one-half the master's total hit points (not including temporary hit points), rounded down, regardless of its actual Hit Dice". "Total" with temporary hp excluded reads as the master's full normal (maximum) hp: it moves with level-ups and Con changes (FAQ p. 115: a Con change adjusts "current and full normal (maximum)" hp), not with the master's wounds. No FAQ answer; community agrees.
- (d) Skills: "use either the normal skill ranks for an animal of that type or the master's skill ranks, whichever are better… the familiar uses its own ability modifiers… some skills may remain beyond the familiar's ability to use". A master's cross-class rank is one rank like any other (3.5 has no half ranks). Nothing official beyond this; the DM decides which skills a familiar can physically use (e.g. Decipher Script, Use Magic Device).
- (e) Master class level: "Levels of different classes that are entitled to familiars stack". In the SRD core only sorcerer and wizard grant a familiar; other classes' levels don't count unless their text says so (FAQ p. 9: bloodline levels don't add to a familiar; FAQ p. 4: a dragon's innate sorcerer casting counts).
- **App:** master bonuses as untyped modifiers (toggle "familiar within 1 mile"); Alertness from the familiar does nothing when the feat is already taken (toggle "within arm's reach"); familiar hp = floor(master max hp / 2); familiar skills = max(own ranks, master's ranks) + own ability modifier; Int and natural armor from sorcerer + wizard levels.

## C31. Wizard spellbook — **two free spells of a level she can cast (Int included); never prohibited schools; 0-level pointless** (high)
- SRD: "At each new wizard level, she gains two new spells of any spell level or levels that she can cast (based on her new wizard level) for her spellbook" (https://www.d20srd.org/srd/classes/wizard.htm#spellbooks). And "To learn, prepare, or cast a spell, the wizard must have an Intelligence score equal to at least 10 + the spell level" (https://www.d20srd.org/srd/classes/wizard.htm#spells): a level her Int blocks is not one she can learn.
- 0-level: allowed by the wording, but her book already holds "all 0-level wizard spells (except those from her prohibited school or schools…)", so a free pick there is wasted.
- Prohibited schools: "Spells of the prohibited school or schools are not available to the wizard" (https://www.d20srd.org/srd/classes/wizard.htm#schoolSpecialization). FAQ p. 48: prohibited-school spells "are not part of his class spell list"; FAQ p. 29: the spellbook is limited to the wizard class spell list.
- **App:** the two free spells per wizard level must be wizard spells of a level ≤ the highest she can cast at the new level and ≤ Int − 10, never from a prohibited school; warn otherwise.

## C32. Bard arcane spell failure — **light armor ignored for bard spells; any shield applies (buckler 5%); spells without S never fail** (high)
- SRD bard: "A bard can cast bard spells while wearing light armor without incurring the normal arcane spell failure chance. However, like any other arcane spellcaster, a bard wearing medium or heavy armor or using a shield incurs a chance of arcane spell failure if the spell in question has a somatic component (most do)" (https://www.d20srd.org/srd/classes/bard.htm#weaponAndArmorProficiency). SRD Arcane Spells and Armor: "If a spell doesn't have a somatic component, an arcane spellcaster can cast it with no problem while wearing armor" (https://www.d20srd.org/srd/classes/sorcererWizard.htm#arcaneSpellsAndArmor).
- So light armor + buckler = 5% (the buckler only); light armor + light shield = 5%; medium armor: its full chance plus the shield's. The light-armor exemption covers bard spells only: "A multiclass bard still incurs the normal arcane spell failure chance for arcane spells received from other classes."
- **App:** ASF for a bard spell = shield's ASF + (armor's ASF if heavier than light); 0% for a spell without S (or with Still Spell); other arcane classes' spells use the full total.

## C33. Sorcerer and bard spell swap — **judged at the new level; sorcerer 4, 6…20, bard 5, 8, 11, 14, 17, 20** (high)
- SRD sorcerer: "Upon reaching 4th level, and at every even-numbered sorcerer level after that (6th, 8th, and so on)… The new spell's level must be the same as that of the spell being exchanged, and it must be at least two levels lower than the highest-level sorcerer spell the sorcerer can cast" and he "must choose whether or not to swap the spell at the same time that he gains new spells known for the level" (https://www.d20srd.org/srd/classes/sorcerer.htm#spells). Bard: "Upon reaching 5th level, and at every third bard level after that (8th, 11th, and so on)", same conditions (https://www.d20srd.org/srd/classes/bard.htm#spells).
- Levels: sorcerer 4, 6, 8, 10, 12, 14, 16, 18, 20; bard 5, 8, 11, 14, 17, 20 ("and so on" doesn't stop at 14). One spell per swap level, same level as the old spell.
- "Can cast" is judged at the level just reached, since the choice is made with that level's new spells. Examples: sorcerer 4 (casts 2nd) swaps a 0-level spell; sorcerer 6 (3rd) up to 1st; bard 5 (2nd) a 0-level spell; bard 8 (3rd) up to 1st. If a low Charisma keeps him from casting his top level ("must have a Charisma score equal to at least 10 + the spell level"), the highest level he can actually cast counts.
- **App:** at those levels, offer one optional swap: a known spell → a new spell of the same level, level ≤ highest castable at the new level − 2; warn on a swap at another level or with a too-high spell.

## C34. Online research of house rules #35–#37 (2026-10-16), and the specialist's free spells
- **Specialist's free spells (settled, high):** SRD Arcane Spells, Spells Gained at a New Level: "If she has chosen to specialize in a school of magic, one of the two free spells must be from her specialty school" (https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm). It applies to each new wizard level, not to the starting spellbook. **App:** warns when a specialist's two free spells of a level include none of her school.
- **#36, wizard free spells at a prestige spellcasting level (settled by the FAQ, medium):** the WotC 3.5 Main FAQ, as quoted on EN World, says a wizard/loremaster "gains 2 spells for her spellbook when using a loremaster level to increase spellcasting" (https://www.enworld.org/threads/wizard-prestige-classes-spell-acquisition.91974/). The opposite "No… He must spend time and gold" answer that circulates is a Pathfinder (d20pfsrd) sidebar, not 3.5 (https://paizo.com/threads/rzs2n4b0). The entry is not in the 6/30/2008 compiled FAQ, so the quote is second-hand. **App:** unchanged (2 free spells at such a level).
- **#35, two bardic music songs at once (no official answer):** nothing in the SRD, the 2008 FAQ (it only says keeping a song going takes no action, p. 11) or the searched forums settles it. Indirect hints lean toward one at a time: options that exist to keep two songs going (the dvati twins of the *Dragon Compendium*; the Lingering Song feat stretching a song's tail) would be pointless otherwise (https://www.joshuad.net/new-bard-handbook/). Community opinion is split (https://forums.obsidianportal.com/discussion/1956/d-d-3-5-rules-question-bardic-music). **App:** unchanged (one song; the previous one lingers 5 rounds). Still a DM decision.
- **#37, bard in a mithral breastplate (no official 3.5 answer):** no FAQ or errata entry found. The common reading (forums, mostly Pathfinder, same mithral text) is that "other limitations" covers the bard's spell failure, while proficiency is still medium armor. *Superseded by C35: the official FAQ (pp. 53–54) answers it, proficiency included.*

## C35. Mithral armor: one category lighter for every purpose, proficiency included — **settled by the FAQ (high)**
- SRD/DMG: mithral armor counts one category lighter "for movement and other limitations"; spell failure −10%, max Dex +2, armor check penalty −3 ([mithral](https://www.d20srd.org/srd/specialMaterials.htm#mithral)).
- Official 3.5 FAQ (6/30/2008, pp. 53–54): the Sage treats mithral armor as one category lighter for all purposes, proficiency included. A rogue or ranger is proficient with a mithral breastplate and keeps evasion or the combat style; a barbarian is proficient with mithral full plate and keeps fast movement. A mithral shield stays its own category (p. 52).
- Bard: a mithral breastplate is light armor for the bard's "no spell failure for bard spells in light armor" (an ability that depends on light armor). Sorcerer, wizard and the bard's spells from another arcane class: only the −10% (breastplate 25% → 15%, chain shirt 20% → 10%). The FAQ (p. 11) also says reducing a chance does not change the category: a 15% breastplate is not light armor for that reason.
- Searched for a stronger source without Pathfinder or 5e material: none found (no Sage Advice or *Rules Compendium* entry turned up).
- **App:** body armor uses the category after mithral for proficiency (attack penalty and warning), movement, class abilities and bard spell failure. This replaces the C34 note on #37.

## C36. Metamagic feats — **SRD + FAQ (high)**
- SRD [metamagic feats](https://www.d20srd.org/srd/feats.htm#metamagicFeats): the spell uses a slot higher by the feat's adjustment (Empower +2, Enlarge +1, Extend +1, Maximize +3, Quicken +4, Silent +1, Still +1, Widen +3); Heighten Spell raises the spell's actual level. Several feats add up; the same feat can't be applied twice. "In all ways, a metamagic spell operates at its original spell level": the save DC only changes with Heighten Spell (FAQ 6/30/2008 p. 37 too).
- Prepared casters choose the feats when preparing. Bards and sorcerers choose when casting: a full-round action instead of a standard action (one extra full-round action for a longer casting time), not more for several feats (FAQ p. 37). Quicken Spell can't be used on a spontaneous spell (feat text); Silent Spell can't be applied to bard spells; a spell with a casting time over 1 full round can't be quickened (a 1-round casting time can).
- Feats that change something a spell doesn't have (Extend on an instantaneous spell, Silent without a verbal component…) are legal but do nothing: the app says so (information).
- Still Spell removes the somatic component, so no arcane spell failure.
- **App:** each prepared slot has a metamagic choice (feats the character has, only those that fit the slot); bard and sorcerer pick the feats for the next spell, and "Cast" uses a slot of the raised level. Checks: slot too low, feat not known, restrictions above. Never in a slot of a level the key ability is too low for (house rule #40, confirmed).

## C37. Spell Mastery — **SRD (high)**
- [Spell Mastery](https://www.d20srd.org/srd/feats.htm#spellMasterySpecial): wizard 1st level; each time, choose as many spells you already know as your Intelligence modifier; you can prepare them without the spellbook. Read magic never needs the spellbook ([wizard](https://www.d20srd.org/srd/classes/wizard.htm#spellbooks)).
- **App:** the spells are chosen in the Spells tab (spellbook part), counted against the Int modifier at the level the feat was taken, and must be in the spellbook at that level (copied spells count, their date isn't recorded). "Without my spellbook today" limits the prepared spells to read magic and the mastered spells, with a warning for the others.

## C38. Improved Familiar — **SRD (high), two pending details**
- [Improved Familiar](https://www.d20srd.org/srd/feats.htm#improvedFamiliar) (DMG p. 200): from arcane spellcaster level 5th, shocker lizard or stirge (neutral); from 7th, formian worker (LN), imp (LE), pseudodragon (NG), quasit (CE). The master's alignment may be up to one step away on each axis. Improved familiars keep their own type (if not animal) and don't gain "speak with animals of its kind"; otherwise the familiar rules apply. The feat lists no master's benefit for them, so only Alertness applies.
- FAQ 6/30/2008: the familiar lists are the PH's plus expansions such as Improved Familiar; Augment Summoning doesn't affect a familiar.
- The seven stat blocks were added to creatures.json from the SRD (the Small elementals and the ice mephit were already there).
- **App:** the familiar picker offers them when the character has the feat, greyed out with the reason when the level or alignment doesn't fit; the rule check flags an illegal one. The type/subtype table is offered too (house rule #38: celestial/fiendish standard animals from arcane level 3, Small elementals, shocker lizard from 5, homunculus, ice mephit from 7; the subtype condition is a reminder for the DM). The familiar's Int follows the table (#39).
