"""Checks of the cleric spell data: spells.json (SpellDef, src/data/types.ts, with schoolId / subschool / descriptors and
the "domain:<id>" levels) and domains.json (DomainDef), cross-referenced with each other, with skills.json / feats.json
and with the dnd35.db cleric list.

Used by validate_data.py:   import validate_spells_domains; validate_spells_domains.check(err, by)
  - err(where, msg): validate_data's error helper;
  - by: {file name: {id: item}} of src/data/srd (validate_data.spot_checks' `by`; lists are accepted too); a missing
    file is read from disk.
Standalone:  python tools/validate_spells_domains.py   (exit code 1 on errors)

Rules checked (SRD):
- cleric list https://www.d20srd.org/srd/spellLists/clericSpells.htm: every cleric spell of dnd35.db (core chapters, no
  psionic spells) is in spells.json at that level; spells per level 0-9 = SRD_CLERIC_COUNTS (the d20srd list, where a
  "Detect Chaos/Evil/Good/Law" line counts one spell per alignment);
- domains https://www.d20srd.org/srd/spellLists/clericDomains.htm: the 22 core domains, one spell per level 1-9, the slot
  level equal to the spell's "domain:<id>" level and every "domain:<id>" level used by a slot;
- effects: class skills / feats exist, caster level bonus descriptors / schools / subschools exist on some spell.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import srd_urls  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRD = ROOT / "src" / "data" / "srd"
DB = ROOT / "sources" / "dnd35.db"
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

# "wizard": the wizard-only spells of the sorcerer/wizard list (mnemonic enhancer, mage's lucubration).
CORE_LISTS = {"bard", "cleric", "druid", "paladin", "ranger", "sorcerer-wizard", "wizard"}
MAX_LEVEL = {"bard": 6, "cleric": 9, "druid": 9, "paladin": 4, "ranger": 4, "sorcerer-wizard": 9, "wizard": 9}
# dnd35.db level names -> list ids
DB_LISTS = {"Bard": "bard", "Cleric": "cleric", "Druid": "druid", "Paladin": "paladin", "Ranger": "ranger",
            "Sorcerer/Wizard": "sorcerer-wizard", "Wizard": "wizard"}
DOMAIN_IDS = {"air", "animal", "chaos", "death", "destruction", "earth", "evil", "fire", "good", "healing", "knowledge",
              "law", "luck", "magic", "plant", "protection", "strength", "sun", "travel", "trickery", "war", "water"}
SCHOOLS = {"abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation",
           "universal"}
# https://www.d20srd.org/srd/magicOverview/spellDescriptions.htm (subschools and descriptors).
SUBSCHOOLS = {"calling", "creation", "healing", "summoning", "teleportation", "scrying", "charm", "compulsion", "figment",
              "glamer", "pattern", "phantasm", "shadow"}
DESCRIPTORS = {"acid", "air", "chaotic", "cold", "darkness", "death", "earth", "electricity", "evil", "fear", "fire",
               "force", "good", "language-dependent", "lawful", "light", "mind-affecting", "sonic", "water"}
# Cleric spells per level 0-9, counted on https://www.d20srd.org/srd/spellLists/clericSpells.htm (231; same in dnd35.db
# without the 5 psionic-chapter spells).
SRD_CLERIC_COUNTS = [12, 31, 32, 34, 23, 27, 26, 18, 17, 11]
SPELL_KEYS = {"id", "name", "school", "level", "components", "castingTime", "range", "duration", "save", "spellResistance",
              "summary", "text", "source"}
SPELL_OPT = {"target", "area", "effect", "schoolId", "subschool", "descriptors"}
DOMAIN_KEYS = {"id", "name", "grantedPower", "spells", "source"}
DOMAIN_TOKENS = {"$deityWeapon", "$deityWeaponIfMartial"}
EFFECT_KEYS = {"classSkills", "grantsFeats", "casterLevelBonus", "turning", "usesPerDay"}
DOMAIN_PAGE = "spellLists/clericDomains.htm"


def _i18n(err, where, v, html=False):
    if not (isinstance(v, dict) and set(v) == {"en", "fr"} and all(isinstance(v[k], str) and v[k].strip() for k in v)):
        err(where, f"bad I18n {str(v)[:80]}")
    elif html and not all(v[k].startswith("<p>") for k in v):
        err(where, "HTML paragraphs expected")


def _items(by, name) -> list:
    v = (by or {}).get(name)
    if v is None:
        return json.loads((SRD / name).read_text(encoding="utf-8"))
    return list(v.values()) if isinstance(v, dict) else v


def _ids(err, name, items):
    ids = [x.get("id") for x in items]
    for i in ids:
        if not isinstance(i, str) or not ID_RE.match(i):
            err(name, f"bad id {i!r}")
    if len(ids) != len(set(ids)):
        err(name, "duplicate ids")
    if ids != sorted(ids):
        err(name, "not sorted by id")


def check_spells(err, spells):
    _ids(err, "spells.json", spells)
    for x in spells:
        w = f"spell {x.get('id')}"
        if not SPELL_KEYS <= set(x) or set(x) - SPELL_KEYS - SPELL_OPT:
            err(w, f"keys {set(x) ^ SPELL_KEYS}")
            continue
        for k in ("name", "school", "castingTime", "range", "duration", "save", "spellResistance", "summary",
                  *(k for k in ("target", "area", "effect") if k in x)):
            _i18n(err, f"{w}.{k}", x[k])
        _i18n(err, f"{w}.text", x["text"], html=True)
        if x["text"]["fr"] == f"<p>{x['name']['fr']}</p>":
            err(w, "French text missing (name-only fallback)")
        if x.get("schoolId") not in SCHOOLS:
            err(w, f"bad schoolId {x.get('schoolId')!r}")
        if "subschool" in x and x["subschool"] not in SUBSCHOOLS:
            err(w, f"bad subschool {x['subschool']!r}")
        if not isinstance(x.get("descriptors"), list) or set(x["descriptors"]) - DESCRIPTORS or len(set(x["descriptors"])) != len(x["descriptors"]):
            err(w, f"bad descriptors {x.get('descriptors')!r}")
        if not x["school"]["en"].lower().startswith(x.get("schoolId") or "?"):
            err(w, f"schoolId {x.get('schoolId')} != school {x['school']['en']}")
        lv = x["level"]
        if not isinstance(lv, dict) or not lv:
            err(w, f"bad level {lv}")
            continue
        for k, v in lv.items():
            if k in CORE_LISTS:
                ok = isinstance(v, int) and 0 <= v <= MAX_LEVEL[k]
            elif k.startswith("domain:") and k[7:] in DOMAIN_IDS:
                ok = isinstance(v, int) and 1 <= v <= 9
            else:
                ok = False
            if not ok:
                err(w, f"bad level {k}: {v}")
        url = x["source"].get("srdUrl", "") if isinstance(x.get("source"), dict) else ""
        if not re.match(r"^https://www\.d20srd\.org/srd/spells/[a-zA-Z0-9]+\.htm$", url):
            err(w, f"srdUrl must be the d20srd spell page: {url!r}")
        if not x["source"].get("frRef"):
            err(w, "no frRef (DRS)")
    got = [sum(1 for x in spells if x["level"].get("cleric") == lv) for lv in range(10)]
    if got != SRD_CLERIC_COUNTS:
        err("spells.json", f"cleric spells per level {got} != SRD list {SRD_CLERIC_COUNTS}")


def check_against_db(err, spells, warn=None):
    """Every core class list and core-domain spell of dnd35.db is in spells.json with the same levels."""
    if not DB.exists():
        (warn or print)("sources/dnd35.db not found: cleric list / domain completeness against the database skipped")
        return
    by_name = {x["name"]["en"]: x for x in spells}
    domain_en = {d.capitalize(): f"domain:{d}" for d in DOMAIN_IDS}
    con = sqlite3.connect(DB)
    for name, levels, ref in con.execute("select name, level, reference from spell where reference like 'SRD 3.5 Spells%'"):
        want = {}
        for lst, n in re.findall(r"([A-Za-z/ ]+?)\s+(\d)", levels or ""):
            lst = lst.strip(" ,")
            if lst in DB_LISTS:
                want[DB_LISTS[lst]] = int(n)
            elif lst in domain_en:
                want[domain_en[lst]] = int(n)
        if not want:
            continue
        x = by_name.get(name)
        if x is None:
            err("spells.json", f"class list / domain spell {name} (dnd35.db) missing")
            continue
        for k, v in want.items():
            if x["level"].get(k) != v:
                err(f"spell {x['id']}", f"level.{k} {x['level'].get(k)} != {v} (dnd35.db)")
        extra = {k for k in x["level"] if (k in CORE_LISTS or k.startswith("domain:")) and k not in want}
        if extra:
            err(f"spell {x['id']}", f"levels {sorted(extra)} not in dnd35.db")
    con.close()


def check_domains(err, domains, spells, skill_ids, feat_ids):
    _ids(err, "domains.json", domains)
    if {d.get("id") for d in domains} != DOMAIN_IDS:
        err("domains.json", f"domains {sorted({d.get('id') for d in domains} ^ DOMAIN_IDS)} differ from the 22 SRD domains")
    sp = {x["id"]: x for x in spells}
    used = {(f"domain:{d['id']}", int(lv), sid) for d in domains for lv, sid in d.get("spells", {}).items()}
    for x in spells:  # every domain level of a spell is a slot of that domain
        for k, v in x["level"].items():
            if k.startswith("domain:") and (k, v, x["id"]) not in used:
                err(f"spell {x['id']}", f"{k} {v} is not a slot of domains.json")
    anchors = srd_urls.anchors(DOMAIN_PAGE)
    for d in domains:
        w = f"domain {d.get('id')}"
        if not DOMAIN_KEYS <= set(d) or set(d) - DOMAIN_KEYS - {"effects"}:
            err(w, f"keys {set(d) ^ DOMAIN_KEYS}")
            continue
        _i18n(err, w + ".name", d["name"])
        _i18n(err, w + ".grantedPower", d["grantedPower"], html=True)
        if sorted(d["spells"], key=int) != [str(i) for i in range(1, 10)]:
            err(w, f"spells must be levels 1-9: {sorted(d['spells'])}")
        for lv, sid in d["spells"].items():
            s = sp.get(sid)
            if s is None:
                err(w, f"spell {lv} {sid} not in spells.json")
            elif s["level"].get(f"domain:{d['id']}") != int(lv):
                err(w, f"spell {sid}: level domain:{d['id']} {s['level'].get('domain:' + d['id'])} != slot {lv}")
        url = d["source"].get("srdUrl", "") if isinstance(d["source"], dict) else ""
        if url != f"https://www.d20srd.org/srd/{DOMAIN_PAGE}#{d['id']}Domain":
            err(w, f"srdUrl {url!r}")
        elif anchors and f"{d['id']}Domain" not in anchors:
            err(w, f"anchor not on page: {url}")
        if not d["source"].get("frRef"):
            err(w, "no frRef (DRS)")
        e = d.get("effects", {})
        if set(e) - EFFECT_KEYS:
            err(w, f"effects keys {set(e) - EFFECT_KEYS}")
        for s in e.get("classSkills", []):
            if s not in skill_ids:
                err(w, f"unknown class skill {s}")
        for f in e.get("grantsFeats", []):
            fid, _, choice = f.partition(":")
            # Choice tokens: $deityWeapon (the deity's favored weapon), $deityWeaponIfMartial (same, granted only
            # when that weapon is martial: War domain Martial Weapon Proficiency "if necessary").
            if fid not in feat_ids or (choice and not (choice in DOMAIN_TOKENS or ID_RE.match(choice))):
                err(w, f"bad granted feat {f}")
        b = e.get("casterLevelBonus")
        if b is not None:
            keys = set(b) - {"value"}
            if len(keys) != 1 or not isinstance(b.get("value"), int) or b["value"] < 1:
                err(w, f"bad casterLevelBonus {b}")
            elif "descriptor" in b and not any(b["descriptor"] in x.get("descriptors", []) for x in spells):
                err(w, f"casterLevelBonus descriptor {b['descriptor']} on no spell")
            elif "school" in b and not any(b["school"] == x.get("schoolId") for x in spells):
                err(w, f"casterLevelBonus school {b['school']} on no spell")
            elif "subschool" in b and not any(b["subschool"] == x.get("subschool") for x in spells):
                err(w, f"casterLevelBonus subschool {b['subschool']} on no spell")
        ts = e.get("turning")
        if ts is not None and not (isinstance(ts, list) and ts):
            err(w, f"turning must be a non-empty array: {ts}")
            ts = []
        for t in ts or []:
            per = t.get("perDay")
            if set(t) != {"mode", "creatures", "perDay"} or t.get("mode") not in ("turn", "rebuke", "greater-turning") \
                    or not (per == "3+cha" or (isinstance(per, int) and not isinstance(per, bool) and per >= 1)):
                err(w, f"bad turning {t}")
            else:
                _i18n(err, w + ".turning.creatures", t["creatures"])
        if "usesPerDay" in e:
            _i18n(err, w + ".usesPerDay", e["usesPerDay"])
    # Spot checks (SRD clericDomains.htm).
    by = {d["id"]: d for d in domains}

    def expect(label, cond):
        if not cond:
            err("domains spot check", label)

    if DOMAIN_IDS <= set(by):
        expect("war: Weapon Focus with the deity's weapon", "weapon-focus:$deityWeapon" in by["war"].get("effects", {}).get("grantsFeats", []))
        expect("good: +1 caster level for [Good] spells", by["good"]["effects"].get("casterLevelBonus") == {"descriptor": "good", "value": 1})
        expect("knowledge: all 10 Knowledge skills, divination +1",
               sum(1 for s in by["knowledge"]["effects"].get("classSkills", []) if s.startswith("knowledge-")) == 10
               and by["knowledge"]["effects"].get("casterLevelBonus") == {"school": "divination", "value": 1})
        expect("trickery: Bluff, Disguise, Hide", sorted(by["trickery"]["effects"].get("classSkills", [])) == ["bluff", "disguise", "hide"])
        expect("travel: Survival; 1 Longstrider ... 9 Astral Projection", by["travel"]["effects"].get("classSkills") == ["survival"]
               and by["travel"]["spells"]["1"] == "longstrider" and by["travel"]["spells"]["9"] == "astral-projection")
        expect("healing 9: Heal, Mass (not True Resurrection)", by["healing"]["spells"]["9"] == "heal-mass")
        expect("sun: greater turning 1/day", [(t["mode"], t["perDay"]) for t in by["sun"]["effects"].get("turning", [])]
               == [("greater-turning", 1)])
        expect("air: rebuke air + turn earth, 3 + Cha each",
               [(t["mode"], t["perDay"]) for t in by["air"]["effects"].get("turning", [])] == [("rebuke", "3+cha"), ("turn", "3+cha")]
               and "earth" in by["air"]["effects"]["turning"][1]["creatures"]["en"])
        expect("plant: rebuke plants 3 + Cha", [(t["mode"], t["perDay"]) for t in by["plant"]["effects"].get("turning", [])] == [("rebuke", "3+cha")])
        expect("war: Martial Weapon Proficiency only for a martial deity weapon",
               "martial-weapon-proficiency:$deityWeaponIfMartial" in by["war"]["effects"].get("grantsFeats", []))
        expect("luck: usesPerDay bilingual", set(by["luck"]["effects"].get("usesPerDay", {})) == {"en", "fr"})
        expect("animal / plant: Faune / Flore", by["animal"]["name"]["fr"] == "Faune" and by["plant"]["name"]["fr"] == "Flore")


def check(err, by=None, warn=None):
    spells = _items(by, "spells.json")
    domains = _items(by, "domains.json") if (by and "domains.json" in by) or (SRD / "domains.json").exists() else []
    skill_ids = {x["id"] for x in _items(by, "skills.json")}
    feat_ids = {x["id"] for x in _items(by, "feats.json")}
    check_spells(err, spells)
    check_against_db(err, spells, warn)
    if not domains:
        err("domains.json", "missing")
        return
    check_domains(err, domains, spells, skill_ids, feat_ids)


if __name__ == "__main__":
    errors: list[str] = []
    check(lambda where, msg: errors.append(f"{where}: {msg}"))
    for e in errors:
        print("ERROR", e)
    print(f"\n{len(errors)} errors")
    sys.exit(1 if errors else 0)
