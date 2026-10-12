# Fighter (Guerrier)

D&D 3.5 SRD base class. Summaries in our own words.
- EN: https://www.d20srd.org/srd/classes/fighter.htm (anchors: #tableTheFighter, #bonusFeats)
- FR: https://regles-donjons-dragons.com/page61.html
- Fighter bonus feat list: https://www.d20srd.org/srd/feats.htm#fighterBonusFeats

## Class data

| Item | Value | Source |
|---|---|---|
| Alignment | any | https://www.d20srd.org/srd/classes/fighter.htm |
| Hit Die (dé de vie) | d10 (house-rules #9: always 10) | https://www.d20srd.org/srd/classes/fighter.htm |
| Skill points at 1st level | (2 + Int mod) × 4 (human: +4) | https://www.d20srd.org/srd/classes/fighter.htm |
| Skill points per later level | 2 + Int mod (human: +1); minimum 1 before the human bonus (Resolved: see rulings-character.md#q3) | https://www.d20srd.org/srd/classes/fighter.htm |
| Class skills (compétences de classe) | Climb (Str) Escalade, Craft (Int) Artisanat, Handle Animal (Cha) Dressage, Intimidate (Cha) Intimidation, Jump (Str) Saut, Ride (Dex) Équitation, Swim (Str) Natation | https://www.d20srd.org/srd/classes/fighter.htm , FR page61 |
| Weapon proficiency | all simple and martial weapons (armes courantes, armes de guerre) | https://www.d20srd.org/srd/classes/fighter.htm |
| Armor proficiency | all armor (light, medium, heavy) and shields, including tower shields (pavois) | https://www.d20srd.org/srd/classes/fighter.htm |

House-rules #4: "Connaissances des monstres" (homebrew Knowledge, Int) is also a Fighter class skill.

Note: Weapon Master skills (Intimidate, Listen, Sense Motive, Spot) are in `weapon-master.md`. Listen and Spot are **not** Fighter class skills.

## Table: The Fighter (Table : le guerrier)

| Level | BAB | Fort (Vigueur) | Ref (Réflexes) | Will (Volonté) | Special |
|---|---|---|---|---|---|
| 1 | +1 | +2 | +0 | +0 | Bonus feat |
| 2 | +2 | +3 | +0 | +0 | Bonus feat |
| 3 | +3 | +3 | +1 | +1 | — |
| 4 | +4 | +4 | +1 | +1 | Bonus feat |
| 5 | +5 | +4 | +1 | +1 | — |
| 6 | +6/+1 | +5 | +2 | +2 | Bonus feat |
| 7 | +7/+2 | +5 | +2 | +2 | — |
| 8 | +8/+3 | +6 | +2 | +2 | Bonus feat |
| 9 | +9/+4 | +6 | +3 | +3 | — |
| 10 | +10/+5 | +7 | +3 | +3 | Bonus feat |
| 11 | +11/+6/+1 | +7 | +3 | +3 | — |
| 12 | +12/+7/+2 | +8 | +4 | +4 | Bonus feat |
| 13 | +13/+8/+3 | +8 | +4 | +4 | — |
| 14 | +14/+9/+4 | +9 | +4 | +4 | Bonus feat |
| 15 | +15/+10/+5 | +9 | +5 | +5 | — |
| 16 | +16/+11/+6/+1 | +10 | +5 | +5 | Bonus feat |
| 17 | +17/+12/+7/+2 | +10 | +5 | +5 | — |
| 18 | +18/+13/+8/+3 | +11 | +6 | +6 | Bonus feat |
| 19 | +19/+14/+9/+4 | +11 | +6 | +6 | — |
| 20 | +20/+15/+10/+5 | +12 | +6 | +6 | Bonus feat |

Source: https://www.d20srd.org/srd/classes/fighter.htm#tableTheFighter
Formulas matching the table (good BAB, good Fort, poor Ref/Will, as in https://www.d20srd.org/srd/xp.htm): BAB = level; Fort = 2 + floor(level/2); Ref = Will = floor(level/3).
(The French page's table header swaps the labels "Réflexes" and "Vigueur"; its numbers are the same as the SRD. Use the SRD.)

CHECK: fighter part of BAB = fighter level; Fort = 2 + floor(fl/2); Ref = Will = floor(fl/3) — https://www.d20srd.org/srd/classes/fighter.htm#tableTheFighter
Baseline Fighter 6: BAB +6, Fort +5, Ref +2, Will +2.

## Bonus feats (dons supplémentaires)

- Fighter level 1: one bonus feat (on top of the 1st-level feat and the human feat), then one at every even fighter level: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20. — https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
- Must be chosen from the fighter bonus feat list below; all prerequisites (ability scores, BAB…) must be met. — same
- Regular feats (from character level) are not limited to this list. — same
- Fighter feats can also be taken as regular feats by anyone who meets the prerequisites. — https://www.d20srd.org/srd/feats.htm#fighterBonusFeats

CHECK: fighter bonus feats count = 1 + floor(fighterLevel / 2) — https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
CHECK: each feat in a fighter-bonus slot is on the fighter bonus feat list — https://www.d20srd.org/srd/feats.htm#fighterBonusFeats
CHECK: fighter bonus feat prerequisites met at that level — https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
Baseline Fighter 6: 4 fighter bonus feats (levels 1, 2, 4, 6).

## Fighter bonus feat list (48 feats)

Prerequisites copied as short data from the SRD feat entries (https://www.d20srd.org/srd/feats.htm#<anchor>). FR names from https://regles-donjons-dragons.com/page269.html (FR 3.5 SRD list).

| Feat (EN) | FR | Anchor | Prerequisites |
|---|---|---|---|
| Blind-Fight | Combat en aveugle | #blindFight | — |
| Cleave | Enchaînement | #cleave | Str 13, Power Attack |
| Combat Expertise | Expertise du combat | #combatExpertise | Int 13 |
| Combat Reflexes | Attaques réflexes | #combatReflexes | — |
| Deflect Arrows | Parade de projectiles | #deflectArrows | Dex 13, Improved Unarmed Strike |
| Dodge | Esquive | #dodge | Dex 13 |
| Exotic Weapon Proficiency | Maniement d'une arme exotique | #exoticWeaponProficiency | BAB +1 (+ Str 13 for bastard sword or dwarven waraxe) |
| Far Shot | Tir de loin | #farShot | Point Blank Shot |
| Great Cleave | Succession d'enchaînements | #greatCleave | Str 13, Cleave, Power Attack, BAB +4 |
| Greater Two-Weapon Fighting | Maîtrise du combat à deux armes | #greaterTwoWeaponFighting | Dex 19, Improved Two-Weapon Fighting, Two-Weapon Fighting, BAB +11 |
| Greater Weapon Focus | Arme de prédilection supérieure | #greaterWeaponFocus | proficiency and Weapon Focus with the weapon, **fighter level 8** |
| Greater Weapon Specialization | Spécialisation martiale supérieure | #greaterWeaponSpecialization | proficiency, Greater Weapon Focus, Weapon Focus, Weapon Specialization with the weapon, **fighter level 12** |
| Improved Bull Rush | Science de la bousculade | #improvedBullRush | Str 13, Power Attack |
| Improved Critical | Science du critique | #improvedCritical | proficient with weapon, BAB +8 |
| Improved Disarm | Science du désarmement | #improvedDisarm | Int 13, Combat Expertise |
| Improved Feint | Science de la feinte | #improvedFeint | Int 13, Combat Expertise |
| Improved Grapple | Science de la lutte | #improvedGrapple | Dex 13, Improved Unarmed Strike |
| Improved Initiative | Science de l'initiative | #improvedInitiative | — |
| Improved Overrun | Science du renversement | #improvedOverrun | Str 13, Power Attack |
| Improved Precise Shot | Science du tir de précision | #improvedPreciseShot | Dex 19, Point Blank Shot, Precise Shot, BAB +11 |
| Improved Shield Bash | Science du coup de bouclier | #improvedShieldBash | Shield Proficiency |
| Improved Sunder | Science de la destruction | #improvedSunder | Str 13, Power Attack |
| Improved Trip | Science du croc en jambe | #improvedTrip | Int 13, Combat Expertise |
| Improved Two-Weapon Fighting | Science du combat à deux armes | #improvedTwoWeaponFighting | Dex 17, Two-Weapon Fighting, BAB +6 |
| Improved Unarmed Strike | Science du combat à mains nues | #improvedUnarmedStrike | — |
| Manyshot | Feu nourri | #manyshot | Dex 17, Point Blank Shot, Rapid Shot, BAB +6 |
| Mobility | Souplesse du serpent | #mobility | Dex 13, Dodge |
| Mounted Archery | Tir monté | #mountedArchery | Ride 1 rank, Mounted Combat |
| Mounted Combat | Combat monté | #mountedCombat | Ride 1 rank |
| Point Blank Shot | Tir à bout portant | #pointBlankShot | — |
| Power Attack | Attaque en puissance | #powerAttack | Str 13 |
| Precise Shot | Tir de précision | #preciseShot | Point Blank Shot |
| Quick Draw | Arme en main | #quickDraw | BAB +1 |
| Rapid Reload | Rechargement rapide | #rapidReload | Weapon Proficiency (crossbow type chosen) |
| Rapid Shot | Tir rapide | #rapidShot | Dex 13, Point Blank Shot |
| Ride-By Attack | Attaque au galop | #rideByAttack | Ride 1 rank, Mounted Combat |
| Shot on the Run | Tir en mouvement | #shotOnTheRun | Dex 13, Dodge, Mobility, Point Blank Shot, BAB +4 |
| Snatch Arrows | Interception de projectiles | #snatchArrows | Dex 15, Deflect Arrows, Improved Unarmed Strike |
| Spirited Charge | Charge dévastatrice | #spiritedCharge | Ride 1 rank, Mounted Combat, Ride-By Attack |
| Spring Attack | Attaque éclair | #springAttack | Dex 13, Dodge, Mobility, BAB +4 |
| Stunning Fist | Coup étourdissant | #stunningFist | Dex 13, Wis 13, Improved Unarmed Strike, BAB +8 |
| Trample | Piétinement | #trample | Ride 1 rank, Mounted Combat |
| Two-Weapon Defense | Défense à deux armes | #twoWeaponDefense | Dex 15, Two-Weapon Fighting |
| Two-Weapon Fighting | Combat à deux armes | #twoWeaponFighting | Dex 15 |
| Weapon Finesse | Attaque en finesse | #weaponFinesse | BAB +1 |
| Weapon Focus | Arme de prédilection | #weaponFocus | proficiency with the weapon, BAB +1 |
| Weapon Specialization | Spécialisation martiale | #weaponSpecialization | proficiency and Weapon Focus with the weapon, **fighter level 4** |
| Whirlwind Attack | Attaque en rotation (FR SRD; the baseline says "Attaque en tourbillon") | #whirlwindAttack | Dex 13, Int 13, Combat Expertise, Dodge, Mobility, Spring Attack, BAB +4 |

Full URL pattern: `https://www.d20srd.org/srd/feats.htm` + anchor, e.g. https://www.d20srd.org/srd/feats.htm#whirlwindAttack

Prerequisites that say "fighter level N" use the **Fighter class level** only, not the character level (Weapon Master levels don't count). Resolved: see rulings-character.md#q9

CHECK: "fighter level N" prerequisite → fighterClassLevel ≥ N — https://www.d20srd.org/srd/feats.htm#weaponSpecialization
CHECK: a feat with a prerequisite can be taken at the level the prerequisite is gained — https://www.d20srd.org/srd/feats.htm#prerequisites

## Proficiency checks

CHECK: weapon used is simple or martial (else needs Exotic Weapon Proficiency for that weapon, or a race/class grant) — https://www.d20srd.org/srd/classes/fighter.htm
CHECK: armor and shields: always proficient as a Fighter — https://www.d20srd.org/srd/classes/fighter.htm
(Nonproficiency effects: armor check penalty on attack rolls and on Str/Dex checks — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty)
