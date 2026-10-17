# Architecture review, 2026-10-17

## Verdict: sound, with some debt; no rebuild needed

### What works
- **Clean layering:** data (JSON + `types.ts`) → model → engine → UI.
- **Pure functions:** `compute()` and `validate()` take a character and the rules and return a result, recomputed through Svelte `$derived`.
- **One calculation path:** every number is a list of contributions with sources (`stacking.ts`), so the breakdown popups and the totals can't disagree.
- **No import cycles.**
- **Real tests:** 20 test files covering the reference character and the example builds.

### Debt, in the order a code reviewer would hit it

1. **`compute()` is one function of about 1,500 lines** (`compute.ts`, 1,850 lines). It already has `// ----` section comments that could become stage functions.
2. **`validate()` is one function of about 550 lines.**
3. **Long lines:** many exceed 200 characters, mostly inline `{ en, fr }` strings.
4. **Rule tables in TypeScript:** size tables, load effects, familiars and paladin mount live in code. The rest of the data is JSON.
5. **`validate()` recomputes the sheet many times.** It runs at every edit, toggles and hit points included.
6. **Rule logic inside components.** `Spells.svelte` is the main case (metamagic helpers, slot choice).

## Refactors

### Done now (safe, guarded by the tests)
- **Per-level sheets cached in `validate()`.** Level L's "after" sheet is level L + 1's "before", so it is no longer computed twice.
- **One spell-level helper, `spellLevelFor()` in `engine/spells.ts`.** It replaces three copies of the domain-level calculation (Spells pane, metamagic check, popup).
- **Hit point logic moved into `engine/hitPoints.ts`.** It is pure and tested; `ui/HitPoints.svelte` is the shared UI.
- **`permanentScores()` in `progression.ts`.** Skill points, spells learned and Spell Mastery now share it.

### Proposed (need the user's approval: structure changes, best done one per commit)

| # | Change | Size | Risk |
|---|---|---|---|
| 1 | **Done (2026-10-17).** `compute()` split into 8 stage functions in `engine/sheet/` (build, modifiers, core, defense, skills, attacks, classes, assemble); `compute.ts` is now 38 lines. Checked identical on 100+ sheets (every example at every level, with effects and toggles, 4 wild shape forms) | ~1,500 lines moved | done |
| 2 | **Done (2026-10-17).** `validate()` split into 6 checkers in `engine/checks/` (build, maneuvers, spells, classes, companions, equipment) on one context; `validate.ts` is now 56 lines. Checked identical warnings on every example | ~550 lines moved | done |
| 3 | Move the bilingual strings of the engine and the large panes into `i18n/` message tables | large, mechanical | low |
| 4 | Move rule tables (sizes, load effects, familiars, paladin mount, class alignment) to `src/data/custom/*.json`, checked by `validate_data.py` | ~150 lines | low |
| 5 | Move the pure logic out of `Spells.svelte` and `Combat.svelte` into engine modules | ~200 lines | low–medium |
| 6 | Run Prettier (`printWidth: 120`, already the project setting) to break up the 200-character lines — **done for the engine's compute/validate files**; the rest of the repo still to do | mechanical | low |
| 7 | Give class-specific branches in `compute()` a hook interface per class | large | medium–high; after 1 |

### Not worth changing
- The contribution/breakdown model.
- The pure `compute`/`validate` functions with `$derived`.
- The save versioning (`migrate.ts`) and the share links.
- The JSON data plus Python generator pipeline.
- The small engine modules.
- The source URLs in comments.
