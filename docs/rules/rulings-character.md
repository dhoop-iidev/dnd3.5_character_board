# Rulings for the character (3.5 rules as written)

Answers to the open questions that were in `feats.md`, `skills.md`, `advancement.md`, `abilities.md`, `fighter.md` and `weapon-master.md`.
Rule base: 3.5 books; the only homebrew is `docs/house-rules.md`; the only 3.0 content is the Weapon Master (*Sword and Fist*).
Summaries in our own words, never the book text.

Order of authority used: 3.5 SRD (d20srd.org) > PHB/DMG 3.5 and errata > official WotC *D&D 3.5 FAQ* (version 6/30/2008) > *Rules Compendium* > forums (supporting evidence only).

Confidence labels:
- **RAW**: book or SRD text says it.
- **FAQ**: the official WotC 3.5 FAQ (the "Sage") says it; it is official but not a rulebook.
- **Interpretation**: not stated in the books; most common reading. Must not be encoded without the user/DM confirming (CLAUDE.md hard rule).

Short names for sources:
- **FAQ**: *D&D v.3.5 Frequently Asked Questions*, update 6/30/2008, WotC. Copy: https://www.d20pfsrd.com/wp-content/uploads/sites/12/2017/01/Main35FAQv06302008.pdf (section given in each ruling).
- **WotC SRD skills text**: the official SRD file "Skills I", same text on https://srd.dndtools.org/srd/skills/skills.html ("Getting Skills" paragraph and Table: Skill Points per Level).
- **S&F**: *Sword and Fist* (3.0), p. 38, Weapon Master. Read via the mirrors https://dnd.arkalseif.info/classes/weapon-master/index.html , https://www.realmshelps.net/charbuild/classes/prestige/general/weaponmaster.shtml , https://dndtools.org/classes/weapon-master/ ; French revision (*Guide de l'Orient*): https://corpus-draconique.com/wiki/doku.php?id=classe:maitre_d_armes

---

<a id="q1"></a>
## Q1. Multiclass XP penalty

**Answer:** if two of a character's classes are 2 or more levels apart, the character takes −20 % XP for each class that is not within 1 level of the highest-level class. The favored class is ignored; a human's (and half-elf's) favored class is always the highest-level class. Prestige class levels are ignored. Racial Hit Dice are ignored. **This character (human, Fighter 6 / Weapon Master 3) can never have a penalty**: Fighter is the only base class and is the highest class (ignored for a human), and Weapon Master is a prestige class (ignored).
The 3.5 DMG prestige-class section forgot to repeat the "no penalty" sentence; the FAQ says this is an error and prestige classes never give the penalty.

**Sources:**
- PHB 3.5 p. 60, "Experience for Multiclass Characters" (rule summarized above; wording confirmed by several quotations, e.g. https://www.enworld.org/threads/so-how-does-multi-class-penalties-actually-work.354424/ ).
- Favored class / human: https://www.d20srd.org/srd/races.htm#favoredClass , https://www.d20srd.org/srd/races.htm#humans
- Prestige classes: https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm ("does not incur the experience point penalties").
- FAQ, "Multiclassing" (DMG omission is an error; racial HD ignored).

**Confidence:** RAW (+ FAQ for the DMG omission).
**Still open?** No.

<a id="q2"></a>
## Q2. Hit points at 1st level

**Answer:** by the books, a character gets the **maximum** of his Hit Die (+ Con modifier) for his **first character level only**; every later Hit Die (including the first level of a second class or a prestige class) is rolled. House rule #9 replaces this for this character (every Hit Die is maximum), so the app never needs the book rule. Recorded for information only.

**Sources:** PHB 3.5, Chapter 3 "Classes", Hit Die entry (page not checked online; the SRD does not contain this sentence); house-rules #9.
**Confidence:** RAW (book), overridden by house rule #9.
**Still open?** No (only the exact PHB page number is unverified; it does not matter because of house rule #9).

<a id="q3"></a>
## Q3. Skill points per level: minimum 1, ×4, human bonus

**Answer:**
1. The **×4 applies only at the 1st character level** (the first level in any class). A second class or a prestige class taken later never gets ×4.
2. Order at character level 1: (class base + Int modifier) × 4, **then** + 4 if human (the human 4 points are added, not multiplied).
3. Later levels: class base + Int modifier, then + 1 if human.
4. "Always at least 1 skill point per level" belongs to the Intelligence rule, so it limits (class base + Int modifier). At 1st level this gives at least 1 × 4 = 4.
5. Int used: only permanent changes count. Int **damage** doesn't reduce the points gained at a new level (use the undamaged score); Int **drain** and inherent bonuses do count; enhancement bonuses don't.

For this character (Int 13, +1) none of this changes anything: 16 at level 1, 4 at each later level.

**Sources:**
- WotC SRD skills text ("If the character [is] gaining his or her 1st character level overall … multiply the total by four; then add an extra 4 points if the character is human"; table footnotes: humans +4 at 1st level, +1 each level): https://srd.dndtools.org/srd/skills/skills.html
- Minimum 1: https://www.d20srd.org/srd/theBasics.htm#intelligenceInt
- Human: https://www.d20srd.org/srd/races.htm#humans
- PHB 3.5 p. 62, Table 4–1: Skill Points per Level.
- Int damage vs drain: FAQ, "Multiclassing" section (citing PH p. 58); enhancement: https://www.d20srd.org/srd/magicItems/wondrousItems.htm#headbandofIntellect

**Confidence:** RAW for 1, 2, 3, 5. Point 4 (minimum applied before ×4 and before the human +1) is the common interpretation of the text.
**Still open?** Only the edge case "human with Int modifier −2 or worse": is the human +1 added after the minimum (`max(1, base+Int) + 1`) or inside it (`max(1, base+Int+1)`)? The books don't say it exactly. It can't happen for this character unless his Int is drained to 7 or lower. Use `max(1, base+Int) + human` and show a note if the case ever happens.

<a id="q4"></a>
## Q4. Cost of a rank depends on the class taken at that level

**Answer:** when a multiclass character gains a level, he spends that level's skill points with **the class and cross-class lists of the class he just took a level in**: 1 point per rank for that class's skills, 2 points per rank for all others, even if another of his classes has the skill as a class skill. Example for this character: Listen and Spot cost 2 points per rank at Fighter levels and 1 point per rank at Weapon Master levels. The **maximum** ranks are a different rule (Q5).

**Sources:** FAQ, "Multiclassing" (wizard/rogue Tumble example); PHB 3.5 "Multiclass Characters" pp. 59–60 (skills); https://www.d20srd.org/srd/skills/skillsSummary.htm (class skill = 1 rank per point, cross-class = ½ rank).
**Confidence:** RAW + FAQ.
**Still open?** No.

<a id="q5"></a>
## Q5. Maximum ranks (multiclass)

**Answer:** if a skill is a class skill of **any** of the character's classes, its maximum is character level + 3, however the ranks were bought. Otherwise the maximum is (character level + 3) / 2, not rounded. Check it after each level with the classes owned at that level (before the first Weapon Master level, Listen/Spot/Sense Motive were cross-class: max 4½ at level 6).

**Sources:** https://www.d20srd.org/srd/skills/skillsSummary.htm ("Regardless of whether a skill is purchased as a class skill or a cross-class skill…"), https://www.d20srd.org/srd/classes/multiclass.htm (Skills); FAQ, "Multiclassing" (same example as Q4).
**Confidence:** RAW.
**Still open?** No.

<a id="q6"></a>
## Q6. Prerequisites: temporary bonuses, losing a prerequisite, losing prestige class requirements

**Answer:**
- **Feats with an item bonus:** allowed. A character may take a feat using an ability score raised by a magic item (FAQ example: gloves of Dexterity +2 to reach Dex 15). If the bonus is lost later (item removed, suppressed, dispelled), the feat can't be used until it comes back.
- **Feats with a spell bonus:** no explicit official ruling. The FAQ says a temporary ability bonus has the same effect as a permanent one unless a rule says otherwise, so the item ruling should apply too while the spell lasts at the moment the feat is chosen. Interpretation.
- **Lost prerequisite:** "A character can't use a feat if he or she has lost a prerequisite." The character still **has** the feat (e.g. Spring Attack unusable in heavy armor still counts as a prerequisite for Whirlwind Attack).
- **Prestige class entry:** requirements must be met before the first prestige-class level is taken. The books don't say that a temporary bonus can't be used.
- **Prestige class requirements lost later:** the 3.5 rule is in *Complete Warrior* p. 16, confirmed by the FAQ. The character can't take more levels in the class and **loses all class features and special abilities of the class** while the requirement is missing. He keeps the Hit Dice and hit points, base attack bonus and base saves from the class. The FAQ recommends that he also keeps the skill points and class skills. Everything comes back when the requirement is met again. (The 3.0 DMG p. 27 had the same rule. The 3.5 DMG prestige-class chapter doesn't repeat it, which is why some forum posts say 3.5 has no rule.)
- **For this character:** Weapon Master requires Dex 13, BAB +5, Intimidate 4 ranks and 6 feats. If Dex drops below 13 (damage, penalty), he loses the Weapon Master class features (ki damage, increased multiplier, …) while it lasts. Int below 13 makes Combat Expertise and Whirlwind Attack unusable. By the FAQ's Spring Attack reasoning he still **has** those feats, so the Weapon Master requirement is still met (interpretation).

**Sources:**
- https://www.d20srd.org/srd/feats.htm#prerequisites
- FAQ, feats section (gloves of Dexterity / Two-Weapon Fighting; Whirlwind Attack in heavy armor); FAQ, cleric section (temporary ability bonus has the same effect as a permanent one); FAQ, "Multiclassing" (assassin who becomes non-evil, quoting CW 16).
- *Complete Warrior* (3.5) p. 16, "Meeting Prestige Class Requirements".
- https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm
- 3.0 DMG p. 27, quoted in https://www.enworld.org/threads/losing-prestige-class-requirements.67571/page-2

**Confidence:** RAW for feats; FAQ + *Complete Warrior* for prestige classes; Interpretation for spells and for "has the feat but can't use it, so the class requirement is still met".
**Still open?** Two points for the DM, and neither matters for the current build: (a) can a spell bonus be used to qualify for a feat or prestige class; (b) does an unusable feat still meet a prestige class requirement.

<a id="q7"></a>
## Q7. Ability damage, drain, penalties, enhancement: order and floors

**Answer:**
- All of these are additions and subtractions, so **the order doesn't change the result**: current score = base + increases + inherent + enhancement − drain − damage − penalties. The only thing that matters is the floors.
- **Damage and drain:** a score can't go below 0, and negative points are never tracked. 0 has the effects in `abilities.md` §6.
- **Penalties** (the SRD calls them an "effective ability score reduction"): they are not ability loss and end with the effect. Their floor is given by **each effect**. Example: *ray of enfeeblement* says Str can't drop below 1, and *touch of idiocy* says the penalty can't bring a score below 1. Without such a clause, the general floor of 0 applies.
- **Daily uses and other derived values** change at once. The FAQ says to recompute as if a bonus had ended or started, and the same for penalties.
- **Int and skill points:** see Q3 point 5. **Con and hit points:** see `abilities.md` §5.

**Sources:** https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss ; https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged ; https://www.d20srd.org/srd/spells/rayOfEnfeeblement.htm ; https://www.d20srd.org/srd/spells/touchOfIdiocy.htm ; https://www.d20srd.org/srd/theBasics.htm#stacking ; FAQ, cleric section (temporary Cha changes).
**Confidence:** RAW. (No book gives an "order"; none is needed because the sum is the same in any order.)
**Still open?** No. App: floor each score at 0. Apply an effect's own floor (e.g. 1) only if the effect's data has one.

<a id="q8"></a>
## Q8. Untyped bonuses (Weapon Focus, Improved Initiative, synergy)

**Answer:** bonuses with no type stack with each other when they come from **different sources**. Two untyped bonuses from the **same source** don't stack. Weapon Focus +1, Greater Weapon Focus +1 and the Weapon Master's Superior Weapon Focus +1 are untyped and from different sources, so they all stack. Improved Initiative +4 is untyped. **There is no "synergy bonus" type in 3.5**: synergy +2s are untyped and stack, even several on one skill (FAQ: Bluff + Sense Motive + Knowledge (nobility) = +6 on Diplomacy).

**Sources:** https://www.d20srd.org/srd/theBasics.htm#stacking ; FAQ, skills section (Diplomacy synergy); FAQ, magic items section (citing *Rules Compendium* p. 21: untyped bonuses from the same source don't stack); feat texts https://www.d20srd.org/srd/feats.htm#weaponFocus , #greaterWeaponFocus , #improvedInitiative .
**Confidence:** RAW + FAQ.
**Still open?** No.

<a id="q9"></a>
## Q9. "Fighter level" for Weapon Specialization / Greater Weapon Focus

**Answer:** "fighter level N" means **levels in the Fighter class only**. Prestige class levels count only if the prestige class says so. *Sword and Fist*'s Weapon Master says nothing about it. This character has Fighter level 6: Weapon Specialization (4) yes; Greater Weapon Focus (8) and Greater Weapon Specialization (12) no.

**Sources:** feat texts https://www.d20srd.org/srd/feats.htm#weaponSpecialization , #greaterWeaponFocus ; class level vs character level: https://www.d20srd.org/srd/classes/multiclass.htm#level and the FAQ definitions ("Class Level … If a class gives you bonus feats, it's your class level that determines when you get them"). Similar FAQ ruling: other levels (UA bloodline levels) "don't stack with class levels for the purpose of meeting prerequisites (such as the minimum fighter level for selecting Weapon Specialization)". S&F Weapon Master text: no such clause.
**Confidence:** RAW (+ FAQ for the similar case).
**Still open?** No.

<a id="q10"></a>
## Q10. Weapon Master (*Sword and Fist*, 3.0) class features

**Verified against the book (`books/Sword & Fist.pdf`, pp. 38–39) on 2026-10-12.** Correction: the original *does* require a masterwork weapon of the chosen type (p. 39).

Original S&F text (from the mirrors above), summarized. Numbers: see `weapon-master.md`. Greatsword: 2d6, 19–20/×2.

<a id="q10-weapon-of-choice"></a>
### Weapon of choice
**Answer:** the weapon master's features work only with **one melee weapon type**, his "weapon of choice". It must be the weapon of his Weapon Focus requirement, and he must be proficient with it. Once chosen it can't be changed. Any weapon of that type works (house rule #6: no masterwork requirement). For this character: the greatsword.
**Sources:** S&F p. 38 requirements (Weapon Focus, proficiency with the weapon of choice); can't change and any weapon of the type works: French revision (corpus-draconique) and realmshelps summary.
**Confidence:** RAW for the link to Weapon Focus. "Can't change" comes from the revised text and secondary summaries; the S&F wording of that sentence wasn't seen.
**Still open?** No for play (house rule #6 already chooses the S&F version).

<a id="q10-ki-damage"></a>
### Ki damage (1/day per Weapon Master level, from WM 1)
**Answer:** after a **hit** with the weapon of choice, the weapon master may choose not to roll the weapon's damage dice and deals the **normal maximum** instead. Other damage is added as usual and not maximized (Power Attack, sneak attack, energy properties…). It can't be used on a **critical hit**. Greatsword: 12 + usual modifiers (Str ×1½, enhancement, Weapon Specialization if taken, Power Attack). Uses per day = WM level (WM 3: 3/day).
**Sources:** S&F p. 38 (mirrors above).
**Confidence:** RAW (S&F).
**Still open?** No.

<a id="q10-increased-multiplier"></a>
### Increased multiplier (1/day at WM 2, +1/day every 2 levels: 2/day at 4, … 5/day at 10)
**Answer:** on a critical hit with the weapon of choice, the weapon's critical multiplier goes up by 1 (greatsword ×2 → ×3). It must be **declared before any damage dice are rolled** (the French revision says: after the critical is confirmed). The usual 3.5 multiplying rules apply to the new multiplier: only the damage that would normally be multiplied is multiplied, not extra dice. Improved Critical changes the threat **range**, and this changes the **multiplier**, so they combine without any order problem. Ki damage can't be used on that hit (Ki damage excludes critical hits).
**Sources:** S&F p. 38; https://www.d20srd.org/srd/combat/combatStatistics.htm#criticalHits, https://www.d20srd.org/srd/theBasics.htm#multiplying
**Confidence:** RAW.
**Still open?** No.

<a id="q10-superior-weapon-focus"></a>
### Superior Weapon Focus (WM 3)
**Answer:** +1 on attack rolls with the weapon of choice. The S&F text says it **stacks with Weapon Focus**. Greater Weapon Focus didn't exist in 3.0. Under the 3.5 stacking rule (untyped bonuses from different sources stack, Q8), Weapon Focus + Greater Weapon Focus + Superior Weapon Focus = +3. Superior Weapon Focus does **not** count as the Greater Weapon Focus feat for prerequisites (no text says so). The French revision's editor note suggests the DM could treat it as Greater Weapon Focus to stop the stacking. That is only a house-rule suggestion. For this character, Greater Weapon Focus needs Fighter level 8, so it isn't available anyway.
**Sources:** S&F p. 38; https://www.d20srd.org/srd/theBasics.htm#stacking ; corpus-draconique note (DM option, not a rule).
**Confidence:** RAW.
**Still open?** No.

<a id="q10-superior-combat-reflexes"></a>
### Superior Combat Reflexes (WM 5)
**Answer (text):** the weapon master may make a **total** number of attacks of opportunity per round equal to his **Dex modifier + Wis modifier**. Read literally, this replaces Combat Reflexes' 1 + Dex modifier. With Dex +3 and Wis −1 that would be 2, which is fewer than the 4 he has now. The text doesn't say "whichever is higher" or "additional".
**Sources:** S&F p. 38 (all mirrors give the same wording "total number … equal to your Dexterity modifier plus your Wisdom modifier"); Combat Reflexes https://www.d20srd.org/srd/feats.htm#combatReflexes
**Confidence:** RAW wording; its interaction with Combat Reflexes is interpretation.
**Still open?** No: house-rules #12 (better of the two).

**Final check (2026-10-12), house rule #12 (better of Dex + Wis mod and Combat Reflexes):** no official text addresses it. The official *D&D FAQ v.3.5* (6/30/2008) has no Weapon Master or Superior Combat Reflexes entry (its only Combat Reflexes entry is about flat-footed AoOs). The *Sword and Fist* errata (mirror https://www.dndadventure.com/html/articles/sword-fist-errata/) corrects many S&F prestige classes but not the Weapon Master. The 3.0→3.5 conversion guide (FR, 2003) doesn't cover splatbook class features. For comparison, the 3.5 Combat Reflexes text (FR DRS 05 "Attaques réflexes": extra AoOs equal to the Dex bonus) is unchanged from 3.0, so the S&F wording "total … equal to Dex modifier + Wis modifier" still reads as a replacement total. **Result: house rule #12 is neither confirmed nor contradicted by any official text. It stays a DM decision (already confirmed).**

<a id="q10-ki-critical"></a>
### Ki critical (WM 7)
**Answer:** the weapon master gains **Improved Critical** (weapon of choice) as a free feat. He really has the feat, so it counts for prerequisites. If he **already has** Improved Critical with that weapon, he instead adds **+2 to the threat range** of the weapon of choice (greatsword: 19–20 → 17–20 with Improved Critical → 15–20). If he takes Improved Critical (greatsword) earlier (e.g. as his level-9 feat; BAB +8 OK), Ki critical gives the +2. **Keen:** in 3.5, Improved Critical and *keen* don't stack (each says it doesn't stack with any other threat-range expander). For the +2: the French revised text says it is applied last, after Improved Critical / *keen* doubling. A forum report says Andy Collins (3.5 designer) saw no problem letting it stack. But the 3.5 *keen* text literally says it doesn't stack with "any other effect that expands the threat range".
**Sources:** S&F p. 38; https://www.d20srd.org/srd/feats.htm#improvedCritical ; https://www.d20srd.org/srd/magicItems/magicWeapons.htm#keen ; corpus-draconique (revised text); https://www.enworld.org/threads/3-5e-weapon-master.90818/ (secondary, unofficial).
**Confidence:** RAW for the free feat and the +2. Its interaction with *keen* is interpretation.
**Still open?** No. The book (p. 39, verified 2026-10-12) says the +2 is applied last, after Improved Critical or *keen*.

<a id="q10-ki-whirlwind"></a>
### Ki Whirlwind Attack (WM 9)
**Answer:** Whirlwind Attack can be used as a **standard action** instead of a full-round action. So in the same round the character can also take a move action (normal action rules). Everything else in Whirlwind Attack still applies: one attack at full BAB against each opponent in reach, and Cleave / Great Cleave / other extra attacks are lost. It can't be used with Spring Attack, which works only with the attack action, not any standard action (FAQ, the same logic for eldritch blast). The French revision adds "once per round". S&F doesn't say it, but one standard action per round gives the same result in practice.
**Sources:** S&F p. 38; https://www.d20srd.org/srd/feats.htm#whirlwindAttack ; https://www.d20srd.org/srd/combat/actionsInCombat.htm ; FAQ, warlock section (Spring Attack only with the attack action).
**Confidence:** RAW for the action change.
**Still open?** **Partly, and not before WM 9:** Combat Expertise works only "when you use the attack action or the full attack action". A standard-action Whirlwind is neither, so a strict reading forbids Combat Expertise with Ki Whirlwind. DM ruling needed.

<a id="q10-conversion"></a>
### 3.0 → 3.5 conversion guidance
**Answer:** WotC never published a 3.5 version or conversion of the S&F Weapon Master.
- The free *D&D v.3.5 Accessory Update* booklet covers only the core books, *Deities and Demigods*, *Epic Level Handbook*, *Fiend Folio*, *Manual of the Planes* and *Monster Manual II*, **not *Sword and Fist***.
- A WotC web document of 13 January 2005 ("Feats, Prestige Classes, and Spells") reportedly lists the S&F Weapon Master as "revised/renamed" into *Complete Warrior*'s Exotic Weapon Master. That is a different class, not a conversion, and house rule #1 keeps the S&F class.
- No official text maps 3.0 feat names to 3.5 for this class. Using **Combat Expertise** for the 3.0 **Expertise** requirement is the natural equivalence (the 3.5 PHB renamed the feat with the same Int 13 prerequisite and a similar effect). It is already written in `weapon-master.md` but is an interpretation.

**Sources:** https://archive.org/details/dnd_3.5_update_booklet ; https://index.rpg.net/display-entry.phtml?mainid=12085 ; Forgotten Realms Wiki "Weapon master" (secondary, cites the 2005 document); https://en.wikipedia.org/wiki/Sword_and_Fist (S&F content partly reprinted in *Complete Warrior*); 3.0 Expertise https://dnd.arkalseif.info/feats/players-handbook-30--106/expertise--3320/index.html vs https://www.d20srd.org/srd/feats.htm#combatExpertise
**Confidence:** Interpretation (Expertise = Combat Expertise).
**Still open?** No: house-rules #10.

**Final check (2026-10-12), house rules #10 and #7, against the official French *Guide de conversion 3.0 vers 3.5* (2003; `sources/DD-3e/fr/Conversion 3.0 vers 3.5/`, read in full with pdftotext):**
- **Expertise is not mentioned anywhere in the guide**: not in "Dons" (removed/renamed feats: Ambidextrie, Attaques réflexe → Attaques réflexes, Botte secrète → Attaque en finesse, Destruction d'arme → Science de la destruction, Uppercut → Coup étourdissant…), not in "Dons modifiés", not in the glossary. The guide translates WotC's own conversion notes and lists only *French* name changes. The likely reason is that the French name, "Expertise du combat", didn't change (the 3.5 DRS uses it: DRS 05 "Expertise du combat [général]", Int 13). We did not see the French 3.0 PHB to confirm this. The English 3.5 PHB renamed the 3.0 feat Expertise to Combat Expertise with the same Int 13 prerequisite and the same effect (https://dnd.arkalseif.info/feats/players-handbook-30--106/expertise--3320/index.html vs https://www.d20srd.org/srd/feats.htm#combatExpertise). **So #10 is consistent with the official texts:** it is the same feat under its 3.5 name, and nothing contradicts it.
- **How to convert 3.0 supplements (guide, section on adapting supplements):** "Les éléments concernant plus directement les personnages des joueurs (c'est-à-dire les classes de prestige, les dons et les sorts) nécessitent un peu plus d'attention, mais souvent également assez peu de modifications." You *ignore the removed skills* (Langage secret, Lecture sur les lèvres, Scrutation, Sens de l'orientation) and *replace the others with their 3.5 equivalent* (Alchimie → Artisanat (alchimie), Connaissance des sorts → Art de la magie, Empathie avec les animaux → empathie sauvage, Sens de la nature → Survie, Vol à la tire → Escamotage). Feats: "Si le PJ possède un don supprimé, ou dont il ne remplit plus les conditions, il doit le remplacer par un autre don accessible."
- **Knowledge (weaponry)** is a *Sword and Fist*-specific Knowledge field, not a 3.0 core skill. The guide neither lists nor maps it. The only 3.5 Knowledge change it notes is the new Connaissances (exploration souterraine). Leaving it out (house rule #7) follows the guide's general method for skills with no 3.5 equivalent (ignore them). The guide doesn't say this about this skill specifically, so #7 stays a DM ruling, consistent with but not dictated by the guide.
- **Result: #10 confirmed (consistent; no contrary text). #7: refined in the sense above (guide method supports it, no explicit mention).**

<a id="q11"></a>
## Q11. Spring Attack in heavy armor

**Answer:** the PHB 3.5 text matches the SRD: Spring Attack **can't be used while wearing heavy armor**. The FAQ cites "PH 100" for this restriction. The character still **has** the feat, so it still counts as the prerequisite for Whirlwind Attack (and for Weapon Master). Whirlwind Attack itself has no armor restriction. No errata changes this. For this character, in full plate +2 (heavy), Spring Attack is unusable; Whirlwind Attack and Weapon Master are not affected.
**Sources:** https://www.d20srd.org/srd/feats.htm#springAttack ; PHB 3.5 p. 100; FAQ, feats section ("Can a character wearing heavy armor use Whirlwind Attack (PH 102)?").
**Confidence:** RAW + FAQ.
**Still open?** No.

<a id="q12"></a>
## Q12. Deity bonus feat and prerequisites

**Answer:** house rule #3 adds one feat (Weapon Focus (greatsword)) but changes nothing else. So it follows the normal feat rules: it needs its prerequisites (proficiency with the greatsword, BAB +1, met from Fighter 1), it counts as having Weapon Focus for every prerequisite (Weapon Specialization, Weapon Master entry, Greater Weapon Focus), and it can't be used if a prerequisite is lost.
**Sources:** house-rules #3; https://www.d20srd.org/srd/feats.htm#prerequisites ; https://www.d20srd.org/srd/feats.htm#weaponFocus
**Confidence:** RAW (normal rules applied to a house-rule feat).
**Still open?** No.

<a id="q13"></a>
## Q13. Trip and Improved Trip with a greatsword

**Answer:** only weapons whose description says they can trip may be used to trip. The FAQ gives the PH list: bolas, spiked chain, dire flail, heavy flail, flail, guisarme, halberd, gnome hooked hammer, kama, scythe, sickle, whip. A quarterstaff can't, and **a greatsword can't**. With a greatsword in hand, a trip is an **unarmed** melee touch attack (followed by the opposed Str/Dex check).
With **Improved Trip**:
- the unarmed trip doesn't provoke an attack of opportunity;
- +4 on the Str check;
- after a successful melee trip, an immediate melee attack against that foe (it can be made with the greatsword) as if the attack hadn't been used for the trip.

A character who doesn't threaten unarmed (no Improved Unarmed Strike) can't trip as an **attack of opportunity** without a trip weapon (FAQ).
**Sources:** https://www.d20srd.org/srd/combat/specialAttacks.htm#trip ; https://www.d20srd.org/srd/feats.htm#improvedTrip ; FAQ, equipment section (PH p. 159 list, "If a weapon's description does not specifically say you can make trip attacks with it, you cannot"); FAQ, combat section (trip as an attack of opportunity).
**Confidence:** RAW + FAQ.
**Still open?** No.

---

## Summary of what is still open (DM decisions; nothing blocks the current level-8 build)

1. **Q3 edge case:** human with Int modifier ≤ −2. Is the human +1 added after the minimum of 1, or inside it? (Can't happen with Int 13.)
2. **Q6:** (a) can a *spell* bonus be used to qualify for a feat or prestige class (items: yes, FAQ); (b) does a feat that is owned but unusable still meet a prestige class requirement (FAQ reasoning says yes).
3. **Q10 Superior Combat Reflexes (WM 5):** literal replacement (Dex + Wis = 2 AoO) or the better of the two (4).
4. **Q10 Ki critical (WM 7):** does the +2 threat range stack with *keen*?
5. **Q10 Ki Whirlwind (WM 9):** can Combat Expertise be used with a standard-action Whirlwind Attack?
6. **Q10 conversion:** write "Expertise (3.0) = Combat Expertise (3.5)" into `house-rules.md` as confirmed.
