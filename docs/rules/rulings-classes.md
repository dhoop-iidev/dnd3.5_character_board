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
- **Open:** the form's +8 racial bonus on Climb/Swim that comes with a climb or swim speed — part of the movement mode or a racial skill bonus? → house rule #24 (pending).
