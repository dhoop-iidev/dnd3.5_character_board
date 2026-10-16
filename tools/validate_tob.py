"""Tome of Battle data checks (house rule #15): disciplines, maneuvers, martial classes, progressions, prestige classes
and their summaries. Called from validate_data.py."""
import json
from pathlib import Path

TOB = Path(__file__).resolve().parent.parent / "src" / "data" / "custom" / "tob"
TYPES = {"strike", "boost", "counter", "stance", "other"}
ACTIONS = {"standard", "swift", "immediate", "full-round", "move", "free", "none", "1 round", "other"}
MARTIAL = ("crusader", "swordsage", "warblade")


def _load(name):
    return json.loads((TOB / name).read_text(encoding="utf-8"))


def _i18n(err, where, v):
    if not (isinstance(v, dict) and set(v) == {"en", "fr"} and all(isinstance(x, str) and x.strip() for x in v.values())):
        err(where, "bad {en, fr} text")


def check(err, warn, skill_ids, feat_ids, weapon_ids):
    disciplines = _load("disciplines.json")
    disc_ids = {d["id"] for d in disciplines}
    if len(disc_ids) != 9:
        err("tob disciplines", f"9 disciplines expected, got {len(disc_ids)}")
    for d in disciplines:
        w = f"discipline {d['id']}"
        _i18n(err, w + ".name", d["name"])
        if d["keySkill"] not in skill_ids:
            err(w, f"unknown key skill {d['keySkill']}")
        for x in d.get("associatedWeapons", []):
            if x not in weapon_ids and x != "unarmed-strike":
                warn(f"{w}: associated weapon {x} not in weapons.json")

    # Maneuvers: one file per discipline, unique ids across files.
    seen = {}
    for f in sorted(TOB.glob("maneuvers-*.json")):
        for m in json.loads(f.read_text(encoding="utf-8")):
            w = f"maneuver {m.get('id')}"
            if m["id"] in seen:
                err(w, f"duplicate id (also in {seen[m['id']]})")
            seen[m["id"]] = f.name
            if m["discipline"] not in disc_ids:
                err(w, f"unknown discipline {m['discipline']}")
            if f.stem != f"maneuvers-{m['discipline']}":
                err(w, f"in {f.name} but discipline {m['discipline']}")
            if not (isinstance(m["level"], int) and 1 <= m["level"] <= 9):
                err(w, f"bad level {m['level']}")
            if m["type"] not in TYPES:
                err(w, f"bad type {m['type']}")
            if not isinstance(m.get("prereqCount", 0), int) or m.get("prereqCount", 0) < 0:
                err(w, "bad prereqCount")
            _i18n(err, w + ".name", m["name"])
            _i18n(err, w + ".summary", m["summary"])
            src = m.get("source") or {}
            if src.get("book") != "Tome of Battle" or not isinstance(src.get("page"), int):
                err(w, "source must be Tome of Battle + page")
    if len(seen) < 180:
        err("tob maneuvers", f"only {len(seen)} maneuvers")

    # Martial adept classes and their progressions.
    for cid in MARTIAL:
        c = _load(f"{cid}.json")
        w = f"class {cid}"
        for d in c.get("disciplines", []):
            if d not in disc_ids:
                err(w, f"unknown discipline {d}")
        for s in c["classSkills"]:
            if s not in skill_ids:
                err(w, f"unknown class skill {s}")
        for g in c.get("grantedFeats", []):
            if g["feat"] not in feat_ids:
                err(w, f"unknown granted feat {g['feat']}")
        p = _load(f"{cid}-progression.json")
        if p["classId"] != cid or [r["level"] for r in p["levels"]] != list(range(1, 21)):
            err(f"{cid}-progression", "levels 1–20 expected")
        prev = None
        for r in p["levels"]:
            for k in ("maneuversKnown", "maneuversReadied", "stancesKnown"):
                if prev and r[k] < prev[k]:
                    err(f"{cid}-progression", f"level {r['level']}: {k} decreases")
            prev = r

    # Prestige classes: requirements and martial advancement refer to known disciplines.
    for c in _load("prestige-classes.json"):
        w = f"prestige {c['id']}"
        if not c.get("prestige"):
            err(w, "prestige: true expected")
        m = (c.get("requirements") or {}).get("martial") or {}
        for r in m.get("maneuvers", []) + m.get("stances", []):
            for d in r.get("disciplines", []):
                if d not in disc_ids:
                    err(w, f"requirement: unknown discipline {d}")
        adv = c.get("martialAdvance")
        if adv:
            for d in adv["disciplines"]:
                if d not in disc_ids:
                    err(w, f"martialAdvance: unknown discipline {d}")
            if [r["level"] for r in adv["levels"]] != [r["level"] for r in c["table"]]:
                err(w, "martialAdvance levels must match the table")
        for s in c["classSkills"]:
            if s not in skill_ids:
                err(w, f"unknown class skill {s}")

    # Summaries: one per table special of the ToB classes.
    summaries = {**_load("summaries-classes.json"), **_load("summaries-prestige.json")}
    wanted = set()
    for c in [_load("crusader.json"), _load("swordsage.json"), *_load("prestige-classes.json")]:
        wanted |= {f"classSpecial:{c['id']}:{sp['en']}" for r in c["table"] for sp in r["special"] if sp["en"] != "Bonus feat"}
    for k in sorted(wanted - set(summaries)):
        err("tob summaries", f"missing summary {k}")
    for k in sorted(set(summaries) - wanted):
        warn(f"tob summaries: orphan key {k}")
    for k, v in summaries.items():
        _i18n(err, f"tob summary {k}", v)
