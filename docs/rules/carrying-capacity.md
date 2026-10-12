# Carrying capacity and load (3.5 SRD)

D&D **3.5** only. Numbers from the SRD (OGL), summarized.
- EN: https://www.d20srd.org/srd/carryingCapacity.htm
- FR: https://regles-donjons-dragons.com/page1609.html "Poids transportable" (Table : charge transportable ; Table : effets de la charge)

Weights store `{ lb, kg }` (house-rules #5). The kg column below is copied from the French SRD site; it equals lb / 2 everywhere **except Str 10 light load** (Resolved: see rulings-combat-equipment.md#r18-strength-10-light-load-in-kg-165-vs-175).
FR terms: charge légère / intermédiaire / lourde (light / medium / heavy load), charge maximale (maximum load), Force (Strength).

---

## 1. Table: Carrying Capacity (Medium biped)

Source: https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingCapacity

Each value is the **upper limit** of the load band. Light = weight ≤ light max; medium = light max < weight ≤ medium max; heavy = medium max < weight ≤ heavy max. Heavy max = **maximum load**. Over heavy max: can't move normally (see §4 lifting).
The French table states the boundary rule explicitly: a weight exactly on a limit belongs to the lighter band (Str 13: 50 kg = medium; 50,1 kg = heavy).

| Str | Light max (lb) | Medium max (lb) | Heavy max (lb) | Light max (kg) | Medium max (kg) | Heavy max (kg) |
|---|---|---|---|---|---|---|
| 1 | 3 | 6 | 10 | 1,5 | 3 | 5 |
| 2 | 6 | 13 | 20 | 3 | 6,5 | 10 |
| 3 | 10 | 20 | 30 | 5 | 10 | 15 |
| 4 | 13 | 26 | 40 | 6,5 | 13 | 20 |
| 5 | 16 | 33 | 50 | 8 | 16,5 | 25 |
| 6 | 20 | 40 | 60 | 10 | 20 | 30 |
| 7 | 23 | 46 | 70 | 11,5 | 23 | 35 |
| 8 | 26 | 53 | 80 | 13 | 26,5 | 40 |
| 9 | 30 | 60 | 90 | 15 | 30 | 45 |
| 10 | 33 | 66 | 100 | **17,5** (lb/2 = 16,5) | 33 | 50 |
| 11 | 38 | 76 | 115 | 19 | 38 | 57,5 |
| 12 | 43 | 86 | 130 | 21,5 | 43 | 65 |
| 13 | 50 | 100 | 150 | 25 | 50 | 75 |
| 14 | 58 | 116 | 175 | 29 | 58 | 87,5 |
| 15 | 66 | 133 | 200 | 33 | 66,5 | 100 |
| 16 | 76 | 153 | 230 | 38 | 76,5 | 115 |
| 17 | 86 | 173 | 260 | 43 | 86,5 | 130 |
| **18** | **100** | **200** | **300** | **50** | **100** | **150** |
| 19 | 116 | 233 | 350 | 58 | 116,5 | 175 |
| 20 | 133 | 266 | 400 | 66,5 | 133 | 200 |
| 21 | 153 | 306 | 460 | 76,5 | 153 | 230 |
| 22 | 173 | 346 | 520 | 86,5 | 173 | 260 |
| 23 | 200 | 400 | 600 | 100 | 200 | 300 |
| 24 | 233 | 466 | 700 | 116,5 | 233 | 350 |
| 25 | 266 | 533 | 800 | 133 | 266,5 | 400 |
| 26 | 306 | 613 | 920 | 153 | 306,5 | 460 |
| 27 | 346 | 693 | 1,040 | 173 | 346,5 | 520 |
| 28 | 400 | 800 | 1,200 | 200 | 400 | 600 |
| 29 | 466 | 933 | 1,400 | 233 | 466,5 | 700 |
| +10 | ×4 | ×4 | ×4 | ×4 | ×4 | ×4 |

Note: the SRD lb table lists integer bands ("101–200 lb."); the French one lists continuous bands ("50–100 kg").

### 1.1 Strength above 29 ("Tremendous Strength")

Source: https://www.d20srd.org/srd/carryingCapacity.htm#tremendousStrength

Take the row 20–29 with the same last digit, multiply by 4 for every 10 points above that row.

```
row  = 20 + (Str mod 10)
k    = floor((Str - row) / 10)
limit(Str) = limit(row) * 4^k           // Str 30 → row 20 × 4 ; Str 45 → row 25 × 16
```

FR site wording: ×4 for 30–39, ×16 for 40–49, ×64 for 50–59 (same thing).
Str 0: no row; Str 0 = helpless (see `conditions.md`, ability damage).

### 1.2 Size multipliers

Source: https://www.d20srd.org/srd/carryingCapacity.htm#biggerandSmallerCreatures

| Size | Biped | Quadruped |
|---|---|---|
| Fine | ×1/8 | ×1/4 |
| Diminutive | ×1/4 | ×1/2 |
| Tiny | ×1/2 | ×3/4 |
| Small | ×3/4 | ×1 |
| Medium | ×1 | ×1½ |
| Large | ×2 | ×3 |
| Huge | ×4 | ×6 |
| Gargantuan | ×8 | ×12 |
| Colossal | ×16 | ×24 |

```json
{ "id": "carryingCapacity", "srdUrl": "https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingCapacity",
  "frUrl": "https://regles-donjons-dragons.com/page1609.html",
  "rows": {
    "18": { "light": { "lb": 100, "kg": 50 }, "medium": { "lb": 200, "kg": 100 }, "heavy": { "lb": 300, "kg": 150 } }
  },
  "boundary": "weight <= limit stays in the lighter band",
  "above29": "limit(20 + Str%10) * 4^floor((Str - (20 + Str%10)) / 10)",
  "sizeMultiplier": { "biped": { "S": 0.75, "M": 1, "L": 2 }, "quadruped": { "S": 1, "M": 1.5, "L": 3 } } }
```
(The full `rows` object = the table above; only Str 18 shown here.)

---

## 2. Table: Carrying Loads (load effects)

Source: https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingLoads ; FR "Table : effets de la charge"

| Load | Max Dex | Check penalty | Speed (base 30 ft / 9 m) | Speed (base 20 ft / 6 m) | Run |
|---|---|---|---|---|---|
| Light (légère) | — | — | 30 ft / 9 m | 20 ft / 6 m | ×4 |
| Medium (intermédiaire) | +3 | −3 | 20 ft / 6 m | 15 ft / 4,50 m | ×4 |
| Heavy (lourde) | +1 | −6 | 20 ft / 6 m | 15 ft / 4,50 m | ×3 |

Reduced speeds for other base speeds (SRD table, same for medium and heavy; FR metre values from the French site):

| Base | 20 ft (6 m) | 30 ft (9 m) | 40 ft (12 m) | 50 ft (15 m) | 60 ft (18 m) | 70 ft (21 m) | 80 ft (24 m) | 90 ft (27 m) | 100 ft (30 m) |
|---|---|---|---|---|---|---|---|---|---|
| Reduced | 15 ft (4,50 m) | 20 ft (6 m) | 30 ft (9 m) | 35 ft (10,50 m) | 40 ft (12 m) | 50 ft (15 m) | 55 ft (16,50 m) | 60 ft (18 m) | 70 ft (21 m) |

```json
[
  { "id": "load.light", "changes": [] },
  { "id": "load.medium", "name": { "en": "Medium load", "fr": "Charge intermédiaire" }, "changes": [
      { "target": "maxDex", "value": 3, "bonusType": "cap" },
      { "target": "acp", "value": -3, "bonusType": "armorCheck" },
      { "target": "speed.land", "value": "reducedSpeed(base)", "bonusType": "cap" },
      { "target": "run.multiplier", "value": 4, "bonusType": "cap" } ],
    "countsAsArmorCategory": "medium",
    "srdUrl": "https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingLoads" },
  { "id": "load.heavy", "name": { "en": "Heavy load", "fr": "Charge lourde" }, "changes": [
      { "target": "maxDex", "value": 1, "bonusType": "cap" },
      { "target": "acp", "value": -6, "bonusType": "armorCheck" },
      { "target": "speed.land", "value": "reducedSpeed(base)", "bonusType": "cap" },
      { "target": "run.multiplier", "value": 3, "bonusType": "cap" } ],
    "countsAsArmorCategory": "heavy",
    "srdUrl": "https://www.d20srd.org/srd/carryingCapacity.htm#tableCarryingLoads" }
]
```

- The load check penalty works like an armor check penalty (same skills, Swim double: see `equipment.md` §4).
- A medium or heavy load counts as medium or heavy armor for abilities and skills restricted by armor. A light load doesn't encumber.

## 3. Armor and load don't stack

Source: https://www.d20srd.org/srd/carryingCapacity.htm#weight (FR: "on prend seulement en compte le plus élevé des deux résultats … on n'additionne pas les deux")

For each category take the **worse** of armor and load, never the sum:

```
maxDexEffective = min(armor.maxDex, towerShield.maxDex, load.maxDex)        // null = no cap
acpEffective    = min(armor.acp + shield.acp, load.acp)                       // most negative
speedEffective  = min(armorSpeed, loadSpeed)
runEffective    = min(armor.run, load.run)
```

CHECK: total carried weight (armor, weapons, gear; including worn items) → load band from current Str score (Str includes enhancement bonuses and ability damage/penalties).
CHECK: show the load band, the effective max Dex / ACP / speed / run, and which source (armor or load) is the worse.
CHECK: weight > heavy max → warn "overloaded: can only lift/drag (see §4)".
CHECK: shield ACP vs load penalty — Still open (no book text; recommended reading given): see rulings-combat-equipment.md#r26-shield-acp-vs-load-penalty-use-the-worse

Example (character, Str 18): full plate +2 50 lb + greatsword 8 + short sword 2 + longbow 3 + 20 arrows 3 + heavy steel shield 15 = **81 lb (40,5 kg)** → light load (≤ 100 lb / 50 kg). Armor decides: max Dex +1, ACP −5 (−7 with the shield), speed 20 ft, run ×3. (Other gear on the sheet is not counted here.)
With bull's strength (Str 22): light ≤ 173 lb / 86,5 kg.

## 4. Lifting and dragging

Source: https://www.d20srd.org/srd/carryingCapacity.htm#liftingandDragging

| Action | Limit | Effect |
|---|---|---|
| Lift over head | 1 × maximum load (heavy max) | — |
| Lift off the ground | 2 × maximum load | only stagger: lose Dex bonus to AC, move 5 ft (1,50 m) per round as a full-round action |
| Push or drag | 5 × maximum load | favorable conditions ×2, bad conditions ×½ or less (DM) |

Str 18: over head 300 lb / 150 kg; off ground 600 lb / 300 kg; drag 1,500 lb / 750 kg.

```json
{ "id": "liftOffGround", "name": { "en": "Staggering under a load", "fr": "Soulever le double de sa charge maximale" },
  "changes": [ { "flag": "loseDexToAC" }, { "target": "speed.land", "value": 5, "bonusType": "cap", "note": "full-round action" } ],
  "srdUrl": "https://www.d20srd.org/srd/carryingCapacity.htm#liftingandDragging" }
```

## 5. Other weight notes

- Coins: 50 coins = 1 lb (https://www.d20srd.org/srd/equipment/wealthAndMoney.htm). kg value — Resolved: see rulings-combat-equipment.md#r21-coin-weight-in-kg
- Adventuring gear made for Small characters weighs ¼ (https://www.d20srd.org/srd/equipment/goodsAndServices.htm); weapons and armor for Small weigh ½ (see `equipment.md`). Not relevant for this Medium human.
- Magic items: when a weight is not given, the item has no weight worth counting (https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#weight).
