# Rulings: combat, bonuses, equipment, load, magic items, conditions (D&D 3.5 RAW)

Resolves the open questions of `combat.md`, `bonus-types.md`, `equipment.md`, `carrying-capacity.md`, `magic-items.md` and `conditions.md`.
D&D **3.5** only. The only homebrew is `docs/house-rules.md`; everything below is the 3.5 books' answer. Summaries in our own words, with short quotes only where the exact wording matters.
Researched 2026-10-12.

## Sources used, in priority order

| Short name | What it is | Where |
|---|---|---|
| SRD (d20srd) | 3.5 SRD, hypertext edition. d20srd adds only official WotC errata/FAQ/reprint changes (https://www.d20srd.org/changes.htm) | https://www.d20srd.org/ |
| Official SRD | WotC's own SRD 3.5 files (RTF/PDF), mirrored | https://github.com/orey/DD-3e/tree/master/en/pdf |
| PHB / DMG | *Player's Handbook* v.3.5, *Dungeon Master's Guide* v.3.5 (page numbers given where known) | — |
| PHB errata | PHB v.3.5 errata 09/24/2003, incl. the **"Primary Sources" rule**: the text wins over a table; a spell's own description wins over a summary; the PHB is the primary source for rules of play, the DMG for magic items | http://www.wizards.com/dnd/files/PHB_Errata09242003.zip (archived on web.archive.org) |
| FAQ | Official WotC *D&D FAQ v.3.5*, version 6/30/2008 (PDF page numbers below) | original http://www.wizards.com/dnd/files/DnD35_FAQ.pdf ; mirror https://www.d20pfsrd.com/wp-content/uploads/sites/12/2017/01/Main35FAQv06302008.pdf |
| RC | *Rules Compendium* (2007). Not available online; quoted only through the rpg.stackexchange answers named below | — |
| DRS (FR) | *Document de Référence du Système*, the official French SRD 3.5 (French book wording and units) | https://github.com/orey/DD-3e/tree/master/fr/pdfs |
| FR site | regles-donjons-dragons.com (mirrors the DRS) | https://regles-donjons-dragons.com/ |

Confidence labels: **RAW** = the book text answers it directly; **RAW + errata rule** = books disagree and the errata "primary source" rule picks one; **FAQ** = official FAQ ruling; **RC** = *Rules Compendium*; **Interpretation** = no text answers it, so a reading is recommended.

---

## 1. Bonus types and stacking

### R01 Penalty stacking
- **Answer:** Penalties follow the same rules as bonuses. Two penalties of the **same type** do not stack: only the worst applies. The **same source** twice (e.g. the same spell twice) does not stack. **Untyped penalties from different sources stack.** Most penalties are untyped, so in practice they usually add up: the FAQ adds −4 (nonproficient weapon) + −4 (nonlethal with a lethal weapon) = −8, and −2 (tower shield) + −10 (tower shield nonproficiency) = −12 ("Penalties in the D&D game stack").
- **Engine rule:** group contributions by `bonusType`. For each typed group keep the best bonus and the worst penalty. `dodge` and `circumstance` stack, except same source. `untyped` stacks, except same source. Two contributions with the same source id never both count.
- **Sources:** https://www.d20srd.org/srd/theBasics.htm#stacking ("only the best bonus and worst penalty applies"; this is the PHB glossary entry "stack"); https://www.d20srd.org/srd/magicOverview/castingSpells.htm#bonusTypes (PHB p. 171, "a character taking two or more penalties of the same type applies only the worst one"); FAQ p. 23 (sneak attack: nonproficient + nonlethal = −8), FAQ p. 52 (tower shield −2 + −10 = −12).
- **Confidence:** RAW + FAQ.

### R02 Racial bonuses stacking
- **Answer:** The PHB contradicts itself. The Magic chapter's "Bonus Types" (PHB p. 171) lists racial bonuses with dodge and most circumstance bonuses as the types that stack. The glossary "stack" entry lists only dodge and circumstance. No errata, FAQ answer or SRD change settles it. It doesn't matter for this human character (no racial bonuses).
- **Recommended default:** let racial bonuses stack. The PHB p. 171 text is chapter text that names racial bonuses explicitly; the glossary entry is a general summary. Show the conflict in the popup.
- **Sources:** https://www.d20srd.org/srd/magicOverview/castingSpells.htm#bonusTypes ; https://www.d20srd.org/srd/theBasics.htm#stacking
- **Confidence:** Interpretation.
- **Still open?** Yes (RAW conflict). Low priority: no effect on this character.

### R03 Where the modifier-type glossary comes from
- **Answer:** The "Stacking" paragraph and the per-type definitions on https://www.d20srd.org/srd/theBasics.htm#modifierTypes are not in WotC's official SRD "Basics" file (checked: the official file only has dice, rounding, multiplying and ability scores). d20srd took them from the PHB v.3.5 glossary and states it only adds official WotC material (https://www.d20srd.org/changes.htm). They are acceptable "Source" links; where it matters, add "PHB glossary" as the book reference.
- **Sources:** official SRD Basics PDF (https://github.com/orey/DD-3e/blob/master/en/pdf/01%20Basics.pdf); https://www.d20srd.org/changes.htm
- **Confidence:** RAW (provenance checked).

### R04 "Alignment" bonus
- **Answer:** 3.5 core (PHB, DMG, MM, SRD) has no "alignment" bonus type. The good/evil types are **sacred** and **profane**. Effects tied to alignment (e.g. *protection from evil*) give deflection/resistance bonuses that only apply against creatures of that alignment. Don't add an "alignment" type.
- **Sources:** https://www.d20srd.org/srd/theBasics.htm#modifierTypes ; https://www.d20srd.org/srd/spells/protectionFromEvil.htm
- **Confidence:** RAW (the type doesn't exist).

### R05 Circumstance bonuses: "essentially the same source"
- **Answer:** Circumstance bonuses stack with each other unless they come from essentially the same source. Deciding what counts as the same source is a judgement call, but the FAQ shows the method: two circumstance bonuses from two different abilities (*change shape* and *detect thoughts*) stack. Engine: every circumstance contribution carries a `source` id. Different ids stack; the same id counts once (the best). The user/DM sets the id when creating a custom circumstance effect.
- **Sources:** https://www.d20srd.org/srd/theBasics.htm#circumstanceModifier ; FAQ p. 4 (doppelganger: circumstance bonuses from two abilities stack).
- **Confidence:** RAW + FAQ.

### R06 Reliability of regles-donjons-dragons.com
- **Answer:** Use the English SRD for numbers. Use the official French SRD (DRS, link above) for French terms and French units. regles-donjons-dragons.com mirrors the DRS and is fine for terms and links, but it has spam injections, and copy errors such as its "Paralysé" page. Where the site and the DRS disagree, use the DRS. Exception by design: kg values come from the French books (house-rules #5), see R18.
- **Sources:** DRS PDFs (https://github.com/orey/DD-3e/tree/master/fr/pdfs), compared with https://regles-donjons-dragons.com/page1609.html and others.
- **Confidence:** Interpretation (source-quality policy, not a game rule).

### R07 Dodge bonuses from spells (haste)
- **Answer:** Follow the spell. The glossary says dodge bonuses are "never granted by spells or magic items", but *haste* explicitly grants "+1 dodge bonus to AC and Reflex saves". Under the errata's primary-source rule, a spell's own description wins over a general summary. The engine must allow `dodge` on spell/item effects when their text says so. The glossary line stays true as a general design note.
- **Sources:** https://www.d20srd.org/srd/spells/haste.htm (PHB p. 239); https://www.d20srd.org/srd/theBasics.htm#dodgeBonus ; PHB errata 09/24/2003, "Primary Sources".
- **Confidence:** RAW + errata rule.

## 2. Damage and criticals

### R08 Strength penalty with two-handed and off-hand weapons
- **Answer:** A Strength **penalty** always applies in full (×1). Only a Strength **bonus** is multiplied (×1½ two-handed, ×½ off hand). The base rule adds your Strength *modifier* to melee damage; the two-handed and off-hand rules change only the Strength *bonus*. The FAQ uses the same split ("adds your Strength modifier" for the primary end, "one-half your Strength bonus" for the off-hand end). Bows: penalty yes, bonus no (composite: bonus up to the bow's rating).
- **Sources:** https://www.d20srd.org/srd/combat/combatStatistics.htm#strengthBonus ; https://www.d20srd.org/srd/equipment/weapons.htm#lightOneHandedandTwoHandedMeleeWeapons (PHB pp. 113–114); FAQ p. 54 (double weapons).
- **Confidence:** RAW (text reading). No 3.5 FAQ states "penalty not multiplied" in so many words; Pathfinder later printed it, but that isn't a 3.5 source.

### R09 Critical multiplier changes and "maximum damage" (generic 3.5 part)
- **Answer (generic):**
  - A crit = roll the damage (dice + all usual modifiers) *multiplier* times and add the results. Extra dice beyond the weapon's normal damage are never multiplied.
  - When **two or more multipliers** apply to the same damage, combine them: each extra ×N adds N − 1 (×2 and ×2 = ×3).
  - A feature that **raises the weapon's multiplier** (×2 → ×3) changes that one multiplier. It isn't a second multiplier, so the combining rule isn't needed.
  - Threat-range expanders (Improved Critical, *keen*) don't stack with each other and don't touch the multiplier.
  - 3.5 core has no generic rule for "maximum damage on a critical". Since a crit is several damage rolls, an effect that maximizes the damage dice would apply to each of those rolls only if its own text says it applies to the attack's damage. That has to come from the feature's text.
- **Sources:** https://www.d20srd.org/srd/combat/actionsInCombat.htm#criticalHits (PHB p. 140); https://www.d20srd.org/srd/combat/combatStatistics.htm#multiplyingDamage ; https://www.d20srd.org/srd/theBasics.htm#multiplying (PHB p. 304); https://www.d20srd.org/srd/feats.htm#improvedCritical
- **Confidence:** RAW for the generic rules.
- **Still open?** Yes, for the Weapon Master features only: their wording is in *Sword and Fist* p. 38 (house-rules #1), which isn't online. The user must supply the text.

## 3. Actions and combat options

### R10 Spring Attack in heavy armor
- **Answer:** Confirmed in the official SRD feat text: "You can't use this feat if you are wearing heavy armor." The feat is still *possessed*, so it still meets the Whirlwind Attack and Weapon Master prerequisites. Only its use is blocked. App: a warning on the Spring Attack line while full plate is worn; no prerequisite failure.
- **Sources:** https://www.d20srd.org/srd/feats.htm#springAttack (PHB p. 100); official SRD Feats PDF (https://github.com/orey/DD-3e/blob/master/en/pdf/08%20Feats.pdf).
- **Confidence:** RAW.

### R11 Bull rush and attacks of opportunity
- **Answer:** It provokes. The bull rush text says that moving into the defender's space provokes an AoO from **each opponent that threatens you, including the defender**. With Improved Bull Rush, the defender doesn't get one, but the others still do. The English action table (PHB Table 8–2, p. 141) also says "Yes". The French DRS and the FR site print "Non" in that table. The text wins over a table (errata primary-source rule), so use "provokes" in both languages.
- **Sources:** https://www.d20srd.org/srd/combat/specialAttacks.htm#bullRush (PHB pp. 154–155); https://www.d20srd.org/srd/combat/actionsInCombat.htm (Table: Actions in Combat); official SRD CombatI/CombatII PDFs; DRS "10 (combat)" (table "Bousculade Non", text "ce qui l'expose à…" attacks of opportunity); PHB errata "Primary Sources".
- **Confidence:** RAW + errata rule.

### R12 Distances in French
- **Answer (French book convention, checked):** the French 3.5 rules give every distance in metres, with 1 square ("case") = 1,50 m: human speed 9 m (6 cases), 6 m (4 cases) in medium/heavy armor; reach 1,50 m; longbow range 30 m (100 ft); composite longbow 33 m; reduced speeds 4,50 m / 6 m / 9 m / 10,50 m… That is 5 ft = 1,50 m (ft × 0.3), not the exact 1.524.
- **Sources:** DRS "10 (combat)" (speeds in metres and squares; reach 1,50 m), DRS "07 (équipement)" (ranges in m), DRS "11 (poids transportable…)" (reduced speed table); https://regles-donjons-dragons.com/page1609.html
- **Confidence:** RAW (French books).
- **Still open?** Not as a rules question. Showing metres in French is a unit-display choice: CLAUDE.md requires a `house-rules.md` entry like #5 (user's decision; this file doesn't add it).
- **Final check (2026-10-12), house rule #11:** **confirmed** by the local official French SRD (`sources/DD-3e/fr/pdfs`, read with pdftotext):
  - DRS 10 (combat), "Déplacement et position": "les cases de 2,50 cm de côté correspondent à des zones carrées de 1,50 mètre de côté".
  - Speeds: humans etc. "9 mètres (6 cases), ou 6 mètres (4 cases)" in medium/heavy armor; gnomes/halflings "6 mètres (4 cases)" / "4,50 mètres (3 cases)".
  - Reach "1,50 mètre (une case)", reach weapons "3 mètres", "pas de placement de 1,50 mètre".
  - DRS 07 (équipement): range increments in metres (longbow 30 m, composite longbow 33 m; improvised thrown "facteur de portée de 3 mètres"); armor table speeds 9 m / 6 m and 6 m / 4,50 m.
  - So 5 ft = 1,50 m and 30 ft = 9 m throughout. The official conversion guide (2003) also refers to Table 8–4 of the *Manuel des Joueurs* for space/reach and uses the same units. Nothing contradicts it.

### R13 Dying: when the stabilization roll starts
- **Answer:** Use the PHB combat chapter: the first d% roll is made **on the dying character's next turn after** dropping to −1…−9, then on each of their turns: 10 % to become stable, otherwise −1 HP. The condition summary ("at the end of each round, starting with the round in which the character dropped") comes from the summary/glossary. Under the errata rule the PHB is the primary source for rules of play, so its chapter text wins. The French DRS says the same: "Lors de chacun de ses tours de jeu … Le premier de ces jets a lieu le round suivant sa chute".
  - Disabled (0 HP) is unchanged: one move or standard action per turn; a standard (or strenuous) action deals 1 damage afterwards → dying.
- **Sources:** https://www.d20srd.org/srd/combat/injuryandDeath.htm#stableCharactersandRecovery (PHB p. 145); https://www.d20srd.org/srd/conditionSummary.htm#dying ; DRS "10 (combat)"; PHB errata "Primary Sources".
- **Confidence:** RAW + errata rule.

### R14 Helpless: AC −4 vs melee or attacker +4?
- **Answer:** It's one effect described twice. Apply it **once**, as the defender's AC −4 against melee (0 against ranged), plus Dexterity treated as 0 (−5 modifier) for AC. The condition summary says the attacker's +4 is "equivalent to attacking a prone target", which shows it's the same modifier. Coup de grace: full-round action, provokes AoO.
- **Sources:** https://www.d20srd.org/srd/combat/combatModifiers.htm#helplessDefenders (PHB p. 153); https://www.d20srd.org/srd/conditionSummary.htm#helpless ; Table: Armor Class Modifiers (PHB p. 151).
- **Confidence:** RAW (same effect worded twice).

### R15 Pinned and grappling AC
- **Answer:** A pinned creature:
  1. treats its **Dexterity as 0 (−5)** for AC (AC table footnote 4, which covers both helpless and pinned; RC p. 35 agrees: "Dexterity is considered to be 0 for the purpose of determining AC");
  2. takes **−4 AC against everyone except the pinner, melee and ranged**: the grapple text says "−4 penalty to your AC against opponents other than the one pinning you". The table's "−4 melee / +0 ranged" is the secondary source and loses to the text;
  3. is **not helpless** (no coup de grace), though rogues may sneak attack it.

  Grappling (not pinned): loses Dex bonus to AC against opponents it isn't grappling. A ranged attack into a grapple picks the target grappler at random (table footnote 3).
- **Sources:** https://www.d20srd.org/srd/combat/specialAttacks.htm#ifYourePinnedbyanOpponent (PHB p. 156); https://www.d20srd.org/srd/combat/combatModifiers.htm (Table: Armor Class Modifiers, footnotes 1, 3, 4; PHB p. 151); https://www.d20srd.org/srd/conditionSummary.htm#pinned ; RC p. 35 as quoted at https://rpg.stackexchange.com/a/56380
- **Confidence:** RAW + errata rule (text over table); RC as support.

### R16 Fighting defensively and Combat Expertise together
- **Answer:** Allowed; the effects stack. The FAQ: "the bonus from Combat Expertise stacks with the bonus from fighting defensively, which can be enhanced if you have 5 or more ranks in Tumble". Example: −4 and −N on attacks for +2 (+3 with 5 Tumble ranks) and +N dodge AC. Neither can be combined with total defense. Tumble 5 ranks does not improve Combat Expertise.
- **Sources:** FAQ p. 36; https://www.d20srd.org/srd/feats.htm#combatExpertise ; https://www.d20srd.org/srd/combat/actionsInCombat.htm#totalDefense ; supporting: https://rpg.stackexchange.com/a/28029
- **Confidence:** FAQ.

### R17 Swift and immediate actions
- **Answer:** They are **not in the PHB v.3.5**, nor in the core combat files of WotC's official SRD. The PHB, the official SRD and the French DRS all list four action types: standard, move, full-round, free. Swift actions come from later books (*Miniatures Handbook*, then *Expanded Psionics Handbook* with immediate actions, *Complete Arcane*, *Spell Compendium*; later collected in the *Rules Compendium*). The FAQ calls immediate actions "defined in several recent rulebooks, including the XPH and CAr" and reprints the definition. d20srd moved them into its core combat page because later official material uses them for core content (*feather fall*, *quicken spell*).
- **For this app:** don't show swift/immediate actions in the core action list. Nothing the character has (Fighter, PHB feats, the 3.0 Weapon Master) uses them. Add them only if a later-book feature with a swift/immediate cost is added.
- **Sources:** official SRD CombatI PDF (https://github.com/orey/DD-3e/blob/master/en/pdf/11%20CombatI.pdf); DRS "10 (combat)" ("Il y a quatre types d'actions"); https://www.d20srd.org/changes.htm ; https://www.d20srd.org/srd/combat/actionsInCombat.htm#swiftActions ; FAQ p. 69.
- **Confidence:** RAW (absent from core) + FAQ (later-book origin).

## 4. Load and weights

### R18 Strength 10 light load in kg (16,5 vs 17,5)
- **Answer:** The French books print **17,5 kg**. Both the official French DRS and regles-donjons-dragons give Str 10: "jusqu'à 17,5 kg / 17,5–33 kg / 33–50 kg". The English value is 33 lb (= 16,5 kg at lb/2). This is the only cell in the French table that isn't lb/2, so it is very likely a French typo. House-rules #5 says "kg as in the French books", so store the printed value: `{ lb: 33, kg: 17.5 }`. Compute the load band from **lb** (the SRD value) so EN and FR never disagree; the kg threshold is display data. No effect on this character (Str 18).
- **Sources:** DRS "11 (poids transportable, déplacements et exploration)", Table : charge transportable; https://regles-donjons-dragons.com/page1609.html ; https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingCapacity
- **Confidence:** RAW (both printed values checked). Using lb for the band is an implementation choice that follows house-rules #5.

### R19 Load band boundaries
- **Answer:** Upper limits are **inclusive**. The official English SRD table reads "33 lb. or less / 34–66 lb. / 67–100 lb.". The French table says "jusqu'à …" with a footnote: a weight exactly on a limit stays in the lighter band, and only weight above the limit (e.g. 50,1 kg at Str 13) is in the heavier band. So `band = light if w ≤ light max; medium if w ≤ medium max; heavy if w ≤ heavy max; else overloaded`. That also settles fractional totals (33.5 lb at Str 10 = medium), which the English integer bands leave unclear.
- **Sources:** official SRD "53 Carrying and Exploration" PDF (https://github.com/orey/DD-3e/blob/master/en/pdf/53%20CarryingandExploration.pdf); DRS 11, footnote 1 of Table : charge transportable.
- **Confidence:** RAW.

### R20 kg per item
- **Answer:** Store the kg value printed in the French book for each item. In every value checked (greatsword 4 kg, short sword, longbow 1,5 kg, arrows (20) 1,5 kg, heavy steel shield 7,5 kg, tower shield 22,5 kg, full plate, vial 50 g, the whole load table except Str 10) the French value is exactly lb / 2. If a French value is missing, use lb / 2 and mark it `(FR?)`.
- **Sources:** DRS "07 (équipement)"; https://regles-donjons-dragons.com/page410.html , page411.html
- **Confidence:** RAW (French books).

### R21 Coin weight in kg
- **Answer:** EN: 50 coins = 1 lb. FR: "Une pièce pèse environ 10 grammes et une centaine de pièces pèse un kilo", so 50 coins = 0,5 kg (= lb / 2). Store per coin `{ lb: 0.02, kg: 0.01 }`.
- **Sources:** https://www.d20srd.org/srd/equipment/wealthAndMoney.htm ; DRS "07 (équipement)", "La monnaie".
- **Confidence:** RAW.

### R22 Potion weight
- **Answer:** A potion is in a vial. Goods table: "Vial, ink or potion — 1 gp — 1/10 lb"; French: "Fiole pour encre ou potion 1 po 50 g". Count each potion as **1/10 lb / 50 g**. The magic-item rule "no weight given = negligible" doesn't apply here, because the container has a listed weight.
- **Sources:** https://www.d20srd.org/srd/equipment/goodsAndServices.htm (Table: Goods and Services; PHB Table 7–8); https://www.d20srd.org/srd/magicItems/potionsAndOils.htm ; DRS "07 (équipement)".
- **Confidence:** RAW for the vial; potion = vial weight is a direct reading (very small Interpretation).

### R23 Partial bundles of arrows
- **Answer:** No book rule for partial bundles. The table only prices and weighs arrows by 20 (3 lb / 1,5 kg). Store arrows by count, at 3/20 lb = 0.15 lb (75 g) each, and **don't round** item weights. The round-down rule is for game values, the tables themselves use fractions (1/10 lb), and weight is a real-world value under the "Multiplying" rule. Compare the exact total with the limits (R19).
- **Sources:** https://www.d20srd.org/srd/equipment/weapons.htm#arrows ; https://www.d20srd.org/srd/theBasics.htm#roundingFractions , #multiplying
- **Confidence:** Interpretation (any rounding changes less than 1 lb).

## 5. Armor and shields

### R24 Nonproficient armor/shield: which checks
- **Answer:** The FAQ settles the wording conflict in favor of the armor/combat chapter. When nonproficient, the item's armor check penalty applies to **attack rolls, Strength checks, Dexterity checks and all Str- and Dex-based skill checks**. This **replaces** the normal ACP, which effectively adds Open Lock, Ride and Use Rope to the penalized skills. It doesn't add to the normal ACP. If the load penalty is worse, the load penalty applies to the normal ACP skills, and the nonproficiency penalty to everything else. Armor and shield nonproficiency penalties stack with each other. The feat pages' "skill checks that involve moving, including Ride" is the older, secondary wording.
- **Sources:** FAQ p. 51 ("Armor" section, Devis example); https://www.d20srd.org/srd/equipment/armor.htm#nonproficientwithArmorWorn (PHB p. 123); https://www.d20srd.org/srd/combat/combatModifiers.htm#weaponArmorAndShieldProficiency ; https://www.d20srd.org/srd/feats.htm#armorProficiencyLight
- **Confidence:** FAQ.

### R25 Masterwork armor/shield with ACP 0
- **Answer:** Masterwork reduces the ACP by 1 but **never makes it positive**: an ACP-0 item stays 0. FAQ example: an adamantine (thus masterwork) shield has ACP "–0 for a buckler or light shield, –1 for a heavy shield". Engine: `acp = min(0, base + 1)`.
- **Sources:** https://www.d20srd.org/srd/equipment/armor.htm#masterworkArmor (PHB p. 126); FAQ p. 52.
- **Confidence:** RAW + FAQ.

### R26 Shield ACP vs load penalty ("use the worse")
- **Answer:** The books say armor and shield ACP both apply, and that between armor and load you use the worse figure without stacking. The FAQ repeats "an armor check penalty for either the armor or the load (whichever is worse)". No text says whether the shield belongs to the "armor" figure. **Recommended:** treat armor ACP + shield ACP as the "armor" figure and compare it with the load ACP: `acpEffective = min(armor.acp + shield.acp, load.acp)`. Shields are armor items in the same chapter and table, and the encumbrance text says the gear carried "including armor" sets the penalty. The other reading (worse of armor and load, then add the shield) only differs with a medium/heavy load and a shield in use, which doesn't happen with this character (light load; no shield in use, see R27).
- **Sources:** https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty ; https://www.d20srd.org/srd/carryingCapacity.htm#weight ; FAQ p. 5 (dwarf/Tumble) and p. 51.
- **Confidence:** Interpretation.
- **Still open?** Yes. No book text decides it; the recommended reading is above. Low priority.
- **Final check (2026-10-12), house rule #13:** no official text decides the shield case. The texts found:
  - French DRS 07, "Malus d'armure aux tests": "Bouclier. Si le personnage utilise également un bouclier, les deux malus d'armure aux tests s'additionnent."
  - DRS 11 (charge): "Dans le cas où l'aventurier porte une armure, on prend seulement en compte le plus élevé des deux résultats (l'armure ou le poids total) ; on n'additionne pas les deux."
  - FAQ v.3.5 p. 5 (dwarf/Tumble): "an armor check penalty for either the armor or the load (whichever is worse)".
  - **Refinement (supports #13):** the FAQ's armor section (question "Does the armor check penalty for nonproficiency with **armor and shields** stack with … the check penalty for encumbrance?") answers "If you have a check penalty from encumbrance that is higher than **your armor check penalty**, use the encumbrance's check penalty…". It treats the worn gear's penalty as one figure set against the load. That fits "(armor + shield) vs load, use the worse" better than the other reading, but it is not an explicit ruling on shields.
  - The FAQ's ACP/encumbrance entries and the 2003 conversion guide add nothing else. The *Rules Compendium* encumbrance text could not be checked verbatim online.
  - **Result: #13 consistent with the texts; not contradicted.**

### R27 Heavy shield and a two-handed weapon
- **Answer:**
  - **Heavy shield:** you strap it to the forearm and grip it, and "you can't use your shield hand for anything else". While it's strapped on, you **can't** wield a greatsword (or a bow) in two hands. The FAQ applies the same logic to the *ring of force shield*: a shield that works like a heavy shield needs that hand, and you can't attack with the hand while the shield is active.
  - **Light shield:** you can carry an item in the shield hand but not use a weapon with it, so again no two-handed weapon.
  - **Buckler:** you can help wield a two-handed weapon (−1 on attacks) and lose its AC bonus for that round. Bows and crossbows have no penalty.
  - Readying or removing a shield is a move action.
  - **Consequences:**
    - A heavy shield that isn't in use (slung on the back, or not gripped) gives **no shield bonus** and **no ACP**: the ACP rule applies to a character "using a shield". It only counts toward weight and load.
    - "In use" and "two-handed weapon wielded" are mutually exclusive; the app should model a shield as either *in use* or *carried*.
    - Baseline check: Climb +3 / Jump +1 with ACP −5 (no shield ACP) is exactly the greatsword-wielding setup: the shield is carried, not in use. No inconsistency.
- **Sources:** https://www.d20srd.org/srd/equipment/armor.htm#shieldHeavyWoodenorSteel , #shieldLightWoodenorSteel , #buckler , #armorCheckPenalty , #tableDonningArmor (PHB pp. 122–126); FAQ p. 59 (ring of force shield), FAQ p. 11 (heavy shield occupies the hand).
- **Confidence:** RAW + FAQ for "can't wield it two-handed while the shield is in use". "Carried shield = no ACP" is a close reading of "using a shield" (minor Interpretation).

## 6. Magic items

### R28 Slot name for amulets ("neck" vs "throat")
- **Answer:** The 3.5 core (DMG p. 214, SRD) says "around the neck" and has no slot names. "Throat" is the slot name in *Magic Item Compendium* (2007) and other later books. Keep the id `neck`; show EN "Neck (throat)" if useful, FR "Autour du cou". Both mean the same slot.
- **Sources:** https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#magicItemsOnTheBody ; DRS "23 (objets magiques)"; *Magic Item Compendium* slot list as reproduced at http://dnd3-5.wikidot.com/magicitemslots
- **Confidence:** RAW.

### R29 Two items in one slot: which one works
- **Answer:** The core text only says that "additional items beyond those listed above have no effect" (DMG p. 214), without naming which item. The French DRS says the **last item added** doesn't work and the other(s) keep working. *Magic Item Compendium* says the same: "only the first-worn item confers its magical abilities". So the **first item donned works** and later items in a full slot don't. App: record a "donned order" per slot, mark the later items "no effect", and link the SRD and DRS.
  - The DRS sentence "la magie de deux objets portés l'un sur l'autre s'annule" has no English SRD equivalent. Treat it as a translation addition, not a rule.
- **Sources:** https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#magicItemsOnTheBody (DMG p. 214); DRS "23 (objets magiques)", "Emplacements des objets magiques sur le corps"; *Magic Item Compendium* (via http://dnd3-5.wikidot.com/magicitemslots).
- **Confidence:** RAW (FR book) + later official book; the English core text is silent on which item.

## 7. Conditions

### R30 Blinded: "most Strength- and Dexterity-based skill checks"
- **Answer:** No 3.5 core book or the FAQ lists which Str/Dex skills the blinded −4 applies to. Search −4 and automatic failure of sight-based checks (Spot, reading) are explicit. **Recommended default:** apply −4 to every Str- and Dex-based skill (Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Open Lock, Ride, Sleight of Hand, Swim, Tumble, Use Rope), shown as one effect line the DM can switch off per skill. "Long-term blindness" relief is DM-only.
- **Sources:** https://www.d20srd.org/srd/conditionSummary.htm#blinded ; https://www.d20srd.org/srd/combat/combatModifiers.htm (Table: Armor Class Modifiers).
- **Confidence:** Interpretation.
- **Still open?** Yes. The books leave "most" to the DM; the recommended default is above.
- **Final check (2026-10-12), house rule #14:** every official D&D 3.5 text found says **"most"** and **none lists the skills**:
  - SRD/PHB condition summary: "takes a −4 penalty on Search checks and on most Strength- and Dexterity-based skill checks".
  - SRD/PHB "Vision and Light" (darkness = effectively blinded), same wording: "−4 penalty on Search checks and most Strength and Dexterity-based skill checks" (`sources/srd-v3.5/basic-rules-and-legal/carrying-movement-and-exploration.html`).
  - Official French DRS 18, "Aveuglé": "malus de –4 sur ses tests de Fouille et de la plupart des compétences associées à la Force et à la Dextérité". Same "la plupart", no list.
  - *D&D FAQ v.3.5* (6/30/2008): no entry on blinded skill penalties. The only blind entry is about golems' senses, where it says the DM "just has to wing it" for odd shapes.
  - Skill descriptions (SRD skills I/II): no Str/Dex skill states whether blindness applies.
  - Conversion guide 2003: nothing.
  - *Rules Compendium* "Blinded": the book couldn't be read online (anyflip 403). Secondary summaries give the same "most Strength- and Dexterity-based skill checks" wording with no list, and no source found shows RC adding one.
  - The only WotC text that applies the penalty to **all** Str/Dex skills is the **d20 Modern** SRD ("a −4 penalty on the use of Strength-based and Dexterity-based skills … also applies to Search checks and any other skill checks for which the GM deems sight to be important", quoted in https://www.enworld.org/threads/rules-clarification-blindness.74297/). That is a different game, not D&D 3.5.
  - **Result:** #14 is **not "common knowledge" from the 3.5 texts**. RAW deliberately says "most" and leaves the exceptions to the DM. #14 (all Str/Dex skills + Search, with a per-skill DM toggle) is a valid, explicit house reading of that DM latitude, and the toggle matches the RAW intent. **Refined, not contradicted.** It must stay labelled as a house rule, not as SRD.

### R31 Exhausted: can't run or charge?
- **Answer:** Yes. The SRD/PHB condition text omits it, but the *Rules Compendium* (p. 35) adds it: "An exhausted creature can neither run nor charge, and it takes a –6 penalty to Strength and Dexterity…". RC is the later official rules restatement, and exhausted is the worse stage of fatigued, which already forbids both. Add `cannotRun` and `cannotCharge` to `exhausted`. Exhausted replaces fatigued; it doesn't add to it (−6, not −8).
- **Sources:** https://www.d20srd.org/srd/conditionSummary.htm#exhausted , #fatigued ; RC p. 35 as quoted at https://rpg.stackexchange.com/a/68336 ; FAQ p. 66 lists exhausted −6 / fatigued −2 separately.
- **Confidence:** RC.

### R32 Other condition notes from `conditions.md`
- Pinned: see R15. Helpless: see R14. Dying timing: see R13.
- Paralyzed (FR page error on the FR site): not a rules question. Use the DRS "18 (pouvoirs et états préjudiciables)" text instead of the FR site page (R06).

---

## Still genuinely open
1. **R02** racial bonuses stacking (PHB p. 171 vs glossary). No effect on this human character.
2. **R09** Weapon Master "increased multiplier" / "ki critical" wording. The generic 3.5 rules are settled; the class text from *Sword and Fist* p. 38 is needed.
3. **R12** showing metres in French. The rule convention is settled; adding the display rule to `house-rules.md` is the user's call.
4. **R26** shield ACP vs load ACP: no text; recommended reading given.
5. **R30** blinded "most" Str/Dex skills: DM judgement; recommended default given.
