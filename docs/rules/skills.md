# Skills (Compétences)

D&D 3.5 SRD only. Summaries in our own words.
French terms checked on regles-donjons-dragons.com unless marked "(FR?)".

Main sources:
- Skills summary (ranks, max ranks): https://www.d20srd.org/srd/skills/skillsSummary.htm
- Using skills (untrained, synergy): https://www.d20srd.org/srd/skills/usingSkills.htm
- Skill description format (key ability, trained only, ACP): https://www.d20srd.org/srd/skills/skillDescriptions.htm
- Multiclass skills: https://www.d20srd.org/srd/classes/multiclass.htm#multiclassSkills
- Armor check penalty: https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty
- FR: https://regles-donjons-dragons.com/page231.html (compétences), skill pages page232–page267

## Terms

| EN | FR |
|---|---|
| skill / skill points | compétence / points de compétence |
| rank | degré de maîtrise |
| class skill / cross-class skill | compétence de classe / compétence hors classe |
| character level | niveau global |
| key ability | caractéristique associée (FR?) — the FR page says "le modificateur de la caractéristique associée à cette compétence" |
| trained only | formation nécessaire |
| untrained check | test inné (de compétence) |
| armor check penalty | malus d'armure aux tests |
| synergy | synergie |
| skill modifier | modificateur de compétence |

## 1. Skill check

`skill modifier = ranks + key ability modifier + misc. modifiers` (racial, armor check penalty, feats, synergy, items…); check = d20 + skill modifier. Natural 20/1 are not automatic success/failure on skill checks.
— https://www.d20srd.org/srd/skills/skillsSummary.htm#skillCheck , https://www.d20srd.org/srd/skills/usingSkills.htm#skillChecks

Only whole ranks count: half ranks don't improve the check (two halves make 1 rank).
— https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers

CHECK (formula): `skillTotal = floor(ranks) + abilityMod(key) + Σ misc` — https://www.d20srd.org/srd/skills/skillsSummary.htm#skillCheck

## 2. Skill points per level

| When | Points | Source |
|---|---|---|
| Character level 1 | (class base + Int mod) × 4 | https://www.d20srd.org/srd/classes/fighter.htm ("Skill Points at 1st Level") |
| Each later level | class base + Int mod | same |
| Minimum | at least 1 skill point per level from Int (Int penalty can't go below 1) | https://www.d20srd.org/srd/theBasics.htm#intelligenceInt |
| Human | +4 at 1st level, +1 each later level | https://www.d20srd.org/srd/races.htm#humans |

Class base: Fighter 2 (https://www.d20srd.org/srd/classes/fighter.htm), Weapon Master 2 (`weapon-master.md`).
The class used is the class **taken at that level**.

- Int increase is not retroactive; enhancement bonus to Int doesn't count, inherent bonus does (see `abilities.md` §5).
- Skill points can't be saved for later levels. — https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers

CHECK (formula): `pointsAtLevel(N) = (N == 1 ? 4 : 1) × max(1, classBase(classOfLevel N) + IntModAtLevel N, no enhancement) + (human ? (N == 1 ? 4 : 1) : 0)` — URLs above. Resolved: see rulings-character.md#q3
CHECK: points spent at level N == pointsAtLevel(N) (warning if fewer: "unspent"; if more: "overspent") — https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers
Baseline (Int 13, +1): level 1 = (2+1)×4 + 4 = 16; each later level = 2 + 1 + 1 = 4. Through level 9: 16 + 8 × 4 = 48.

## 3. Cost of ranks

- Class skill: 1 skill point = 1 rank.
- Cross-class skill: 1 skill point = ½ rank (2 points for a full rank).
— https://www.d20srd.org/srd/skills/skillsSummary.htm , https://www.d20srd.org/srd/skills/skillsSummary.htm#miscellaneousModifiers

CHECK (formula): `pointsSpent = Σ classRanksBought × 1 + Σ crossClassRanksBought × 2` per level — https://www.d20srd.org/srd/skills/skillsSummary.htm

## 4. Maximum ranks

- Class skill: character level + 3.
- Cross-class skill: half of that, not rounded (so x.5 values exist: 2, 2½, 3, 3½…).
- Multiclass: if the skill is a class skill for **any** of the character's classes, max = character level + 3, whatever way the ranks were bought; else half.
— https://www.d20srd.org/srd/skills/skillsSummary.htm , https://www.d20srd.org/srd/classes/multiclass.htm#multiclassSkills , table https://www.d20srd.org/srd/xp.htm

CHECK: ranks(skill) ≤ characterLevel + 3 if skill is a class skill of any class the character has — https://www.d20srd.org/srd/classes/multiclass.htm#multiclassSkills
CHECK: ranks(skill) ≤ (characterLevel + 3) / 2 (no rounding) otherwise — https://www.d20srd.org/srd/skills/skillsSummary.htm
CHECK (history): the two checks above hold after **every** level record, using the classes owned at that level (e.g. Listen/Spot at Fighter levels are cross-class: max 4½ at level 6) — https://www.d20srd.org/srd/skills/skillsSummary.htm

## 5. Untrained use (test inné)

- A skill without "Trained Only" can be used with 0 ranks: roll with the key ability modifier and other modifiers. — https://www.d20srd.org/srd/skills/usingSkills.htm#untrainedSkillChecks
- "Trained Only" skills need at least 1 rank. — https://www.d20srd.org/srd/skills/skillDescriptions.htm#trainedOnly
- Some skills have a specific "Untrained" rule (e.g. Handle Animal: Cha check to handle/push domestic animals; Knowledge: an untrained check is an Int check, only very easy questions (DC ≤ 10)). — https://www.d20srd.org/srd/skills/handleAnimal.htm , https://www.d20srd.org/srd/skills/knowledge.htm

CHECK (display): a trained-only skill with 0 ranks shows "not usable untrained" instead of a total (except the special untrained uses above) — https://www.d20srd.org/srd/skills/skillDescriptions.htm#trainedOnly

## 6. Armor check penalty (malus d'armure aux tests)

- Applies to: Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Tumble. — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty
- **Swim: double** the armor check penalty (and the encumbrance penalty). — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty , https://www.d20srd.org/srd/skills/swim.htm
- Armor and shield penalties both apply. Encumbrance (load) can also give a check penalty. — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty
- Nonproficient armor/shield: the penalty also applies to attack rolls and all Str- and Dex-based ability and skill checks. — same
- Each skill header shows "Armor Check Penalty" when it applies. — https://www.d20srd.org/srd/skills/skillDescriptions.htm#armorCheckPenalty

CHECK (formula): `ACP = armorACP + shieldACP` (how load and armor penalties combine: see the equipment/load docs) applied to the 8 skills; ×2 for Swim — https://www.d20srd.org/srd/equipment/armor.htm#armorCheckPenalty
Baseline: full plate −5 (magic = masterwork, −1 better) → Climb 4 + 4 − 5 = +3, Jump 2 + 4 − 5 = +1.

## 7. Synergy (synergie)

Rule: 5 or more ranks in one skill → +2 on the listed checks (sometimes only for specific uses). — https://www.d20srd.org/srd/skills/usingSkills.htm#skillSynergy
Table: https://www.d20srd.org/srd/skills/usingSkills.htm#tableSkillSynergies (the skill pages' "Synergy" entries agree with it)

| 5+ ranks in | +2 on | Conditional? |
|---|---|---|
| Bluff | Diplomacy | no |
| Bluff | Disguise | only to act in character when observed |
| Bluff | Intimidate | no |
| Bluff | Sleight of Hand | no |
| Craft (any) | Appraise | only for items of that Craft |
| Decipher Script | Use Magic Device | only scrolls |
| Escape Artist | Use Rope | only to bind someone |
| Handle Animal | Ride | no |
| Handle Animal | wild empathy (class feature) | no |
| Jump | Tumble | no |
| Knowledge (arcana) | Spellcraft | no |
| Knowledge (architecture and engineering) | Search | only secret doors / hidden compartments |
| Knowledge (dungeoneering) | Survival | only underground |
| Knowledge (geography) | Survival | only to avoid getting lost / natural hazards |
| Knowledge (history) | bardic knowledge | class feature |
| Knowledge (local) | Gather Information | no |
| Knowledge (nature) | Survival | only aboveground natural environments |
| Knowledge (nobility and royalty) | Diplomacy | no |
| Knowledge (religion) | turn/rebuke undead checks | class feature |
| Knowledge (the planes) | Survival | only on other planes |
| Search | Survival | only to find/follow tracks |
| Sense Motive | Diplomacy | no |
| Spellcraft | Use Magic Device | only scrolls |
| Survival | Knowledge (nature) | no |
| Tumble | Balance | no |
| Tumble | Jump | no |
| Use Magic Device | Spellcraft | only to decipher spells on scrolls |
| Use Rope | Climb | only climbing ropes / rope-and-wall |
| Use Rope | Escape Artist | only escaping rope bonds |

Synergy bonuses are untyped in the SRD text ("+2 bonus"); several synergies to the same skill (e.g. Diplomacy from Bluff, Sense Motive, Knowledge (nobility)) are all listed separately.
CHECK (formula): `synergy(target) = Σ +2 for each unconditional source skill with ranks ≥ 5`; conditional ones shown as a note, not in the total — https://www.d20srd.org/srd/skills/usingSkills.htm#tableSkillSynergies
Baseline: no skill has a synergy partner with 5+ ranks (Intimidate 7 gives nothing; Bluff would be the source for Intimidate).

Not a synergy but rank-based: Tumble 5+ ranks → +3 (not +2) dodge AC when fighting defensively, +6 (not +4) on total defense. — https://www.d20srd.org/srd/skills/tumble.htm

## 8. 3.5 skill list

Header data (key ability; Trained Only "T"; Armor Check Penalty "ACP") read from each SRD skill page `https://www.d20srd.org/srd/skills/<name>.htm`. FR names from https://regles-donjons-dragons.com/page231.html and each FR skill page header. "F" = Fighter class skill, "WM" = Weapon Master class skill (house-rules #6).

| Skill | FR | Key | T | ACP | F | WM | URL |
|---|---|---|---|---|---|---|---|
| Appraise | Estimation | Int | | | | | https://www.d20srd.org/srd/skills/appraise.htm |
| Balance | Équilibre | Dex | | yes | | | https://www.d20srd.org/srd/skills/balance.htm |
| Bluff | Bluff | Cha | | | | | https://www.d20srd.org/srd/skills/bluff.htm |
| Climb | Escalade | Str | | yes | F | | https://www.d20srd.org/srd/skills/climb.htm |
| Concentration | Concentration | Con | | | | | https://www.d20srd.org/srd/skills/concentration.htm |
| Craft (each) | Artisanat | Int | | | F | | https://www.d20srd.org/srd/skills/craft.htm |
| Decipher Script | Décryptage | Int | T | | | | https://www.d20srd.org/srd/skills/decipherScript.htm |
| Diplomacy | Diplomatie | Cha | | | | | https://www.d20srd.org/srd/skills/diplomacy.htm |
| Disable Device | Désamorçage/sabotage | Int | T | | | | https://www.d20srd.org/srd/skills/disableDevice.htm |
| Disguise | Déguisement | Cha | | | | | https://www.d20srd.org/srd/skills/disguise.htm |
| Escape Artist | Évasion | Dex | | yes | | | https://www.d20srd.org/srd/skills/escapeArtist.htm |
| Forgery | Contrefaçon | Int | | | | | https://www.d20srd.org/srd/skills/forgery.htm |
| Gather Information | Renseignements | Cha | | | | | https://www.d20srd.org/srd/skills/gatherInformation.htm |
| Handle Animal | Dressage | Cha | T* | | F | | https://www.d20srd.org/srd/skills/handleAnimal.htm |
| Heal | Premiers secours | Wis | | | | | https://www.d20srd.org/srd/skills/heal.htm |
| Hide | Discrétion | Dex | | yes | | | https://www.d20srd.org/srd/skills/hide.htm |
| Intimidate | Intimidation | Cha | | | F | WM | https://www.d20srd.org/srd/skills/intimidate.htm |
| Jump | Saut | Str | | yes | F | | https://www.d20srd.org/srd/skills/jump.htm |
| Knowledge (each) | Connaissances | Int | T* | | | | https://www.d20srd.org/srd/skills/knowledge.htm |
| Listen | Perception auditive | Wis | | | | WM | https://www.d20srd.org/srd/skills/listen.htm |
| Move Silently | Déplacement silencieux | Dex | | yes | | | https://www.d20srd.org/srd/skills/moveSilently.htm |
| Open Lock | Crochetage | Dex | T | | | | https://www.d20srd.org/srd/skills/openLock.htm |
| Perform (each) | Représentation | Cha | | | | | https://www.d20srd.org/srd/skills/perform.htm |
| Profession (each) | Profession | Wis | T | | | | https://www.d20srd.org/srd/skills/profession.htm |
| Ride | Équitation | Dex | | | F | | https://www.d20srd.org/srd/skills/ride.htm |
| Search | Fouille | Int | | | | | https://www.d20srd.org/srd/skills/search.htm |
| Sense Motive | Psychologie | Wis | | | | WM | https://www.d20srd.org/srd/skills/senseMotive.htm |
| Sleight of Hand | Escamotage | Dex | T | yes | | | https://www.d20srd.org/srd/skills/sleightOfHand.htm |
| Speak Language | Langue | None | T | | | | https://www.d20srd.org/srd/skills/speakLanguage.htm |
| Spellcraft | Art de la magie | Int | T | | | | https://www.d20srd.org/srd/skills/spellcraft.htm |
| Spot | Détection | Wis | | | | WM | https://www.d20srd.org/srd/skills/spot.htm |
| Survival | Survie | Wis | | | | | https://www.d20srd.org/srd/skills/survival.htm |
| Swim | Natation | Str | | yes (×2) | F | | https://www.d20srd.org/srd/skills/swim.htm |
| Tumble | Acrobaties | Dex | T | yes | | | https://www.d20srd.org/srd/skills/tumble.htm |
| Use Magic Device | Utilisation d'objets magiques | Cha | T | | | | https://www.d20srd.org/srd/skills/useMagicDevice.htm |
| Use Rope | Maîtrise des cordes | Dex | | | | | https://www.d20srd.org/srd/skills/useRope.htm |
| *Connaissances des monstres* (homebrew, house-rules #4) | Connaissances des monstres | Int | T | | F | WM | DM ruling, house-rules #4 |

T* = trained only, with a special untrained use (see §5).
Knowledge fields in the SRD (FR): arcana (mystères), architecture and engineering (architecture et ingénierie), dungeoneering (exploration souterraine), geography (géographie), history (histoire), local (folklore local), nature (nature), nobility and royalty (noblesse et royauté), religion (religion), the planes (plans). — https://www.d20srd.org/srd/skills/knowledge.htm , https://regles-donjons-dragons.com/page237.html
The SRD lists these as "typical fields of study"; the FR text adds "you can invent others".

Craft, Knowledge, Perform and Profession are families: each specialty is a separate skill with its own ranks. — https://www.d20srd.org/srd/skills/knowledge.htm (first paragraph)
Speak Language: each "rank" bought = one new language, no checks. — https://www.d20srd.org/srd/skills/speakLanguage.htm

## 9. House rules affecting skills

- **#4 Connaissances des monstres:** homebrew Knowledge, key Int, trained only, class skill for Fighter and Weapon Master (1 point per rank, max = character level + 3). Not in the SRD; source = DM ruling.
- **#7 Knowledge (weaponry):** listed as a Weapon Master class skill in *Sword and Fist* but it is not a 3.5 skill → ignored, not offered in the app.
- **#2:** 3.0 skills (Scrutation, Sens de la nature, Langage secret…) are dropped; only the list above.

CHECK: every skill on the sheet is in the 3.5 list above or is a confirmed house-rule skill — https://www.d20srd.org/indexes/skills.htm , house-rules #2/#4/#7
