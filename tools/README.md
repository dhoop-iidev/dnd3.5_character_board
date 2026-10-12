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
| `src/data/srd/classes.json` | Fighter, table 1–20, bonus-feat levels and list. |
| `src/data/srd/weapons.json` | SRD weapons (shield bash / armor spikes rows excluded). |
| `src/data/srd/armor.json` | Armors and shields. |
| `src/data/srd/gear.json` | Goods and services that are items, **plus ammunition** (arrows, bolts, sling bullets: they have no damage of their own) and armor add-ons (spikes, locked gauntlet). |
| `src/data/srd/magic-items.json` | All SRD wondrous items, rings, potions and oils, weapon/armor/shield enhancement +1…+5. |
| `src/data/srd/carrying-capacity.json` | Str 1–29, lb from the SRD, kg as printed in the French SRD (house rule #5). |

Hand-authored (not touched by the build): `src/data/custom/weapon-master.json`, `homebrew-skills.json`,
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
| `build_data.py` | Entry point; skills, synergies, feats, classes |
| `build_equipment.py` | weapons, armor, gear |
| `build_magic.py` | magic items, carrying capacity |
| `rtf_fr.py` | Minimal RTF reader for the DRS files (paragraphs, bold runs, table rows). `python tools/rtf_fr.py "DRS 05"` dumps a file. |
| `glossary_fr.py` | EN → FR glossary from the DD-3e PDF (decodes the PDF text itself; cached in `tools/.cache/`) |
| `srd_urls.py` | d20srd.org URLs. Anchors are checked against `d20srd_anchors.json`; refresh it with `python tools/srd_urls.py --refresh` (needs internet) |
| `fr_match.py`, `ctx.py`, `common.py` | French-name registry + overrides CSV, shared state, helpers |
| `validate_data.py` | Checks the JSON against `types.ts` and the spot values (greatsword, full plate, fighter 6, …) |

## Conventions

- ids: stable, kebab-case English (`weapon-focus`, `greatsword`, `full-plate`, `heavy-steel-shield`, `amulet-of-health-2`); arrays sorted by id.
- Weights `{lb, kg}`: kg from the French book when printed, else lb / 2. Distances `{ft, m}` with 5 ft = 1,5 m.
- Texts: SRD text (OGL) as HTML paragraphs, at most ~2000 characters each.
- Modifier targets beyond the `types.ts` comment: `attack.choice` / `damage.choice` / `skill.choice` (the feat's chosen weapon/skill),
  `attack.weapon` / `damage.weapon` (the weapon a property is applied to), `ac.armor` / `ac.shield` (enhancement to the armor or shield bonus).
