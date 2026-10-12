# Abilities (Caractéristiques)

D&D 3.5 SRD only. Summaries in our own words; follow the links for the rule text.
French terms checked on regles-donjons-dragons.com (FR 3.5 SRD) unless marked "(FR?)".

Main sources:
- Abilities and modifiers: https://www.d20srd.org/srd/theBasics.htm#abilityScores
- Ability score loss: https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss
- Conditions: https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged
- FR: https://regles-donjons-dragons.com/page10.html (modificateurs), https://regles-donjons-dragons.com/page2121.html (affaiblissement / diminution)

## 1. The six abilities

| EN | FR | Abbr. EN / FR | Applies to (summary) | URL |
|---|---|---|---|---|
| Strength | Force | Str / For | melee attack, melee & thrown damage, Climb/Jump/Swim, Str checks, carrying capacity | https://www.d20srd.org/srd/theBasics.htm#strengthStr |
| Dexterity | Dextérité | Dex / Dex | ranged attack, AC (if able to react), Reflex save, Dex skills | https://www.d20srd.org/srd/theBasics.htm#dexterityDex |
| Constitution | Constitution | Con / Con | hit points per HD, Fortitude save, Concentration | https://www.d20srd.org/srd/theBasics.htm#constitutionCon |
| Intelligence | Intelligence | Int / Int | skill points per level, starting languages, Int skills | https://www.d20srd.org/srd/theBasics.htm#intelligenceInt |
| Wisdom | Sagesse | Wis / Sag | Will save, Wis skills | https://www.d20srd.org/srd/theBasics.htm#wisdomWis |
| Charisma | Charisme | Cha / Cha | Cha skills, influence checks | https://www.d20srd.org/srd/theBasics.htm#charismaCha |

The key ability of each skill is in `skills.md`.

## 2. Ability modifier (modificateur de caractéristique)

- The SRD gives the modifier as a table (score 1 → −5, 2–3 → −4, …, 10–11 → 0, 12–13 → +1, …, 44–45 → +17, "etc.").
  The table is exactly `mod = floor((score − 10) / 2)` (round down, also for negative numbers).
  — https://www.d20srd.org/srd/theBasics.htm#tableAbilityModifiersandBonusSpells
- The modifier is computed from the **current** score (after race, increases, enhancement/inherent bonuses, damage, drain, penalties). "When an ability score changes, all attributes associated with that score change accordingly." — https://www.d20srd.org/srd/theBasics.htm#charismaCha (last paragraph of the abilities section)
- A score of 0 is not the same as "no score" (nonability); a nonability has modifier +0. — https://www.d20srd.org/srd/specialAbilities.htm#nonabilities

CHECK (formula): `abilityMod(score) = floor((score − 10) / 2)` — https://www.d20srd.org/srd/theBasics.htm#tableAbilityModifiersandBonusSpells
CHECK: ability score ≥ 0 (never negative; a score can't drop below 0) — https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss

## 3. Ability increases from level (augmentation de caractéristiques)

- +1 to one ability score of the player's choice at character levels 4, 8, 12, 16, 20 (column "Ability Score Increases" of the XP table). — https://www.d20srd.org/srd/xp.htm
- Based on **character level** (niveau global), not class level. — https://www.d20srd.org/srd/classes/multiclass.htm#abilityIncreases
- The increase is a permanent change of the base score (it is lost again if the level is lost, see §7).

CHECK: number of level-based increases recorded = floor(characterLevel / 4) — https://www.d20srd.org/srd/xp.htm
CHECK: each increase is recorded at a level that is a multiple of 4, and is exactly +1 to one ability — https://www.d20srd.org/srd/xp.htm , https://www.d20srd.org/srd/classes/multiclass.htm#abilityIncreases

(Baseline: level 4 → Str, level 8 → Con; see `docs/character-baseline.md`.)

## 4. Kinds of changes to a score

| Kind | EN term | FR term | Duration | Changes the score? | Source |
|---|---|---|---|---|---|
| Level increase | ability score increase | augmentation de caractéristique | permanent | yes, base score +1 | https://www.d20srd.org/srd/xp.htm |
| Inherent bonus | inherent bonus | bonus inné | permanent | yes; max +5 per ability; inherent bonuses to the same ability do not stack (best only) | https://www.d20srd.org/srd/spells/wish.htm |
| Enhancement bonus | enhancement bonus | bonus d'altération | while the item/spell lasts | yes; enhancement bonuses to the same ability don't stack (highest only) | https://www.d20srd.org/srd/theBasics.htm#enhancementBonus |
| Ability damage | ability damage | affaiblissement temporaire (de caractéristique) | temporary, heals | yes, lowers the score | https://www.d20srd.org/srd/specialAbilities.htm#abilityDamage |
| Ability drain | ability drain | diminution permanente (de caractéristique) | permanent until magic restores it | yes, lowers the score | https://www.d20srd.org/srd/specialAbilities.htm#abilityDrain |
| Ability penalty (effective reduction from a spell/effect/condition) | "effective ability score reduction" / penalty | réduction de la valeur de caractéristique (FR?) | ends with the effect | effective score lowered while it lasts; the score returns to its former value at the end; it is **not** ability score loss | https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss , https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged |

Details:
- **Ability damage:** temporary loss of points. Heals 1 point per day per damaged ability (2 per day with complete bed rest); lesser restoration / restoration also remove it. A critical hit with a damaging attack doubles the damage.
  — https://www.d20srd.org/srd/specialAbilities.htm#abilityDamage , https://www.d20srd.org/srd/combat/injuryandDeath.htm#healingAbilityDamage
- **Ability drain:** permanent loss of points; only magic (restoration and the like) brings them back.
  — https://www.d20srd.org/srd/specialAbilities.htm#abilityDrain , https://www.d20srd.org/srd/conditionSummary.htm#abilityDrained
- **Penalty vs damage:** "Ability damage is different from penalties to ability scores, which go away when the conditions causing them go away." — https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged
  Example in the SRD: sleeping in medium/heavy armor → fatigued, −2 Str and −2 Dex. — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty (section "Sleeping in Armor")
- **Enhancement bonus:** e.g. Amulet of Health (+2/+4/+6 Con, house-rules #8 uses +2), bear's endurance (+4 Con).
  — https://www.d20srd.org/srd/magicItems/wondrousItems.htm#amuletofHealth , https://www.d20srd.org/srd/spells/bearsEndurance.htm

Stacking (all kinds): same-named bonuses don't stack (highest only); different types stack; "only the best bonus and worst penalty applies" when modifiers don't stack. — https://www.d20srd.org/srd/theBasics.htm#stacking

## 5. Effects on derived values

All of these use the current modifier, so a change of the score updates them at once (https://www.d20srd.org/srd/theBasics.htm#charismaCha):

- **Skills:** key-ability modifier is part of every skill modifier. — https://www.d20srd.org/srd/skills/skillsSummary.htm#abilityModifier
- **Saves:** Fort = Con, Ref = Dex, Will = Wis. — https://www.d20srd.org/srd/combat/combatStatistics.htm#savingThrows
- **Attack/damage/AC:** Str (melee attack and damage), Dex (ranged attack, AC). — https://www.d20srd.org/srd/theBasics.htm#strengthStr , https://www.d20srd.org/srd/theBasics.htm#dexterityDex
- **Prerequisites:** a feat whose prerequisite (e.g. Dex 13) is lost can't be used. — https://www.d20srd.org/srd/feats.htm#prerequisites

### Constitution and hit points (retroactive)
- The Con modifier applies to every Hit Die. If the Con modifier changes, hit points go up or down accordingly (i.e. retroactively, × total Hit Dice). — https://www.d20srd.org/srd/theBasics.htm#constitutionCon
- Con drop (damage or drain): lose 1 hp per Hit Die for each point the Con modifier drops; Con damage/drain can't lower max hp below 1 hp per Hit Die. — https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss
- Con increase, even temporary (e.g. enhancement bonus): the extra hp are **not** temporary hit points; they can be healed and are not lost first; they go away when Con goes back to normal. — https://www.d20srd.org/srd/combat/injuryandDeath.htm#increasesinConstitutionScoreandCurrentHitPoints , https://www.d20srd.org/srd/spells/bearsEndurance.htm
- Per level, the Con modifier can't reduce the hp gained below 1. — https://www.d20srd.org/srd/theBasics.htm#constitutionCon

CHECK (formula): `maxHP = Σ over levels of max(1, hdRoll_or_max + conMod)` with the **current** Con mod (house-rules #9: hdRoll = die maximum) — https://www.d20srd.org/srd/theBasics.htm#constitutionCon
CHECK: after Con damage/drain, maxHP ≥ 1 × total Hit Dice — https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss

### Intelligence and skill points (not retroactive)
- Int modifier sets skill points gained per level (minimum 1 per level). — https://www.d20srd.org/srd/theBasics.htm#intelligenceInt
- An Int increase does **not** give skill points for previous levels. — https://www.d20srd.org/srd/theBasics.htm#charismaCha (last paragraph)
- An **enhancement** bonus to Int does not give skill points at level up (use the unenhanced Int). — https://www.d20srd.org/srd/magicItems/wondrousItems.htm#headbandofIntellect
- An **inherent** bonus to Int does give skill points at later level ups. — https://www.d20srd.org/srd/magicItems/wondrousItems.htm#tomeofClearThought

CHECK: skill points of level N use the Int modifier the character had at level N, excluding enhancement bonuses (inherent bonuses count) — URLs above.

## 6. Score of 0

| Ability at 0 | Effect | Source |
|---|---|---|
| Str 0 | can't move, lies helpless | https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss |
| Dex 0 | can't move, rigid and helpless (paralyzed) | same, and https://www.d20srd.org/srd/conditionSummary.htm#abilityDamaged |
| Con 0 | dead | same |
| Int 0 | unconscious, coma-like, helpless | same |
| Wis 0 | deep nightmare sleep, helpless | same |
| Cha 0 | catatonic, coma-like, helpless | same |

CHECK (severity: error-level warning): any current ability score = 0 → show the condition above; Con 0 → dead — https://www.d20srd.org/srd/specialAbilities.htm#abilityScoreLoss

## 7. Level loss and negative levels (link to abilities)

- Losing a level removes the ability increase gained at that level (if unknown: −1 to the highest score). — https://www.d20srd.org/srd/specialAbilities.htm#levelLoss
- A negative level (niveau négatif) does not change ability scores: −1 on attacks, saves, skill and ability checks, −5 hp, −1 effective level. — https://www.d20srd.org/srd/specialAbilities.htm#energyDrainAndNegativeLevels

## 8. Data model hint (for the app)

`score = base (+ racial, none for humans) + level increases + inherent (best, ≤ +5) + enhancement (best) − drain − damage − penalties (all stack)`, floor at 0; `mod = floor((score − 10)/2)`.
Order of application: Resolved: see rulings-character.md#q7 (order doesn't change the sum; only the floors matter).
