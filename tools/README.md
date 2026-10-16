# Data pipeline (`tools/`)

One-off Python scripts that turn the local SRD sources into the bilingual JSON the app reads.
Python is only used here, never by the app. The output must match `src/data/types.ts`.

## Run

```sh
C:/Users/le_re/miniforge3/python.exe tools/build_data.py      # regenerate src/data/srd/*.json (idempotent)
C:/Users/le_re/miniforge3/python.exe tools/validate_data.py   # schema, cross-references, anchors, spot checks
```

Needs the gitignored sources in `sources/`: `dnd35.db` (Andargor SRD 3.5), `DD-3e/fr/rtf-source` and
`DD-3e/en/rtf-source` (official French and English SRD 3.5, RTF), `DD-3e/fr/GlossaireDD3-DD5.pdf`, `OGL.txt`.
Python packages: `pypdf` (glossary). No internet needed, except `srd_urls.py --refresh` (see below).

`build_data.py` prints the file counts, the French-name statistics, every French weight that differs from
lb / 2, and notes about modelling choices. It also copies `sources/OGL.txt` to `public/OGL.txt`
(the OGL notice must ship with SRD content).

## What is generated

| File | Content |
|---|---|
| `src/data/srd/skills.json` | 3.5 SRD skills (psionic ones excluded). Craft, Perform, Profession: one entry with `hasSubtypes: true`. Knowledge: one entry per field (`knowledge-arcana`…). |
| `src/data/srd/synergies.json` | SRD Table: Skill Synergies (5 ranks → +2), conditional ones with `condition`. |
| `src/data/srd/feats.json` | The 110 core SRD feats (no monster, epic, psionic or divine feats). Parsed `prereq`, `fighterBonus`, always-on `modifiers`. |
| `src/data/srd/classes.json` | The 11 core classes (`build_classes.py`): tables 1–20 (BAB, saves, Special column EN/FR, `spellsPerDay` / `spellsKnown` with 10 slots, `null` = —), class skills, proficiencies, `spellcasting`, `features` (one entry per feature per level gained or improved, SRD paragraph EN + DRS 03 paragraph FR, d20srd anchor), `choices` (ranger favored enemies and combat styles, rogue special abilities, wizard schools). The fighter's fields are unchanged (tests); it only gains `features`. Only the ranger features the engine computes carry `computed: true`. |
| `src/data/srd/races.json` | The 7 SRD races (`build_races.py`): numbers and modifiers by hand from the SRD bullets (situational ones with `condition`; Small-size modifiers are left to the engine), trait and race texts = the EN SRD (03_Races) and DRS 02 bullets. |
| `src/data/srd/spells.json` | Every spell of the druid (0–9) and ranger (1–4) lists, 173 spells (`build_spells.py`), with its level on each core list (bard, cleric, druid, paladin, ranger, sorcerer-wizard; cleric domains left out). French entry from DRS 22a–d matched by (core levels, school, subschool), ties in `HAND_FR`, and checked against the DRS 21 druid / ranger lists (same level; `FR_LIST_ALIAS`, `FR_LIST_MISSING` for the French list's own slips); summaries from DRS 21; entries that say "semblable à X" inherit X's header lines; French header lines that contradict the SRD fixed in `FR_HEADER_ERRATA`, text misprints in `FR_ERRATA`. |
| `src/data/srd/creatures.json` | 137 creatures (`build_creatures.py`): the 115 of the SRD druid animal companion lists and of the Summon Nature's Ally I–IX table, plus the 22 other SRD animals and plants (wild shape forms; 79 animals and 6 plants in all): stat block from `dnd35.db` parsed into typed fields (Hit Dice, speeds, AC components, attacks of the **first** full-attack routine with role / ability / Str factor, saves, abilities, feat ids), texts as printed (skills, feats with `(B)` / `(S)` for bonus feats, SA, SQ, alignment, CR), description and special abilities from the `full_text` (snakes, warhorses, bat, violet fungus: the local English SRD HTML). French block (DRS 33, 35–40) matched by numbers (Hit Dice line + ability scores, speeds on ties), never by name. |
| `src/data/srd/companions.json` | SRD Table: The Druid's Animal Companion (bands 1–2 … 18–20, the six special abilities with EN/FR texts, checked against the DRS 03a table) and `options`: base list (level 1, adjustment 0) and alternative lists (4th −3 … 16th −15), parsed from the SRD druid text. |
| `src/data/srd/summon-lists.json` | Summon Nature's Ally I–IX: spell id → creature ids, parsed from the SRD table; the French table (DRS 22a) is counted against it. |
| `src/data/srd/weapons.json` | SRD weapons (shield bash / armor spikes rows excluded). |
| `src/data/srd/armor.json` | Armors and shields. |
| `src/data/srd/gear.json` | Goods and services that are items, **plus ammunition** (arrows, bolts, sling bullets: they have no damage of their own) and armor add-ons (spikes, locked gauntlet). |
| `src/data/srd/magic-items.json` | All SRD wondrous items, rings, potions and oils, weapon/armor/shield enhancement +1…+5. |
| `src/data/srd/item-properties.json` | SRD weapon / armor / shield special abilities (flaming, keen, fortification…): price as bonus equivalent or flat gp, `appliesTo` from the SRD tables, `effects` written by hand from the SRD text. Fortification split into light/moderate/heavy, ghost touch into weapon/armor entries. |
| `src/data/srd/carrying-capacity.json` | Str 1–29, lb from the SRD, kg as printed in the French SRD (house rule #5). |

Hand-authored (not touched by the build): `src/data/custom/weapon-master.json`, `homebrew-skills.json`, `materials.json` (SRD special materials),
`conditions.json` (texts from the EN/FR SRD, modifiers by hand from `docs/rules/conditions.md`),
`class-skill-overrides.json`.

## French names and texts

Every entry gets `name.fr` and `text.fr` from the official French SRD (DRS RTF files). Matching methods, in order:

- verified terms from `docs/rules/*.md` and the DD-3e glossary (`glossary_fr.py`), checked against the French SRD headings;
- table data: same price / damage / weight / armor values in the French and English tables (`table-stats`, `table-price`);
- magic items: the French entry with the same caster level, school and price (`aura+price`);
- small hand maps in the code for rows that nothing else can separate, each checked against the French source at build time.

Anything left unmatched goes to **`tools/fr_overrides.csv`** (`id,en,fr_guess,status`) with status `todo`.
To correct one: edit `fr_guess`, set `status` to `ok`, and rebuild. Rows with `ok` always win and are kept;
`todo` rows are regenerated on each run.

## Modules

| Module | Role |
|---|---|
| `build_data.py` | Entry point; skills, synergies, feats, fighter |
| `build_classes.py` | classes.json: catalog `CLASSES` (per class: proficiencies, spellcasting, features with their EN/FR paragraph starts, d20srd anchor and the regexes that pair the EN/FR Special-column items). Asserts that every Special item is paired, that the DRS tables give the same spells per day as the database, and that every favored-enemy French name is in DRS 03b. |
| `build_races.py` | races.json (hand data + SRD/DRS 02 bullets, checked: speed, darkvision, weapon ids, skill ids) |
| `build_spells.py` | spells.json (druid list 0–9 + ranger list 1–4) |
| `build_creatures.py` | creatures.json, companions.json, summon-lists.json (see below). Runs alone too (`python tools/build_creatures.py`, reads the other generated files) and prints the consistency report. |
| `build_equipment.py` | weapons, armor, gear |
| `build_magic.py` | magic items, carrying capacity |
| `build_properties.py` | item-properties.json (special abilities; French headings from DRS 24/25, a few French SRD errors corrected in `FR_ERRATA`) |
| `rtf_fr.py` | Minimal RTF reader for the DRS files (paragraphs, bold runs, table rows). `python tools/rtf_fr.py "DRS 05"` dumps a file. |
| `glossary_fr.py` | EN → FR glossary from the DD-3e PDF (decodes the PDF text itself; cached in `tools/.cache/`) |
| `srd_urls.py` | d20srd.org URLs (class pages, races.htm and spellDescriptions are in `PAGES`; spell pages are `spells/<camelCase>.htm`, checked once online). Anchors are checked against `d20srd_anchors.json`; refresh it with `python tools/srd_urls.py --refresh` (needs internet) |
| `fr_match.py`, `ctx.py`, `common.py` | French-name registry + overrides CSV, shared state, helpers |
| `validate_data.py` | Checks the JSON against `types.ts` and the spot values (greatsword, full plate, fighter 6, …) |

## Conventions

- Creature ids: "family first", as the SRD lists name them: `shark-large`, `bear-black`, `snake-small-viper`,
  `arrowhawk-juvenile`, `whale-orca`, `unicorn-celestial-charger`; dire animals keep `dire-wolf`; elementals put the
  element last: `elemental-small-air` … `elemental-elder-water`; `pony-war`, `warhorse-heavy`, `snake-tiny-viper`,
  `fungus-violet` (and `fungus-shrieker`, `swarm-bat`, `swarm-rat` when they are added).
- ids: stable, kebab-case English (`weapon-focus`, `greatsword`, `full-plate`, `heavy-steel-shield`, `amulet-of-health-2`); arrays sorted by id.
- Weights `{lb, kg}`: kg from the French book when printed, else lb / 2. Distances `{ft, m}` with 5 ft = 1,5 m.
- Texts: SRD text (OGL) as HTML paragraphs, at most ~2000 characters each.
- Modifier targets beyond the `types.ts` comment: `attack.choice` / `damage.choice` / `skill.choice` (the feat's chosen weapon/skill),
  `attack.weapon` / `damage.weapon` (the weapon a property is applied to), `ac.armor` / `ac.shield` (enhancement to the armor or shield bonus).

## Creatures (`build_creatures.py`)

- **Lists**: `CATALOG` (id → `dnd35.db` name, d20srd page and anchor) and `LABELS` (SRD list label → ids). The companion
  lists are parsed from the Druid `full_text`, the summon lists from the Summon Nature's Ally IX `full_text`; every
  label must be in `LABELS` and every catalog creature on a list, or in `WILD_SHAPE`: every `dnd35.db` creature of type
  Animal or Plant is in the catalog, except the epic and psionic SRD (legendary bear and tiger, mu spore, elder treant,
  udoroot: no French SRD entry) and `WILD_SHAPE_BLOCKED` (bat and rat swarms: grapple "—" and an automatic swarm
  attack; shrieker: Reflex "—"; `CreatureDef` needs numbers there). Bat and toad have no attack (`attacks: []`). Variants of one stat block (satyr with/without pipes,
  pixie with or without special arrows) are one creature; the summon table's printed variant goes to the list's `notes`.
- **Source URLs**: d20srd monster pages from the d20srd monster index; their anchors are in `d20srd_anchors.json`
  (`python tools/srd_urls.py --refresh-monsters`, needs internet, fetches only `srd_urls.MONSTER_PAGES`).
- **French**: the DRS stat block (paragraph or table form) with the same Hit Dice line and ability scores; `FR_MATCH`
  pairs the two fire elementals whose French Int differs, `FR_NAME` fixes the table names that only print the variant
  ("Jeune" → "Tojanida, jeune"). `FR_FIELD_ERRATA` fixes French stat block lines that contradict the English SRD
  (heavy warhorse and toad special qualities, treant DR 10/tranchant, a misprint). The celestial charger has no French entry: its French texts are written in `CHARGER_FR`
  with official terms (skills/feats from skills.json/feats.json, spell names checked against the DRS 22 headings).
- **Attacks**: only the first full-attack routine (`or` alternatives are reported). Role: weapon if the name is a
  weapons.json weapon; natural attacks are primary when the bonus = BAB + Str (Dex with Weapon Finesse) + size
  (+ Weapon Focus, + enhancement), secondary when 5 lower (2 with Multiattack). Str factor: 1.5 sole natural attack or
  two-handed weapon, 1 primary, 0.5 secondary, 0 for rays, bows, crossbows and 0-damage attacks.
- **Checks** (reported in the build notes, never fatal; the printed English SRD numbers are kept): hp = average of the
  Hit Dice, AC total/touch/flat-footed vs components, size and Dex modifiers, grapple, initiative, base saves by type,
  attack and damage bonuses, French vs English numbers. `DB_FIX` corrects the few `dnd35.db` typos against d20srd.
- Monster feats (Multiattack, Flyby Attack, Improved Natural Attack, Awesome Blow, Wingover, Snatch…) are not in
  feats.json but are kept in `featIds` (`MONSTER_FEATS`, also accepted by `validate_data.py`).

## Cleric spells, domains, Summon Monster (2026-10-16)

- `src/data/srd/spells.json`: every spell of the cleric (0–9), druid (0–9) and ranger (1–4) lists and of the 22 SRD cleric domains, 383 spells (`build_spells.py`), with its level on each core list (bard, cleric, druid, paladin, ranger, sorcerer-wizard) and each domain (`"domain:<id>"`), plus `schoolId` / `subschool` / `descriptors` from `dnd35.db` (`DB_FIX` where it contradicts the d20srd page). French entry from DRS 22a–d matched by (core levels, school, subschool); ties settled by `HAND_FR`, the DD-3e glossary name, the domain levels, then the components; each match checked against the DRS 21 lists at the same level (`FR_LIST_ALIAS`, `FR_LIST_MISSING`). "semblable à X" entries inherit X's header lines, recursively. French errata: `FR_HEADER_ERRATA`, `FR_ERRATA`, `SUMMARY_ERRATA`.
- `src/data/srd/domains.json`: the 22 SRD cleric domains (`build_domains.py`; runs alone too). English granted powers and spell-list footnotes from the English SRD RTF, slots checked against the `dnd35.db` `domain` table and the spells' `domain:<id>` levels. French from DRS 21 "Domaines de prêtre" (`FR_LIST_STALE`, `FR_ERRATA`). `effects` written by hand from the SRD. Source: `spellLists/clericDomains.htm#<id>Domain`.
- `src/data/srd/creatures.json`: plus the 58 base creatures of the Summon Monster I–IX table not already listed (vermin, archons, demons, devils, mephits…; `SUMMON_MONSTER`). French blocks from DRS 33–40 (DRS 34 vermin). Lemure (absent from dnd35.db) read from the English SRD HTML (`HTML_STATBLOCK`); `EN_TEXT_CUT`; mephits paired by `FR_TIE`; weapon pairs printed with two damages (xill) become two attacks, the second at ½ Str.
- `src/data/srd/summon-lists.json`: Summon Nature's Ally I–IX, then Summon Monster I–IX (`summon-monster-i`…), with `templates` (celestial / fiendish, as printed) and `alignments` (the table's column); both French tables (DRS 22a) counted against them.
- `src/data/srd/templates.json`: celestial and fiendish creature templates (`build_templates.py`): English SRD HTML + DRS 35 text, Hit Dice bands (DR, energy resistances) checked identical in both languages, SR = HD + 5 (max 25), smite, darkvision 60 ft. The open last band "12 or more" has maxHD 99.

Modules: `build_domains.py`, `build_templates.py`; `validate_spells_domains.py` (spells with school/descriptors, cleric list complete, domain slots), `validate_summon_monster.py` (Summon Monster lists, templates) — both called by `validate_data.py`, both run alone too.

## Review fixes (2026-10-16, `docs/reviews/um_actually-2026-10-16-full.md`)

- **Hit Dice groups**: `parse_hd` keeps every dice group; the first is `count`/`die`, the others go to `hitDice.extra`
  (`[{count, die}]`), all `+N` to `bonus`. Only the celestial charger has two groups (8d10+7d8+75).
- **Quadrupeds**: `CreatureDef.quadruped` (true/false on every creature) from the hand set `QUADRUPED` in
  `build_creatures.py` (SRD: "any creature with four or more motive limbs can carry a load as a quadruped"; the
  comment above the set lists the judgement calls). Asserted to name catalog creatures only.
- **Summon Nature's Ally table**: `alignments` (the `[NG]`-style brackets), `aquatic` (the "1" footnote: "May be
  summoned only into an aquatic or watery environment") and `notes` (I18n: satyr with/without pipes, pixie arrows and
  *irresistible dance*, grig with fiddle; French from the DRS 22a table via `SNA_NOTES_FR`, each checked to be in the
  French table at the same level). Summon Monster lists gain `aquatic` too. The French tables miss some aquatic marks
  (reported in the build notes; the English marks are used).
- **Domains**: `effects.turning` is an array of pools `{mode, creatures, perDay: "3+cha" | number}`. Air/Earth/Fire/
  Water have two entries (rebuke own element, turn the opposed one); the SRD gives them ONE shared total ("use these
  abilities a total number of times per day equal to 3 + your Charisma modifier"), so the engine must count both
  entries of one elemental domain against the same uses. `effects.usesPerDay` is I18n (French tags (Ext)/(Sur)/(Mag)).
- **War domain** `grantsFeats`: `martial-weapon-proficiency:$deityWeaponIfMartial` (granted only when the deity's
  favored weapon is martial; SRD "if necessary") and `weapon-focus:$deityWeapon`. Tokens checked by
  `validate_spells_domains.py` (`DOMAIN_TOKENS`).
- **Spells**: *earthquake* French summary "1,50 m/niv." -> "24 m" (`SUMMARY_ERRATA`); spells with two subschools
  (*gate*: creation or calling; *mislead*: figment, glamer) keep the first in `subschool`, the second is only reported
  in the build notes.
