# Bonus types and stacking (D&D 3.5)

Rule base: 3.5 SRD only. Summaries in our own words, numbers kept exact. Every rule has its source URL.
French terms: verified on regles-donjons-dragons.com (page given) or marked `(FR?)` when not found there.
Open points are listed at the end, each with a pointer to its ruling in `rulings-combat-equipment.md`.

## Sources
- Stacking + modifier-type glossary: https://www.d20srd.org/srd/theBasics.htm#stacking and https://www.d20srd.org/srd/theBasics.htm#modifierTypes
- Bonus types for spells: https://www.d20srd.org/srd/magicOverview/castingSpells.htm#bonusTypes
- Combining magical effects: https://www.d20srd.org/srd/magicOverview/castingSpells.htm#combiningMagicalEffects
- AC components: https://www.d20srd.org/srd/combat/combatStatistics.htm#armorClass
- FR: "Types de bonus" https://regles-donjons-dragons.com/page428.html ; "Combinaison d'effets magiques" https://regles-donjons-dragons.com/page429.html ; "Classe d'armure" https://regles-donjons-dragons.com/page1533.html

Note: the d20srd.org "Modifier Types" glossary (theBasics.htm#modifierTypes) is d20srd's presentation; d20srd states it only adds official WotC errata/updates (https://www.d20srd.org/changes.htm). See open question Q3.

## General stacking rules

- RULE: Modifier = bonus (positive) or penalty (negative). FR: bonus / malus (page10). — https://www.d20srd.org/srd/theBasics.htm#modifiers
- RULE: Modifiers stack if they come from **different sources** AND have **different types** (or no type). — https://www.d20srd.org/srd/theBasics.htm#stacking
- RULE: Modifiers of the **same type** do not stack: only the best bonus applies. — same URL; also castingSpells.htm#stackingEffects
- RULE: Modifiers from the **same source** do not stack (e.g. the same spell cast twice), even if untyped. — https://www.d20srd.org/srd/theBasics.htm#stacking
- RULE: Same spell at different strengths on the same target: only the strongest applies. — https://www.d20srd.org/srd/magicOverview/castingSpells.htm#sameEffectMorethanOnceinDifferentStrengths
- RULE: An unnamed (untyped) bonus stacks with any bonus (still subject to the same-source rule). — https://www.d20srd.org/srd/magicOverview/castingSpells.htm#differentBonusNames
- RULE: Exceptions that stack with themselves: **dodge** bonuses; **circumstance** bonuses (unless from essentially the same source). castingSpells.htm also lists **racial** bonuses as stacking (see Q2). — theBasics.htm#stacking, theBasics.htm#circumstanceModifier, castingSpells.htm#bonusTypes
- RULE (penalties): when modifiers don't stack, the **worst penalty** applies; two penalties of the same type → only the worst one. — theBasics.htm#stacking ; castingSpells.htm#bonusTypes. See Q1 (conflicts with CLAUDE.md wording "penalties stack").
- RULE: Bonuses of different types from the same kind of item/target stack (e.g. armor bonus + natural armor + deflection + dodge + shield all add to AC). — theBasics.htm#armorBonus etc.
- RULE (multipliers): several multipliers on one abstract value combine as a single multiple: each extra multiple adds (its value − 1). ×2 and ×2 → ×3. Real-world values (weight, distance) multiply normally. — https://www.d20srd.org/srd/theBasics.htm#multiplying
- RULE (rounding): round fractions down; damage and hit points have a minimum of 1. — https://www.d20srd.org/srd/theBasics.htm#roundingFractions

Data-model checks (derived directly from the rules above):
- CHECK: for each target (e.g. `ac`, `attack.melee`, `save.will`, `ability.str`), group contributions by `bonusType`; for types other than `dodge`, `circumstance` and `untyped`, keep only the highest bonus and (see Q1) the lowest penalty.
- CHECK: two contributions with the same `source` id never both count (same-source rule), whatever their type.
- CHECK: `enhancement` must be scoped to what it enhances (a specific weapon, the armor, the shield, natural armor, a given ability score). Enhancement bonuses only conflict within the same scope: armor enhancement + shield enhancement + weapon enhancement + Str enhancement all coexist. — theBasics.htm#enhancementBonus ; https://www.d20srd.org/srd/magicItems/magicArmor.htm
- CHECK: masterwork weapon = +1 enhancement bonus on attack rolls only; does not stack with the magic weapon enhancement bonus on attacks. — https://www.d20srd.org/srd/equipment/weapons.htm#masterworkWeapons ; https://www.d20srd.org/srd/magicItems/magicWeapons.htm
- CHECK: ability-score bonuses change the modifier, which then feeds every dependent value (attack, damage, AC, saves, skills, HP). — https://www.d20srd.org/srd/theBasics.htm#abilityModifiers

## Bonus types

| Type (EN) | FR | Typically applies to | Stacks with itself? | Touch AC? | Flat-footed AC? | Source |
|---|---|---|---|---|---|---|
| Ability modifier | modificateur de caractéristique (page10) | anything tied to the ability | n/a (one per ability) | Dex: yes | Dex bonus: lost | theBasics.htm#abilityModifier |
| Alchemical | bonus alchimique (FR?) | from alchemical substances (e.g. antitoxin) on the relevant roll | no (same-type rule) | — | — | theBasics.htm#alchemicalBonus |
| Alignment | (FR?) | **not defined in the 3.5 SRD** (see Q4) | — | — | — | — |
| Armor | bonus d'armure (page1533, page569) | AC (armor or armor-like effects, e.g. mage armor +4) | no | **no** (except force armor vs incorporeal touch) | yes | theBasics.htm#armorBonus ; spells/mageArmor.htm |
| Circumstance | bonus de circonstances (page428) | conditional factors (attack, checks…) | **yes**, unless essentially the same source | — | — | theBasics.htm#circumstanceModifier |
| Competence | bonus d'aptitude (page573) | attack rolls, saves, skill checks, caster level checks (rolls tied to level/ranks); **not** ability checks, damage, initiative | no | — | — | theBasics.htm#competenceModifier ; spells/guidance.htm (+1) |
| Deflection | bonus de parade (page1533, page607) | AC (ring of protection +1..+5, shield of faith, protection from evil +2) | no | **yes** | yes | theBasics.htm#deflectionBonus ; magicItems/rings.htm#protection |
| Dodge | bonus d'esquive (page1533) | AC (sometimes Reflex): Dodge feat +1, Mobility +4 vs AoO from moving, fighting defensively, total defense, Combat Expertise, haste +1; never from spells or magic items per the glossary (haste is the SRD's own counter-example) | **yes** | **yes** | **no** (lost with Dex bonus) | theBasics.htm#dodgeBonus ; combatStatistics.htm#dodgeBonuses |
| Enhancement | bonus d'altération (page1533, page805) | weapon (attack + damage), armor/shield bonus, natural armor, ability scores (bull's strength +4 Str, gauntlets of ogre power +2 Str, amulet of health), speed (haste) | no, **per enhanced thing** | armor/shield/natural-armor enhancement: **no** | yes | theBasics.htm#enhancementBonus |
| Inherent | bonus inné (page1091) | ability scores (wish, manuals); max +5 per ability | no | — | — | spells/wish.htm ; wondrousItems.htm#manualofGainfulExercise |
| Insight | bonus d'intuition (page697) | varied (true strike +20 on one attack) | no | — | — | theBasics.htm#insightBonus ; spells/trueStrike.htm |
| Luck | bonus de chance (page1419, page991) | attack, damage, saves, checks (prayer +1, luckstone +1) | no | — | — | theBasics.htm#luckModifier ; spells/prayer.htm |
| Morale | bonus de moral (page543, page589) | attack, saves, checks (bless +1, aid +1, heroism +2); no effect on creatures with no Int | no | — | — | theBasics.htm#moraleModifier ; spells/bless.htm |
| Natural armor | bonus d'armure naturelle (page1533, page968) | AC (creature hide); amulet of natural armor and barkskin give an **enhancement** bonus to it | no | **no** | yes | theBasics.htm#naturalArmorBonus ; spells/barkskin.htm ; wondrousItems.htm#amuletofNaturalArmor |
| Profane | bonus de malfaisance (page992) | evil-power effects (desecrate +1 to undead) | no | — | — | theBasics.htm#profaneModifier ; spells/desecrate.htm |
| Racial | bonus racial / raciaux (page428) | racial traits | castingSpells says they stack, theBasics doesn't (Q2) | — | — | theBasics.htm#racialBonus ; castingSpells.htm#bonusTypes |
| Resistance | bonus de résistance (page1047, page1311) | saving throws (cloak of resistance +1..+5, resistance +1, protection from evil +2) | no | — | — | theBasics.htm#resistanceBonus ; wondrousItems.htm#cloakofResistance |
| Sacred | bonus de sainteté (page1064) | good-power effects (consecrate +3 on turning) | no | — | — | theBasics.htm#sacredModifier ; spells/consecrate.htm |
| Shield | bonus de bouclier (page1533, page605) | AC (shields, shield spell +4); magic shields add an enhancement bonus to it | no | **no** | yes | theBasics.htm#shieldBonus |
| Size | modificateur / bonus / malus de taille (page1531, page541) | attack and AC (table −8..+8), grapple (special table), Hide; size bonus/penalty to abilities (enlarge person +2 Str/−2 Dex) | no | **yes** | yes | theBasics.htm#sizeModifier ; combatStatistics.htm#automaticMissesAndHits (size table) |
| Untyped | bonus non nommé (page429, "bonus qui ne sont pas nommés") | anything (haste +1 attack, flanking +2, charge +2, Weapon Focus +1) | **yes**, except same source | — | — | castingSpells.htm#differentBonusNames |

Note on haste: "+1 bonus on attack rolls" (untyped) and "+1 dodge bonus to AC and Reflex saves". — https://www.d20srd.org/srd/spells/haste.htm (FR: rapidité).

## AC-specific checks
- FORMULA: AC = 10 + armor bonus (incl. its enhancement) + shield bonus (incl. its enhancement) + Dex modifier (capped by max Dex) + size modifier + natural armor (incl. its enhancement) + deflection + Σ dodge + other applicable modifiers — https://www.d20srd.org/srd/combat/combatStatistics.htm#armorClass
- CHECK: touch AC excludes armor, shield and natural armor bonuses **and their enhancement bonuses**; keeps Dex, size, deflection, dodge and others. — combatStatistics.htm#touchAttacks ; theBasics.htm#enhancementBonus
- CHECK: flat-footed AC (or any "loses Dex bonus to AC" situation) removes a positive Dex modifier **and all dodge bonuses**; a Dex penalty still applies. — combatStatistics.htm#dodgeBonuses ; https://www.d20srd.org/srd/combat/initiative.htm#flatFooted
- CHECK: armor capping Dex to +0 is **not** "losing the Dex bonus": dodge bonuses still apply. — https://www.d20srd.org/srd/equipment/armor.htm#maximumDexBonus

## Open questions
- Q1 Penalties — Resolved: see rulings-combat-equipment.md#r01-penalty-stacking
- Q2 Racial bonuses — Still open (RAW conflict, no effect on a human): see rulings-combat-equipment.md#r02-racial-bonuses-stacking
- Q3 Glossary origin — Resolved: see rulings-combat-equipment.md#r03-where-the-modifier-type-glossary-comes-from
- Q4 Alignment / other types — Resolved: see rulings-combat-equipment.md#r04-alignment-bonus
- Q5 Circumstance "same source" — Resolved: see rulings-combat-equipment.md#r05-circumstance-bonuses-essentially-the-same-source
- Q6 French site reliability — Resolved: see rulings-combat-equipment.md#r06-reliability-of-regles-donjons-dragonscom
- Q7 Dodge from spells — Resolved: see rulings-combat-equipment.md#r07-dodge-bonuses-from-spells-haste
