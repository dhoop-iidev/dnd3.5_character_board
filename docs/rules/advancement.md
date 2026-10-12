# Advancement (Progression), multiclassing and prestige classes

D&D 3.5 SRD only. Summaries in our own words; follow the links for the rule text.
French terms checked on regles-donjons-dragons.com unless marked "(FR?)".

Main sources:
- XP and level table: https://www.d20srd.org/srd/xp.htm (page has no anchors)
- Multiclass: https://www.d20srd.org/srd/classes/multiclass.htm
- Humans / favored class: https://www.d20srd.org/srd/races.htm#humans , https://www.d20srd.org/srd/races.htm#favoredClass
- Prestige classes: https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm
- Level loss: https://www.d20srd.org/srd/specialAbilities.htm#levelLoss
- FR: "Table : expérience et avantages liés au niveau", multiclassage https://regles-donjons-dragons.com/page19.html , humains https://regles-donjons-dragons.com/page12.html , classes de prestige https://regles-donjons-dragons.com/page119.html , perte de niveau https://regles-donjons-dragons.com/page2157.html

## Terms

| EN | FR | Meaning | Source |
|---|---|---|---|
| Character level | niveau global | sum of all class levels; drives feats, ability increases, max ranks | https://www.d20srd.org/srd/classes/multiclass.htm#level |
| Class level | niveau de classe | levels in one class; drives class table (BAB, saves, features) | https://www.d20srd.org/srd/classes/multiclass.htm#level |
| Experience points (XP) | points d'expérience (PX) | | https://www.d20srd.org/srd/xp.htm |
| Hit Die (HD) | dé de vie (DV) | | https://www.d20srd.org/srd/classes/fighter.htm |
| Favored class | classe de prédilection | | https://www.d20srd.org/srd/races.htm#favoredClass |
| Base class / prestige class | classe de base / classe de prestige | | https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm#definitionsOfTerms |
| Requirements | conditions | entry requirements of a prestige class | https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm |

## 1. Experience and level-dependent benefits (XP table)

From https://www.d20srd.org/srd/xp.htm (character level):

| Level | XP | Class skill max ranks | Cross-class max ranks | Feat | Ability increase |
|---|---|---|---|---|---|
| 1 | 0 | 4 | 2 | 1st | — |
| 2 | 1,000 | 5 | 2½ | — | — |
| 3 | 3,000 | 6 | 3 | 2nd | — |
| 4 | 6,000 | 7 | 3½ | — | 1st |
| 5 | 10,000 | 8 | 4 | — | — |
| 6 | 15,000 | 9 | 4½ | 3rd | — |
| 7 | 21,000 | 10 | 5 | — | — |
| 8 | 28,000 | 11 | 5½ | — | 2nd |
| 9 | 36,000 | 12 | 6 | 4th | — |
| 10 | 45,000 | 13 | 6½ | — | — |
| 11 | 55,000 | 14 | 7 | — | — |
| 12 | 66,000 | 15 | 7½ | 5th | 3rd |
| 13 | 78,000 | 16 | 8 | — | — |
| 14 | 91,000 | 17 | 8½ | — | — |
| 15 | 105,000 | 18 | 9 | 6th | — |
| 16 | 120,000 | 19 | 9½ | — | 4th |
| 17 | 136,000 | 20 | 10 | — | — |
| 18 | 153,000 | 21 | 10½ | 7th | — |
| 19 | 171,000 | 22 | 11 | — | — |
| 20 | 190,000 | 23 | 11½ | — | 5th |

XP needed for level n (n ≥ 1) follows `1000 × n × (n − 1) / 2` (matches every row above; the SRD gives only the table).

The same table also lists generic BAB/save progressions (good save: +2 at level 1, +3 at 2–3, +4 at 4–5…; poor save: +0 at 1–2, +1 at 3–5…; good/average/poor BAB) and "Total Equipment Value" (not a rule we need).

CHECK: XP total ≥ XP threshold of the current character level (otherwise warning "level higher than XP allows") — https://www.d20srd.org/srd/xp.htm
CHECK (info): XP total ≥ threshold of level + 1 → "level up available" — https://www.d20srd.org/srd/xp.htm

## 2. Feats (dons)

- 1 feat at character level 1, then 1 at every level divisible by 3 (3, 6, 9, 12, 15, 18). — https://www.d20srd.org/srd/xp.htm
- Based on character level, not class level. — https://www.d20srd.org/srd/classes/multiclass.htm#feats
- Human: 1 extra feat at 1st level. — https://www.d20srd.org/srd/races.htm#humans
- Fighter bonus feats: class levels 1, 2, 4, 6, 8…, from the fighter list (see `fighter.md`). — https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
- House-rules #3: +1 deity feat (Weapon Focus (greatsword)).
- Prerequisites must be met when the feat is chosen; a feat can be taken at the same level the prerequisite is gained; a feat whose prerequisite is lost can't be used. — https://www.d20srd.org/srd/feats.htm#prerequisites

CHECK: general feats chosen = 1 + floor(characterLevel / 3) — https://www.d20srd.org/srd/xp.htm
CHECK: human bonus feat chosen at level 1 = 1 — https://www.d20srd.org/srd/races.htm#humans
CHECK: total feats = general + human (1) + fighter bonus (see fighter.md) + house-rules #3 (1). Baseline at level 8: 3 + 1 + 4 + 1 = 9; at level 9: 4 + 1 + 4 + 1 = 10.
CHECK: every feat's prerequisites were met at the level it was taken, and are still met now (else "can't use") — https://www.d20srd.org/srd/feats.htm#prerequisites

## 3. Ability increases

+1 to one ability at character levels 4, 8, 12, 16, 20 (details in `abilities.md` §3). — https://www.d20srd.org/srd/xp.htm , https://www.d20srd.org/srd/classes/multiclass.htm#abilityIncreases

## 4. Human (humain) racial traits relevant to advancement

From https://www.d20srd.org/srd/races.htm#humans:
- No ability adjustments; Medium; base land speed 30 ft (9 m, FR page12).
- 1 extra feat at 1st level.
- 4 extra skill points at 1st level and 1 extra skill point at each later level.
- Favored class: any. For the multiclass XP penalty, the human's **highest-level class** does not count.

CHECK: human skill points: +4 at level 1, +1 at each later level — https://www.d20srd.org/srd/races.htm#humans

## 5. Hit points per level (points de vie)

- Each class has a Hit Die (Fighter d10; Weapon Master d10, see `weapon-master.md`). — https://www.d20srd.org/srd/classes/fighter.htm
- Each level: roll the Hit Die of the class taken + Con modifier, minimum 1 hp for that level. — https://www.d20srd.org/srd/theBasics.htm#constitutionCon
- Multiclass: hp from each class are added to the previous total. — https://www.d20srd.org/srd/classes/multiclass.htm#multiclassHitPoints
- **House-rules #9 (confirmed):** never rolled, every level gives the die maximum (10 for Fighter and Weapon Master) + Con mod.
- Con modifier changes are applied to all levels retroactively (see `abilities.md` §5).
- At 0 hp disabled, −1 to −9 dying, −10 dead. — https://www.d20srd.org/srd/combat/combatStatistics.htm#hitPoints

CHECK (formula, house rule #9): `maxHP = Σ_levels max(1, HDmax(class of that level) + currentConMod)` — https://www.d20srd.org/srd/theBasics.htm#constitutionCon , house-rules #9
Example: level 9, Con 18 (+4): 9 × 14 = 126.

## 6. Multiclassing (multiclassage)

From https://www.d20srd.org/srd/classes/multiclass.htm:
- General rule: abilities of a multiclass character are the sum of each class's. — #classAndLevelFeatures
- **BAB:** add the BAB of each class (its own table at its own class level). +6 or more total gives extra attacks (+6/+1, then +11, +16). — #baseAttackBonus , https://www.d20srd.org/srd/combat/combatStatistics.htm#baseAttackBonus
- **Base saves:** add the base save bonuses of each class together. — #multiclassSavingThrows , https://www.d20srd.org/srd/combat/combatStatistics.htm#baseSaveBonus
  Note: under this SRD rule each class's level-1 "good save" +2 is added again (e.g. Fighter 6 Fort +5 + Weapon Master 3 Fort +1 = +6; Ref +2 + +3 = +5; Will +2 + +1 = +3). "Fractional base bonuses" is only an optional variant, **not** used unless a house rule says so: https://www.d20srd.org/srd/variant/classes/gestaltCharacters.htm#houseRuleFractionalBaseBonuses
- **Skills:** a skill that is a class skill for any of the character's classes has max ranks = character level + 3; otherwise half that. — #multiclassSkills (details in `skills.md`)
- **Feats and ability increases:** by character level. — #feats , #abilityIncreases
- **Class features:** all features and all restrictions of all classes. — "Class Features" section of the page.

CHECK (formula): `BAB = Σ_classes classTable[class].bab[classLevel]` — https://www.d20srd.org/srd/classes/multiclass.htm#baseAttackBonus
CHECK (formula): `baseSave[s] = Σ_classes classTable[class].save[s][classLevel]` — https://www.d20srd.org/srd/classes/multiclass.htm#multiclassSavingThrows
CHECK (formula): iterative attacks: BAB, BAB−5, BAB−10, BAB−15 while > 0 (+6 → 2 attacks, +11 → 3, +16 → 4) — https://www.d20srd.org/srd/combat/combatStatistics.htm#baseAttackBonus

### XP penalty for multiclassing
- The SRD **mentions** "experience point penalties for multiclassing" (favored class, human/half-elf highest class, prestige classes exempt) but does **not** contain the penalty rule itself (amount and trigger). — https://www.d20srd.org/srd/races.htm#favoredClass , https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm
- For this character (human, one base class Fighter + prestige class Weapon Master): the highest-level class doesn't count for a human, and prestige classes never cause the penalty → **no penalty can apply** under any reading.

CHECK: prestige class levels never trigger an XP penalty — https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm
CHECK: for a human, ignore the highest-level class when looking for an XP penalty — https://www.d20srd.org/srd/races.htm#humans
Resolved (PHB p. 60 rule): see rulings-character.md#q1

## 7. Prestige classes (classes de prestige)

From https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm:
- The character must meet **all** requirements **before** taking the first level of the prestige class (the class is chosen as the first step of advancing a level; if the requirements are not met at that moment, the class can't be taken).
- No multiclass XP penalty for prestige classes.
- Character level = sum of all class levels; class level = levels in one class.
- Multiclass rules (BAB, saves, hp, skills) apply as for any class.

Weapon Master requirements: see `weapon-master.md` (BAB +5, Intimidate 4 ranks, feats, Dex 13…).

CHECK: at the level where the first prestige class level is taken, all requirements are met using the state **after the previous level** (not counting what the new level gives) — https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm
CHECK (info): requirement lost later → no more levels in the class and its class features are lost while it lasts (HD, BAB, saves kept). Resolved: see rulings-character.md#q6

## 8. What changes on level up (passage de niveau)

For each new level the record should hold: class taken, hp (house rule: max), skill points spent, feat(s), ability increase. Derived changes:

| Item | Change | Source |
|---|---|---|
| Character level | +1 | https://www.d20srd.org/srd/classes/multiclass.htm#level |
| Class level | +1 in the chosen class (prestige: requirements first) | https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm |
| Hit points | + HD of that class (max, house-rules #9) + Con mod (min 1) | https://www.d20srd.org/srd/theBasics.htm#constitutionCon |
| BAB, base saves | recomputed from class tables (sum) | https://www.d20srd.org/srd/classes/multiclass.htm |
| Skill points | class skill points + Int mod (min 1) + 1 (human); ×4 at character level 1 | class pages, https://www.d20srd.org/srd/races.htm#humans , `skills.md` |
| Max ranks | +1 (class) / +½ (cross-class) | https://www.d20srd.org/srd/xp.htm |
| Feat | at character level 3, 6, 9… | https://www.d20srd.org/srd/xp.htm |
| Fighter bonus feat | at fighter level 1, 2, 4, 6, 8… | https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats |
| Ability increase | at character level 4, 8, 12… | https://www.d20srd.org/srd/xp.htm |
| Class features | per class table | class pages |

Skill points can't be saved for later. — https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers

CHECK: each level record has exactly one class — https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm ("the first step of advancement is always choosing a class")
CHECK: skill points spent at level N = skill points available at level N (no carry-over) — https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers

## 9. What changes on level down (level loss / app "remove level")

SRD level loss (energy drain failure etc.) — https://www.d20srd.org/srd/specialAbilities.htm#levelLoss :
- Lose one Hit Die (and its hp).
- BAB, base saves and class abilities drop to the new, lower level.
- Lose the ability increase, skill ranks and feat associated with that level. If unknown: −1 to the highest ability score, ranks from the highest-ranked skills.
- XP total set to the midpoint of the previous level (SRD wording; FR: "à mi-chemin entre son nouveau niveau et le suivant").

For the app (level-by-level record), removing the last level removes exactly that level's record; then re-run all checks. Typical warnings after a level down:
- feats whose prerequisites are no longer met (e.g. BAB) → "can't use" — https://www.d20srd.org/srd/feats.htm#prerequisites
- prestige-class requirements no longer met (Resolved: see rulings-character.md#q6)
- ranks now above max for the new character level (cannot happen if the level's ranks are removed, but can after manual edits) — https://www.d20srd.org/srd/skills/skillsSummary.htm
- XP above the next threshold (level up available)

Negative levels are different (temporary −1 effective level, −5 hp, −1 attacks/saves/checks) — https://www.d20srd.org/srd/specialAbilities.htm#energyDrainAndNegativeLevels
CHECK: negative levels ≥ character level → dead — https://www.d20srd.org/srd/specialAbilities.htm#energyDrainAndNegativeLevels
