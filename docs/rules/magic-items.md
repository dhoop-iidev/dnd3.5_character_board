# Magic items: body slots, bonuses, Amulet of Health, potions (3.5 SRD)

D&D **3.5** only. Summaries in our own words; numbers from the SRD (OGL).
- Basics: https://www.d20srd.org/srd/magicItems/magicItemBasics.htm (FR: https://regles-donjons-dragons.com/page1162.html "Objets magiques")
- Body slots: https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#magicItemsOnTheBody (FR: https://regles-donjons-dragons.com/page1165.html "Emplacement des objets magiques sur le corps")
- Bonus types and stacking: https://www.d20srd.org/srd/theBasics.htm#stacking , https://www.d20srd.org/srd/theBasics.htm#modifierTypes
- Prices: https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm#tableEstimatingMagicItemGoldPieceValues

---

## 1. Body slots

A humanoid can wear up to **12** magic items at once, **one per slot** (two rings). Extra items of the same slot **have no effect** (they can be carried). Some items take no slot (the description says so; e.g. ioun stones).

| Slot id | SRD (EN) | FR (French SRD) |
|---|---|---|
| `head` | one headband, hat, helmet or phylactery | Sur la tête : serre-tête, bandeau, couronne, casque, couvre-chef ou phylactère |
| `eyes` | one pair of eye lenses or goggles | Devant les yeux : lunettes, lentilles ou monocle |
| `neck` | one amulet, brooch, medallion, necklace, periapt or scarab | Autour du cou : amulette, broche, médaillon, collier, charme ou scarabée |
| `torso` | one vest, vestment or shirt | Sur le torse : gilet, veste, chemise, chasuble |
| `body` | one robe **or suit of armor** (over the torso item) | Sur le corps : robe ou armure |
| `waist` | one belt (over robe or armor) | Autour de la taille : ceinture ou ceinturon |
| `shoulders` | one cloak, cape or mantle (over robe or armor) | Sur les épaules : cape, écharpe ou manteau |
| `arms` | one pair of bracers or bracelets | Sur les bras ou les poignets : une paire de bracelets |
| `hands` | one glove, pair of gloves or pair of gauntlets | Aux mains : gants ou gantelets |
| `ring` ×2 | one ring on each hand (or two on one hand) | Aux doigts : deux anneaux |
| `feet` | one pair of boots or shoes | Aux pieds : bottes ou chaussons |

```json
{ "slots": { "head": 1, "eyes": 1, "neck": 1, "torso": 1, "body": 1, "waist": 1, "shoulders": 1,
             "arms": 1, "hands": 1, "ring": 2, "feet": 1, "none": null },
  "srdUrl": "https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#magicItemsOnTheBody" }
```

Notes:
- **Armor uses the `body` slot**: the character's full plate +2 rules out a magic robe.
- Armor that comes with boots or gauntlets (full plate does) is made so these pieces can be swapped for magic boots/gauntlets (https://www.d20srd.org/srd/magicItems/magicArmor.htm). So full plate does not block the `hands` / `feet` slots.
- Slot naming "neck" vs "throat" — Resolved: see rulings-combat-equipment.md#r28-slot-name-for-amulets-neck-vs-throat
- Shields and weapons are held, not worn in a slot.
- Which extra item doesn't work — Resolved: see rulings-combat-equipment.md#r29-two-items-in-one-slot-which-one-works

CHECK: for each slot, count equipped magic items; if count > capacity (1, rings 2) → warning "only N works; the extra item has no effect" with the SRD link.
CHECK: wondrous item data must carry a `slot` field (the SRD wondrous item entries don't state a slot; the app derives it from the item type: amulet → `neck`, belt → `waist`, etc.).

## 2. How magic items apply bonuses

Sources: https://www.d20srd.org/srd/theBasics.htm#stacking , #modifierTypes ; https://www.d20srd.org/srd/magicItems/magicItemBasics.htm#usingItems

- A worn continuous item works while worn (use-activated). Most other activations are a standard action.
- Each item bonus has a **type**. Same type doesn't stack (highest only), except **dodge** and **circumstance** (stack) and untyped (stack). Same source twice doesn't stack either. Dodge bonuses are never granted by spells or items.
- **Enhancement** bonus: to an ability score, to armor/natural armor, or to a weapon. Multiple enhancement bonuses to the same ability/object don't stack. Enhancement to armor doesn't apply vs touch attacks.
- When an ability score changes, everything derived from it changes (https://www.d20srd.org/srd/theBasics.htm#abilityScores). Con modifier change → HP change by (Δ Con mod) × HD (https://www.d20srd.org/srd/theBasics.htm#constitutionCon). No retroactive skill points from Int.
- Price guidelines (base price): ability enhancement b² × 1,000 gp; armor enhancement b² × 1,000; weapon enhancement b² × 2,000; deflection b² × 2,000; natural armor enhancement b² × 2,000; resistance to saves b² × 1,000; competence to skill b² × 100. An item that takes no slot costs ×2. Multiple different powers on one slotted item: each extra power ×1.5.

FR bonus types verified on the French SRD: bonus d'altération (enhancement), bonus d'armure (armor), bonus de bouclier (shield), bonus d'armure naturelle (natural armor), bonus de résistance (resistance). Others: deflection, dodge, luck, morale, insight, competence, sacred, profane (FR?).

```json
{ "stacking": {
    "stacksWithSameType": ["dodge", "circumstance", "untyped"],
    "highestOnly": ["alchemical", "armor", "competence", "deflection", "enhancement", "insight", "luck",
                    "morale", "naturalArmor", "profane", "racial", "resistance", "sacred", "shield", "size"],
    "sameSourceNeverStacks": true },
  "srdUrl": "https://www.d20srd.org/srd/theBasics.htm#stacking" }
```

CHECK: the breakdown popup shows suppressed (non-stacking) bonuses greyed out with the reason.

## 3. Amulet of Health (FR: Amulette de Constitution)

Source: https://www.d20srd.org/srd/magicItems/wondrousItems.htm#amuletofHealth ; FR https://regles-donjons-dragons.com/page1278.html
House-rules #8: the character's "Perle de constitution" is replaced by an **Amulet of Health +2**.

- Golden disk on a chain; **enhancement bonus to Constitution** of +2, +4 or +6.
- Moderate transmutation; CL 8th; Craft Wondrous Item, *bear's endurance*.
- Price 4,000 gp (+2), 16,000 gp (+4), 36,000 gp (+6) (= b² × 1,000).
- Slot: `neck`. Weight: none given (counts as 0).

```json
{ "id": "amuletOfHealth2", "name": { "en": "Amulet of Health +2", "fr": "Amulette de Constitution +2" },
  "slot": "neck", "price": { "gp": 4000 }, "casterLevel": 8, "aura": "moderate transmutation",
  "weight": { "lb": 0, "kg": 0 },
  "changes": [ { "target": "ability.con", "value": 2, "bonusType": "enhancement" } ],
  "srdUrl": "https://www.d20srd.org/srd/magicItems/wondrousItems.htm#amuletofHealth" }
```

Effect on the character (baseline, level 8): Con 16 → 18, modifier +3 → +4: +1 HP per HD (8 HD → +8 HP, 104 → 112), +1 Fort.
HP gained from a Con increase (even temporary) are not temporary hit points: they can be healed and are not lost first (https://www.d20srd.org/srd/combat/injuryandDeath.htm#increasesinConstitutionScoreandCurrentHitPoints). Removing the amulet lowers max HP by 8.
CHECK: does not stack with another enhancement bonus to Con (e.g. *bear's endurance* +4: only the +4 applies).

## 4. Potions

Source: https://www.d20srd.org/srd/magicItems/potionsAndOils.htm (FR: https://regles-donjons-dragons.com/page1461.html "Potions")

- One use. Duplicates a spell of up to 3rd level with casting time < 1 minute; no personal-range spells. Drinker = caster and target; the brewer made all choices.
- **Caster level = minimum level to cast the spell** (unless stated). Price = **spell level × caster level × 50 gp** (0-level = ½).
- Drinking = **standard action**, takes effect at once, **provokes attacks of opportunity**; if hit, Concentration check or the potion is lost. An enemy can target the vial (AC 13, 1 hp, hardness 1, break DC 12). Giving a potion to an unconscious creature: full-round action.
- Vial: 1 ounce of liquid. Weight — Resolved: see rulings-combat-equipment.md#r22-potion-weight
- Effects from potions are spells: their bonus types follow the spell.

| Potion (EN / FR spell name) | Spell level, min CL | Price | Effect | Duration at min CL | Bonus type | Sources |
|---|---|---|---|---|---|---|
| Cure light wounds / Soins légers | 1, CL 1 | 50 gp | heal 1d8 + 1 | instantaneous | — (healing) | https://www.d20srd.org/srd/spells/cureLightWounds.htm ; FR https://regles-donjons-dragons.com/page1082.html |
| Bull's strength / Force de taureau | 2, CL 3 | 300 gp | +4 Str | 1 min/level → **3 min (30 rounds)** | enhancement | https://www.d20srd.org/srd/spells/bullsStrength.htm ; FR https://regles-donjons-dragons.com/page805.html |
| Invisibility / Invisibilité | 2, CL 3 | 300 gp | invisible (see `conditions.md` "invisible"); ends if the subject attacks | 1 min/level → **3 min** | — (condition) | https://www.d20srd.org/srd/spells/invisibility.htm ; FR https://regles-donjons-dragons.com/page864.html |
| Levitate / Lévitation | 2, CL 3 | 300 gp | move self up/down 20 ft (6 m) per move action; no horizontal move (pull along walls at ½ speed); attacks while levitating −1, −2, … to −5; a full round stabilizing resets to −1 | 1 min/level → **3 min** | untyped penalty | https://www.d20srd.org/srd/spells/levitate.htm ; FR https://regles-donjons-dragons.com/page875.html |

Prices: https://www.d20srd.org/srd/magicItems/potionsAndOils.htm#tablePotionsandOils (CLW 50 gp; bull's strength, invisibility, levitate 300 gp).
FR: the spell names are verified; the item names "Potion de …" below are built from them (exact French item names: FR?).

```json
[
  { "id": "potionCureLightWounds", "name": { "en": "Potion of cure light wounds", "fr": "Potion de soins légers" },
    "price": { "gp": 50 }, "casterLevel": 1, "consumable": true,
    "instant": { "heal": "1d8+1" },
    "srdUrl": "https://www.d20srd.org/srd/spells/cureLightWounds.htm" },
  { "id": "potionBullsStrength", "name": { "en": "Potion of bull's strength", "fr": "Potion de force de taureau" },
    "price": { "gp": 300 }, "casterLevel": 3, "consumable": true,
    "duration": { "rounds": 30 },
    "changes": [ { "target": "ability.str", "value": 4, "bonusType": "enhancement" } ],
    "srdUrl": "https://www.d20srd.org/srd/spells/bullsStrength.htm" },
  { "id": "potionInvisibility", "name": { "en": "Potion of invisibility", "fr": "Potion d'invisibilité" },
    "price": { "gp": 300 }, "casterLevel": 3, "consumable": true,
    "duration": { "rounds": 30, "dismissible": true, "endsOnAttack": true },
    "appliesCondition": "invisible",
    "srdUrl": "https://www.d20srd.org/srd/spells/invisibility.htm" },
  { "id": "potionLevitate", "name": { "en": "Potion of levitate", "fr": "Potion de lévitation" },
    "price": { "gp": 300 }, "casterLevel": 3, "consumable": true,
    "duration": { "rounds": 30, "dismissible": true },
    "changes": [ { "target": "attack.all", "value": "-min(5, attackNumberSinceStable)", "bonusType": "untyped" } ],
    "notes": "vertical move 20 ft per move action",
    "srdUrl": "https://www.d20srd.org/srd/spells/levitate.htm" }
]
```

Bull's strength on the character: Str 18 → 22 (+4 → +6): melee attack +2, melee damage +2 (greatsword ×1½: +3), Climb/Jump +2, carrying capacity row 22 (`carrying-capacity.md`). Doesn't stack with another enhancement to Str (e.g. a belt of giant strength).
CHECK: a potion effect is a timed effect (rounds); the app counts it down and removes it at 0.
CHECK: invisibility ends when the subject attacks (prompt the user to end it).
CHECK: potions don't use a body slot.

## 5. Price formulas used by the app

Source: https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm#tableEstimatingMagicItemGoldPieceValues

| Effect | Price |
|---|---|
| Ability enhancement bonus | b² × 1,000 gp |
| Armor / shield enhancement | b² × 1,000 gp + masterwork item cost |
| Weapon enhancement | b² × 2,000 gp + masterwork item cost |
| Deflection AC bonus | b² × 2,000 gp |
| Natural armor enhancement | b² × 2,000 gp |
| Resistance bonus to saves | b² × 1,000 gp |
| Competence bonus to a skill | b² × 100 gp |
| Potion (single use, use-activated) | spell level × CL × 50 gp |
| Scroll | spell level × CL × 25 gp |
| Wand (50 charges) | spell level × CL × 750 gp |
| No slot | ×2 |
| Extra different power on a slotted item | ×1.5 for each extra |

CHECK (informative only): an entered price that differs from the formula → info message, not a warning (specific items are priced individually in the SRD).
