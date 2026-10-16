# *Tome of Battle*: crusader and swordsage mechanics

Implementation sheet for the two other martial adept base classes (the warblade is in `warblade.json`). Summaries in our own words, never the book text; page numbers are the printed pages of *Tome of Battle* (the PDF page index equals the printed page). Data: `src/data/custom/tob/crusader*.json`, `swordsage*.json`, `summaries-classes.json`.

**Status:** both classes are outside house rule #15 as written (it allows the warblade and its five disciplines only). They, and the disciplines they add (Devoted Spirit, Desert Wind, Setting Sun, Shadow Hand), need a `confirmed` house-rule entry before they are offered in the app.

## Common to all martial adepts (pp. 38–40)

- **Initiator level** (p. 39) = level in that adept class + ½ of all other class levels (round down); prestige classes usually add their full level. A multiclass adept has a separate initiator level per adept class (book example: crusader 7 / swordsage 5 → IL 9 as crusader, IL 8 as swordsage). No adept level: ½ character level.
- Highest maneuver level by initiator level: Table 3–1, p. 39 (copied in each `*-progression.json`).
- **Swap** (pp. 9, 15): at 4th level and every even level after, replace one known maneuver (not a stance) with another of any level allowed.
- **Readying** (pp. 9, 15, 38): 5 minutes (crusader: prayer; swordsage: meditation and exercise). Readied maneuvers stay readied until changed.
- **Initiating** (p. 38): only a readied, unexpended maneuver, and for the crusader only a **granted** one. Stances: swift action, never expended, kept until changed, work outside combat too.
- **Recovery at the end of an encounter** (p. 40): every adept recovers everything automatically. During long fights: 1 full minute without attacking, initiating a maneuver or being targeted by an attack.
- **Multiclass adepts** (p. 40): readied, expended and recovery are tracked separately per class.

## Crusader (pp. 8–14, Table 1–1 p. 10)

- d10, 4 + Int skill points (×4 at 1st), full BAB, good Fort, poor Ref/Will. Proficiencies: simple and martial weapons, all armor, all shields (tower shield included: "all shields" in the text). Alignment: any except true neutral (p. 8).
- Class skills: Balance, Concentration, Craft, Diplomacy, Intimidate, Jump, Knowledge (history), Knowledge (religion), Martial Lore, Ride.
- Disciplines: Devoted Spirit, Stone Dragon, White Raven (p. 9). Key skills: Intimidate, Balance, Diplomacy (p. 12).
- Known 5 → 14; readied 5 (6 at 10th, 7 at 20th); stances 1, +1 at 2nd, 8th, 14th (4 max). See `crusader-progression.json`.

### Granting and recovery (pp. 9–10, 38, 40)

1. Encounter start, before the crusader's first action: draw **G** of the readied maneuvers at random; they are *granted*, the others are *withheld*. **G** = 2 (levels 1–9), 3 (10–19), 4 (20) (`maneuversGranted`, the number in brackets in the table).
2. On her turn she may initiate any maneuver that was granted when the turn began (and is not expended).
3. **End of each of her turns**, whether she used maneuvers or not: one random withheld maneuver becomes granted.
4. If at the end of a turn there is **no withheld maneuver left to grant**: recover all expended maneuvers, reshuffle, draw a new set of granted maneuvers (the rest withheld), and continue from step 3 at the end of the next turn. P. 40 adds that the turn in which the last withheld maneuver gets granted does not count: recovery happens at the end of the *following* turn.
5. No voluntary recovery action. End of encounter: everything recovered (p. 40).
- With R readied and G granted, a full cycle lasts R − G + 1 turns (e.g. 1st level: 5 − 2 + 1 = 4 turns).
- p. 38 suggests a deck of cards: face up = granted, face down = withheld, discard pile = expended. A UI could do the same with a "draw" button at the end of the turn.

### Class features

| Level | Feature | Numbers |
|---|---|---|
| 1 | **Steely resolve** (Ex, p. 10) | Delayed damage pool, empty at the start of each encounter. Hit-point damage from attacks goes into it instead of the hit points, up to the cap; overflow is taken at once. At the end of her **next** turn she takes the pool's total and it resets to 0. Healing: she chooses, and may split, between reducing the pool and restoring hit points. Riders of the attack (poison save, energy drain, stun, petrification…) apply immediately. Cap: 5 at 1st, 10 at 4th, 15 at 8th, 20 at 12th, 25 at 16th, 30 at 20th (`delayedDamagePool`). |
| 1 | **Furious counterstrike** (Ex, pp. 10–11) | During her turn only: bonus on attack **and** damage rolls = floor(pool ÷ 5), minimum +1 (when the pool holds at least 1 point), maximum +6. Table: 1–9 → +1, 10–14 → +2, 15–19 → +3, 20–24 → +4, 25–29 → +5, 30+ → +6. Untyped. Lasts until the end of her turn. |
| 2 | **Indomitable soul** (Ex, p. 11) | + Cha bonus (if positive) on Will saves. Does not stack with a paladin's divine grace (take the higher if she has both). |
| 3 | **Zealous surge** (Ex, p. 11) | 1/day: reroll one saving throw, no action, decided after seeing the roll but before knowing success; the reroll stands even if lower. |
| 6, 18 | **Smite** (Ex, p. 11) | 1/day at 6th, 2/day at 18th. Next melee attack: + Cha bonus (if any) on the attack roll, + crusader level on damage. No alignment restriction. |
| 10 | **Die hard** (Ex, p. 11) | Diehard as a bonus feat (`grantedFeats` in `crusader.json`). |
| 13 | **Mettle** (Ex, p. 11) | On a successful Fortitude or Will save against an effect that still has a lesser effect on a success (half, partial), no effect at all. Not while unconscious or asleep. |

Table "Special" also lists "Steely resolve 10/15/20/25/30" at 4/8/12/16/20: those rows are the pool cap increases.

## Swordsage (pp. 15–19, Table 1–2 p. 16)

- d8, 6 + Int skill points (×6 at 1st), ¾ BAB, poor Fort, good Ref/Will. Proficiencies: simple weapons, martial **melee** weapons (thrown ones included), light armor; no shields. Any alignment.
- Class skills: Balance, Climb, Concentration, Craft, Heal, Hide, Intimidate, Jump, Knowledge (history), Knowledge (local), Knowledge (nature), Knowledge (nobility and royalty), Listen, Martial Lore, Move Silently, Profession, Ride, Sense Motive, Swim, Tumble.
- Disciplines: Desert Wind, Diamond Mind, Setting Sun, Shadow Hand, Stone Dragon, Tiger Claw (p. 15).
- Known = level + 5 (6 → 25); readied 4 → 12; stances 1, +1 at 2nd, 5th, 9th, 14th, 20th (6 max). See `swordsage-progression.json`.

### Recovery (pp. 16, 40)

- **Full-round action** of meditation (does not provoke): refresh **one** expended maneuver of his choice; it can be used from a later round.
- End of encounter: everything (p. 40).

### Class features

| Level | Feature | Numbers |
|---|---|---|
| 1, 5, 10, 15, 20 | **Quick to act** (Ex, p. 16) | Untyped bonus on initiative: +1 at 1st, +2 at 5th, +3 at 10th, +4 at 15th, +5 at 20th. |
| 1 | **Discipline focus: Weapon Focus** (Ex, p. 16) | Choose one swordsage discipline in which he knows at least one maneuver: benefit of Weapon Focus (+1 attack) with that discipline's associated weapons (Chapter 4 / `disciplines.json` `associatedWeapons`). |
| 4, 12 | **Discipline focus: insightful strike** (p. 16) | Choose a discipline (second one at 12th): + Wis modifier on damage rolls of **strikes** from it. |
| 8, 16 | **Discipline focus: defensive stance** (p. 16) | Choose a discipline (second one at 16th): +2 on all saving throws while in a **stance** from it. |
| all | Discipline focus, Martial Lore (p. 16) | +2 on Martial Lore checks about a maneuver of a discipline he has any focus in. |
| 2 | **AC bonus** (p. 16) | + Wis modifier to AC when wearing light armor, unencumbered and without a shield. Applies to touch AC and when flat-footed; lost when immobilized or helpless. |
| 7 | **Sense magic** (Su, p. 16) | 10 minutes studying a weapon or armor, level check d20 + level vs DC 10 + the item's caster level: learn its properties (enhancement, special abilities). Artifacts and legacy weapons are only revealed as very powerful. |
| 9 | **Evasion** (Ex, p. 17) | As rogue: successful Reflex save vs a half-damage effect → no damage. Only in light or no armor; not when helpless. |
| 17 | **Improved evasion** (Ex, p. 17) | Also half damage on a failed Reflex save; not when helpless. (The text does not repeat the armor limit.) |
| 20 | **Dual boost** (Ex, p. 17) | 3/day: when initiating a boost, also initiate another known (readied, unexpended) boost as a free action; both are expended. |

Discipline focus choices are permanent: a later choice never changes an earlier one. Data model: one choice per grant (levels 1, 4, 8, 12, 16), each a discipline id; 12th and 16th should normally differ from 4th and 8th (the text says "a second discipline").

## Doubts to ask the user / research

1. **House rule #15** covers only the warblade: crusader, swordsage and the four extra disciplines need a new `confirmed` entry.
2. **Steely resolve and non-attack damage**: the text says damage from a "blow" when "attacked". Does damage from spells or area effects (a fireball, a failed Reflex save) go into the pool? RAW leans to *attacks only*; the community is split.
3. **Steely resolve timing**: "at the end of your next turn" — damage taken during the crusader's own turn (e.g. an attack of opportunity) would wait until the end of her *following* turn. Assumed so.
4. **Furious counterstrike minimum +1**: assumed only when the pool holds ≥ 1 point (the table starts at 1–9); an empty pool gives nothing.
5. **New granted set after recovery**: the text says "a new pair"; assumed it uses the level's G (3 at 10th, 4 at 20th), like the start of an encounter.
6. **Swordsage AC bonus with no armor**: the text says "wear light armor"; reading it as "light or no armor" (as monk-like abilities do) is the common reading but not written. "Unencumbered" assumed = light load. Wis *modifier* means a negative Wis lowers AC.
7. **Sense magic "level check"**: which level (swordsage level or character level) is not said. Suggest swordsage level (class-feature rule of the FAQ), or ask.
8. **Insightful strike on boosts/counters**: only "strikes" are named; boosts and counters excluded as written.
9. **No "discipline mastery"** in the swordsage table: the 20th-level capstone is **dual boost**. If "discipline mastery" was meant, it is not in this book's swordsage.
