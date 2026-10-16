"""Checks of the Summon Monster data: the summon-monster-i..ix lists of summon-lists.json (creature ids, templates,
alignments), templates.json (TemplateDef, src/data/types.ts) and the Summon Monster base creatures of creatures.json.

Used by validate_data.py:   import validate_summon_monster; validate_summon_monster.check(err, files)
  - err(where, msg): validate_data's error helper;
  - files: {file name: parsed JSON} of src/data/srd (validate_data.main's `files`); missing files are read from disk.
Standalone:  python tools/validate_summon_monster.py   (exit code 1 on errors)

Rules checked (SRD):
- Summon Monster table, https://www.d20srd.org/srd/spells/summonMonsterI.htm: levels 1-9, one alignment per entry,
  celestial / fiendish versions of animals, vermin and magical beasts (hippogriff, griffon, girallon...);
- celestial creature (https://www.d20srd.org/srd/monsters/celestialCreature.htm): corporeal aberration, animal, dragon,
  fey, giant, humanoid, magical beast, monstrous humanoid, plant or vermin, good or neutral; "Always good" afterwards;
- fiendish creature (https://www.d20srd.org/srd/monsters/fiendishCreature.htm): the same types plus ooze, nongood;
  "Always evil" afterwards;
- template table: Hit Dice bands 1-3, 4-7, 8-11, 12+ contiguous, spell resistance HD + 5, darkvision 60 ft.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import srd_urls  # noqa: E402

SRD = Path(__file__).resolve().parent.parent / "src" / "data" / "srd"
ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"]
ALIGNMENTS = {"LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"}
TEMPLATE_IDS = {"celestial", "fiendish"}
# Base creature types each template accepts (SRD "Creating a ... Creature").
TEMPLATE_TYPES = {
    "celestial": {"aberration", "animal", "dragon", "fey", "giant", "humanoid", "magical-beast", "monstrous-humanoid",
                  "plant", "vermin"},
    "fiendish": {"aberration", "animal", "dragon", "fey", "giant", "humanoid", "magical-beast", "monstrous-humanoid",
                 "ooze", "plant", "vermin"},
}
LIST_KEYS = {"spellId", "level", "creatures", "templates", "alignments"}
BAND_KEYS = {"minHD", "maxHD", "dr", "resistances"}
TEMPLATE_KEYS = {"id", "name", "text", "bands", "srPlusHD", "smite", "darkvision", "source"}
# Entries per level of the SRD table (an "(any)" row counts every creature it names: 4 elementals, 10 mephits).
SM_COUNTS = [14, 12, 19, 22, 20, 17, 15, 15, 14]


def _i18n(err, where, v):
    if not (isinstance(v, dict) and set(v) == {"en", "fr"} and all(isinstance(v[k], str) and v[k].strip() for k in v)):
        err(where, f"bad I18n {str(v)[:80]}")
        return False
    return True


def _load(files, name):
    if files and files.get(name) is not None:
        v = files[name]
        return list(v.values()) if isinstance(v, dict) and name != "companions.json" else v
    return json.loads((SRD / name).read_text(encoding="utf-8"))


def check_lists(err, lists, creatures, spell_ids, warn):
    by_id = {c["id"]: c for c in creatures}
    sm = [x for x in lists if x.get("spellId", "").startswith("summon-monster-")]
    if [x.get("level") for x in sm] != list(range(1, 10)):
        err("summon-lists.json", f"summon-monster lists: levels {[x.get('level') for x in sm]}, 1-9 expected")
    for x in lists:
        w = f"summon-lists.json {x.get('spellId')}"
        if not x.get("spellId", "").startswith("summon-monster-") and "templates" in x:
            err(w, "templates only on the Summon Monster lists")
    for x in sm:
        w = f"summon-lists.json {x.get('spellId')}"
        if not LIST_KEYS <= set(x) or set(x) - LIST_KEYS - {"aquatic"}:
            err(w, f"keys {sorted(set(x) ^ LIST_KEYS)}")
            continue
        if x["spellId"] != f"summon-monster-{ROMAN[x['level'] - 1]}":
            err(w, f"spellId does not match level {x['level']}")
        if x["spellId"] not in spell_ids:
            warn(f"{w}: spell not in spells.json")
        cs = x["creatures"]
        if cs != sorted(set(cs)):
            err(w, "creatures not sorted/unique")
        if len(cs) != SM_COUNTS[x["level"] - 1]:
            err(w, f"{len(cs)} creatures, the SRD table names {SM_COUNTS[x['level'] - 1]}")
        for c in cs:
            if c not in by_id:
                err(w, f"unknown creature {c}")
        if list(x["alignments"]) != sorted(x["alignments"]) or list(x["templates"]) != sorted(x["templates"]):
            err(w, "templates / alignments keys not sorted")
        if set(x["alignments"]) != set(cs):
            err(w, f"alignment missing or extra: {sorted(set(x['alignments']) ^ set(cs))}")
        for c, al in x["alignments"].items():
            if al not in ALIGNMENTS:
                err(w, f"{c}: bad alignment {al!r}")
        for c, tpls in x["templates"].items():
            cr = by_id.get(c)
            if c not in cs or cr is None:
                err(w, f"template on {c}, not on the list")
                continue
            if not (isinstance(tpls, list) and tpls and set(tpls) <= TEMPLATE_IDS and len(set(tpls)) == len(tpls)):
                err(w, f"{c}: bad templates {tpls}")
                continue
            al = x["alignments"].get(c, "")
            for t in tpls:
                if cr["type"] not in TEMPLATE_TYPES[t]:
                    err(w, f"{c}: {t} template not allowed on type {cr['type']}")
                base_al = cr["alignment"]["en"].lower()
                if (t == "celestial" and "evil" in base_al) or (t == "fiendish" and re.search(r"\bgood\b", base_al)):
                    err(w, f"{c}: {t} template not allowed on a base creature '{cr['alignment']['en']}'")
                if (t == "celestial" and not al.endswith("G")) or (t == "fiendish" and not al.endswith("E")):
                    err(w, f"{c}: {t} version printed with alignment {al}")
        for c in cs:  # untemplated entries: the printed alignment is the creature's own
            cr = by_id.get(c)
            if cr is None or c in x["templates"]:
                continue
            al, own = x["alignments"].get(c, ""), cr["alignment"]["en"].lower()
            words = {"L": "lawful", "C": "chaotic", "G": "good", "E": "evil"}
            if any(ch in words and words[ch] not in own for ch in al) or (al == "N" and "neutral" not in own):
                err(w, f"{c}: list alignment {al} vs creature '{cr['alignment']['en']}'")


def check_templates(err, templates):
    w = "templates.json"
    if [t.get("id") for t in templates] != sorted(TEMPLATE_IDS):
        err(w, f"ids {[t.get('id') for t in templates]}, {sorted(TEMPLATE_IDS)} expected")
    for t in templates:
        wt = f"{w} {t.get('id')}"
        if set(t) != TEMPLATE_KEYS:
            err(wt, f"keys {sorted(set(t) ^ TEMPLATE_KEYS)}")
            continue
        for k in ("name", "text", "smite"):
            _i18n(err, f"{wt}.{k}", t[k])
        bands = t["bands"]
        if not bands or bands[0].get("minHD") != 1:
            err(wt, "bands must start at 1 HD")
        for n, b in enumerate(bands):
            wb = f"{wt} band {n}"
            if set(b) != BAND_KEYS or not all(isinstance(b[k], int) for k in ("minHD", "maxHD")) or b["minHD"] > b["maxHD"]:
                err(wb, f"bad band {b}")
                continue
            if n and b["minHD"] != bands[n - 1]["maxHD"] + 1:
                err(wb, f"not contiguous: {bands[n - 1]['maxHD']} then {b['minHD']}")
            if not re.match(r"^(—|\d+/[a-z ]+)$", b["dr"]):
                err(wb, f"bad dr {b['dr']!r}")
            _i18n(err, f"{wb}.resistances", b["resistances"])
        if [(b.get("minHD"), b.get("dr")) for b in bands] != [(1, "—"), (4, "5/magic"), (8, "5/magic"), (12, "10/magic")]:
            err(wt, "SRD table: DR — / 5/magic / 5/magic / 10/magic from 1, 4, 8, 12 HD")
        res = [re.findall(r"\d+", b["resistances"]["en"]) for b in bands]
        if any(set(r) != {v} for r, v in zip(res, ("5", "5", "10", "10"))):
            err(wt, f"SRD table: resistance 5 / 5 / 10 / 10, got {res}")
        if t["srPlusHD"] != 5 or t["darkvision"] != 60:
            err(wt, "spell resistance HD + 5 and darkvision 60 ft. expected")
        if "+20" not in t["smite"]["en"] or "+20" not in t["smite"]["fr"]:
            err(wt, "smite: extra damage = HD, maximum +20")
        s = t["source"]
        page = f"monsters/{t['id']}Creature.htm"
        if s.get("srdUrl") != srd_urls.BASE + page or not s.get("frRef"):
            err(wt, f"source must be {srd_urls.BASE + page} with a frRef: {s}")
        elif not srd_urls.anchors(page):
            err(wt, f"{page} not in d20srd_anchors.json")
    by = {t.get("id"): t for t in templates}
    if "celestial" in by and "fiendish" in by:
        if "acid" not in by["celestial"]["bands"][0]["resistances"]["en"] or "fire" not in by["fiendish"]["bands"][0]["resistances"]["en"]:
            err(w, "celestial: acid/cold/electricity, fiendish: cold/fire")


def check_spots(err, lists, creatures):
    by = {x["spellId"]: x for x in lists}
    cr = {c["id"]: c for c in creatures}

    def expect(label, cond):
        if not cond:
            err("summon-monster spot-check", label)

    try:
        expect("SM I: fiendish dire rat LE, celestial dog LG, fiendish raven",
               by["summon-monster-i"]["templates"]["dire-rat"] == ["fiendish"]
               and by["summon-monster-i"]["alignments"]["dire-rat"] == "LE"
               and by["summon-monster-i"]["templates"]["dog"] == ["celestial"]
               and by["summon-monster-i"]["templates"]["raven"] == ["fiendish"])
        expect("SM III: dretch CE, hell hound LE, small elementals N, no template",
               by["summon-monster-iii"]["alignments"]["dretch"] == "CE" and "dretch" not in by["summon-monster-iii"]["templates"]
               and by["summon-monster-iii"]["alignments"]["hell-hound"] == "LE"
               and by["summon-monster-iii"]["alignments"]["elemental-small-fire"] == "N")
        expect("SM IV: lantern archon LG, 10 mephits N, celestial giant owl LG",
               by["summon-monster-iv"]["alignments"]["archon-lantern"] == "LG"
               and sum(c.startswith("mephit-") for c in by["summon-monster-iv"]["creatures"]) == 10
               and by["summon-monster-iv"]["alignments"]["owl-giant"] == "LG")
        expect("SM IX: 4 elder elementals, roc celestial, bebilith CE, night hag NE",
               sum(c.startswith("elemental-elder-") for c in by["summon-monster-ix"]["creatures"]) == 4
               and by["summon-monster-ix"]["templates"]["roc"] == ["celestial"]
               and by["summon-monster-ix"]["alignments"]["bebilith"] == "CE"
               and by["summon-monster-ix"]["alignments"]["night-hag"] == "NE")
        la, lem = cr["archon-lantern"], cr["lemure"]
        expect("lantern archon: Archon lumineux, Small outsider, 1d8 (4 hp), 2 light rays +2 ranged touch 1d6, #lanternArchon",
               la["name"]["fr"] == "Archon lumineux" and la["size"] == "small" and la["type"] == "outsider" and la["hp"] == 4
               and [(a["count"], a["kind"], a["bonus"], a["damage"]) for a in la["attacks"]] == [(2, "rangedTouch", 2, "1d6")]
               and la["source"]["srdUrl"].endswith("archon.htm#lanternArchon"))
        expect("lemure (not in dnd35.db): Lémure, 2d8 (9 hp), AC 14/10/14, 2 claws +2 1d4, Int —",
               lem["name"]["fr"] == "Lémure" and lem["hp"] == 9 and (lem["ac"]["total"], lem["ac"]["touch"], lem["ac"]["flatFooted"]) == (14, 10, 14)
               and lem["abilities"]["int"] is None and [(a["count"], a["bonus"], a["damage"]) for a in lem["attacks"]] == [(2, 2, "1d4")])
        expect("monstrous spider, Medium: vermin, Araignée monstrueuse, moyenne, always neutral",
               cr["monstrous-spider-medium"]["type"] == "vermin" and cr["monstrous-spider-medium"]["name"]["fr"] == "Araignée monstrueuse, moyenne"
               and cr["monstrous-spider-medium"]["alignment"]["en"] == "Always neutral")
        xb = cr["devil-bearded"]
        expect("bearded devil: glaive +9/+4 (weapon, 1.5 Str) or 2 claws +8",
               (xb["attacks"][0]["role"], xb["attacks"][0]["iterative"], xb["attacks"][0]["strDamageFactor"]) == ("weapon", [4], 1.5)
               and xb["altAttacks"][0][0]["count"] == 2)
    except (KeyError, IndexError) as e:
        err("summon-monster spot-check", f"missing {e}")


def check(err, files=None, warn=None):
    """Run every check; `err(where, msg)` records an error, `warn(msg)` a warning (printed if not given)."""
    warn = warn or (lambda m: print("WARN", m))
    lists = _load(files, "summon-lists.json")
    creatures = _load(files, "creatures.json")
    templates = _load(files, "templates.json")
    spells = _load(files, "spells.json")
    for c in creatures:  # bilingual texts of every creature (the SM base creatures included)
        for k in ("name", "typeText", "alignment", "text"):
            _i18n(err, f"creature {c['id']}.{k}", c.get(k))
    fr = [c["name"]["fr"] for c in creatures]
    if len(fr) != len(set(fr)):
        err("creatures.json", "duplicate French names")
    check_lists(err, lists, creatures, {s["id"] for s in spells}, warn)
    check_templates(err, templates)
    check_spots(err, lists, creatures)


if __name__ == "__main__":
    errors: list[str] = []
    check(lambda w, m: errors.append(f"{w}: {m}"))
    for e in errors:
        print("ERROR", e)
    print(f"{len(errors)} errors")
    sys.exit(1 if errors else 0)
