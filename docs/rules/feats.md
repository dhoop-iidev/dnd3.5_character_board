# Feats / Dons (D&D 3.5)

Rule base: 3.5 SRD as published on d20srd.org (which includes official WotC errata, see https://www.d20srd.org/changes.htm#rules-updates).
French names checked on https://regles-donjons-dragons.com/ (French 3.5 SRD, Spellbook/Asmodée translation), page links given per feat.
Summaries are in our own words; no rules text is copied. Every `CHECK:` line is meant to become a validation warning.

Prerequisite data format (used below):

```ts
// all fields optional; every listed field must be met
{
  ability?: { str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number }, // minimum scores
  feats?: (string | { id: string; param: "$weapon" })[],  // "$weapon" = same weapon as this feat's parameter
  bab?: number,                 // minimum base attack bonus (sum over all classes)
  fighterLevel?: number,        // minimum class level in Fighter ONLY (see "Fighter level" below)
  proficient?: "$weapon",       // must be proficient with the chosen weapon
}
```

Parameterized feats (`param: "weapon"`) are stored once per chosen weapon, e.g. `{ id: "weaponFocus", param: "greatsword" }`.

---

## 1. General feat rules

### 1.1 Acquisition (how many feats)
- Feats come from **character level**, not class level: 1 at 1st level, then 1 at every level divisible by 3 (3, 6, 9, 12, 15, 18).
  Source: https://www.d20srd.org/srd/xp.htm (table "Feats" column) and https://www.d20srd.org/srd/classes/multiclass.htm#feats
- **Human:** +1 feat at 1st level. https://www.d20srd.org/srd/races.htm#humans
- **Fighter bonus feats:** at Fighter class levels 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20. Must be chosen from the fighter bonus feat list; prerequisites (ability scores, BAB…) still apply. They are in addition to the normal feats, and the normal feats may also be fighter feats.
  https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
- **Weapon Master** grants no bonus feats (see `weapon-master.md` class table).
- **House rule #3:** +1 feat from the deity (Weapon Focus (greatsword)). `docs/house-rules.md`.

Expected total for this character (Fighter 6 / Weapon Master 3, character level 9):

| Source | Levels | Count |
|---|---|---|
| Character level | 1, 3, 6, 9 | 4 |
| Human | 1 | 1 |
| Fighter bonus | Fighter 1, 2, 4, 6 | 4 |
| Deity (house-rules #3) | — | 1 |
| **Total** | | **10** (9 chosen at level 8, 1 general feat open at level 9) |

- CHECK: number of feats chosen = 1 + floor(characterLevel / 3) + (human ? 1 : 0) + count(fighter levels in {1,2,4,6,8,…,20}) + houseRuleBonus — https://www.d20srd.org/srd/xp.htm , https://www.d20srd.org/srd/classes/fighter.htm#bonusFeats
- CHECK: every feat placed in a fighter bonus slot has `fighterBonus: true` — https://www.d20srd.org/srd/feats.htm#fighterBonusFeats

### 1.2 Prerequisites
- To **select or use** a feat, the character needs the listed ability score, class feature, feat, skill ranks, BAB, or other quality. https://www.d20srd.org/srd/feats.htm#prerequisites
- A prerequisite gained at a level can be used for a feat chosen **at that same level** (e.g. BAB +4 reached at level 4 allows Spring Attack at level 4). Same URL.
- Prerequisites must be met **at the level where the feat is taken**, so the app must check each feat against the character's state at that level (level-by-level record), not only at the current level.
- CHECK (per level): for each feat taken at level N, its prerequisites are met using the state at level N (ability scores incl. level-4/8 increases already taken by N, BAB at N, feats taken at levels ≤ N, Fighter class level at N) — https://www.d20srd.org/srd/feats.htm#prerequisites

### 1.3 Losing a prerequisite later (ability damage/drain, etc.)
- SRD: a character **can't use a feat** if he has lost a prerequisite. The feat is not removed; it becomes unusable while the prerequisite is missing. https://www.d20srd.org/srd/feats.htm#prerequisites
- Ability damage (temporary, heals 1/day) and ability drain (permanent until *restoration*) lower the ability score. https://www.d20srd.org/srd/specialAbilities.htm#abilityDamage , https://www.d20srd.org/srd/specialAbilities.htm#abilityDrain
- Feats depending on a lost feat are also unusable (chain effect), since that feat is itself a prerequisite.
- Fragile points for this character: **Int 13 exactly** → 1 point of Int damage/drain disables Combat Expertise **and** Whirlwind Attack. Dex 16 and Str 18 have margin (3 and 5 points).
- CHECK (live, with effects): for each feat, re-evaluate prerequisites against the current *effective* stats; if one fails, mark the feat "inactive (prerequisite lost)" and remove its contributions from computed values — https://www.d20srd.org/srd/feats.htm#prerequisites

### 1.4 Fighter bonus feat list (SRD)
Blind-Fight, Combat Expertise, Improved Disarm, Improved Feint, Improved Trip, Whirlwind Attack, Combat Reflexes, Dodge, Mobility, Spring Attack, Exotic Weapon Proficiency, Improved Critical, Improved Initiative, Improved Shield Bash, Improved Unarmed Strike, Deflect Arrows, Improved Grapple, Snatch Arrows, Stunning Fist, Mounted Combat, Mounted Archery, Ride-By Attack, Spirited Charge, Trample, Point Blank Shot, Far Shot, Precise Shot, Rapid Shot, Manyshot, Shot On The Run, Improved Precise Shot, Power Attack, Cleave, Great Cleave, Improved Bull Rush, Improved Overrun, Improved Sunder, Quick Draw, Rapid Reload, Two-Weapon Fighting, Two-Weapon Defense, Improved Two-Weapon Fighting, Greater Two-Weapon Fighting, Weapon Finesse, Weapon Focus, Weapon Specialization, Greater Weapon Focus, Greater Weapon Specialization.
https://www.d20srd.org/srd/feats.htm#fighterBonusFeats

Not on the list (general feat slots only): e.g. Toughness, Iron Will, Great Fortitude, Lightning Reflexes, Alertness, Endurance, Diehard.

### 1.5 "Fighter level" requirement
- SRD defines **class level** = level in one particular class; **character level** = sum of all classes. https://www.d20srd.org/srd/classes/multiclass.htm#level , https://www.d20srd.org/srd/prestigeClasses/prestigeClasses.htm#classLevel
- "Fighter level 4th/8th/12th" therefore means **Fighter class levels only**; Weapon Master levels do not count (a prestige class would have to say so explicitly; the Weapon Master doesn't). Resolved: see rulings-character.md#q9
- This character has **Fighter level 6**: Weapon Specialization OK (4); Greater Weapon Focus (8) and Greater Weapon Specialization (12) **not available** while he stays Fighter 6.

### 1.6 Taking a feat more than once
- Default: having a feat twice = having it once; benefits don't stack unless the feat says so. https://www.d20srd.org/srd/feats.htm#benefit
- Repeatable, **new weapon each time, no stacking**: Weapon Focus, Weapon Specialization, Greater Weapon Focus, Greater Weapon Specialization, Improved Critical, Exotic Weapon Proficiency, Martial Weapon Proficiency.
- Repeatable **and stacks**: Toughness (+3 HP each time).
- CHECK: a non-repeatable feat appears at most once; a weapon-parameterized feat appears at most once per weapon — https://www.d20srd.org/srd/feats.htm#benefit

---

## 2. The character's feats

All are `[General]` in the SRD and on the fighter bonus list unless noted.

### Weapon Focus — Arme de prédilection
- FR: https://regles-donjons-dragons.com/page272.html
- Type: general, fighterBonus: true, param: weapon, repeatable (new weapon, no stacking)
- Prereq: `{ proficient: "$weapon", bab: 1 }`
- Effect: `{ target: "attack", weapon: "$weapon", bonusType: "untyped", value: +1 }` (SRD gives no bonus type → untyped)
- Source: https://www.d20srd.org/srd/feats.htm#weaponFocus
- CHECK: Weapon Focus (greatsword) requires proficiency with greatsword (Fighter: all martial weapons) and BAB +1 — https://www.d20srd.org/srd/feats.htm#weaponFocus
- Note: taken as the deity bonus feat (house-rules #3).

### Combat Reflexes — Attaques réflexes
- FR: https://regles-donjons-dragons.com/page281.html
- Type: general, fighterBonus: true
- Prereq: `{}` (none)
- Effect:
  - `{ target: "aooPerRound", value: "1 + dexMod" }` (base 1 + Dex modifier; Dex 16 → 4 per round). Still max 1 AoO per single opportunity.
  - `{ flag: "canMakeAoOWhileFlatFooted" }`
- Sources: https://www.d20srd.org/srd/feats.htm#combatReflexes , https://www.d20srd.org/srd/combat/attacksOfOpportunity.htm#combatReflexes
- CHECK: none (no prerequisite).

### Dodge — Esquive
- FR: https://regles-donjons-dragons.com/page301.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { dex: 13 } }`
- Effect: `{ target: "ac", bonusType: "dodge", value: +1, condition: "vs one designated opponent (chosen on your action)" }`. Dodge bonuses stack; lost whenever Dex bonus to AC is lost (flat-footed etc.).
- Source: https://www.d20srd.org/srd/feats.htm#dodge
- CHECK: Dodge requires Dex 13 — https://www.d20srd.org/srd/feats.htm#dodge

### Mobility — Souplesse du serpent
- FR: https://regles-donjons-dragons.com/page347.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { dex: 13 }, feats: ["dodge"] }`
- Effect: `{ target: "ac", bonusType: "dodge", value: +4, condition: "vs AoO provoked by moving out of or within a threatened area" }`. Lost when Dex bonus to AC is lost.
- Source: https://www.d20srd.org/srd/feats.htm#mobility
- CHECK: Mobility requires Dex 13, Dodge — https://www.d20srd.org/srd/feats.htm#mobility

### Spring Attack — Attaque éclair
- FR: https://regles-donjons-dragons.com/page277.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { dex: 13 }, feats: ["dodge", "mobility"], bab: 4 }`
- Effect: with the **attack action** (standard action, one attack) using a melee weapon, may move before and after the attack (total ≤ speed, at least 5 ft / 1,50 m before and after); this movement doesn't provoke an AoO from the target attacked (others may). Data: `{ action: "attack", flag: "moveBeforeAndAfter", noAoOFrom: "target" }`.
- **Restriction: cannot be used while wearing heavy armor** (in both the d20srd English text and the French text "impossible d'utiliser ce don en armure lourde").
- Source: https://www.d20srd.org/srd/feats.htm#springAttack
- CHECK: Spring Attack requires Dex 13, Dodge, Mobility, BAB +4 — https://www.d20srd.org/srd/feats.htm#springAttack
- CHECK (usability): Spring Attack unusable while wearing heavy armor — https://www.d20srd.org/srd/feats.htm#springAttack . **The character wears full plate +2 (heavy armor) → this check fires.** Resolved: see rulings-character.md#q11 (the feat still counts as a prerequisite for Whirlwind Attack).

### Combat Expertise — Expertise du combat
- FR: https://regles-donjons-dragons.com/page302.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { int: 13 } }`
- Effect: when using the attack or full attack action **in melee**, choose N with `0 ≤ N ≤ min(5, BAB)`:
  `{ target: "attack(melee)", value: -N }` and `{ target: "ac", bonusType: "dodge", value: +N }`, lasting until your next action.
  (Without the feat: fighting defensively = −4 attack / +2 dodge AC.)
- Source: https://www.d20srd.org/srd/feats.htm#combatExpertise
- CHECK: Combat Expertise requires Int 13 — https://www.d20srd.org/srd/feats.htm#combatExpertise (character has Int 13 exactly: any Int damage/drain disables it)

### Whirlwind Attack — Attaque en rotation
- FR: https://regles-donjons-dragons.com/page280.html (official French name is **"Attaque en rotation"**; `character-baseline.md` says "Attaque en tourbillon")
- Type: general, fighterBonus: true
- Prereq: `{ ability: { dex: 13, int: 13 }, feats: ["combatExpertise", "dodge", "mobility", "springAttack"], bab: 4 }`
- Effect: as a **full attack action**, give up the normal attacks and make **one melee attack at full BAB against each opponent within reach**. All bonus/extra attacks from other feats, spells or abilities are forfeited (the French text names Cleave/Enchaînement and *haste* explicitly). Data: `{ action: "fullAttack", replaces: "iterativeAttacks", attacks: "1 per opponent in reach @ full attack bonus", forfeits: ["cleave", "greatCleave", "haste extra attack", …] }`.
- Source: https://www.d20srd.org/srd/feats.htm#whirlwindAttack
- CHECK: Whirlwind Attack requires Int 13, Dex 13, Combat Expertise, Dodge, Mobility, Spring Attack, BAB +4 — https://www.d20srd.org/srd/feats.htm#whirlwindAttack
- Note: requiring Spring Attack only as a prerequisite; Whirlwind Attack itself has no armor restriction in the text.

### Power Attack — Attaque en puissance
- FR: https://regles-donjons-dragons.com/page279.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { str: 13 } }`
- Effect: on your action, before attack rolls for the round, choose N with `0 ≤ N ≤ BAB`:
  `{ target: "attack(melee, all)", value: -N }` and `{ target: "damage(melee)", value: +N × k }` until your next turn, where
  `k = 2` for a two-handed weapon or a one-handed weapon held in two hands (**greatsword: ×2**), `k = 1` for a one-handed weapon, `k = 0` for a light weapon (penalty still applies; unarmed strikes and natural weapons excepted).
  Applies to every melee attack until your next turn (so also attacks of opportunity and Cleave attacks).
- Source: https://www.d20srd.org/srd/feats.htm#powerAttack
- CHECK: Power Attack requires Str 13 — https://www.d20srd.org/srd/feats.htm#powerAttack
- CHECK (input): Power Attack N ≤ current BAB (8 at level 8, 9 at level 9) — same URL

### Cleave — Enchaînement
- FR: https://regles-donjons-dragons.com/page299.html
- Type: general, fighterBonus: true
- Prereq: `{ ability: { str: 13 }, feats: ["powerAttack"] }`
- Effect: when a melee hit drops a creature (typically below 0 HP or killed), one immediate extra melee attack against another creature within reach, same weapon, same attack bonus as the attack that dropped the first one; no 5-foot step before it; **once per round**. Data: `{ trigger: "dropFoe", extraAttacks: 1, perRound: 1, sameBonus: true }`.
- Source: https://www.d20srd.org/srd/feats.htm#cleave
- CHECK: Cleave requires Str 13, Power Attack — https://www.d20srd.org/srd/feats.htm#cleave

### Order / slot feasibility check for the current build (informative)
All 9 feats are on the fighter bonus list, so any slot can hold any of them. The only timing constraints are the BAB +4 feats (Spring Attack, Whirlwind Attack), which can only be taken at character level ≥ 4 (Fighter 4 bonus slot, level-6 general slot, Fighter 6 bonus slot), and Whirlwind after Spring Attack. A legal order exists, e.g.: L1 Dodge + Combat Expertise + Power Attack (general, human, fighter), L2 Mobility, L3 Cleave, L4 Spring Attack, L6 Whirlwind Attack + Combat Reflexes, Weapon Focus (deity, BAB +1 from L1). The baseline does not say which feat was taken at which level (open question).

---

## 3. Plausible next feats (Fighter 6 / Weapon Master, greatsword)

Character state used for the CHECK verdicts: level 8 = Fighter 6 / WM 2, BAB +8; level 9 = Fighter 6 / WM 3, BAB +9; Str 18, Dex 16, Con 16 (18 with amulet), Int 13, Wis 9, Cha 13. The next open slot is the **level-9 general feat** (no fighter bonus slot, since Weapon Master levels give none). Greatsword: 2d6, threat 19–20, ×2, two-handed, slashing.

| Feat (EN) | FR (official) | Fighter bonus | Fighter level req. | Prereq | Effect (data) | Available now? | Source |
|---|---|---|---|---|---|---|---|
| Weapon Specialization | Spécialisation martiale ([page348](https://regles-donjons-dragons.com/page348.html)) | yes | **4** | `{ proficient: "$weapon", feats: [{id:"weaponFocus",param:"$weapon"}], fighterLevel: 4 }` | `{ target: "damage", weapon: "$weapon", value: +2 }` (untyped); repeatable per weapon, no stacking | yes (Fighter 6) | https://www.d20srd.org/srd/feats.htm#weaponSpecialization |
| Greater Weapon Focus | Arme de prédilection supérieure ([page273](https://regles-donjons-dragons.com/page273.html)) | yes | **8** | `{ proficient: "$weapon", feats: [{id:"weaponFocus",param:"$weapon"}], fighterLevel: 8 }` | `{ target: "attack", weapon: "$weapon", value: +1 }`, stacks with Weapon Focus | **no** (Fighter 6 < 8) | https://www.d20srd.org/srd/feats.htm#greaterWeaponFocus |
| Greater Weapon Specialization | Spécialisation martiale supérieure | yes | **12** | `{ proficient: "$weapon", feats: [{id:"weaponFocus",param:"$weapon"},{id:"greaterWeaponFocus",param:"$weapon"},{id:"weaponSpecialization",param:"$weapon"}], fighterLevel: 12 }` | `{ target: "damage", weapon: "$weapon", value: +2 }`, stacks with Weapon Specialization | **no** | https://www.d20srd.org/srd/feats.htm#greaterWeaponSpecialization |
| Improved Critical | Science du critique ([page341](https://regles-donjons-dragons.com/page341.html)) | yes | — | `{ proficient: "$weapon", bab: 8 }` | `{ target: "threatRange", weapon: "$weapon", op: "double" }` (greatsword 19–20 → 17–20); doesn't stack with other threat-range expanders (e.g. *keen*) | yes (BAB +8) | https://www.d20srd.org/srd/feats.htm#improvedCritical |
| Great Cleave | Succession d'enchaînements ([page350](https://regles-donjons-dragons.com/page350.html)) | yes | — | `{ ability: {str:13}, feats: ["powerAttack","cleave"], bab: 4 }` | as Cleave, `perRound: unlimited` | yes | https://www.d20srd.org/srd/feats.htm#greatCleave |
| Improved Sunder | Science de la destruction ([page332](https://regles-donjons-dragons.com/page332.html)) | yes | — | `{ ability: {str:13}, feats: ["powerAttack"] }` | sunder doesn't provoke AoO; `{ target: "attack(vs held/carried object)", value: +4 }` (stacks with the +4 a two-handed weapon gets in sunder, per [Sunder](https://www.d20srd.org/srd/combat/specialAttacks.htm#sunder)) | yes | https://www.d20srd.org/srd/feats.htm#improvedSunder |
| Improved Trip | Science du croc-en-jambe ([page342](https://regles-donjons-dragons.com/page342.html)) | yes | — | `{ ability: {int:13}, feats: ["combatExpertise"] }` | unarmed trip doesn't provoke AoO; `{ target: "strCheck(trip)", value: +4 }`; after a successful melee trip, a free melee attack on that foe | yes (Int 13 exactly) | https://www.d20srd.org/srd/feats.htm#improvedTrip |
| Improved Disarm | Science du désarmement | yes | — | `{ ability: {int:13}, feats: ["combatExpertise"] }` | disarm doesn't provoke AoO, no counter-disarm; `{ target: "opposedAttack(disarm)", value: +4 }` | yes | https://www.d20srd.org/srd/feats.htm#improvedDisarm |
| Improved Bull Rush | Science de la bousculade | yes | — | `{ ability: {str:13}, feats: ["powerAttack"] }` | bull rush doesn't provoke AoO from defender; `{ target: "strCheck(bullRush)", value: +4 }` | yes | https://www.d20srd.org/srd/feats.htm#improvedBullRush |
| Improved Overrun | Science du renversement | yes | — | `{ ability: {str:13}, feats: ["powerAttack"] }` | target can't avoid you; `{ target: "strCheck(overrun)", value: +4 }` | yes | https://www.d20srd.org/srd/feats.htm#improvedOverrun |
| Improved Initiative | Science de l'initiative ([page333](https://regles-donjons-dragons.com/page333.html)) | yes | — | `{}` | `{ target: "initiative", value: +4 }` (untyped) | yes | https://www.d20srd.org/srd/feats.htm#improvedInitiative |
| Blind-Fight | Combat en aveugle | yes | — | `{}` | reroll concealment miss chance once in melee; invisible attackers get no melee advantage; speed penalty halved when unable to see | yes | https://www.d20srd.org/srd/feats.htm#blindFight |
| Quick Draw | Arme en main | yes | — | `{ bab: 1 }` | draw a weapon as a free action | yes | https://www.d20srd.org/srd/feats.htm#quickDraw |
| Toughness | Robustesse ([page330](https://regles-donjons-dragons.com/page330.html)) | **no** | — | `{}` | `{ target: "hp", value: +3 }`; repeatable, **stacks** | yes (general slot) | https://www.d20srd.org/srd/feats.htm#toughness |
| Iron Will | Volonté de fer ([page360](https://regles-donjons-dragons.com/page360.html)) | **no** | — | `{}` | `{ target: "save.will", value: +2 }` (untyped) | yes (general slot) | https://www.d20srd.org/srd/feats.htm#ironWill |
| Great Fortitude | Vigueur surhumaine | **no** | — | `{}` | `{ target: "save.fort", value: +2 }` | yes (general slot) | https://www.d20srd.org/srd/feats.htm#greatFortitude |
| Lightning Reflexes | Réflexes surhumains | **no** | — | `{}` | `{ target: "save.ref", value: +2 }` | yes (general slot) | https://www.d20srd.org/srd/feats.htm#lightningReflexes |
| Endurance | Endurance | **no** | — | `{}` | +4 on listed checks/saves vs nonlethal/environment; sleep in light/medium armor without fatigue | yes (general slot) | https://www.d20srd.org/srd/feats.htm#endurance |
| Diehard | Dur à cuire | **no** | — | `{ feats: ["endurance"] }` | auto-stabilize at −1…−9 HP; may act as disabled instead of dying | after Endurance | https://www.d20srd.org/srd/feats.htm#diehard |

French names in the table were read from the French site's feat index (https://regles-donjons-dragons.com/page269.html and its summary table page268.html); pages with a link were also opened and read.

Checks for these:
- CHECK: Weapon Specialization requires proficiency, Weapon Focus (same weapon), **Fighter level 4** — https://www.d20srd.org/srd/feats.htm#weaponSpecialization
- CHECK: Greater Weapon Focus requires proficiency, Weapon Focus (same weapon), **Fighter level 8** (Fighter class levels only; Weapon Master levels don't count) — https://www.d20srd.org/srd/feats.htm#greaterWeaponFocus
- CHECK: Greater Weapon Specialization requires proficiency, Weapon Focus, Greater Weapon Focus, Weapon Specialization (same weapon), **Fighter level 12** — https://www.d20srd.org/srd/feats.htm#greaterWeaponSpecialization
- CHECK: Improved Critical requires proficiency with the weapon, BAB +8 — https://www.d20srd.org/srd/feats.htm#improvedCritical
- CHECK: Improved Critical does not stack with any other threat-range expansion (e.g. *keen*) — same URL
- CHECK: Great Cleave requires Str 13, Power Attack, Cleave, BAB +4 — https://www.d20srd.org/srd/feats.htm#greatCleave
- CHECK: Improved Sunder / Improved Bull Rush / Improved Overrun require Str 13, Power Attack — https://www.d20srd.org/srd/feats.htm#improvedSunder
- CHECK: Improved Trip / Improved Disarm require Int 13, Combat Expertise — https://www.d20srd.org/srd/feats.htm#improvedTrip
- CHECK: Diehard requires Endurance — https://www.d20srd.org/srd/feats.htm#diehard
- CHECK: Toughness, Iron Will, Great Fortitude, Lightning Reflexes, Endurance, Diehard cannot fill a fighter bonus slot — https://www.d20srd.org/srd/feats.htm#fighterBonusFeats
- Note (Improved Trip with a greatsword): a trip is normally an unarmed touch attack; only weapons with the trip property can be used to trip (greatsword has none). The +4 and the follow-up attack still apply to unarmed trips. https://www.d20srd.org/srd/combat/specialAttacks.htm#trip — Resolved: see rulings-character.md#q13

---

## 4. Interactions with Weapon Master features

- Superior Weapon Focus vs Weapon Focus / Greater Weapon Focus: Resolved: see rulings-character.md#q10-superior-weapon-focus
- Ki critical (Improved Critical already taken, *keen*): Resolved (keen case still open, DM): see rulings-character.md#q10-ki-critical
- Increased multiplier vs Improved Critical: Resolved: see rulings-character.md#q10-increased-multiplier
- Superior Combat Reflexes vs Combat Reflexes: still open (DM, before WM 5): see rulings-character.md#q10-superior-combat-reflexes
- Ki Whirlwind Attack (move action, Spring Attack, Cleave, Combat Expertise): Resolved (Combat Expertise case still open, DM): see rulings-character.md#q10-ki-whirlwind
- Losing a Weapon Master requirement: Resolved: see rulings-character.md#q6
