# Equipment: weapons, armor, shields (3.5 SRD)

D&D **3.5** only. Summaries in our own words, numbers from the SRD (OGL). Every item has its d20srd URL.
French terms come from https://regles-donjons-dragons.com/ (FR SRD, checked on 2026-10-12); `(FR?)` = not verified there.
Weights: `lb` from the SRD, `kg` from the French SRD (house-rules #5). For the items below the French kg is exactly lb / 2.

Main sources:
- Weapons: https://www.d20srd.org/srd/equipment/weapons.htm (FR: https://regles-donjons-dragons.com/page410.html "Les armes")
- Armor: https://www.d20srd.org/srd/equipment/armor.htm (FR: https://regles-donjons-dragons.com/page411.html "Les armures")
- Proficiency summary: https://www.d20srd.org/srd/combat/combatModifiers.htm#weaponArmorAndShieldProficiency
- Magic weapons: https://www.d20srd.org/srd/magicItems/magicWeapons.htm ; magic armor: https://www.d20srd.org/srd/magicItems/magicArmor.htm
- Prices: https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm#tableEstimatingMagicItemGoldPieceValues

---

## 1. Weapon data model

Source: https://www.d20srd.org/srd/equipment/weapons.htm#weaponQualities

| Field | Meaning | FR |
|---|---|---|
| `cost` | gp (or sp). Same for Small and Medium; Large ×2 | Prix (po / pa) |
| `damageS`, `damageM` | damage die for a Small / Medium weapon. Double weapons: two values `a/b` | Dgts (P), Dgts (M) |
| `critical` | `{ threatMin: 20 \| 19 \| 18, multiplier: 2 \| 3 \| 4 }`. Only the weapon's normal damage is multiplied; extra dice are not | Critique |
| `rangeIncrement` | ft (and m: 5 ft = 1,5 m). −2 per full increment; thrown max 5 increments, projectile max 10 | Facteur de portée |
| `weight` | `{ lb, kg }` for a Medium weapon. Small = half, Large = double | Poids |
| `damageType` | bludgeoning / piercing / slashing; `"and"` = both at once, `"or"` = wielder's choice | Contondant / Perforant / Tranchant |
| `proficiency` | `simple` \| `martial` \| `exotic` | armes courantes / de guerre / exotiques |
| `handedness` | `light` \| `oneHanded` \| `twoHanded` \| `ranged` (ranged also: `thrown` / `projectile`) | armes (de corps à corps) légères / à une main / à deux mains ; armes à distance |
| `size` | size of the intended wielder (S, M, L…) | taille (FR?) |
| `special` | reach, double, trip, ammunition, mounted use… | |
| `masterwork` | boolean | arme de maître |
| `enhancement` | 0–5 (magic) | bonus d'altération |
| `srdUrl` | anchor in weapons.htm | |

### 1.1 The character's weapons

| Item (EN / FR) | Cost | Dmg S | Dmg M | Critical | Range | Weight | Type | Category | Source |
|---|---|---|---|---|---|---|---|---|---|
| Greatsword / Épée à deux mains | 50 gp | 1d10 | 2d6 | 19–20/×2 | — | 8 lb / 4 kg | Slashing | martial, two-handed melee | https://www.d20srd.org/srd/equipment/weapons.htm#tableWeapons |
| Short sword (Sword, short) / Épée courte | 10 gp | 1d4 | 1d6 | 19–20/×2 | — | 2 lb / 1 kg | Piercing | martial, light melee | https://www.d20srd.org/srd/equipment/weapons.htm#tableWeapons |
| Longbow / Arc long | 75 gp | 1d6 | 1d8 | ×3 | 100 ft / 30 m | 3 lb / 1,5 kg | Piercing | martial, ranged (projectile) | https://www.d20srd.org/srd/equipment/weapons.htm#longbow |
| Arrows (20) / Flèches (20) | 1 gp | — | — | — | — | 3 lb / 1,5 kg | — | ammunition | https://www.d20srd.org/srd/equipment/weapons.htm#arrows |

```json
[
  { "id": "greatsword", "name": { "en": "Greatsword", "fr": "Épée à deux mains" },
    "cost": { "gp": 50 }, "damageS": "1d10", "damageM": "2d6",
    "critical": { "threatMin": 19, "multiplier": 2 }, "rangeIncrement": null,
    "weight": { "lb": 8, "kg": 4 }, "damageType": ["slashing"],
    "proficiency": "martial", "handedness": "twoHanded",
    "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#tableWeapons" },
  { "id": "shortSword", "name": { "en": "Short sword", "fr": "Épée courte" },
    "cost": { "gp": 10 }, "damageS": "1d4", "damageM": "1d6",
    "critical": { "threatMin": 19, "multiplier": 2 }, "rangeIncrement": null,
    "weight": { "lb": 2, "kg": 1 }, "damageType": ["piercing"],
    "proficiency": "martial", "handedness": "light",
    "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#tableWeapons" },
  { "id": "longbow", "name": { "en": "Longbow", "fr": "Arc long" },
    "cost": { "gp": 75 }, "damageS": "1d6", "damageM": "1d8",
    "critical": { "threatMin": 20, "multiplier": 3 }, "rangeIncrement": { "ft": 100, "m": 30 },
    "weight": { "lb": 3, "kg": 1.5 }, "damageType": ["piercing"],
    "proficiency": "martial", "handedness": "ranged", "rangedKind": "projectile",
    "ammunition": "arrows", "strToDamage": "penaltyOnly", "usableMounted": false,
    "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#longbow" },
  { "id": "arrows20", "name": { "en": "Arrows (20)", "fr": "Flèches (20)" },
    "cost": { "gp": 1 }, "quantity": 20, "weight": { "lb": 3, "kg": 1.5 },
    "kind": "ammunition", "for": ["longbow", "longbowComposite", "shortbow", "shortbowComposite"],
    "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#arrows" }
]
```

Notes on these weapons:
- **Longbow** (https://www.d20srd.org/srd/equipment/weapons.htm#longbow): needs two hands; can't be used mounted; a Strength **penalty** applies to damage, a Strength **bonus** does not (only a composite bow with a strength rating adds it, up to its rating, +100 gp per point for a composite longbow: https://www.d20srd.org/srd/equipment/weapons.htm#longbowComposite). With Str 18 the character gets **no** Str bonus on longbow damage.
- **Arrows** (https://www.d20srd.org/srd/equipment/weapons.htm#arrows): drawn as a free action; an arrow that hits is destroyed, one that misses has 50 % chance to be lost; come in a quiver of 20. Used in melee: light improvised weapon (−4), damage as a dagger of its size, ×2.
- **Greatsword size table** (https://www.d20srd.org/srd/equipment/weapons.htm#tableLargerAndSmallerWeaponDamage): Fine 1d4, Dim 1d6, Tiny 1d8, Small 1d10, Medium 2d6, Large 3d6, Huge 4d6, Garg 6d6, Col 8d6.

CHECK: weight of a stack of ammunition = (count / 20) × 3 lb for arrows; the app should store arrows by count, not only by bundle. Rounding — Resolved: see rulings-combat-equipment.md#r23-partial-bundles-of-arrows
CHECK: a longbow never adds a Str bonus to damage, but always applies a Str penalty.
CHECK: a ranged attack beyond 10 range increments (projectile) or 5 (thrown) is impossible; each full increment = −2 on attack (`{ target: "attack.ranged", value: -2 × increments, bonusType: "untyped" }`). Source: https://www.d20srd.org/srd/equipment/weapons.htm#rangeIncrement

---

## 2. Wielding: Strength to damage, hands, size

Source: https://www.d20srd.org/srd/equipment/weapons.htm#lightOneHandedandTwoHandedMeleeWeapons

| Wield | Str bonus to damage | FR |
|---|---|---|
| Light, primary hand | ×1 | arme légère |
| Light, off hand | ×½ | main non directrice |
| Light, two hands | ×1 (no extra) | |
| One-handed, primary | ×1 | arme à une main |
| One-handed, off hand | ×½ | |
| One-handed, two hands | ×1½ | |
| Two-handed | ×1½ | arme à deux mains |
| Bow (non-composite), sling | penalty only (bonus never; sling: see SRD) | |

Fractions round down (https://www.d20srd.org/srd/theBasics.htm#roundingFractions). Example: Str 18 (+4) with the greatsword → +6 damage; Str 22 (+6, bull's strength) → +9.

```json
{ "rule": "strToDamage", "multipliers": { "light.primary": 1, "light.offHand": 0.5, "light.twoHands": 1,
  "oneHanded.primary": 1, "oneHanded.offHand": 0.5, "oneHanded.twoHands": 1.5, "twoHanded": 1.5 },
  "penaltyAlwaysFull": true, "round": "down",
  "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#lightOneHandedandTwoHandedMeleeWeapons" }
```

Weapon size (https://www.d20srd.org/srd/equipment/weapons.htm#inappropriatelySizedWeapons):
- A weapon's size = size of the intended wielder. Wielding a weapon of another size: **−2 on attack per size step** (cumulative), plus −4 if nonproficient.
- Each size step also shifts the handedness one step (light ↔ one-handed ↔ two-handed). If it would go beyond two-handed or below light, the weapon can't be wielded.
- Data: `{ target: "attack", value: -2 * |sizeSteps|, bonusType: "untyped" }`.

CHECK: weapon size must be Medium for this Medium human; otherwise warn and apply −2/step and the handedness shift.
CHECK: a two-handed weapon needs both hands free (a heavy shield occupies its hand: see §5).
CHECK: improvised weapon = nonproficient (−4), threat on 20 only, ×2, range increment 10 ft (https://www.d20srd.org/srd/equipment/weapons.htm#improvisedWeapons).

---

## 3. Weapon proficiency

Sources: https://www.d20srd.org/srd/equipment/weapons.htm#simpleMartialandExoticWeapons ; feats https://www.d20srd.org/srd/feats.htm#simpleWeaponProficiency , #martialWeaponProficiency , #exoticWeaponProficiency ; Fighter https://www.d20srd.org/srd/classes/fighter.htm

- Fighter: proficient with **all simple and martial weapons**, all armor (light, medium, heavy) and all shields **including tower shields**.
- Weapon Master (3.0) grants no proficiency of its own here (see `weapon-master.md`; not SRD).
- Nonproficient with a weapon: **−4 on attack rolls**.

```json
{ "id": "nonproficientWeapon", "changes": [ { "target": "attack.withThisWeapon", "value": -4, "bonusType": "untyped" } ],
  "srdUrl": "https://www.d20srd.org/srd/combat/combatModifiers.htm#weaponArmorAndShieldProficiency" }
```

FR feat names: Maniement des armes courantes (Simple), Maniement d'une arme de guerre (Martial), Maniement d'une arme exotique (Exotic), Port des armures légères / intermédiaires / lourdes, Maniement des boucliers (Shield Proficiency), Tower Shield Proficiency = (FR?).

CHECK: each wielded weapon's `proficiency` category is covered by the character's class proficiencies or a proficiency feat; else warn and apply −4.
CHECK: a composite longbow counts as a longbow for proficiency and feats (https://www.d20srd.org/srd/equipment/weapons.htm#longbowComposite).

---

## 4. Armor and shield data model

Source: https://www.d20srd.org/srd/equipment/armor.htm#armorQualities

| Field | Meaning | FR |
|---|---|---|
| `cost` | gp, for Small or Medium humanoid | Prix |
| `category` | `light` \| `medium` \| `heavy` \| `shield` | armure légère / intermédiaire / lourde ; bouclier |
| `armorBonus` / `shieldBonus` | armor bonus (armor) or shield bonus (shield) to AC; no stacking with another of the same type | bonus d'armure / bonus de bouclier |
| `maxDex` | max Dex bonus to AC (`null` = no limit). Shields don't limit Dex (except tower shield +2) | bonus de Dextérité maximal |
| `acp` | armor check penalty (≤ 0) | malus d'armure aux tests |
| `arcaneSpellFailure` | % | risque d'échec des sorts profanes |
| `speed` | `{ "30": ft, "20": ft }` speed while worn, for base speed 30 / 20 ft | vitesse de déplacement (9 m / 6 m) |
| `runMultiplier` | 4, or **3 in heavy armor** | course |
| `weight` | `{ lb, kg }` for Medium; Small = half, Large = double | Poids |
| `masterwork`, `enhancement` | see §7–8 | armure de maître ; bonus d'altération |

ACP applies to: Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Tumble; **double** on Swim (FR: Équilibre, Escalade, Évasion, Discrétion, Saut, Déplacement silencieux, Escamotage, Acrobaties; Swim = Natation (FR?)). Armor ACP and shield ACP **add together**. Arcane spell failure of armor and shield add together.
Source: https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty

### 4.1 The character's armor and shield

| Item (EN / FR) | Cost | Bonus | Max Dex | ACP | ASF | Speed (30 / 20) | Weight | Source |
|---|---|---|---|---|---|---|---|---|
| Full plate / Harnois | 1,500 gp | +8 armor | +1 | −6 | 35 % | 20 ft / 15 ft (6 m / 4,50 m) | 50 lb / 25 kg | https://www.d20srd.org/srd/equipment/armor.htm#fullPlate |
| Heavy steel shield / Écu en acier | 20 gp | +2 shield | — | −2 | 15 % | — | 15 lb / 7,5 kg | https://www.d20srd.org/srd/equipment/armor.htm#shieldHeavyWoodenorSteel |

For reference: light steel shield / Rondache en acier 9 gp, +1, ACP −1, 5 %, 6 lb / 3 kg; tower shield / Pavois 30 gp, +4, max Dex +2, ACP −10, 50 %, 45 lb / 22,5 kg, −2 on attack rolls.

```json
[
  { "id": "fullPlate", "name": { "en": "Full plate", "fr": "Harnois" }, "category": "heavy",
    "cost": { "gp": 1500 }, "armorBonus": 8, "maxDex": 1, "acp": -6, "arcaneSpellFailure": 35,
    "speed": { "30": 20, "20": 15 }, "speedM": { "9": 6, "6": 4.5 }, "runMultiplier": 3,
    "weight": { "lb": 50, "kg": 25 }, "donning": "halfPlateOrFullPlate", "needsHelpToDon": true,
    "includes": ["gauntlets", "heavy leather boots", "visored helmet", "padding"],
    "srdUrl": "https://www.d20srd.org/srd/equipment/armor.htm#fullPlate" },
  { "id": "heavySteelShield", "name": { "en": "Heavy steel shield", "fr": "Écu en acier" }, "category": "shield",
    "cost": { "gp": 20 }, "shieldBonus": 2, "maxDex": null, "acp": -2, "arcaneSpellFailure": 15,
    "weight": { "lb": 15, "kg": 7.5 }, "occupiesHand": true, "handUsableForOther": false,
    "bash": { "damageM": "1d4", "damageS": "1d3", "critical": { "threatMin": 20, "multiplier": 2 }, "type": "bludgeoning", "proficiency": "martial", "treatAs": "oneHanded" },
    "srdUrl": "https://www.d20srd.org/srd/equipment/armor.htm#shieldHeavyWoodenorSteel" }
]
```

The character's **full plate +2** (baseline) = magic, so masterwork: ACP −6 + 1 = **−5**, armor bonus 8 + 2 enhancement = **10**, max Dex +1, ASF 35 %, 20 ft, 50 lb / 25 kg, price **5,650 gp** (1,500 + 150 masterwork + 2² × 1,000).
With Dex 16 (+3) the Dex bonus to AC is capped at **+1**. "Capped by armor" is *not* "losing the Dex bonus" (dodge bonuses still apply): https://www.d20srd.org/srd/equipment/armor.htm#maximumDexBonus

```json
{ "id": "fullPlatePlus2", "base": "fullPlate", "masterwork": true, "enhancement": 2,
  "changes": [
    { "target": "ac.armor", "value": 8, "bonusType": "armor" },
    { "target": "ac.armor", "value": 2, "bonusType": "enhancement", "note": "enhances the armor bonus; not vs touch" },
    { "target": "maxDex", "value": 1, "bonusType": "cap" },
    { "target": "acp", "value": -5, "bonusType": "armorCheck" },
    { "target": "speed.land", "value": 20, "bonusType": "cap" },
    { "target": "run.multiplier", "value": 3, "bonusType": "cap" } ],
  "price": { "gp": 5650 }, "weight": { "lb": 50, "kg": 25 },
  "srdUrl": "https://www.d20srd.org/srd/magicItems/magicArmor.htm" }
```

CHECK: Dex bonus to AC = min(Dex modifier, lowest `maxDex` among armor, tower shield and load) (load: `carrying-capacity.md`).
CHECK: total ACP = armor ACP + shield ACP (then compare with load ACP, use the worse; see `carrying-capacity.md`).
CHECK: in medium or heavy armor speed 30 → 20 ft (9 → 6 m); heavy armor → run ×3 instead of ×4 (https://www.d20srd.org/srd/movement.htm#tableMovementAndDistance).
CHECK: only one armor bonus and one shield bonus count (highest of each type).
CHECK: sleeping in medium or heavy armor → **fatigued** next day (https://www.d20srd.org/srd/equipment/armor.htm#sleepinginArmor). Preset effect: `fatigued` (see `conditions.md`).
CHECK (baseline consistency): Climb +3 / Jump +1 in `character-baseline.md` = ACP −5 only, i.e. **no shield ACP** included. If the shield is in use, totals become Climb +1, Jump −1. Resolved (shield can't be in use with the greatsword; a carried shield has no ACP): see rulings-combat-equipment.md#r27-heavy-shield-and-a-two-handed-weapon

---

## 5. Two-handed weapons and shields

Sources: https://www.d20srd.org/srd/equipment/armor.htm#shieldHeavyWoodenorSteel , #shieldLightWoodenorSteel , #buckler , #shieldTower

- **Heavy shield**: strapped to the forearm and gripped; the shield hand **can't be used for anything else**. ⇒ incompatible with a two-handed weapon (greatsword, longbow).
- **Light shield**: the hand can carry items but **not use weapons**.
- **Buckler**: the shield arm may help wield a weapon (two-handed or off-hand) with −1 on attack rolls, but then no buckler AC bonus that round; bows/crossbows usable without penalty.
- **Tower shield**: −2 on attack rolls; can't bash; hand unusable.
- Shield bash: heavy shield = martial bludgeoning, off-hand, treated as one-handed for penalties; light = light weapon. Bashing loses the shield's AC bonus until your next action. Shield enhancement does not apply to the bash.
- Ready (strap on) a shield = **move action**; loose (drop) it = **move action** (https://www.d20srd.org/srd/equipment/armor.htm#tableDonningArmor).

CHECK: if a two-handed weapon (or a bow) is wielded and a heavy or light shield is equipped as "in use", warn; its shield bonus can't apply while the hand is used for the weapon. Carried vs. in use — Resolved: see rulings-combat-equipment.md#r27-heavy-shield-and-a-two-handed-weapon
CHECK: tower shield in use → `{ target: "attack.all", value: -2, bonusType: "untyped" }`.

---

## 6. Armor proficiency and nonproficiency

Sources: https://www.d20srd.org/srd/equipment/armor.htm#nonproficientwithArmorWorn ; https://www.d20srd.org/srd/combat/combatModifiers.htm#weaponArmorAndShieldProficiency ; feats https://www.d20srd.org/srd/feats.htm#armorProficiencyLight , #shieldProficiency , #towerShieldProficiency

- Nonproficient with worn armor and/or shield: the item's ACP applies to **attack rolls** and to **all Str- and Dex-based ability and skill checks** (armor page & combat modifiers page). Armor and shield nonproficiency penalties stack.
- The feat pages word the "Normal" line differently ("skill checks that involve moving, including Ride"). Resolved: see rulings-combat-equipment.md#r24-nonproficient-armorshield-which-checks
- The Fighter is proficient with everything relevant, so no penalty for this character.

```json
{ "id": "nonproficientArmor", "changes": [
    { "target": "attack.all", "value": "item.acp", "bonusType": "untyped" },
    { "target": "skill.strOrDexBased", "value": "item.acp", "bonusType": "untyped" },
    { "target": "abilityCheck.str", "value": "item.acp", "bonusType": "untyped" },
    { "target": "abilityCheck.dex", "value": "item.acp", "bonusType": "untyped" } ],
  "srdUrl": "https://www.d20srd.org/srd/equipment/armor.htm#nonproficientwithArmorWorn" }
```

CHECK: each worn armor category / shield type is covered by class or feat; else warn and apply the effect above.

---

## 7. Donning and removing armor

Source: https://www.d20srd.org/srd/equipment/armor.htm#tableDonningArmor (FR: "Enfiler", "Enfiler à la hâte", "Ôter")

| Armor | Don | Don hastily | Remove |
|---|---|---|---|
| Shield (any) | 1 move action | n/a | 1 move action |
| Padded, leather, hide, studded leather, chain shirt | 1 minute | 5 rounds | 1 minute¹ |
| Breastplate, scale, chainmail, banded, splint | 4 minutes¹ | 1 minute | 1 minute¹ |
| Half-plate, **full plate** | 4 minutes² | 4 minutes¹ | 1d4+1 minutes¹ |

¹ With help: half the time (one helper doing nothing else can help 1–2 adjacent characters; two characters can't help each other at the same time).
² Must have help; without help it can only be donned hastily.
Hastily donned: armor bonus **−1** and ACP **1 worse**.

```json
{ "id": "hastilyDonned", "changes": [
    { "target": "ac.armor", "value": -1, "bonusType": "untyped" },
    { "target": "acp", "value": -1, "bonusType": "untyped" } ],
  "srdUrl": "https://www.d20srd.org/srd/equipment/armor.htm#donHastily" }
```

---

## 8. Masterwork

- **Weapon** (https://www.d20srd.org/srd/equipment/weapons.htm#masterworkWeapons): **+1 enhancement bonus on attack rolls** (not damage). +300 gp (+600 for a double weapon); ammunition +6 gp per unit, destroyed when used. Must be made masterwork (can't be added later). Masterwork ammo enhancement does not stack with the launcher's. All magic weapons are masterwork, and the masterwork +1 does **not** stack with the magic enhancement.
- **Armor/shield** (https://www.d20srd.org/srd/equipment/armor.htm#masterworkArmor): **ACP lessened by 1**, +150 gp; never gives attack/damage bonus even when bashing. All magic armor and shields are masterwork. FR: "armure de maître".

```json
[
  { "id": "masterworkWeapon", "changes": [ { "target": "attack.withThisWeapon", "value": 1, "bonusType": "enhancement" } ],
    "costAdd": { "gp": 300 }, "srdUrl": "https://www.d20srd.org/srd/equipment/weapons.htm#masterworkWeapons" },
  { "id": "masterworkArmor", "changes": [ { "target": "item.acp", "value": 1, "bonusType": "untyped" } ],
    "costAdd": { "gp": 150 }, "srdUrl": "https://www.d20srd.org/srd/equipment/armor.htm#masterworkArmor" }
]
```

CHECK: an item with `enhancement ≥ 1` must have `masterwork: true` (warn if data says otherwise).
CHECK: masterwork weapon bonus and magic enhancement on attack: take the highest (same type, enhancement).

---

## 9. Magic weapons and armor

Sources: https://www.d20srd.org/srd/magicItems/magicWeapons.htm ; https://www.d20srd.org/srd/magicItems/magicArmor.htm ; price table https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm#tableEstimatingMagicItemGoldPieceValues

- **Weapon**: enhancement +1 to +5 on **attack and damage**. Special abilities count as extra "bonus" for price only; total (enhancement + ability equivalents) ≤ +10; any special ability needs at least +1 enhancement. Caster level = 3 × enhancement (if no special ability).
- Launcher and ammunition enhancements **don't stack** (highest applies). Ammunition fired from a +1 or better launcher counts as magic for damage reduction.
- Additional damage dice (e.g. flaming) are not multiplied on a critical.
- **Armor/shield**: enhancement +1 to +5 to the armor (or shield) bonus; stacks with the base armor bonus and with a shield's enhancement. Same +10 total cap. Enhancement to armor doesn't apply vs touch attacks (https://www.d20srd.org/srd/theBasics.htm#enhancementBonus).
- Each +1 adds 2 hardness and 10 hp to the weapon/shield.

Price formulas (base item + masterwork + enhancement):

| Item | Formula | Example |
|---|---|---|
| Magic weapon | base + 300 + 2,000 × b² | greatsword +1 = 50 + 300 + 2,000 = **2,350 gp** |
| Magic armor or shield | base + 150 + 1,000 × b² | full plate +2 = 1,500 + 150 + 4,000 = **5,650 gp** |
| Magic ammunition (price is for 50) | 2,000 × b² + 302 gp 5 sp (50 arrows + masterwork, per https://www.d20srd.org/srd/magicItems/magicWeapons.htm#tableCommonRangedWeapons) | +1 arrows (50) = 2,302 gp 5 sp |

```json
{ "rule": "magicPrice",
  "weapon": "baseCost + 300 + 2000 * b^2",
  "armorOrShield": "baseCost + 150 + 1000 * b^2",
  "bMax": 5, "totalEquivalentMax": 10,
  "srdUrl": "https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm#tableEstimatingMagicItemGoldPieceValues" }
```

CHECK: `enhancement` ≤ 5; enhancement + special-ability equivalents ≤ 10; special ability ⇒ enhancement ≥ 1.
CHECK: on a ranged attack, use max(launcher enhancement, ammunition enhancement), not the sum.

---

## 10. Summary of CHECKs for the rules module

1. Proficiency (weapon category, armor category, shield, tower shield) → −4 / ACP-on-attack penalties.
2. Masterwork flag required on any magic weapon/armor.
3. Max Dex: min of armor, tower shield, load.
4. ACP: armor + shield (+ masterwork/magic −1 each), vs load: worse.
5. Speed and run multiplier: armor vs load, worse.
6. Two-handed weapon / bow vs heavy or light shield in use.
7. Weapon size ≠ wielder size → −2 per step, handedness shift.
8. Longbow: no Str bonus to damage; Str penalty applies.
9. Enhancement caps (+5, +10 total).
10. Ammunition: launcher + ammo enhancement don't stack.
