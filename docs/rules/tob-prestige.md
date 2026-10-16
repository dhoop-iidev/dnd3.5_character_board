# *Tome of Battle* prestige classes: mechanics sheet

Implementation notes for the eight prestige classes of *Tome of Battle* chapter 5 (pp. 95–130). Summaries in our own words; page numbers are the printed pages. Data: `src/data/custom/tob/prestige-classes.json` (classes) and `src/data/custom/tob/summaries-prestige.json` (one-line table summaries). **Status: data entered only.** House rule #15 (as of 2026-10-15) allows the warblade and five disciplines; these prestige classes need the house rule extended before they are offered at the table. Chapter 5 runs pp. 95–130 (pp. 131–151 are chapter 6, the legacy weapons "Nine Swords", not covered here).

Legend: **P** = passive, the engine can apply it as a modifier or computed value; **T** = toggle (an effect the player switches on, with fixed numbers); **D** = described only (text, a counter at most).

## Data fields beyond `ClassDef`

- `requirements.martial` (prerequisites `Prereq` can't express):
  - `maneuvers: [{ count, disciplines?, minLevel?, type? }]`: know `count` maneuvers from those disciplines (omitted = any), of at least `minLevel`; `type: "strike"` = must be a strike. Each entry is checked on its own.
  - `stances: [{ count, disciplines? }]`.
  - `distinctDisciplines: N` (Master of Nine): at least one maneuver from N different disciplines.
  - `keySkills: { count, ranks }` (Master of Nine): `ranks` in `count` different discipline key skills. Key skills (p. 41–42): Desert Wind Tumble, Devoted Spirit Intimidate, Diamond Mind Concentration, Iron Heart Balance, Setting Sun Sense Motive, Shadow Hand Hide, Stone Dragon Balance, Tiger Claw Jump, White Raven Diplomacy. Distinct *skills*: Balance counts once.
- **Stances count as maneuvers** for maneuver prerequisites and for prestige class and feat requirements (p. 43). So a stance counts toward `maneuvers` too.
- `martialAdvance`: per-level increments of maneuvers known / readied / stances, from the class tables. `initiatorLevel: "full"` for every class: each says it adds its full class levels to the initiator level (and so to the highest maneuver level known). Bloodstorm Blade has **no** `martialAdvance` (no maneuver columns, no initiator level).
- `spellcastingAdvance: { kind, levels }` (new, Jade Phoenix Mage and Ruby Knight Vindicator): at the listed class levels, +1 level of an existing arcane (resp. divine) spellcasting class for spells per day, caster level and spells known; no other class feature. Both skip levels 1 and 6. With two such classes, the player picks one per level.
- Bloodstorm Blade: `bonusFeatLevels` [3, 6, 9] with the fighter bonus feat list.
- Race requirements (Deepstone Sentinel: dwarf; Eternal Blade: elf), alignment, deity and spellcasting are in `requirements.other` as text. "Ability to turn or rebuke undead" (Ruby Knight) uses the wording `unmetPrereqs` already checks.

## Advancing a martial progression (pp. 96)

- **Martial adepts** (crusader, swordsage, warblade levels): new maneuvers known/readied add to one existing martial adept class (the player chooses which if several, and must keep to the prestige class's disciplines). Recovery method unchanged; with several adept classes, choose per new maneuver, permanently. A readied slot added to a crusader progression also adds one granted maneuver per encounter.
- **Maneuvers from feats** first (Martial Study): prestige class maneuvers add to those; if martial adept levels come later, the earlier maneuvers keep working as before and are tracked separately.
- **Nonmartial adepts** (no crusader/swordsage/warblade level before the prestige class):
  - Known = maneuvers from Martial Study + prestige class maneuvers known.
  - Readied = maneuvers from Martial Study + prestige class readied increments; if known > readied, choose; changing the selection takes 5 minutes.
  - Stances: from the prestige class's disciplines.
  - **No recovery in an encounter**: each readied maneuver is usable once per encounter; all recover with 5 minutes of exercise outside combat. Maneuvers gained this way keep that rule even if martial adept levels are taken later (only maneuvers from the new adept levels recover normally).
- Initiator level reminder (p. 39): martial adept levels + ½ other levels; these prestige classes add their levels in full.

## Bloodclaw Master (pp. 96–98) — d12, 2 + Int, BAB ¾, Fort/Ref good, Will poor, 5 levels

Requirements: Jump 9 ranks; Multiattack or Two-Weapon Fighting (Multiattack is a *Monster Manual* feat, not in `feats.json`: text); know 3 Tiger Claw maneuvers.
Martial: Tiger Claw; known +1 at 1, 3, 5; readied +1 at 3; no stances.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Shifting (Su) | 1/day (2/day at 3rd, 3/day at 5th), free action, Con mod + class level rounds: +2 Str (untyped in the text), two claws 1d4 (primary natural weapons; one claw = standard action, both = full attack, max one attack per claw per round; off-hand claw with normal two-weapon penalties) | T (Str +2, claw attacks) |
| 1 | Claws of the beast (Ex) | Two daggers or Tiger Claw weapons (kukri, kama, handaxe, unarmed strike, claws): off-hand adds full Str to damage | P (conditional on the weapon pair) |
| 2 | Superior two-weapon fighting (Ex) | Same weapon pairs: no −2 two-weapon attack penalty | P (conditional) |
| 2 | Tiger claw synergy, stance (Ex) | In a Tiger Claw stance: +1 dodge AC **or** +10 ft base speed, chosen on entering the stance | T (choice tied to the active stance) |
| 3 | Pouncing strike (Ex) | Two weapons: standard action (or end of charge) = one attack with each at highest bonus; expends one readied Tiger Claw strike | D |
| 3 | Low-light vision (Ex) | — | P (sense) |
| 4 | Tiger claw synergy, strike (Ex) | +1 on attack rolls of Tiger Claw strikes | P (on Tiger Claw strike attacks) |
| 5 | Rending claws (Ex) | While shifting, two daggers/Tiger Claw weapons, both hit one foe in a round: 2nd hit +2d6; counts as a Tiger Claw boost and expends one readied | D |
| 5 | Scent (Ex) | MM 314 | P (sense) |

Eberron shifter sidebar (p. 97): ignored (not our setting).

## Bloodstorm Blade (pp. 100–102) — d12, 4 + Int, BAB full, Fort good, Ref/Will poor, 10 levels

Requirements: Balance 8 ranks; Point Blank Shot; know 1 Iron Heart **strike** and 1 Iron Heart stance.
Martial: none (no maneuvers, no initiator level).

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Returning attacks (Ex) | Any thrown weapon acts as returning (DMG 225); each use expends a readied Iron Heart strike | D |
| 1 | Throw Anything | Bonus feat (*Complete Warrior*; reprinted p. 101: Dex 15, proficiency, BAB +2 — granted regardless): throw any proficient melee weapon, range increment 10 ft, no −4 | P (not in `feats.json`: needs a custom feat or a feature flag) |
| 1 | Weapon aptitude (Ex) | Fighter level for feat prerequisites = warblade + bloodstorm blade levels − 2 (replaces, does not stack with, the warblade's own −2: engine today uses `fighter + max(0, warblade − 2)`; make it `fighter + max(0, warblade + bloodstorm − 2)`); daily 1-hour reassignment of single-weapon feats | P (prereq) + D |
| 2 | Martial throw (Ex) | Single-target Iron Heart strikes with a thrown weapon | D |
| 2 | Thunderous throw (Ex) | Swift action: thrown attacks this turn use melee attack bonus (range penalties still apply); two-handed thrown weapon: 1½ Str, Power Attack ×2 | T |
| 3, 6, 9 | Bonus fighter feat | Fighter bonus feat list, prerequisites apply | P (feat slots) |
| 4 | Lightning ricochet (Ex) | Thrown weapons return instantly on your turn: full attack all thrown or mixed | D |
| 5 | Blood wind ricochet (Ex) | Full-round full attack with a thrown weapon, each attack on a different target, range/cover from last target; expends a readied Iron Heart strike | D |
| 7 | Eye of the storm (Ex) | Swift, replaces the current Iron Heart stance benefit: +4 dodge AC vs ranged, +2 competence Reflex, swift-action melee riposte against a foe making an AoO on your ranged attack; move ≤ 10 ft/turn | T (AC vs ranged, Reflex) |
| 8 | Blood rain (Ex) | Swift, replaces the Iron Heart stance benefit: creatures you damage bleed 3 hp at the start of your turn (ends: healing, DC 15 Heal, end of stance); doesn't stack | D |
| 10 | Blade storm (Ex) | Full-round: one thrown attack at highest bonus against each of any number of targets; expends a readied Iron Heart strike | D |

Sidebar p. 102 (stopping a returning weapon): table-side, not encoded.

## Deepstone Sentinel (pp. 105–106) — d10, 2 + Int, BAB ¾, Fort good, Ref/Will poor, 5 levels

Requirements: dwarf; BAB +10; Balance 13 ranks; Power Attack or Stone Power (ToB feat p. 32, not in `feats.json`): text; know 2 Stone Dragon maneuvers and 1 Stone Dragon stance.
Martial: Stone Dragon; known +1 at 1, 3, 5; readied +1 at 3; no stances.
Save DC of the class abilities: 10 + ½ character level + Str modifier.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Mountain fortress stance (Su) | Swift, replaces the Stone Dragon stance benefit; needs earth/stone (rock ≤ 1 ft below): 5-ft pillar under you, adjacent squares difficult terrain, entering/leaving = DC 10 Balance or prone (+4 four legs/stability; flyers and difficult-terrain-immune creatures unaffected); ends on leaving the stance or moving > 5 ft in a round; a 5-ft step moves it | T (no number on the sheet; a status flag) |
| 1 | Passwall (Sp) | 1/day per class level, CL = class level | D (uses/day counter) |
| 2 | Crashing mountain juggernaut (Su) | Start turn in mountain fortress: full-round, ends the stance; creatures in the terrain DC 15 Balance or prone (no leg/stability bonus); optional charge, hit +2d6; not on the turn mountain fortress is activated | D |
| 3 | Indomitable redoubt (Ex) | In mountain fortress stance, also benefit from one Stone Dragon stance | P (allows two active stances; engine: let a Stone Dragon stance stay active alongside) |
| 4 | Stone curse (Su) | Immediate, after a melee hit and before damage: Will or speed 0 except fly, 1 round | D (show DC) |
| 4 | Dragon's tooth (Su) | Standard: 5/10-ft pillar within 60 ft from natural ground; occupant Reflex or prone; dismiss as standard | D (show DC) |
| 5 | Awaken the stone dragon (Su) | 1/encounter, swift: enemies within 60 ft Reflex or 12d6 + prone; save = half, standing; stability doesn't help | D (show DC) |

## Eternal Blade (pp. 109–111) — d10, 2 + Int, BAB full, Fort good, Ref/Will poor, 10 levels

Requirements: elf; BAB +10; Weapon Focus (any: `"weapon-focus"` without choice); know 2 Devoted Spirit or Diamond Mind maneuvers.
Martial: Devoted Spirit, Diamond Mind, Iron Heart, White Raven; known +1 at 1, 3, 5, 7, 9; readied +1 at 3, 6, 9; stance +1 at 5.
Most features need access to the blade guide (lost while the guide is destroyed, out of line of effect, or manifesting).

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Blade guide (Su) | Incorporeal Fine spirit, hp = yours, AC 18, fly 30 ft perfect, your saves, telepathy, your senses; returns in 1d6 rounds; may manifest to speak ≤ 10 min/day (features lost meanwhile) | D (a "guide available" toggle gating the others) |
| 1 | Eternal training (Ex) | 1/day, +1 use at 3, 5, 7, 9 (5/day at 9th); max 1/encounter; one encounter: insight bonus = Int bonus (if positive) on attack **and** damage vs one creature type (subtype for humanoid/outsider), **or** one Devoted Spirit/Diamond Mind maneuver (prereq met; recoverable; forgotten after) | T (insight attack/damage vs chosen type) + uses counter |
| 2 | Guided strike (Ex) | Swift: overcome one foe's DR for the rest of the turn | D |
| 3 | Armored uncanny dodge (Ex) | Uncanny dodge; improved uncanny dodge if you already have uncanny dodge (warblade 2 does); works in medium/heavy armor | P (while guide available) |
| 4 | Eternal knowledge (Ex) | Guide's Knowledge checks = eternal blade level + Int mod, 2 fields, +1 field at 6, 8, 10 | P (computed value, shown as text) |
| 6 | Defensive insight (Ex) | Swift: dodge AC = Int bonus vs one foe until next turn | T |
| 8 | Tactical insight (Ex) | Swift: foes you hit in melee this turn take −Int bonus AC against allies for 1 round | D |
| 10 | Island in time (Ex) | 1/encounter: take a turn as an immediate action, initiative count unchanged | D |

## Jade Phoenix Mage (pp. 113–116) — d6, 2 + Int, BAB full, Fort good, Ref/Will poor, 10 levels

Requirements: any nonevil; Concentration 9, Knowledge (arcana) 2, (history) 2, (religion) 2; know 2 maneuvers incl. 1 strike; 1 stance; cast 2nd-level arcane spells.
Martial: Desert Wind, Devoted Spirit; known +1 at 1, 3, 5, 7, 9; readied +1 at 3, 6, 9; stance +1 at 5.
Spellcasting: +1 arcane class level at 2, 3, 4, 5, 7, 8, 9, 10.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Arcane wrath (Su) | Swift, lose an arcane prepared spell or slot: +4 on one attack/strike and +1d10 per spell level, before next turn | D (could be a one-shot effect) |
| 1 | Rite of waking (Ex) | +2 on all Knowledge checks, Knowledge usable untrained; +2 on saves vs death and fear effects | P (Knowledge +2; saves conditional) |
| 2 | Mystic phoenix stance (Su) | Swift, replaces any stance's benefit: +1 arcane caster level, +2 dodge AC; optional slot spent: DR (2 × spell level)/evil, max 10/evil | T |
| 4 | Empowering strike (Su) | 1/encounter, after a strike hits: next arcane spell before end of next turn empowered, no level increase | D |
| 6 | Firebird stance (Su) | Swift, replaces a stance's benefit: fire resistance 10, +3 CL for fire spells; optional slot: 10-ft aura 1d6/spell level (half fire, half untyped) each turn for 1 minute, Reflex half DC 14 + key casting mod | T |
| 6 | Jade Phoenix master (Su) | Perform the Rite of Waking; 1-minute meditation senses nearest Jade Phoenix mage | D |
| 8 | Quickening strike (Su) | 1/encounter, after a strike hits: next arcane spell ≤ 5th quickened, no level increase | D |
| 10 | Emerald immolation (Sp) | 1/week: 20d6 in 20 ft (half fire), Reflex half DC 19 + key casting mod; failed extraplanar creatures Will same DC or dismissed; you re-form 1d6 rounds later with gear, dazed 1 round, fully healed; 9th-level spell equivalent | D |

## Master of Nine (pp. 119–120) — d8, 6 + Int, BAB ¾, Fort/Ref poor, Will good, 5 levels

Requirements: 10 ranks in four discipline key skills; Adaptive Style (ToB p. 28, not in `feats.json`: text), Dodge, Blind-Fight, Improved Initiative, Improved Unarmed Strike; know a maneuver from 6 different disciplines.
Martial: all nine; known +2/+1/+2/+1/+2; readied +1 every level; stance +1 at 2 and 4.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 2 | Dual stance (Ex) | Keep a stance when entering one of another discipline; 2 rounds per class level per day | T (second active stance) + rounds counter |
| 3 | Perfect form (Ex) | +1 save DC of maneuvers you initiate | P (maneuver DCs) |
| 4 | Counter stance (Ex) | Change stance as part of a counter, even off-turn | D |
| 5 | Mastery of nine (Ex) | Strikes: +2 attack; + damage = number of disciplines among the day's readied maneuvers | P (strike attack +2; damage computed from readied list) |

## Ruby Knight Vindicator (pp. 122–123) — d8, 4 + Int, BAB full, Fort/Ref poor, Will good, 10 levels

Requirements: Hide 4, Intimidate 4, Knowledge (religion) 8; know 1 Devoted Spirit maneuver and 1 Devoted Spirit stance; deity Wee Jas (not an SRD deity: text); ability to turn or rebuke undead.
Martial: Devoted Spirit, Shadow Hand, Stone Dragon, White Raven; known +1 at 2, 4, 6, 8, 10; readied +1 at 5, 9; stance +1 at 1, 6.
Spellcasting: +1 divine class level at 2, 3, 4, 5, 7, 8, 9, 10 (the text says "devoted enforcer" once: a leftover name, read as this class). A paladin can keep taking paladin levels.

The class does **not** raise turning level or turning uses: its features spend turn/rebuke attempts. Only the uses counter matters.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 2 | Divine recovery (Su) | Swift, spend 1 turn/rebuke: recover one expended maneuver (crusader: immediately granted) | D (decrements turning uses) |
| 5 | Armored stealth (Ex) | No armor check penalty on Hide | P (skip ACP for `hide`) |
| 7 | Divine impetus (Su) | Spend 1 turn/rebuke: +1 swift action this round | D |
| 9 | Divine fury (Su) | Free action, spend 1 turn/rebuke: +4 sacred (profane if evil) on one strike's attack this turn, +1d10 damage | T (one-shot) |

## Shadow Sun Ninja (pp. 126–128) — d8, 4 + Int, BAB ¾, all saves good, 10 levels

Requirements: any good; BAB +3; Hide 8 ranks; Improved Unarmed Strike; know a 2nd-level Setting Sun or Shadow Hand maneuver, a Setting Sun maneuver and a Shadow Hand maneuver.
Martial: Setting Sun, Shadow Hand; known +1 at 1, 3, 6, 9; readied +1 at 5, 10; stance +1 at 5.
Save DC of the class abilities: 10 + ½ character level + Wis modifier.

| Lvl | Feature | Numbers | Kind |
|---|---|---|---|
| 1 | Monk abilities | Class levels + monk levels for: monk AC bonus, unarmed damage, unarmored speed bonus, flurry penalty, Stunning Fist uses. No monk levels: monk AC bonus of a monk of SSN level; Stunning Fist uses count SSN levels like monk levels (1/level, other classes 1 per 4). No other monk feature | P (monk AC bonus, unarmed damage, speed, Stunning Fist uses computed on monk + SSN level) |
| 1 | Touch of the Shadow Sun (Su) | Standard, melee touch: negative energy = base unarmed damage + Wis mod (heals undead); next round heal that amount by touch (standard; swift if willing); alternate, never both in a round | D |
| 2 | Flame of the Shadow Sun (Su) | Immediate: cold resistance 10 to start of next turn; if it reduced damage, swift next turn: 60-ft ranged touch, 2d6 fire | T (cold resistance) |
| 4 | Light within darkness (Su) | Melee attack the round after a successful Hide: undetecting foes within 60 ft Fort or blinded 1 round | D |
| 5 | Darkness within light (Su) | Self-blind (and deafen) until next turn: vs blinded foes no blindness drawbacks, +4 melee attack and damage, −2 on their saves vs your Stunning Fist | T |
| 7 | Void of the Shadow Sun (Su) | Swift: +2 deflection AC to next turn; if hit anyway: lost, not reusable next turn, and next round a standard action releases a 30-ft burst 8d6 cold (Fort half) | T (+2 deflection) |
| 8 | Child of shadow and light (Su) | Swift, replaces a Setting Sun/Shadow Hand stance benefit: alternating each round, 60-ft dazzle (1 round) or 60-ft total darkness; 9th-level spell vs magical light/darkness | D |
| 10 | Balance of light and dark (Su) | 1/day, swift, 1 minute: immune to crits, mind-affecting, death attacks, energy drain, poison; +8 Hide; healed by negative energy; +4 attack vs creatures in darkness/shadow; unarmed hits may bestow a negative level (heal 5 each, last 1 hour). Afterwards 1 Con damage per negative level; at Con 0 you become a vampire in 1d4 days unless *true resurrection* | T (Hide +8, conditional attack) |

## Open questions (not decided; ask the user before implementing)

1. **Overlapping requirement entries.** Shadow Sun Ninja: can one 2nd-level Setting Sun maneuver count both as "a 2nd-level Setting Sun or Shadow Hand maneuver" and as "a Setting Sun maneuver"? Deepstone Sentinel: can the Stone Dragon stance be one of the "two Stone Dragon maneuvers" (p. 43 says stances count as maneuvers)? Same for Jade Phoenix Mage (2 maneuvers incl. a strike, plus a stance). The book doesn't say whether the entries need distinct maneuvers. Not researched online yet.
2. **Jade Phoenix Mage class skills** (p. 115) are word for word the Eternal Blade list (no Knowledge (arcana), no Spellcraft, odd for a mage). Likely a misprint; no errata found in the book. Entered as printed.
3. **Bloodstorm Blade weapon aptitude vs warblade weapon aptitude**: the book's formula (warblade + bloodstorm levels − 2) implies one combined −2; noted above for the engine.
4. **Feats missing from `feats.json`**: Multiattack (MM), Throw Anything (*Complete Warrior*), Adaptive Style and Stone Power (ToB). Requirements using them are text in `other`.
