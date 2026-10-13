"""Validate src/data/srd/*.json and src/data/custom/*.json against src/data/types.ts (by hand-written
schema checks), cross-references, d20srd anchors, and a few spot checks. Exit code 1 on errors.

Run:  C:/Users/le_re/miniforge3/python.exe tools/validate_data.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import srd_urls  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRD = ROOT / "src" / "data" / "srd"
CUSTOM = ROOT / "src" / "data" / "custom"
ERR: list[str] = []
WARN: list[str] = []

ABILITIES = {"str", "dex", "con", "int", "wis", "cha"}
BONUS = {"base", "ability", "alchemical", "armor", "circumstance", "competence", "deflection", "dodge", "enhancement",
         "inherent", "insight", "luck", "morale", "naturalArmor", "profane", "racial", "resistance", "sacred",
         "shield", "size", "untyped"}
SLOTS = {"head", "eyes", "neck", "shoulders", "body", "torso", "arms", "hands", "ring", "waist", "feet"}
KINDS = {"wondrous", "potion", "ring", "rod", "staff", "wand", "scroll", "weaponProperty", "armorProperty"}
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def err(where, msg):
    ERR.append(f"{where}: {msg}")


def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(p.name, f"does not parse: {e}")
        return None


def i18n(where, v, html=False):
    if not (isinstance(v, dict) and set(v) == {"en", "fr"} and all(isinstance(v[k], str) and v[k].strip() for k in v)):
        err(where, f"bad I18n {str(v)[:80]}")
        return
    if html:
        for k in v:
            if len(v[k]) > 2100:
                WARN.append(f"{where}.{k}: text {len(v[k])} chars")


def weight(where, w):
    if not (isinstance(w, dict) and set(w) == {"lb", "kg"} and all(isinstance(w[k], (int, float)) and w[k] >= 0 for k in w)):
        err(where, f"bad Weight {w}")


def distance(where, d, nullable=False):
    if d is None and nullable:
        return
    if not (isinstance(d, dict) and set(d) == {"ft", "m"} and all(isinstance(d[k], (int, float)) for k in d)):
        err(where, f"bad Distance {d}")
    elif abs(d["m"] - d["ft"] * 0.3) > 0.01:
        err(where, f"distance m != ft × 0.3: {d}")


def source(where, s):
    allowed = {"srdUrl", "book", "page", "frRef", "houseRule"}
    if not isinstance(s, dict) or not s or set(s) - allowed:
        err(where, f"bad Source {s}")
        return
    url = s.get("srdUrl")
    if url:
        m = re.match(r"^https://www\.d20srd\.org/srd/(.+?)(?:#(.+))?$", url)
        if not m:
            err(where, f"bad srdUrl {url}")
        elif m.group(2) and srd_urls.anchors(m.group(1)) and not srd_urls.has_anchor(m.group(1), m.group(2)):
            err(where, f"anchor not on page: {url}")


TARGET_RE = re.compile(
    r"^(ability\.(str|dex|con|int|wis|cha)|abilityDamage\.\w+|abilityDrain\.\w+|attack\.(melee|ranged|all|choice|weapon)"
    r"|attack\.extra|damage\.(melee|ranged|all|choice|weapon)|ac|ac\.noDex|ac\.armor|ac\.shield|save\.(fort|ref|will|all)|initiative"
    r"|skill\.[a-z-]+|check\.(str|dex|con|int|wis|cha)|speed|speed\.half|hp\.temp|hp\.max)$")
EXTENDED_TARGETS = {"attack.choice", "damage.choice", "attack.weapon", "damage.weapon", "ac.armor", "ac.shield", "skill.choice"}


def modifiers(where, mods, skill_ids, used_ext):
    if not isinstance(mods, list):
        err(where, "modifiers not a list")
        return
    for m in mods:
        if set(m) - {"target", "bonusType", "value", "condition"} or not {"target", "bonusType", "value"} <= set(m):
            err(where, f"bad ModifierSpec keys {m}")
            continue
        if m["bonusType"] not in BONUS:
            err(where, f"bad bonusType {m['bonusType']}")
        if not isinstance(m["value"], (int, float)):
            err(where, f"bad value {m}")
        t = m["target"]
        if not TARGET_RE.match(t):
            err(where, f"unknown target {t}")
        if t.startswith("skill.") and t not in ("skill.all", "skill.strdex", "skill.choice") and t[6:] not in skill_ids:
            err(where, f"unknown skill in target {t}")
        if t in EXTENDED_TARGETS:
            used_ext.add(t)
        if "condition" in m:
            i18n(where + ".condition", m["condition"])


def prereq(where, p, feat_ids, skill_ids):
    allowed = {"abilities", "bab", "feats", "fighterLevel", "characterLevel", "skills", "proficiency", "masterworkWeapon", "other"}
    if set(p) - allowed:
        err(where, f"bad prereq keys {set(p) - allowed}")
    for a in p.get("abilities", {}):
        if a not in ABILITIES:
            err(where, f"bad ability {a}")
    for f in p.get("feats", []):
        fid = f.split(":")[0]
        if fid not in feat_ids:
            err(where, f"unknown prerequisite feat {f}")
    for s in p.get("skills", {}):
        if s not in skill_ids:
            err(where, f"unknown prerequisite skill {s}")
    for o in p.get("other", []):
        i18n(where + ".other", o)


def check_ids(name, items):
    ids = [x.get("id") for x in items]
    for i in ids:
        if not isinstance(i, str) or not ID_RE.match(i):
            err(name, f"bad id {i!r}")
    if len(ids) != len(set(ids)):
        err(name, "duplicate ids")
    if ids != sorted(ids):
        err(name, "not sorted by id")


def main():
    files = {p.name: load(p) for p in sorted(SRD.glob("*.json"))}
    custom = {p.name: load(p) for p in sorted(CUSTOM.glob("*.json"))}
    if ERR:
        return finish()
    skills = files["skills.json"] + custom["homebrew-skills.json"]
    skill_ids = {s["id"] for s in skills}
    feats = files["feats.json"]
    feat_ids = {f["id"] for f in feats}
    used_ext: set = set()

    for name in ("skills.json", "feats.json", "classes.json", "weapons.json", "armor.json", "gear.json", "magic-items.json"):
        check_ids(name, files[name])
    check_ids("homebrew-skills.json", custom["homebrew-skills.json"])
    check_ids("conditions.json", custom["conditions.json"])

    for s in skills:
        w = f"skill {s['id']}"
        req = {"id", "name", "ability", "trainedOnly", "armorCheck", "hasSubtypes", "text", "source"}
        if not req <= set(s) or set(s) - req - {"homebrew", "noAbility"}:
            err(w, f"keys {set(s) ^ req}")
        i18n(w + ".name", s["name"]); i18n(w + ".text", s["text"], True); source(w, s["source"])
        if s["ability"] not in ABILITIES or s["armorCheck"] not in (0, 1, 2):
            err(w, "bad ability/armorCheck")

    for y in files["synergies.json"]:
        w = f"synergy {y['from']}->{y['to']}"
        if y["from"] not in skill_ids or y["to"] not in skill_ids:
            err(w, "unknown skill")
        if set(y) - {"from", "to", "ranks", "value", "condition", "source"}:
            err(w, "bad keys")
        if "condition" in y:
            i18n(w, y["condition"])
        source(w, y["source"])

    for f in feats:
        w = f"feat {f['id']}"
        req = {"id", "name", "type", "fighterBonus", "multiple", "prereq", "summary", "text", "source"}
        if not req <= set(f) or set(f) - req - {"choice", "modifiers"}:
            err(w, f"keys {set(f) ^ req}")
        if f["type"] not in ("general", "itemCreation", "metamagic", "special"):
            err(w, "bad type")
        if f.get("choice") not in (None, "weapon", "skill", "school", "other"):
            err(w, "bad choice")
        i18n(w + ".name", f["name"]); i18n(w + ".summary", f["summary"]); i18n(w + ".text", f["text"], True)
        prereq(w, f["prereq"], feat_ids, skill_ids); source(w, f["source"])
        if "modifiers" in f:
            modifiers(w, f["modifiers"], skill_ids, used_ext)

    overrides = custom["class-skill-overrides.json"]
    for c in files["classes.json"] + [custom["weapon-master.json"]]:
        w = f"class {c['id']}"
        req = {"id", "name", "prestige", "hitDie", "skillPoints", "classSkills", "proficiencies", "table", "text", "source"}
        if not req <= set(c) or set(c) - req - {"bonusFeatLevels", "bonusFeatList", "requirements"}:
            err(w, f"keys {set(c) ^ req}")
        i18n(w + ".name", c["name"]); i18n(w + ".text", c["text"]); source(w, c["source"])
        for s in c["classSkills"] + overrides.get(c["id"], []):
            if s not in skill_ids:
                err(w, f"unknown class skill {s}")
        for f in c.get("bonusFeatList", []):
            if f not in feat_ids:
                err(w, f"unknown bonus feat {f}")
        if [r["level"] for r in c["table"]] != list(range(1, len(c["table"]) + 1)):
            err(w, "table levels")
        for r in c["table"]:
            for sp in r["special"]:
                i18n(w + ".special", sp)
        if "requirements" in c:
            prereq(w, c["requirements"], feat_ids, skill_ids)
    for cid in overrides:
        if cid not in {"fighter", "weapon-master"}:
            err("class-skill-overrides", f"unknown class {cid}")

    for x in files["weapons.json"]:
        w = f"weapon {x['id']}"
        req = {"id", "name", "category", "kind", "handedness", "damage", "critRange", "critMult", "damageTypes", "weight", "costGp", "text", "source"}
        if not req <= set(x) or set(x) - req - {"rangeIncrement"}:
            err(w, f"keys {set(x) ^ req}")
        if x["category"] not in ("simple", "martial", "exotic") or x["kind"] not in ("melee", "ranged") \
                or x["handedness"] not in ("unarmed", "light", "oneHanded", "twoHanded", "ranged"):
            err(w, "bad enum")
        if set(x["damage"]) != {"S", "M"}:
            err(w, "bad damage")
        if "rangeIncrement" in x:
            distance(w, x["rangeIncrement"])
        weight(w, x["weight"]); i18n(w + ".name", x["name"]); i18n(w + ".text", x["text"], True); source(w, x["source"])

    for x in files["armor.json"]:
        w = f"armor {x['id']}"
        req = {"id", "name", "category", "armorBonus", "maxDex", "acp", "arcaneFailure", "speed30", "speed20", "weight", "costGp", "text", "source"}
        if set(x) != req:
            err(w, f"keys {set(x) ^ req}")
        if x["category"] not in ("light", "medium", "heavy", "shield", "tower"):
            err(w, "bad category")
        distance(w, x["speed30"], True); distance(w, x["speed20"], True)
        weight(w, x["weight"]); i18n(w + ".name", x["name"]); i18n(w + ".text", x["text"], True); source(w, x["source"])

    for x in files["gear.json"]:
        w = f"gear {x['id']}"
        if set(x) != {"id", "name", "weight", "costGp", "text", "source"}:
            err(w, "keys")
        weight(w, x["weight"]); i18n(w + ".name", x["name"]); i18n(w + ".text", x["text"], True); source(w, x["source"])

    for x in files["magic-items.json"]:
        w = f"magic {x['id']}"
        req = {"id", "name", "kind", "priceGp", "weight", "text", "source"}
        if not req <= set(x) or set(x) - req - {"slot", "casterLevel", "modifiers", "duration"}:
            err(w, f"keys {set(x) ^ req}")
        if x["kind"] not in KINDS or ("slot" in x and x["slot"] not in SLOTS):
            err(w, "bad kind/slot")
        if not isinstance(x["priceGp"], (int, float)) or x["priceGp"] <= 0:
            err(w, f"bad price {x['priceGp']}")
        weight(w, x["weight"]); i18n(w + ".name", x["name"]); i18n(w + ".text", x["text"], True); source(w, x["source"])
        if "duration" in x:
            i18n(w + ".duration", x["duration"])
        if "modifiers" in x:
            modifiers(w, x["modifiers"], skill_ids, used_ext)

    rows = files["carrying-capacity.json"]
    if [r["str"] for r in rows] != list(range(1, 30)):
        err("carrying-capacity", "Str 1–29 expected")
    for r in rows:
        for k in ("light", "medium", "heavy"):
            weight(f"carrying {r['str']}", r[k])

    for c in custom["conditions.json"]:
        w = f"condition {c['id']}"
        req = {"id", "name", "modifiers", "flags", "summary", "text", "source"}
        if not req <= set(c) or set(c) - req - {"replaces"}:
            err(w, f"keys {set(c) ^ req}")
        i18n(w + ".name", c["name"]); i18n(w + ".summary", c["summary"]); i18n(w + ".text", c["text"], True); source(w, c["source"])
        modifiers(w, c["modifiers"], skill_ids, used_ext)
        for r in c.get("replaces", []):
            if r not in {x["id"] for x in custom["conditions.json"]}:
                err(w, f"replaces unknown {r}")

    spot_checks(files, custom)
    if used_ext:
        WARN.append("targets used beyond the types.ts Target comment: " + ", ".join(sorted(used_ext)))
    return finish()


def spot_checks(files, custom):
    by = {k: {x["id"]: x for x in v} for k, v in files.items() if isinstance(v, list) and v and "id" in v[0]}

    def expect(label, cond):
        if not cond:
            err("spot-check", label)
        else:
            print(f"  ok  {label}")

    g = by["weapons.json"]["greatsword"]
    expect("greatsword 2d6 19–20/×2 8 lb/4 kg 50 gp martial twoHanded",
           g["damage"]["M"] == "2d6" and g["critRange"] == 19 and g["critMult"] == 2 and g["weight"] == {"lb": 8, "kg": 4}
           and g["costGp"] == 50 and g["category"] == "martial" and g["handedness"] == "twoHanded")
    fp = by["armor.json"]["full-plate"]
    expect("full plate +8, max Dex +1, ACP −6, ASF 35, 20/15 ft, 50 lb",
           fp["armorBonus"] == 8 and fp["maxDex"] == 1 and fp["acp"] == -6 and fp["arcaneFailure"] == 35
           and fp["speed30"]["ft"] == 20 and fp["speed20"]["ft"] == 15 and fp["weight"]["lb"] == 50)
    hs = by["armor.json"]["heavy-steel-shield"]
    expect("heavy steel shield +2, ACP −2, 15 lb", hs["armorBonus"] == 2 and hs["acp"] == -2 and hs["weight"]["lb"] == 15)
    wa = by["feats.json"]["whirlwind-attack"]["prereq"]
    expect("whirlwind-attack prereqs", wa.get("abilities") == {"dex": 13, "int": 13} and wa.get("bab") == 4
           and set(wa.get("feats", [])) == {"combat-expertise", "dodge", "mobility", "spring-attack"})
    f6 = by["classes.json"]["fighter"]["table"][5]
    expect("fighter 6: BAB 6, Fort 5, Ref 2, Will 2", (f6["bab"], f6["fort"], f6["ref"], f6["will"]) == (6, 5, 2, 2))
    ah = by["magic-items.json"]["amulet-of-health-2"]
    expect("amulet-of-health-2 neck, enhancement +2 Con, 4000 gp",
           ah["slot"] == "neck" and ah["priceGp"] == 4000
           and ah["modifiers"] == [{"target": "ability.con", "bonusType": "enhancement", "value": 2}])
    s18 = next(r for r in files["carrying-capacity.json"] if r["str"] == 18)
    expect("Str 18 light load 100 lb / 50 kg", s18["light"] == {"lb": 100, "kg": 50})
    for gid in ("travelers-outfit", "waterskin", "belt-pouch", "backpack", "grappling-hook", "flask", "clay-mug-tankard", "arrows-20"):
        expect(f"gear {gid} present", gid in by["gear.json"])
    for pid in ("potion-of-cure-light-wounds", "potion-of-cure-moderate-wounds", "potion-of-cure-serious-wounds",
                "potion-of-bulls-strength", "potion-of-cats-grace", "potion-of-bears-endurance",
                "potion-of-invisibility", "potion-of-levitate"):
        expect(f"magic item {pid} present", pid in by["magic-items.json"])
    for fid, fr in (("whirlwind-attack", "Attaque en rotation"), ("combat-expertise", "Expertise du combat"),
                    ("mobility", "Souplesse du serpent"), ("spring-attack", "Attaque éclair")):
        expect(f"{fid} FR = {fr}", by["feats.json"][fid]["name"]["fr"] == fr)
    expect("amulet of health FR", ah["name"]["fr"].startswith("Amulette de Constitution"))


def finish():
    for w in WARN:
        print("WARN", w)
    for e in ERR:
        print("ERROR", e)
    print(f"\n{len(ERR)} errors, {len(WARN)} warnings")
    return 1 if ERR else 0


if __name__ == "__main__":
    sys.exit(main())
