# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Goal
A personal digital "playboard" for playing one D&D **3.5** character at the table: stats in panes, quick rules reference, live temporary effects, and rule checks that flag an illegal or inconsistent build. It is a living spec; update this file as decisions are made.

Characters: the app is generic (any SRD race, the 11 core classes, Weapon Master, the *Tome of Battle* crusader, swordsage, warblade and its 8 prestige classes); a character is created or imported on the welcome screen. A second character, a **ranger**, is planned (2026-10-15). Main character: **Chikibidouille** (formerly Fenrir Ykiyuk), Human, Fighter 6 / Weapon Master 2 / Warblade 1 (level 9 = Warblade 1, decided 2026-10-15). Weapon Master (FR: maître d'armes) = the **3.0 prestige class from *Sword and Fist*** (FR: *De chair et d'acier*), not the 3.5 Exotic Weapon Master. It is the **only** 3.0 content allowed. Its data is in `docs/rules/weapon-master.md`. Store only numbers and short summaries in our own words, never the copyrighted book text. The *Tome of Battle* classes, the nine disciplines and their maneuvers (3.5, non-SRD, house rule #15; book in `books/`, never committed) are in `src/data/custom/tob/`; mechanics sheets in `docs/rules/tob-classes.md` and `tob-prestige.md`, rulings in `rulings-tob.md`. A martial prestige class level feeds one martial adept class's progression (`engine/martial.ts` `martialOwner`); readied, expended and recovery are tracked per class. Arcane casters (2026-10-16): wizard spellbook (free spells per level `LevelEntry.spellsLearned`, copied spells `SpellcastingState.spellbook`, specialty + prohibited schools as wizard-1 class choices), bard/sorcerer spells known and swaps (`spellsLearned`, `spellSwap`), spontaneous casting from slots of the spell's level or higher, arcane spell failure, the familiar (`CompanionState.kind: 'familiar'`) and bardic music (class effects) live in `engine/arcane.ts` and `engine/spellLearning.ts`; prestige classes with `spellcastingAdvance` add spellcasting levels (`engine/spells.ts`). Rulings C26–C33 in `rulings-classes.md`. Wizard-only spells carry the list key `wizard` (`classSpellLevel`).

Character data: `docs/character-baseline.md` (user-provided, authoritative). `DD3.5_chikibidouille_23122017.xls` is an old 2017 sheet that mixes 3.0 and 3.5 by mistake: use it at most for identity and equipment names, never for skills, feats, formulas or rules.

## Hard rules
- **D&D 3.5 only. Never 5e** rules, terms or data (no advantage, proficiency bonus, bounded accuracy, 5e conditions).
- Rule base = 3.5 SRD + the DM exceptions in `docs/house-rules.md`. Anything that isn't plain SRD (3.0 material, house rules, interpretations, unit conversions) must be in that file with status `confirmed` before it is implemented.
- The only homebrew rules are those in `docs/house-rules.md`; everything else follows the 3.5 books as written. When a rule seems ambiguous, **research it online first**, in this order of authority: SRD (d20srd.org), PHB/DMG 3.5 + official errata, official 3.5 FAQ, *Rules Compendium*. Record the answer with sources in `docs/rules/rulings-*.md`.
- **Never implement a rule assumption that the books don't back without asking the user first.** Only if the books genuinely don't answer: stop, explain the options (with links), and add a `pending` entry to `docs/house-rules.md`. Questions about the character's own facts (gear, build history) always go to the user.
- Every rule, feat, item, class feature and computed formula carries a source: a d20srd.org URL (https://www.d20srd.org/index.htm) for SRD content, or book + page for non-SRD content. Popups show it as a clickable "Source" link, so the user can show the DM proof.
- Weights and load thresholds store both units (`lb` and `kg`, kg = lb ÷ 2, house rule #5); distances ft and m (1 square = 1,50 m, #11). Show lb/ft in English and kg/m in French.
- Every piece of user-facing text is bilingual: `{ en, fr }`, never one language hard-coded. Use the official French 3.5 terms (e.g. "don", "compétence", "classe d'armure", "bonus de base à l'attaque").

## Platform & stack
- Offline web app installable on a tablet (PWA): Vite + Svelte + TypeScript, no backend, works in any modern browser (desktop, iPad Safari, Android Chrome), touch-friendly.
- State is saved in the browser and moved between PC and tablet by exporting/importing a JSON file. The save format is versioned, with code that converts older versions.
- Python (miniforge) is only for one-off data-conversion scripts (e.g. reading the .xls, the SRD SQLite, the French SRD text), never for the app itself.

## Architecture principles
- **Data-driven:** classes (per-level tables), feats with machine-readable prerequisites, skills, items, conditions and effects live in bilingual JSON files, not in code.
- **Character = choices + levels:** store the build as a level-by-level record (class taken, HP roll, skill ranks bought, feat chosen, ability increase, class-feature choices like the ranger's favored enemy). Derive everything else from it. This makes level up/down and legality checks possible.
- **Races and classes are data:** `RaceDef` (`src/data/srd/races.json`: size, speed, ability adjustments, racial modifiers, bonus feat/skill points) and `ClassDef` (`classes.json`: table, `features` with `modifiers`/`grantsFeats`/`computed`, `spellcasting`, `choices`). Class-specific rules that can't be pure data live in small engine modules (`engine/classChoices.ts`, `engine/spells.ts`, `engine/martial.ts`); a feature not computed yet is shown as text, flagged "described only". Feat slots: general / race / class / deity / granted.
- **Computed with breakdown:** every derived value (AC, attack, damage, saves, skills, HP, initiative, speed, load) is calculated from a list of contributions `{ source, bonusType, value, srdUrl }`. Popups show this list, so the calculation and the explanation never disagree.
- **Effects:** a temporary effect is a set of changes `{ target, bonusType, value, duration? }`, modeled after the Foundry D35E "changes" system. Apply the 3.5 stacking rules in `docs/rules/bonus-types.md`: modifiers of the same type or from the same source don't stack (take the best bonus / worst penalty), except dodge and circumstance from different sources; untyped modifiers from different sources stack. Ability damage, drain and penalties change the modifiers that depend on them. Effects can be toggled and removed without destroying base data.
- **Validation = warnings, never blocking.** A rules module produces `{ severity, message{en,fr}, srdUrl }` warnings, shown under the table they concern. Checks:
  - skill points spent vs. available per level, and the maximum ranks for class and cross-class skills;
  - feat count (1st level + every 3 levels, the human bonus feat, fighter bonus feats from the fighter list) and feat prerequisites;
  - ability increases at levels 4 and 8;
  - prestige class entry requirements;
  - BAB and saves from class tables;
  - armor/weapon proficiency;
  - load (light/medium/heavy) and its effects;
  - max Dex bonus, armor check penalty;
  - items occupying the same magic-item body slot.
- Model each rule from the SRD text first (cite the URL in a code comment or the data), then encode it. When a rule is unclear, ask; don't guess.

## UI
- Panes (order inside each pane decided with the user, 2026-10-16): **General** (portrait and identity card first; then one "In play" band: abilities, saves, AC/touch/flat-footed/initiative, HP; then skills; then page-wide racial traits, class features and feats with one-line summaries; then **Background** (coat of arms with motto beside a free-text history, `identity.background`, user request 2026-10-16); progression last), **Equipment** (paper doll, items by location; money, load and adding items last), **Combat** (summary strip incl. BAB/iteratives, grapple, AoO, speed, armor check penalty, max Dex; turn bar; weapons in hand and attacks; then combat options, effects and class blocks; resistances last; combat feats, Weapon Master features, turn bar with effect durations), **Manœuvres** (martial adepts: crusader, swordsage, warblade), **Sorts** (spellcasters only), **Compagnons** (druid 1 / ranger 4+: animal companion stat block with SRD advancement; paladin mount; sorcerer/wizard familiar; summoned creatures are cards in the Combat pane), **Notes** (campaign notes).
- Layout inspired by the official 3.5 character sheet, sober and modern: black-and-white with one red accent, black small-caps panel tags, no gradients or textures (the user rejected the parchment/gold look as tacky). Values are clickable to open a breakdown and source popup. FR/EN toggle everywhere.
- Colour cues (user request 2026-10-16): muted per-school colours for spells (`--school-*` tokens in `app.css`, a tinted row and a thick coloured edge on spell rows, light and dark variants) and a discreet arcane ✦ marker with a slow glimmer for magic items (`--arcane`, no animation with reduced motion). Still no gradients or textures.
- Lists show one-line summaries: spells (data), feats (SRD summary), class features and racial traits (`src/data/custom/summaries.json`, checked by `validate_data.py`).
- Items can hold spells (`ItemInstance.spells`, `charges`, `spellItem`: scroll, potion, oil, wand, staff; any item for command-word or daily spells), used from the Combat pane; custom weapons are a base weapon plus `custom` overrides (`engine/spellItems.ts`, `CustomItemForm.svelte`).
- Images: the Equipment paper doll uses `public/images/fenrir-knight.webp` (user-provided illustration); the General pane shows a portrait and a coat of arms that the user uploads (resized, stored in the character JSON). The 3D viewer was removed at the user's request.
- Every popup can carry a campaign note (`character.annotations`, keyed like `feat:<id>`, `item:<uid>`, `stat:<title>`).
- Rules review: the project skill `/um_actually` (`.claude/skills/um_actually/SKILL.md`) audits the engine and data against the SRD; reports go to `docs/reviews/`.

## Data sources (3.5 only)
- **Local copies in `sources/` — search these first, go online only for what they lack** (FAQ, errata, Rules Compendium):
  - `sources/dnd35.db`: Andargor SRD 3.5 SQLite (class, class_table, feat, skill, equipment, item, spell, monster…).
  - `sources/srd-v3.5/`: English SRD as HTML.
  - `sources/DD-3e/en/rtf-source/`, `sources/DD-3e/fr/rtf-source/`: official English and French SRD 3.5 (RTF); `sources/DD-3e/fr/Conversion 3.0 vers 3.5/`: official 3.0→3.5 conversion guide.
- SRD rules and links: d20srd.org. Structured English SRD: Andargor `dnd35.db` (SQLite, OGL).
- French: github.com/orey/DD-3e (French SRD 3.5, OGL); official French terms from regles-donjons-dragons.com.
- Non-SRD content (Weapon Master, splatbook feats): entered by hand for personal use. Never invent its rules text; ask the user for it.
- Keep the OGL 1.0a notice in the repo if SRD text is included.

## Commands
- `npm run dev` / `npm run build` / `npm run check` (svelte-check + tsc) / `npm test` (Vitest; one file: `npm test -- src/engine/__tests__/chikibidouille.test.ts`) / `npm run format`.
- `python tools/build_data.py`: regenerates `src/data/srd/*.json` from `sources/` (see `tools/README.md`). `src/data/custom/*.json` is hand-written.
- **Gotcha:** the `&` in the folder path (`D&D 3.5`) breaks npm's Windows `.cmd` shims (`npx vite` fails with "'D' is not recognized"). The npm scripts therefore call `node node_modules/<pkg>/…` directly; keep it that way and don't use `npx` here.
- `books/`, `sources/` and the `.xls` are gitignored (copyrighted or large): never commit them or copy book text into the repo.
- Live app: https://dhoop-iidev.github.io/dnd3.5_character_board/ (repo github.com/dhoop-iidev/dnd3.5_character_board, public).
- Deployment: pushing to `main` runs `.github/workflows/deploy.yml` (tests, build, GitHub Pages). The build uses relative paths (`base: './'`) and is an installable offline PWA (`vite-plugin-pwa`).
- **No character ships with the app** (the user wants it private): it opens on a welcome screen that imports a character JSON; "Fermer le personnage" clears it from the browser. The build used by the tests is `src/engine/__tests__/fixtures/chikibidouille.json`. `examples/` holds fictional legal builds to import (druid 10, cleric 15, ranger 12, dwarf fighter 10); `examples.test.ts` keeps them warning-free. `character_saves/` is gitignored: never commit it.
- `examples/` holds generic example characters (e.g. `druide-niveau-10.json`, human druid 10) to import from the welcome screen; `src/engine/__tests__/examples.test.ts` keeps them legal (no actionable warning).
- DM sharing: "Partager avec le MJ" makes a read-only link `?share=<deflate+base64url character>` (no pictures, notes optional; `src/model/share.ts`); a shared view never saves over the local character.
