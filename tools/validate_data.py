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
    r"^(ability\.(str|dex|con|int|wis|cha)|abilityDamage\.\w+|abilityDrain\.\w+|attack\.(melee|ranged|all|choice|weapon|thrown)"
    r"|attack\.extra|damage\.(melee|ranged|all|choice|weapon)|ac|ac\.noDex|ac\.armor|ac\.shield|save\.(fort|ref|will|all)|initiative"
    r"|skill\.[a-z-]+(:[a-z-]+)?|check\.(str|dex|con|int|wis|cha)|speed|speed\.half|hp\.temp|hp\.max)$")
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
        if t.startswith("skill.") and t not in ("skill.all", "skill.strdex", "skill.choice") and t[6:].split(":")[0] not in skill_ids:
            err(where, f"unknown skill in target {t}")
        if t in EXTENDED_TARGETS:
            used_ext.add(t)
        if "condition" in m:
            i18n(where + ".condition", m["condition"])


DICE_RE = re.compile(r"^\d+d\d+$")
PROPERTY_APPLIES = {"melee", "ranged", "ammunition", "armor", "shield"}
MATERIAL_APPLIES = {"weapon", "ammunition", "armor", "shield"}


def num_ok(v, lo=None):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and (lo is None or v >= lo)


def item_property(where, x, skill_ids, used_ext):
    """ItemPropertyDef (types.ts)."""
    req = {"id", "name", "appliesTo", "bonusEquivalent", "requiresEnhancement", "effects", "text", "source"}
    if not req <= set(x) or set(x) - req - {"flatPriceGp"}:
        err(where, f"keys {set(x) ^ req}")
        return
    i18n(where + ".name", x["name"]); i18n(where + ".text", x["text"], True); source(where, x["source"])
    if any(not v.startswith("<p>") or len(v) > 1200 for v in x["text"].values()):
        err(where, "text must be <p> HTML of at most 1200 chars")
    ap = x["appliesTo"]
    if not isinstance(ap, list) or not ap or set(ap) - PROPERTY_APPLIES or len(ap) != len(set(ap)):
        err(where, f"bad appliesTo {ap}")
    elif ({"melee", "ranged", "ammunition"} & set(ap)) and ({"armor", "shield"} & set(ap)):
        err(where, "appliesTo mixes weapon and armor kinds")
    if not (isinstance(x["bonusEquivalent"], int) and 0 <= x["bonusEquivalent"] <= 5):
        err(where, f"bad bonusEquivalent {x['bonusEquivalent']}")
    if x["bonusEquivalent"] == 0 and not num_ok(x.get("flatPriceGp"), 1):
        err(where, "bonusEquivalent 0 needs a flatPriceGp")
    if x["bonusEquivalent"] > 0 and "flatPriceGp" in x:
        err(where, "both bonusEquivalent and flatPriceGp")
    if not isinstance(x["requiresEnhancement"], bool):
        err(where, "requiresEnhancement not a boolean")
    e = x["effects"]
    allowed = {"extraDamage", "critExtraDamage", "keen", "extraAttack", "attackBonus", "damageBonus", "modifiers", "notes"}
    if not isinstance(e, dict) or not e or set(e) - allowed:
        err(where, f"bad effects {e}")
        return
    for d in e.get("extraDamage", []):
        if set(d) - {"dice", "type", "condition"} or not DICE_RE.match(str(d.get("dice"))):
            err(where, f"bad extraDamage {d}")
            continue
        i18n(where + ".extraDamage.type", d["type"])
        if "condition" in d:
            i18n(where + ".extraDamage.condition", d["condition"])
    if "critExtraDamage" in e:
        d = e["critExtraDamage"]
        if set(d) != {"dice", "type"} or not DICE_RE.match(str(d["dice"])):
            err(where, f"bad critExtraDamage {d}")
        else:
            i18n(where + ".critExtraDamage.type", d["type"])
    for k in ("keen", "extraAttack"):
        if k in e and e[k] is not True:
            err(where, f"{k} must be true when present")
    for k in ("attackBonus", "damageBonus"):
        if k in e:
            if set(e[k]) != {"value", "condition"} or not num_ok(e[k]["value"]):
                err(where, f"bad {k} {e[k]}")
            else:
                i18n(f"{where}.{k}.condition", e[k]["condition"])
    if "modifiers" in e:
        modifiers(where, e["modifiers"], skill_ids, used_ext)
    if "notes" in e:
        i18n(where + ".notes", e["notes"])


def material(where, x):
    """MaterialDef (types.ts)."""
    req = {"id", "name", "appliesTo", "price", "effects", "text", "source"}
    if set(x) != req:
        err(where, f"keys {set(x) ^ req}")
        return
    i18n(where + ".name", x["name"]); i18n(where + ".text", x["text"], True); source(where, x["source"])
    ap = x["appliesTo"]
    if not isinstance(ap, list) or not ap or set(ap) - MATERIAL_APPLIES or len(ap) != len(set(ap)):
        err(where, f"bad appliesTo {ap}")
    pk = {"weapon", "ammunition", "light", "medium", "heavy", "shield", "weaponMultiplier", "perLb"}
    if not isinstance(x["price"], dict) or set(x["price"]) - pk or not all(num_ok(v, 0) for v in x["price"].values()):
        err(where, f"bad price {x['price']}")
    e = x["effects"]
    ek = {"damage", "bypassDR", "armorCategoryShift", "maxDexBonus", "acpReduction", "arcaneFailureReduction",
          "weightMultiplier", "armorDR", "masterwork", "notes"}
    if not isinstance(e, dict) or set(e) - ek:
        err(where, f"bad effects {e}")
        return
    for k in ("damage", "armorCategoryShift", "maxDexBonus", "acpReduction", "arcaneFailureReduction", "weightMultiplier"):
        if k in e and not num_ok(e[k]):
            err(where, f"bad {k} {e[k]}")
    for k in ("acpReduction", "arcaneFailureReduction", "maxDexBonus", "armorCategoryShift"):
        if k in e and num_ok(e[k]) and e[k] < 0:
            err(where, f"{k} must be positive")
    if "bypassDR" in e and not (isinstance(e["bypassDR"], str) and e["bypassDR"]):
        err(where, "bad bypassDR")
    if "armorDR" in e and (not isinstance(e["armorDR"], dict) or set(e["armorDR"]) - {"light", "medium", "heavy"}
                           or not all(isinstance(v, str) and re.match(r"^\d+/.+$", v) for v in e["armorDR"].values())):
        err(where, f"bad armorDR {e['armorDR']}")
    if "masterwork" in e and not isinstance(e["masterwork"], bool):
        err(where, "masterwork not a boolean")
    if "notes" in e:
        i18n(where + ".notes", e["notes"])


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


ARMOR_PROF = {"light", "medium", "heavy", "shield", "tower"}
LISTS = {"bard", "cleric", "druid", "paladin", "ranger", "sorcerer-wizard"}


def class_extras(w, c, skill_ids, feat_ids, weapon_ids, used_ext):
    """ClassDef.features / spellcasting / choices / proficiencies (types.ts)."""
    pr = c["proficiencies"]
    for x in pr["weapons"]:
        if x not in ("simple", "martial", "exotic") and x not in weapon_ids:
            err(w, f"unknown weapon proficiency {x}")
    if set(pr["armor"]) - ARMOR_PROF:
        err(w, f"bad armor proficiency {pr['armor']}")
    if "spellcasting" in c:
        sc = c["spellcasting"]
        if not {"ability", "kind", "style", "list", "casterLevel", "maxSpellLevel"} <= set(sc) <= {"ability", "kind", "style", "list", "casterLevel", "maxSpellLevel", "domainSlots"} or sc["ability"] not in ABILITIES \
                or sc["kind"] not in ("arcane", "divine") or sc["style"] not in ("prepared", "spontaneous") \
                or sc["list"] not in LISTS or sc["casterLevel"] not in ("full", "half") or not 1 <= sc["maxSpellLevel"] <= 9:
            err(w, f"bad spellcasting {sc}")
        if not all("spellsPerDay" in r for r in c["table"]):
            err(w, "caster without spellsPerDay on every level")
        if (sc["style"] == "spontaneous") != all("spellsKnown" in r for r in c["table"]):
            err(w, "spellsKnown must be present exactly for spontaneous casters")
    fids = []
    for f in c.get("features", []):
        fw = f"{w}.feature {f.get('id')}"
        req = {"id", "level", "name", "text", "source"}
        if not req <= set(f) or set(f) - req - {"modifiers", "grantsFeats", "computed"}:
            err(fw, f"keys {set(f) ^ req}")
            continue
        fids.append(f["id"])
        if not ID_RE.match(f["id"]):
            err(fw, "bad id")
        if not (isinstance(f["level"], int) and 1 <= f["level"] <= len(c["table"])):
            err(fw, f"bad level {f['level']}")
        i18n(fw + ".name", f["name"]); i18n(fw + ".text", f["text"]); source(fw, f["source"])
        for g in f.get("grantsFeats", []):
            if g not in feat_ids:
                err(fw, f"unknown granted feat {g}")
        if "computed" in f and not isinstance(f["computed"], bool):
            err(fw, "computed not a boolean")
        if "modifiers" in f:
            modifiers(fw, f["modifiers"], skill_ids, used_ext)
    if len(fids) != len(set(fids)):
        err(w, "duplicate feature ids")
    for key, opts in c.get("choices", {}).items():
        ids = [o.get("id") for o in opts]
        if not opts or len(ids) != len(set(ids)) or not all(isinstance(i, str) and ID_RE.match(i) for i in ids):
            err(w, f"bad choices.{key}")
        for o in opts:
            if set(o) != {"id", "name"}:
                err(w, f"bad choice option {o}")
            else:
                i18n(f"{w}.choices.{key}", o["name"])


def race(w, x, class_ids, skill_ids, weapon_ids, used_ext):
    """RaceDef (types.ts)."""
    req = {"id", "name", "size", "speed", "abilityAdjustments", "favoredClass", "vision", "automaticLanguages", "bonusLanguages",
           "modifiers", "traits", "text", "source"}
    opt = {"speedNotReducedByArmor", "bonusFeat", "extraSkillPoints", "darkvision", "weaponProficiencies", "weaponFamiliarity", "minimumScores"}
    if not req <= set(x) or set(x) - req - opt:
        err(w, f"keys {set(x) ^ req}")
        return
    i18n(w + ".name", x["name"]); i18n(w + ".text", x["text"]); source(w, x["source"])
    if x["size"] not in ("small", "medium") or x["vision"] not in ("normal", "lowLight", "darkvision"):
        err(w, "bad size/vision")
    if not (isinstance(x["speed"], int) and x["speed"] > 0 and x["speed"] % 5 == 0):
        err(w, f"bad speed {x['speed']}")
    if set(x["abilityAdjustments"]) - ABILITIES or not all(isinstance(v, int) for v in x["abilityAdjustments"].values()):
        err(w, "bad abilityAdjustments")
    if x["favoredClass"] != "any" and x["favoredClass"] not in class_ids:
        err(w, f"unknown favoredClass {x['favoredClass']}")
    if (x["vision"] == "darkvision") != ("darkvision" in x):
        err(w, "darkvision range must be given exactly for darkvision")
    for k in ("automaticLanguages", "bonusLanguages"):
        if not x[k]:
            err(w, f"empty {k}")
        for lang in x[k]:
            i18n(f"{w}.{k}", lang)
    for k in ("weaponProficiencies", "weaponFamiliarity"):
        for wid in x.get(k, []):
            if wid not in weapon_ids:
                err(w, f"unknown weapon {wid} in {k}")
    modifiers(w, x["modifiers"], skill_ids, used_ext)
    for t in x["traits"]:
        if set(t) != {"name", "text"}:
            err(w, f"bad trait {t}")
        else:
            i18n(w + ".trait", t["name"]); i18n(w + ".trait", t["text"])


def spell(w, x):
    """SpellDef (types.ts)."""
    req = {"id", "name", "school", "level", "components", "castingTime", "range", "duration", "save", "spellResistance",
           "summary", "text", "source"}
    if not req <= set(x) or set(x) - req - {"target", "area", "effect", "schoolId", "subschool", "descriptors"}:
        err(w, f"keys {set(x) ^ req}")
        return
    for k in (req - {"id", "level", "components", "source"}) | ({"target", "area", "effect"} & set(x)):
        i18n(f"{w}.{k}", x[k])
    if not any(k in x for k in ("target", "area", "effect")):
        err(w, "no target, area or effect")
    if not (isinstance(x["components"], str) and x["components"]):
        err(w, "bad components")
    if not x["level"] or {k for k in x["level"] if not k.startswith("domain:")} - LISTS or not all(isinstance(v, int) and 0 <= v <= 9 for v in x["level"].values()):
        err(w, f"bad level {x['level']}")
    if any(not v.startswith("<p>") or len(v) > 6100 for v in x["text"].values()):
        err(w, "text must be <p> HTML of at most ~6000 chars")
    source(w, x["source"])
    if not x["source"].get("srdUrl", "").startswith("https://www.d20srd.org/srd/spells/"):
        err(w, "srdUrl must be the d20srd spell page")


SIZES = {"fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"}
ATTACK_KINDS = {"melee", "ranged", "touch", "rangedTouch"}
ATTACK_ROLES = {"primary", "secondary", "weapon"}
# Monster feats (not in feats.json) accepted in CreatureDef.featIds (build_creatures.MONSTER_FEATS).
MONSTER_FEATS = {"multiattack", "flyby-attack", "improved-natural-attack", "awesome-blow", "hover", "wingover",
                 "ability-focus", "multiweapon-fighting", "snatch"}


# Creatures whose stat block has no attack at all (Full Attack "—"): attacks = [].
NO_ATTACK = {"bat", "toad"}


def creature(w, x, feat_ids):
    """CreatureDef (types.ts)."""
    req = {"id", "name", "size", "type", "typeText", "hitDice", "hp", "initiative", "speed", "ac", "bab", "grapple",
           "attacks", "space", "reach", "saves", "abilities", "skills", "feats", "featIds", "specialAttacks",
           "specialQualities", "specialAbilities", "alignment", "cr", "text", "source"}
    if not req <= set(x) or set(x) - req - {"altAttacks", "quadruped"}:
        err(w, f"keys {set(x) ^ req}")
        return
    for k in ("name", "typeText", "skills", "feats", "specialAttacks", "specialQualities", "alignment"):
        i18n(f"{w}.{k}", x[k])
    for k in ("specialAbilities", "text"):
        i18n(f"{w}.{k}", x[k])
        if any(len(v) > 6100 for v in x[k].values()):
            err(w, f"{k} longer than ~6000 chars")
    if x["size"] not in SIZES or not ID_RE.match(x["type"]):
        err(w, "bad size/type")
    if "quadruped" in x and not isinstance(x["quadruped"], bool):
        err(w, "quadruped not a boolean")
    hd = x["hitDice"]
    if not {"count", "die", "bonus"} <= set(hd) or set(hd) - {"count", "die", "bonus", "extra"}             or not (hd["count"] > 0 and hd["die"] in (4, 6, 8, 10, 12) and isinstance(hd["bonus"], int)):
        err(w, f"bad hitDice {hd}")
    for g in hd.get("extra", [{"count": 1, "die": 8}]):
        if set(g) != {"count", "die"} or not (isinstance(g["count"], int) and g["count"] > 0 and g["die"] in (4, 6, 8, 10, 12)):
            err(w, f"bad hitDice.extra {g}")
    if "extra" in hd and not hd["extra"]:
        err(w, "empty hitDice.extra")
    for k in ("hp", "initiative", "bab", "grapple"):
        if not isinstance(x[k], int):
            err(w, f"{k} not an int")
    sp = x["speed"]
    if "land" not in sp or set(sp) - {"land", "fly", "swim", "climb", "burrow", "flyManeuver"} \
            or not all(isinstance(v, int) and v >= 0 for k, v in sp.items() if k != "flyManeuver") \
            or sp.get("flyManeuver", "average") not in ("clumsy", "poor", "average", "good", "perfect") \
            or ("flyManeuver" in sp) != ("fly" in sp):
        err(w, f"bad speed {sp}")
    ac = x["ac"]
    if set(ac) != {"total", "touch", "flatFooted", "natural", "dexMod", "sizeMod", "other"} or not all(isinstance(v, int) for v in ac.values()):
        err(w, f"bad ac {ac}")
    elif ac["total"] != 10 + ac["natural"] + ac["dexMod"] + ac["sizeMod"] + ac["other"]:
        err(w, f"AC total != 10 + components {ac}")
    if not x["attacks"] and x["id"] not in NO_ATTACK:
        err(w, "no attack")
    if "altAttacks" in x and (not isinstance(x["altAttacks"], list) or not all(x["altAttacks"])):
        err(w, "altAttacks must be a list of non-empty routines")
    for a in x["attacks"] + [b for r in x.get("altAttacks", []) for b in r]:
        wa = f"{w} attack {a.get('name', {}).get('en')}"
        allowed = {"name", "bonus", "damage", "extra", "kind", "role", "count", "attackAbility", "strDamageFactor", "critical", "iterative"}
        if "iterative" in a and not (isinstance(a["iterative"], list) and a["iterative"] and all(isinstance(v, int) and v < a["bonus"] for v in a["iterative"])):
            err(wa, f"bad iterative {a.get('iterative')}")
        if not {"name", "bonus", "damage", "kind", "role", "count", "attackAbility", "strDamageFactor"} <= set(a) or set(a) - allowed:
            err(wa, f"keys {set(a)}")
            continue
        i18n(wa, a["name"])
        if "extra" in a:
            i18n(wa, a["extra"])
        if a["kind"] not in ATTACK_KINDS or a["role"] not in ATTACK_ROLES or a["attackAbility"] not in ("str", "dex") \
                or a["strDamageFactor"] not in (0, 0.5, 1, 1.5) or not (isinstance(a["count"], int) and a["count"] >= 1) \
                or not isinstance(a["bonus"], int) or not re.match(r"^(\d+d\d+([+-]\d+)?|\d+)$", a["damage"]) \
                or not re.match(r"^((\d+-)?\d+/×\d|×\d)$", a.get("critical", "×2")):
            err(wa, f"bad attack {a}")
    if x["space"] <= 0 or x["reach"] < 0:
        err(w, "bad space/reach")
    if set(x["saves"]) != {"fort", "ref", "will"} or not all(isinstance(v, int) for v in x["saves"].values()):
        err(w, "bad saves")
    if set(x["abilities"]) != ABILITIES or not all(v is None or (isinstance(v, int) and v >= 1) for v in x["abilities"].values()):
        err(w, f"bad abilities {x['abilities']}")
    for f in x["featIds"]:
        if f not in feat_ids and f not in MONSTER_FEATS:
            err(w, f"unknown feat id {f}")
    if x["featIds"] != sorted(set(x["featIds"])):
        err(w, "featIds not sorted/unique")
    if not re.match(r"^\d+(/\d+)?", x["cr"]):
        err(w, f"bad cr {x['cr']}")
    source(w, x["source"])
    url = x["source"].get("srdUrl", "")
    page = re.sub(r"#.*$", "", url.replace("https://www.d20srd.org/srd/", ""))
    if not url.startswith("https://www.d20srd.org/srd/monsters/") or not srd_urls.anchors(page) or not x["source"].get("frRef"):
        err(w, f"srdUrl must be a d20srd monster page present in d20srd_anchors.json, with a frRef: {x['source']}")


def creature_lists(companions, summon, creature_ids, spell_ids):
    """CompanionData and SummonList[] (types.ts), cross-referenced with creatures.json and spells.json."""
    w = "companions.json"
    if set(companions) != {"advancement", "options", "source"}:
        err(w, f"keys {set(companions)}")
        return
    rows = companions["advancement"]
    if [(r["minLevel"], r["maxLevel"]) for r in rows] != [(1, 2), (3, 5), (6, 8), (9, 11), (12, 14), (15, 17), (18, 20)]:
        err(w, "advancement bands")
    for n, r in enumerate(rows):
        if set(r) != {"minLevel", "maxLevel", "bonusHD", "naturalArmorAdj", "strDexAdj", "bonusTricks", "special"}:
            err(w, f"row keys {set(r)}")
            continue
        if (r["bonusHD"], r["naturalArmorAdj"], r["strDexAdj"], r["bonusTricks"]) != (2 * n, 2 * n, n, n + 1):
            err(w, f"row {r['minLevel']}: SRD table values expected +{2 * n}/+{2 * n}/+{n}/{n + 1}")
        for s in r["special"]:
            if set(s) != {"id", "name", "text"} or not ID_RE.match(s["id"]):
                err(w, f"bad special {s}")
            else:
                i18n(f"{w}.{s['id']}", s["name"]); i18n(f"{w}.{s['id']}", s["text"])
    specials = [s["id"] for r in rows for s in r["special"]]
    if specials != ["link", "share-spells", "evasion", "devotion", "multiattack", "improved-evasion"]:
        err(w, f"specials {specials}")
    for o in companions["options"]:
        if set(o) != {"creatureId", "minLevel", "levelAdjustment"} or o["creatureId"] not in creature_ids \
                or (o["minLevel"], o["levelAdjustment"]) not in ((1, 0), (4, -3), (7, -6), (10, -9), (13, -12), (16, -15)):
            err(w, f"bad option {o}")
    source(w, companions["source"])
    w = "summon-lists.json"
    if [x.get("level") for x in summon if x["spellId"].startswith("summon-natures-ally-")] != list(range(1, 10)):
        err(w, "levels 1-9 expected")
    for x in summon:
        if set(x) - {"templates", "alignments", "aquatic", "notes"} != {"spellId", "level", "creatures"} or x["spellId"] not in spell_ids:
            err(w, f"bad list {x.get('spellId')}")
        # SummonList.alignments / aquatic / notes (both families): keys on the list, sorted, valid values.
        al = x.get("alignments", {})
        if list(al) != sorted(al) or set(al) - set(x["creatures"])                 or any(v not in ("LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE") for v in al.values()):
            err(w, f"{x['spellId']}: bad alignments {al}")
        aq = x.get("aquatic")
        if aq is not None and (not aq or aq != sorted(set(aq)) or set(aq) - set(x["creatures"])):
            err(w, f"{x['spellId']}: bad aquatic {aq}")
        nt = x.get("notes")
        if nt is not None and (not nt or list(nt) != sorted(nt) or set(nt) - set(x["creatures"])):
            err(w, f"{x['spellId']}: bad notes keys {list(nt or {})}")
        for c, v in (nt or {}).items():
            i18n(f"{w} {x['spellId']}.notes.{c}", v)
        for c in x["creatures"]:
            if c not in creature_ids:
                err(w, f"{x['spellId']}: unknown creature {c}")
        if x["creatures"] != sorted(set(x["creatures"])):
            err(w, f"{x['spellId']}: creatures not sorted/unique")


# Spells per level on the SRD lists that spells.json holds in full, counted on
# https://www.d20srd.org/srd/spellLists/druidSpells.htm and .../rangerSpells.htm (same counts in dnd35.db).
SRD_LIST_COUNTS = {"druid": [13, 20, 26, 22, 17, 19, 18, 13, 11, 10], "ranger": [0, 19, 12, 13, 7]}
DB_LIST = {"druid": "Druid", "ranger": "Ranger"}


def spell_lists_complete(spells):
    """Every druid / ranger list spell of dnd35.db is in spells.json with that list level; counts match the SRD lists."""
    by_name = {x["name"]["en"]: x for x in spells}
    for x in spells:
        if x["text"]["fr"] == f"<p>{x['name']['fr']}</p>":
            err(f"spell {x['id']}", "French text missing (name-only fallback)")
    db_path = ROOT / "sources" / "dnd35.db"
    if db_path.exists():
        import sqlite3
        con = sqlite3.connect(db_path)
        for lst, label in DB_LIST.items():
            for name, levels in con.execute("select name, level from spell where level like ?", (f"%{label}%",)):
                m = re.search(rf"\b{label} (\d)", levels)
                if not m:
                    continue
                x = by_name.get(name)
                if x is None:
                    err("spells.json", f"{lst} spell {name} (dnd35.db) missing")
                elif x["level"].get(lst) != int(m.group(1)):
                    err(f"spell {x['id']}", f"level.{lst} {x['level'].get(lst)} != {m.group(1)} (dnd35.db)")
        con.close()
    else:
        WARN.append("sources/dnd35.db not found: druid/ranger list completeness against the database skipped")
    for lst, counts in SRD_LIST_COUNTS.items():
        got = [sum(1 for x in spells if x["level"].get(lst) == lv) for lv in range(len(counts))]
        if got != counts:
            err("spells.json", f"{lst} spells per level {got} != SRD list {counts}")


# Wild shape forms (https://www.d20srd.org/srd/classes/druid.htm#wildShape): every animal and plant of dnd35.db is in
# creatures.json, except the epic / psionic SRD (no French SRD entry) and the stat blocks with a "—" where CreatureDef
# needs a number (build_creatures.WILD_SHAPE_BLOCKED). Counts of the core SRD (MM) animals and plants.
WILD_SHAPE_EXCLUDED_REFS = ("SRD 3.5 EpicMonsters", "SRD 3.5 PsionicMonsters")
WILD_SHAPE_BLOCKED = {"Bat Swarm", "Rat Swarm", "Shrieker"}
WILD_SHAPE_COUNTS = {"animal": 79, "plant": 6}


def wild_shape_complete(creatures):
    names = {x["name"]["en"] for x in creatures}
    got = {t: sum(1 for x in creatures if x["type"] == t) for t in WILD_SHAPE_COUNTS}
    if got != WILD_SHAPE_COUNTS:
        err("creatures.json", f"animals/plants {got} != {WILD_SHAPE_COUNTS}")
    db_path = ROOT / "sources" / "dnd35.db"
    if not db_path.exists():
        WARN.append("sources/dnd35.db not found: animal/plant completeness against the database skipped")
        return
    import sqlite3
    con = sqlite3.connect(db_path)
    for name, typ, ref in con.execute("select name, type, reference from monster where type in ('Animal', 'Plant')"):
        if ref.startswith(WILD_SHAPE_EXCLUDED_REFS) or name in WILD_SHAPE_BLOCKED:
            if name in names:
                err("creatures.json", f"{name}: excluded / blocked but present")
        elif name not in names:
            err("creatures.json", f"{typ.lower()} {name} (dnd35.db) missing")
    con.close()


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
    weapon_ids = {x["id"] for x in files["weapons.json"]}
    used_ext: set = set()

    for name in ("skills.json", "feats.json", "classes.json", "weapons.json", "armor.json", "gear.json", "magic-items.json",
                 "races.json", "spells.json"):
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
        if not req <= set(c) or set(c) - req - {"bonusFeatLevels", "bonusFeatList", "bonusFeatListByLevel", "bonusFeatIgnorePrereqs", "requirements", "features", "spellcasting", "choices"}:
            err(w, f"keys {set(c) ^ req}")
        class_extras(w, c, skill_ids, feat_ids, weapon_ids, used_ext)
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
            for k in ("spellsPerDay", "spellsKnown"):
                if k in r:
                    v = r[k]
                    if not (isinstance(v, list) and len(v) == 10 and all(x is None or (isinstance(x, int) and x >= 0) for x in v)):
                        err(w, f"level {r['level']}: bad {k} {v}")
                    elif "spellcasting" not in c:
                        err(w, f"{k} without spellcasting")
                    elif any(x is not None for x in v[c["spellcasting"]["maxSpellLevel"] + 1:]):
                        err(w, f"level {r['level']}: {k} above maxSpellLevel")
        if "requirements" in c:
            prereq(w, c["requirements"], feat_ids, skill_ids)
    for cid in overrides:
        known = {c["id"] for c in files["classes.json"]} | {"weapon-master"} | {
            json.loads(f.read_text(encoding="utf-8")).get("id") for f in (CUSTOM / "tob").glob("warblade.json")}
        if cid not in known:
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

    class_ids = {c["id"] for c in files["classes.json"]}
    for x in files["races.json"]:
        race(f"race {x['id']}", x, class_ids, skill_ids, weapon_ids, used_ext)
    for x in files["spells.json"]:
        spell(f"spell {x['id']}", x)
    spell_lists = {c["spellcasting"]["list"]: c for c in files["classes.json"] if "spellcasting" in c}
    for x in files["spells.json"]:
        for lst, lv in x["level"].items():
            if lst.startswith("domain:"):
                continue  # domain levels: validate_spells_domains
            if lst not in spell_lists:
                err(f"spell {x['id']}", f"unknown spell list {lst}")
            elif not 0 <= lv <= spell_lists[lst]["spellcasting"]["maxSpellLevel"]:
                err(f"spell {x['id']}", f"level {lv} out of range for {lst}")
    for lst, c in spell_lists.items():
        if lst == "ranger":
            for lv in range(1, c["spellcasting"]["maxSpellLevel"] + 1):
                if not any(x["level"].get("ranger") == lv for x in files["spells.json"]):
                    err("spells.json", f"no ranger spell of level {lv}")
    spell_lists_complete(files["spells.json"])

    check_ids("creatures.json", files["creatures.json"])
    for x in files["creatures.json"]:
        creature(f"creature {x['id']}", x, feat_ids)
    wild_shape_complete(files["creatures.json"])
    creature_lists(files["companions.json"], files["summon-lists.json"], {x["id"] for x in files["creatures.json"]},
                   {x["id"] for x in files["spells.json"]})
    import validate_summon_monster
    validate_summon_monster.check(err, files, warn=WARN.append)
    import validate_spells_domains
    validate_spells_domains.check(err, {k: v for k, v in files.items() if isinstance(v, list)}, warn=WARN.append)

    check_ids("item-properties.json", files["item-properties.json"])
    for x in files["item-properties.json"]:
        item_property(f"property {x['id']}", x, skill_ids, used_ext)

    check_ids("materials.json", custom["materials.json"])
    for x in custom["materials.json"]:
        material(f"material {x['id']}", x)

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
    cl = by["classes.json"]
    expect("fighter output keeps its fields (features added only)",
           set(cl["fighter"]) == {"id", "name", "prestige", "hitDie", "skillPoints", "classSkills", "proficiencies", "table",
                                  "bonusFeatLevels", "bonusFeatList", "text", "source", "features"})
    expect("11 core classes", set(cl) == {"barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue",
                                          "sorcerer", "wizard"})
    expect("French class names", [cl[i]["name"]["fr"] for i in ("barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin",
                                                               "ranger", "rogue", "sorcerer", "wizard")]
           == ["Barbare", "Barde", "Prêtre", "Druide", "Guerrier", "Moine", "Paladin", "Rôdeur", "Roublard", "Ensorceleur", "Magicien"])
    rg = cl["ranger"]
    r9 = rg["table"][8]
    expect("ranger 9: BAB 9, Fort 6, Ref 6, Will 3, spells/day 1st 1 2nd 0",
           (r9["bab"], r9["fort"], r9["ref"], r9["will"]) == (9, 6, 6, 3) and r9["spellsPerDay"][:3] == [None, 1, 0])
    expect("ranger d8, 6 skill points, wis/divine/prepared/half/4",
           rg["hitDie"] == 8 and rg["skillPoints"] == 6 and rg["spellcasting"] == {
               "ability": "wis", "kind": "divine", "style": "prepared", "list": "ranger", "casterLevel": "half", "maxSpellLevel": 4})
    rf = {f["id"]: f for f in rg["features"]}
    expect("ranger features and levels", all(rf.get(i, {}).get("level") == lv for i, lv in (
        ("favored-enemy", 1), ("track", 1), ("wild-empathy", 1), ("combat-style", 2), ("endurance", 3), ("animal-companion", 4),
        ("favored-enemy-5", 5), ("improved-combat-style", 6), ("woodland-stride", 7), ("swift-tracker", 8), ("evasion", 9),
        ("favored-enemy-10", 10), ("combat-style-mastery", 11), ("camouflage", 13), ("favored-enemy-15", 15),
        ("hide-in-plain-sight", 17), ("favored-enemy-20", 20))))
    expect("ranger computed features", sorted(i for i, f in rf.items() if f.get("computed")) == sorted(
        ["favored-enemy", "favored-enemy-5", "favored-enemy-10", "favored-enemy-15", "favored-enemy-20", "track", "combat-style",
         "endurance", "improved-combat-style", "combat-style-mastery", "wild-empathy", "spells"]))
    expect("ranger Track / Endurance granted feats", rf["track"].get("grantsFeats") == ["track"]
           and rf["endurance"].get("grantsFeats") == ["endurance"])
    fe = rg["choices"]["favoredEnemy"]
    expect("ranger favored enemies: 32 (Humanoid (goblinoid) = Humanoïde (goblinoïde))", len(fe) == 32 and any(
        o["id"] == "humanoid-goblinoid" and o["name"]["fr"] == "Humanoïde (goblinoïde)" for o in fe))
    expect("ranger combat styles archery / two-weapon", [o["id"] for o in rg["choices"]["combatStyle"]] == ["archery", "two-weapon"])
    for fid in ("track", "endurance", "rapid-shot", "manyshot", "improved-precise-shot", "two-weapon-fighting",
                "improved-two-weapon-fighting", "greater-two-weapon-fighting"):
        expect(f"feat {fid} present (ranger)", fid in by["feats.json"])
    expect("cleric 1: spells/day 3, 1 (+1 domain)", cl["cleric"]["table"][0]["spellsPerDay"][:2] == [3, 1])
    expect("sorcerer 20: 6 per day at every spell level, 9/5/5/4/4/4/3/3/3/3 known",
           cl["sorcerer"]["table"][19]["spellsPerDay"] == [6] * 10
           and cl["sorcerer"]["table"][19]["spellsKnown"] == [9, 5, 5, 4, 4, 4, 3, 3, 3, 3])
    rc = by["races.json"]
    expect("7 races with French names", {i: x["name"]["fr"] for i, x in rc.items()} == {
        "human": "Humain", "dwarf": "Nain", "elf": "Elfe", "gnome": "Gnome", "half-elf": "Demi-elfe", "half-orc": "Demi-orque",
        "halfling": "Halfelin"})
    expect("human: bonus feat, +1 skill point, any favored class",
           rc["human"].get("bonusFeat") is True and rc["human"].get("extraSkillPoints") == 1 and rc["human"]["favoredClass"] == "any")
    expect("dwarf: 20 ft not reduced by armor, darkvision 60, Con +2 Cha -2, waraxe/urgrosh familiarity",
           rc["dwarf"]["speed"] == 20 and rc["dwarf"].get("speedNotReducedByArmor") is True and rc["dwarf"].get("darkvision") == 60
           and rc["dwarf"]["abilityAdjustments"] == {"con": 2, "cha": -2}
           and set(rc["dwarf"]["weaponFamiliarity"]) == {"dwarven-waraxe", "dwarven-urgrosh"})
    expect("elf: +2 racial Listen/Search/Spot", all({"target": f"skill.{s}", "bonusType": "racial", "value": 2} in rc["elf"]["modifiers"]
                                                    for s in ("listen", "search", "spot")))
    expect("halfling: small, +1 racial all saves", rc["halfling"]["size"] == "small"
           and {"target": "save.all", "bonusType": "racial", "value": 1} in rc["halfling"]["modifiers"])
    sp = by["spells.json"]
    rl = [x for x in sp.values() if "ranger" in x["level"]]
    dl = [x for x in sp.values() if "druid" in x["level"]]
    pl = [x for x in sp.values() if "paladin" in x["level"]]
    expect("paladin list: 45 spells (dnd35.db), incl. bless weapon, heal mount, holy sword",
           len(pl) == 45 and all(i in sp for i in ("bless-weapon", "heal-mount", "holy-sword")))
    expect("386 spells: cleric 231, druid 169, ranger 51 (19/12/13/7 by level 1-4), and the domain spells",
           len(sp) == 386 and sum(1 for x in sp.values() if "cleric" in x["level"]) == 231 and len(dl) == 169 and len(rl) == 51 and [
        sum(1 for x in rl if x["level"]["ranger"] == lv) for lv in (1, 2, 3, 4)] == [19, 12, 13, 7])
    expect("entangle: druid 1 / ranger 1, Enchevêtrement",
           sp["entangle"]["level"] == {"domain:plant": 1, "druid": 1, "ranger": 1} and sp["entangle"]["name"]["fr"] == "Enchevêtrement")
    expect("goodberry: druid 1, Baie nourricière", sp["goodberry"]["level"] == {"druid": 1}
           and sp["goodberry"]["name"]["fr"] == "Baie nourricière")
    expect("shapechange: druid 9 / sorcerer-wizard 9, Changement de forme",
           sp["shapechange"]["level"] == {"domain:animal": 9, "druid": 9, "sorcerer-wizard": 9} and sp["shapechange"]["name"]["fr"] == "Changement de forme")
    expect("detect magic: druid 0, school Divination (French SRD 'Universel' corrected)",
           sp["detect-magic"]["level"]["druid"] == 0 and sp["detect-magic"]["school"]["fr"] == "Divination")
    expect("cure light wounds: ranger 2, Soins légers", sp["cure-light-wounds"]["level"]["ranger"] == 2
           and sp["cure-light-wounds"]["name"]["fr"] == "Soins légers")
    cr = by["creatures.json"]
    wolf = cr["wolf"]
    expect("195 creatures (companion lists + Summon Nature's Ally I-IX: 115; other animals and plants: 22; Summon Monster I-IX base creatures: 58)", len(cr) == 195)
    wh = cr["warhorse-heavy"]
    expect("heavy warhorse: Cheval de guerre lourd, 4d8+12, 2 hooves +6 1d6+4 primary, bite +1 1d4+2 secondary, #warhorseHeavy",
           wh["name"]["fr"].startswith("Cheval de guerre lourd") and wh["hp"] == 30
           and [(a["count"], a["bonus"], a["damage"], a["role"]) for a in wh["attacks"]] == [(2, 6, "1d6+4", "primary"), (1, 1, "1d4+2", "secondary")]
           and wh["source"]["srdUrl"].endswith("horse.htm#warhorseHeavy"))
    tr_ = cr["treant"]
    expect("treant: Sylvanien, Huge plant, 2 slams +12 2d6+9, DR 10/tranchant (French SRD 'perforant' corrected)",
           tr_["name"]["fr"] == "Sylvanien" and tr_["type"] == "plant" and tr_["size"] == "huge"
           and (tr_["attacks"][0]["count"], tr_["attacks"][0]["bonus"], tr_["attacks"][0]["damage"]) == (2, 12, "2d6+9")
           and "10/tranchant" in tr_["specialQualities"]["fr"])
    expect("bat and toad: no attack", cr["bat"]["attacks"] == [] and cr["toad"]["attacks"] == [])
    expect("wolf: Loup, 2d8+4 (13 hp), AC 14/12/12, bite +3 1d6+1 (primary, 1.5 Str), trip, Track + Weapon Focus",
           wolf["name"]["fr"] == "Loup" and wolf["hitDice"] == {"count": 2, "die": 8, "bonus": 4} and wolf["hp"] == 13
           and (wolf["ac"]["total"], wolf["ac"]["touch"], wolf["ac"]["flatFooted"]) == (14, 12, 12)
           and [(a["name"]["fr"], a["bonus"], a["damage"], a["role"], a["strDamageFactor"]) for a in wolf["attacks"]]
           == [("Morsure", 3, "1d6+1", "primary", 1.5)] and wolf["featIds"] == ["track", "weapon-focus"]
           and wolf["source"]["srdUrl"] == "https://www.d20srd.org/srd/monsters/wolf.htm")
    dw = cr["dire-wolf"]
    expect("dire wolf: Loup sanguinaire, large, bite +11 1d8+10", dw["name"]["fr"] == "Loup sanguinaire" and dw["size"] == "large"
           and (dw["attacks"][0]["bonus"], dw["attacks"][0]["damage"]) == (11, "1d8+10"))
    ea = cr["elemental-small-air"]
    expect("small air elemental: fly 100 perfect, slam +5 Dex (Weapon Finesse), Élémentaire de l’Air, taille P",
           ea["speed"] == {"land": 0, "fly": 100, "flyManeuver": "perfect"} and ea["attacks"][0]["attackAbility"] == "dex"
           and ea["name"]["fr"] == "Élémentaire de l’Air, taille P" and ea["source"]["srdUrl"].endswith("elemental.htm#airElemental"))
    bb = cr["bear-black"]
    expect("black bear: 2 claws +6 primary, bite +1 secondary (½ Str)",
           [(a["count"], a["bonus"], a["role"], a["strDamageFactor"]) for a in bb["attacks"]] == [(2, 6, "primary", 1), (1, 1, "secondary", 0.5)])
    sl = {x["level"]: x for x in files["summon-lists.json"] if x["spellId"].startswith("summon-natures-ally-")}
    expect("SNA table notes: [NG] giant eagle, [CN] satyr without/with pipes (III/V), [CG] unicorn, [NG] djinni, "
           "aquatic octopus (I) and dire shark (VIII), pixie IX can cast irresistible dance",
           sl[3]["alignments"] == {"eagle-giant": "NG", "owl-giant": "NG", "satyr": "CN"}
           and sl[3]["notes"]["satyr"] == {"en": "Without pipes", "fr": "Sans flûte de Pan"}
           and sl[5]["notes"]["satyr"]["en"] == "With pipes" and sl[4]["alignments"].get("unicorn") == "CG"
           and sl[7]["alignments"].get("djinni") == "NG" and "octopus" in sl[1]["aquatic"]
           and sl[8]["aquatic"] == ["dire-shark"] and "can cast irresistible dance" in sl[9]["notes"]["pixie"]["en"]
           and "pixie" in sl[6]["notes"] and "grig" in sl[9]["notes"])
    ch = cr["unicorn-celestial-charger"]
    expect("celestial charger: 8d10+7d8+75 (two Hit Dice groups)",
           ch["hitDice"] == {"count": 8, "die": 10, "bonus": 75, "extra": [{"count": 7, "die": 8}]})
    expect("quadrupeds: wolf, warhorse, monstrous spider yes; eagle, shark, tyrannosaurus, elemental no",
           all(cr[c]["quadruped"] is True for c in ("wolf", "warhorse-heavy", "monstrous-spider-medium"))
           and all(cr[c]["quadruped"] is False for c in ("eagle", "shark-large", "tyrannosaurus", "elemental-small-air")))
    expect("SNA I: 8 creatures incl. wolf, dire rat; SNA IX: 4 elder elementals, grig, pixie, celestial charger",
           len(sl[1]["creatures"]) == 8 and {"wolf", "dire-rat"} <= set(sl[1]["creatures"])
           and set(sl[9]["creatures"]) == {"elemental-elder-air", "elemental-elder-earth", "elemental-elder-fire",
                                           "elemental-elder-water", "grig", "pixie", "unicorn-celestial-charger"}
           and sl[1]["spellId"] == "summon-natures-ally-i")
    co = files["companions.json"]
    opts = {(o["creatureId"], o["minLevel"]): o["levelAdjustment"] for o in co["options"]}
    expect("companions: wolf base list, dire wolf 7th (-6), tyrannosaurus 16th (-15), crocodile base and 4th (-3); 9-11: +6 HD, multiattack",
           opts.get(("wolf", 1)) == 0 and opts.get(("dire-wolf", 7)) == -6 and opts.get(("tyrannosaurus", 16)) == -15
           and opts.get(("crocodile", 1)) == 0 and opts.get(("crocodile", 4)) == -3 and len(co["options"]) == 59
           and co["advancement"][3]["bonusHD"] == 6 and co["advancement"][3]["special"][0]["id"] == "multiattack")
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
    ip = by["item-properties.json"]
    fb = ip["flaming-burst"]["effects"]
    expect("flaming burst +2: 1d6 fire, crit +1d10 fire",
           ip["flaming-burst"]["bonusEquivalent"] == 2 and fb["extraDamage"][0]["dice"] == "1d6"
           and fb["critExtraDamage"]["dice"] == "1d10" and fb["critExtraDamage"]["type"]["en"] == "fire")
    expect("keen +1 melee only, keen flag, FR Acérée",
           ip["keen"]["bonusEquivalent"] == 1 and ip["keen"]["appliesTo"] == ["melee"] and ip["keen"]["effects"].get("keen") is True
           and ip["keen"]["name"]["fr"] == "Acérée")
    expect("speed +3 extra attack", ip["speed"]["bonusEquivalent"] == 3 and ip["speed"]["effects"].get("extraAttack") is True)
    expect("vorpal +5, FR Vorpale", ip["vorpal"]["bonusEquivalent"] == 5 and ip["vorpal"]["name"]["fr"] == "Vorpale")
    expect("fortification light/moderate/heavy +1/+3/+5",
           [ip[f"{k}-fortification"]["bonusEquivalent"] for k in ("light", "moderate", "heavy")] == [1, 3, 5])
    expect("glamered +2,700 gp flat", ip["glamered"]["bonusEquivalent"] == 0 and ip["glamered"]["flatPriceGp"] == 2700)
    expect("all properties require +1 enhancement", all(x["requiresEnhancement"] for x in files["item-properties.json"]))
    mat = {x["id"]: x for x in custom["materials.json"]}
    mi = mat["mithral"]
    expect("mithral +1,000/+4,000/+9,000, shield +1,000, Dex +2, ACP -3, ASF -10%, half weight",
           (mi["price"]["light"], mi["price"]["medium"], mi["price"]["heavy"], mi["price"]["shield"]) == (1000, 4000, 9000, 1000)
           and mi["effects"]["maxDexBonus"] == 2 and mi["effects"]["acpReduction"] == 3
           and mi["effects"]["arcaneFailureReduction"] == 10 and mi["effects"]["weightMultiplier"] == 0.5)
    ad = mat["adamantine"]
    expect("adamantine weapon +3,000, armor DR 1/2/3", ad["price"]["weapon"] == 3000
           and ad["effects"]["armorDR"] == {"light": "1/—", "medium": "2/—", "heavy": "3/—"})


def finish():
    for w in WARN:
        print("WARN", w)
    for e in ERR:
        print("ERROR", e)
    print(f"\n{len(ERR)} errors, {len(WARN)} warnings")
    return 1 if ERR else 0


if __name__ == "__main__":
    sys.exit(main())
