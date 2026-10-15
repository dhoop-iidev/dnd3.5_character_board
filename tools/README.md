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
| `src/data/srd/spells.json` | Every spell of the ranger list (`build_spells.py`), with its level on each core list (bard, cleric, druid, paladin, ranger, sorcerer-wizard). French entry from DRS 22a–d matched by (core levels, school, subschool), ties in `HAND_FR`; summaries from DRS 21; entries that say "semblable à X" inherit X's header lines; misprints fixed in `FR_ERRATA`. |
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
| `build_spells.py` | spells.json (ranger list, levels 1–4) |
| `build_equipment.py` | weapons, armor, gear |
| `build_magic.py` | magic items, carrying capacity |
| `build_properties.py` | item-properties.json (special abilities; French headings from DRS 24/25, a few French SRD errors corrected in `FR_ERRATA`) |
| `rtf_fr.py` | Minimal RTF reader for the DRS files (paragraphs, bold runs, table rows). `python tools/rtf_fr.py "DRS 05"` dumps a file. |
| `glossary_fr.py` | EN → FR glossary from the DD-3e PDF (decodes the PDF text itself; cached in `tools/.cache/`) |
| `srd_urls.py` | d20srd.org URLs (class pages, races.htm and spellDescriptions are in `PAGES`; spell pages are `spells/<camelCase>.htm`, checked once online). Anchors are checked against `d20srd_anchors.json`; refresh it with `python tools/srd_urls.py --refresh` (needs internet) |
| `fr_match.py`, `ctx.py`, `common.py` | French-name registry + overrides CSV, shared state, helpers |
| `validate_data.py` | Checks the JSON against `types.ts` and the spot values (greatsword, full plate, fighter 6, …) |

## Conventions

- ids: stable, kebab-case English (`weapon-focus`, `greatsword`, `full-plate`, `heavy-steel-shield`, `amulet-of-health-2`); arrays sorted by id.
- Weights `{lb, kg}`: kg from the French book when printed, else lb / 2. Distances `{ft, m}` with 5 ft = 1,5 m.
- Texts: SRD text (OGL) as HTML paragraphs, at most ~2000 characters each.
- Modifier targets beyond the `types.ts` comment: `attack.choice` / `damage.choice` / `skill.choice` (the feat's chosen weapon/skill),
  `attack.weapon` / `damage.weapon` (the weapon a property is applied to), `ac.armor` / `ac.shield` (enhancement to the armor or shield bonus).
