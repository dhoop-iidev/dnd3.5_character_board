"""Build the SRD JSON data for the playboard (src/data/srd/*.json).

Run:  C:/Users/le_re/miniforge3/python.exe tools/build_data.py
Idempotent: always regenerates every file from the local sources (sources/ is gitignored).
See tools/README.md.
"""
from __future__ import annotations

import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import glossary_fr  # noqa: E402
import rtf_fr  # noqa: E402
import srd_urls  # noqa: E402
from common import (  # noqa: E402
    OUT_SRD, ROOT, clip_paras, db, distance, esc, first_sentence, html_paras, i18n, kebab, num,
    parse_ft, parse_gp, parse_kg_fr, parse_lb, parse_po, srd_source, strip_tags, weight, write_json,
)

from ctx import FR, NOTES, WEIGHT_LOG, fr_entries, fr_paras_html, norm  # noqa: E402


# ---------------------------------------------------------------------------------------------
# French terms already verified in docs/rules/*.md (authoritative over automatic guesses)
# ---------------------------------------------------------------------------------------------

def docs_table(path: Path, en_col=0, fr_col=1) -> dict[str, str]:
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| ") or line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) <= max(en_col, fr_col):
            continue
        en, fr = cells[en_col], cells[fr_col]
        fr = re.sub(r"\s*\(.*$", "", fr).strip()
        en = re.sub(r"\s*\(.*$", "", en).strip() if "(" in en and "each" in en else en
        if en and fr and not en.startswith(("Feat", "Skill", "EN", "Item")):
            out[norm(en)] = fr
    return out


DOCS = ROOT / "docs" / "rules"
DOC_FEATS = docs_table(DOCS / "fighter.md")
DOC_FEATS.update({
    norm("Combat Expertise"): "Expertise du combat", norm("Whirlwind Attack"): "Attaque en rotation",
    norm("Mobility"): "Souplesse du serpent", norm("Spring Attack"): "Attaque éclair",
    norm("Toughness"): "Robustesse", norm("Iron Will"): "Volonté de fer",
    norm("Great Fortitude"): "Vigueur surhumaine", norm("Lightning Reflexes"): "Réflexes surhumains",
    norm("Endurance"): "Endurance", norm("Diehard"): "Dur à cuire",
})
DOC_SKILLS = docs_table(DOCS / "skills.md")

# 3.5-only feats missing from the glossary: identified by reading their French SRD entry
# (DRS 05) benefit text; each is still checked against the DRS 05 headers at build time.
HAND_FEATS = {
    "Acrobatic": "Voltigeur", "Agile": "Funambule", "Animal Affinity": "Fraternité animale",
    "Armor Proficiency (Heavy)": "Port des armures lourdes", "Armor Proficiency (Light)": "Port des armures légères",
    "Armor Proficiency (Medium)": "Port des armures intermédiaires", "Athletic": "Athlétisme",
    "Augment Summoning": "Amélioration des créatures convoquées", "Deceitful": "Fourberie",
    "Deft Hands": "Doigts de fée", "Diligent": "Méticuleux", "Eschew Materials": "Dispense de composantes matérielles",
    "Greater Spell Focus": "École supérieure", "Greater Spell Penetration": "Efficacité des sorts supérieure",
    "Improved Counterspell": "Science du contresort", "Improved Turning": "Science du renvoi",
    "Investigator": "Fin limier", "Magical Aptitude": "Affinité magique",
    "Martial Weapon Proficiency": "Maniement d’une arme de guerre", "Natural Spell": "Incantation animale",
    "Negotiator": "Négociation", "Nimble Fingers": "Savoir-faire mécanique", "Persuasive": "Persuasion",
    "Self-Sufficient": "Autonome", "Shield Proficiency": "Maniement des boucliers", "Stealthy": "Discret",
    "Tower Shield Proficiency": "Maniement du pavois", "Improved Familiar": "Familier supérieur", "Widen Spell": "Extension de zone d’effet",
}

# =============================================================================================
# Skills
# =============================================================================================

PSIONIC_SKILLS = {"Autohypnosis", "Psicraft", "Use Psionic Device"}
KNOWLEDGE_FR = {
    "arcana": "mystères", "architecture and engineering": "architecture et ingénierie",
    "dungeoneering": "exploration souterraine", "geography": "géographie", "history": "histoire",
    "local": "folklore local", "nature": "nature", "nobility and royalty": "noblesse et royauté",
    "religion": "religion", "the planes": "plans",
}
ABIL = {"Str": "str", "Dex": "dex", "Con": "con", "Int": "int", "Wis": "wis", "Cha": "cha"}


def build_skills():
    c = db()
    fr_paras = rtf_fr.load("DRS 04")
    fr_ref = rtf_fr.file_label("DRS 04")
    # French skill entries: "Nom (Carac ; …)"
    entries = fr_entries(fr_paras, r"^[A-ZÉÈÀÂÎÔÛÇ][^.]{2,60} \((For|Dex|Con|Int|Sag|Cha|aucune)\b")
    fr_by_norm = {norm(re.sub(r"\s*\(.*$", "", t)): (re.sub(r"\s*\(.*$", "", t), body) for t, body in entries}

    skills = []
    for r in c.execute("select * from skill where psionic='No' order by name"):
        en = r["name"]
        if en in PSIONIC_SKILLS:
            continue
        base_id = kebab(en)
        doc_fr = DOC_SKILLS.get(norm(en)) or DOC_SKILLS.get(norm(en + " (each)"))
        hit = fr_by_norm.get(norm(doc_fr)) if doc_fr else None
        gl = glossary_fr.lookup(en, "compétence")
        if not hit and gl:
            hit = fr_by_norm.get(norm(gl))
        fr_name = FR.resolve(base_id, en, hit[0] if hit else None, doc_fr or gl, "rtf+docs")
        body = hit[1] if hit else []
        en_paras = html_paras(r["full_text"])
        text_en = clip_paras(en_paras, 1500)
        text_fr = clip_paras(fr_paras_html(body), 1500) if body else f"<p>{esc(fr_name)}</p>"
        armor = 0
        if r["armor_check"] == "Yes":
            armor = 2 if en == "Swim" else 1
        ability = ABIL.get(r["key_ability"], "int")
        common = dict(ability=ability, trainedOnly=r["trained"] == "Yes", armorCheck=armor)
        if en == "Speak Language":
            # SRD key ability "None": no ability modifier applies (SkillDef.noAbility).
            common["noAbility"] = True
        url = srd_urls.skill_url(en)
        if en == "Knowledge":
            for field, field_fr in KNOWLEDGE_FR.items():
                sid = "knowledge-" + kebab(field)
                name_en = f"Knowledge ({field})"
                name_fr = FR.resolve(sid, name_en, f"{fr_name} ({field_fr})", None, "rtf+docs")
                skills.append(dict(id=sid, name=i18n(name_en, name_fr), **common, hasSubtypes=False,
                                   text=i18n(text_en, text_fr), source=srd_source(url, fr_ref)))
            continue
        skills.append(dict(id=base_id, name=i18n(en, fr_name), **common,
                           hasSubtypes=en in ("Craft", "Perform", "Profession"),
                           text=i18n(text_en, text_fr), source=srd_source(url, fr_ref)))
    write_json(OUT_SRD / "skills.json", skills)
    return skills


# =============================================================================================
# Synergies (SRD Table: Skill Synergies, cross-checked with docs/rules/skills.md §7)
# =============================================================================================

SYNERGIES = [
    ("bluff", "diplomacy", None),
    ("bluff", "disguise", ("only to act in character when you know you're being observed",
                           "seulement pour jouer un rôle quand on se sait observé")),
    ("bluff", "intimidate", None),
    ("bluff", "sleight-of-hand", None),
    ("craft", "appraise", ("only for items made with that Craft skill",
                           "seulement pour les objets relevant de cet Artisanat")),
    ("decipher-script", "use-magic-device", ("only with scrolls", "seulement pour les parchemins")),
    ("escape-artist", "use-rope", ("only to bind someone", "seulement pour ligoter quelqu’un")),
    ("handle-animal", "ride", None),
    ("jump", "tumble", None),
    ("knowledge-arcana", "spellcraft", None),
    ("knowledge-architecture-and-engineering", "search",
     ("only to find secret doors or hidden compartments",
      "seulement pour trouver portes secrètes et compartiments cachés")),
    ("knowledge-dungeoneering", "survival", ("only when underground", "seulement sous terre")),
    ("knowledge-geography", "survival", ("only to keep from getting lost or to avoid natural hazards",
                                         "seulement pour ne pas se perdre ou éviter les dangers naturels")),
    ("knowledge-local", "gather-information", None),
    ("knowledge-nature", "survival", ("only in aboveground natural environments",
                                      "seulement en milieu naturel, à la surface")),
    ("knowledge-nobility-and-royalty", "diplomacy", None),
    ("knowledge-the-planes", "survival", ("only while on other planes", "seulement sur les autres plans")),
    ("search", "survival", ("only to find or follow tracks", "seulement pour trouver ou suivre une piste")),
    ("sense-motive", "diplomacy", None),
    ("spellcraft", "use-magic-device", ("only with scrolls", "seulement pour les parchemins")),
    ("survival", "knowledge-nature", None),
    ("tumble", "balance", None),
    ("tumble", "jump", None),
    ("use-magic-device", "spellcraft", ("only to decipher spells on scrolls",
                                        "seulement pour déchiffrer les sorts des parchemins")),
    ("use-rope", "climb", ("only to climb a rope, a knotted rope or a rope-and-wall combination",
                           "seulement pour grimper à une corde, une corde à nœuds ou une corde le long d’une paroi")),
    ("use-rope", "escape-artist", ("only to escape from rope bonds",
                                   "seulement pour se libérer de liens de corde")),
]


def build_synergies(skill_ids: set[str]):
    url = srd_urls.anchor_url("skills/usingSkills.htm", ["tableSkillSynergies", "skillSynergy"])
    out = []
    for f, t, cond in SYNERGIES:
        assert f in skill_ids and t in skill_ids, (f, t)
        d = {"from": f, "to": t, "ranks": 5, "value": 2}
        if cond:
            d["condition"] = i18n(*cond)
        d["source"] = srd_source(url, rtf_fr.file_label("DRS 04"))
        out.append(d)
    out.sort(key=lambda d: (d["from"], d["to"]))
    write_json(OUT_SRD / "synergies.json", out)
    NOTES.append("synergies: class-feature targets (wild empathy, bardic knowledge, turning) are not skills and were left out.")
    return out


# =============================================================================================
# Feats
# =============================================================================================

FIGHTER_BONUS = [
    "Blind-Fight", "Cleave", "Combat Expertise", "Combat Reflexes", "Deflect Arrows", "Dodge",
    "Exotic Weapon Proficiency", "Far Shot", "Great Cleave", "Greater Two-Weapon Fighting",
    "Greater Weapon Focus", "Greater Weapon Specialization", "Improved Bull Rush", "Improved Critical",
    "Improved Disarm", "Improved Feint", "Improved Grapple", "Improved Initiative", "Improved Overrun",
    "Improved Precise Shot", "Improved Shield Bash", "Improved Sunder", "Improved Trip",
    "Improved Two-Weapon Fighting", "Improved Unarmed Strike", "Manyshot", "Mobility", "Mounted Archery",
    "Mounted Combat", "Point Blank Shot", "Power Attack", "Precise Shot", "Quick Draw", "Rapid Reload",
    "Rapid Shot", "Ride-By Attack", "Shot on the Run", "Snatch Arrows", "Spirited Charge", "Spring Attack",
    "Stunning Fist", "Trample", "Two-Weapon Defense", "Two-Weapon Fighting", "Weapon Finesse",
    "Weapon Focus", "Weapon Specialization", "Whirlwind Attack",
]

SKILL_FEATS = {
    "acrobatic": ["jump", "tumble"], "agile": ["balance", "escape-artist"], "alertness": ["listen", "spot"],
    "animal-affinity": ["handle-animal", "ride"], "athletic": ["climb", "swim"],
    "deceitful": ["disguise", "forgery"], "deft-hands": ["sleight-of-hand", "use-rope"],
    "diligent": ["appraise", "decipher-script"], "investigator": ["gather-information", "search"],
    "magical-aptitude": ["spellcraft", "use-magic-device"], "negotiator": ["diplomacy", "sense-motive"],
    "nimble-fingers": ["disable-device", "open-lock"], "persuasive": ["bluff", "intimidate"],
    "self-sufficient": ["heal", "survival"], "stealthy": ["hide", "move-silently"],
}


def feat_modifiers(fid: str) -> list[dict] | None:
    m = {
        "weapon-focus": [{"target": "attack.choice", "bonusType": "untyped", "value": 1}],
        "greater-weapon-focus": [{"target": "attack.choice", "bonusType": "untyped", "value": 1}],
        "weapon-specialization": [{"target": "damage.choice", "bonusType": "untyped", "value": 2}],
        "greater-weapon-specialization": [{"target": "damage.choice", "bonusType": "untyped", "value": 2}],
        "improved-initiative": [{"target": "initiative", "bonusType": "untyped", "value": 4}],
        "iron-will": [{"target": "save.will", "bonusType": "untyped", "value": 2}],
        "great-fortitude": [{"target": "save.fort", "bonusType": "untyped", "value": 2}],
        "lightning-reflexes": [{"target": "save.ref", "bonusType": "untyped", "value": 2}],
        "toughness": [{"target": "hp.max", "bonusType": "untyped", "value": 3}],
        "skill-focus": [{"target": "skill.choice", "bonusType": "untyped", "value": 3}],
        "dodge": [{"target": "ac", "bonusType": "dodge", "value": 1,
                   "condition": i18n("vs designated opponent", "contre l’adversaire désigné")}],
        "mobility": [{"target": "ac", "bonusType": "dodge", "value": 4,
                      "condition": i18n("vs attacks of opportunity caused by moving out of or within a threatened area",
                                        "contre les attaques d’opportunité provoquées en quittant ou traversant une zone contrôlée")}],
    }.get(fid)
    if fid in SKILL_FEATS:
        m = [{"target": f"skill.{s}", "bonusType": "untyped", "value": 2} for s in SKILL_FEATS[fid]]
    return m


FEAT_TYPE = {"General": "general", "Item Creation": "itemCreation", "Metamagic": "metamagic", "Special": "special"}


def split_top(s: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip().rstrip(".").strip() for p in parts if p.strip().rstrip(".").strip()]


ORD = r"(\d+)(?:st|nd|rd|th)"
OTHER_FR = [
    (rf"^Caster level {ORD}$", lambda m: f"Niveau {m.group(1)} de lanceur de sorts"),
    (rf"^Wizard level {ORD}$", lambda m: f"Magicien de niveau {m.group(1)}"),
    (r"^Ability to turn or rebuke creatures$", lambda m: "Pouvoir de renvoi ou d’intimidation des créatures"),
    (r"^wild shape ability$", lambda m: "Aptitude forme animale"),
    (r"^Ability to acquire a new familiar$", lambda m: "Pouvoir d’obtenir un nouveau familier"),
    (r"^compatible alignment$", lambda m: "Alignement compatible"),
    (r"^sufficiently high level \(see below\)$", lambda m: "Niveau suffisant (voir ci-dessous)"),
    (r"^Str 13 for bastard sword or dwarven waraxe$",
     lambda m: "For 13 pour l’épée bâtarde ou la hache de guerre naine"),
]


def parse_prereq(text: str | None, feat_ids_by_norm: dict[str, str], fr_line: str) -> dict:
    pr: dict = {}
    if not text or text.strip() in ("None", ""):
        return pr
    t = text.replace("Base attack bonus +1 (plus Str 13 for bastard sword or dwarven waraxe)",
                     "Base attack bonus +1, Str 13 for bastard sword or dwarven waraxe")
    for part in split_top(t):
        p = part.strip()
        m = re.match(r"^(Str|Dex|Con|Int|Wis|Cha) (\d+)$", p)
        if m:
            pr.setdefault("abilities", {})[ABIL[m.group(1)]] = int(m.group(2))
            continue
        m = re.match(r"^[Bb]ase attack bonus \+(\d+)$", p)
        if m:
            pr["bab"] = int(m.group(1))
            continue
        m = re.match(rf"^[Ff]ighter level {ORD}$", p)
        if m:
            pr["fighterLevel"] = int(m.group(1))
            continue
        m = re.match(rf"^[Cc]haracter level {ORD}$", p)
        if m:
            pr["characterLevel"] = int(m.group(1))
            continue
        m = re.match(r"^(Ride) (\d+) ranks?$", p)
        if m:
            pr.setdefault("skills", {})["ride"] = int(m.group(2))
            continue
        if re.match(r"^(Proficiency with selected weapon|Proficient with weapon|Weapon Proficiency \(crossbow type chosen\))$", p):
            pr["proficiency"] = "$choice"
            continue
        m = re.match(r"^(.+?) with selected weapon$", p)
        if m and norm(m.group(1)) in feat_ids_by_norm:
            pr.setdefault("feats", []).append(feat_ids_by_norm[norm(m.group(1))] + ":$choice")
            continue
        m = re.match(r"^Spell Focus \((\w+)\)$", p)
        if m:
            pr.setdefault("feats", []).append(f"spell-focus:{m.group(1).lower()}")
            continue
        if norm(p) in feat_ids_by_norm:
            pr.setdefault("feats", []).append(feat_ids_by_norm[norm(p)])
            continue
        fr = None
        for rx, f in OTHER_FR:
            mm = re.match(rx, p)
            if mm:
                fr = f(mm)
                break
        pr.setdefault("other", []).append(i18n(p, fr or fr_line))
    return pr


def build_feats(skill_ids: set[str]):
    c = db()
    rows = [dict(r) for r in c.execute("select * from feat where reference='SRD 3.5 Feats' and name<>'Feat Name' order by name")]
    ids_by_norm = {norm(r["name"]): kebab(r["name"]) for r in rows}
    fighter_ids = {kebab(n) for n in FIGHTER_BONUS}
    missing = fighter_ids - set(ids_by_norm.values())
    assert not missing, missing

    fr_paras = rtf_fr.load("DRS 05")
    fr_ref = rtf_fr.file_label("DRS 05")
    entries = fr_entries(fr_paras, r"^.+ \[[^\]]+\]$")
    fr_feats = {}
    for title, body in entries:
        name = re.sub(r"\s*\[[^\]]+\]$", "", title).strip()
        fr_feats[norm(name)] = (name, body)

    feats = []
    for r in rows:
        en = r["name"]
        fid = kebab(en)
        doc = DOC_FEATS.get(norm(en))
        gl = glossary_fr.lookup(en, "don")
        hit = None
        method = ""
        for cand, meth in ((doc, "docs+rtf"), (gl, "glossary+rtf"), (HAND_FEATS.get(en), "hand+rtf")):
            if cand and norm(cand) in fr_feats:
                hit, method = fr_feats[norm(cand)], meth
                break
        fr_name = FR.resolve(fid, en, hit[0] if hit else None, doc or gl or HAND_FEATS.get(en), method)
        body = hit[1] if hit else []
        cond_line = next((p.text for p in body if p.bold_prefix.startswith("Condition")), "")
        cond_line = re.sub(r"^Conditions?\.\s*", "", cond_line).rstrip(".")
        avantage = next((p.text for p in body if p.bold_prefix.startswith("Avantage")), "")
        avantage = re.sub(r"^Avantage\.\s*", "", avantage)

        benefit = strip_tags(r["benefit"] or "").replace("Benefit:", "").strip()
        choice_txt = (r["choice"] or "None")
        choice = None
        if choice_txt != "None":
            if re.search(r"weapon|crossbow", choice_txt, re.I):
                choice = "weapon"
            elif "skill" in choice_txt.lower():
                choice = "skill"
            elif "school" in choice_txt.lower():
                choice = "school"
            else:
                choice = "other"
        prereq = parse_prereq(r["prerequisite"], ids_by_norm, cond_line or "")
        if fid == "greater-spell-focus":
            # SRD: "Choose a school of magic to which you already have applied the Spell Focus feat."
            prereq.setdefault("feats", []).append("spell-focus:$choice")
        if choice == "weapon" and fid in ("weapon-focus", "greater-weapon-focus", "weapon-specialization",
                                          "greater-weapon-specialization", "improved-critical", "rapid-reload"):
            prereq["proficiency"] = "$choice"
        d = dict(
            id=fid, name=i18n(en, fr_name), type=FEAT_TYPE.get(r["type"], "general"),
            fighterBonus=fid in fighter_ids, multiple=r["multiple"] == "Yes",
        )
        if choice:
            d["choice"] = choice
        d["prereq"] = prereq
        d["summary"] = i18n(first_sentence(benefit), first_sentence(avantage) if avantage else fr_name)
        en_paras = html_paras(r["full_text"])
        d["text"] = i18n(clip_paras(en_paras), clip_paras(fr_paras_html(body)) if body else f"<p>{esc(fr_name)}</p>")
        d["source"] = srd_source(srd_urls.feat_url(en), fr_ref)
        mods = feat_modifiers(fid)
        if mods:
            for mo in mods:
                if mo["target"].startswith("skill.") and mo["target"] != "skill.choice":
                    assert mo["target"][6:] in skill_ids, mo
            d["modifiers"] = mods
        feats.append(d)
    write_json(OUT_SRD / "feats.json", feats)
    return feats


# =============================================================================================
# Classes: the fighter is built here (its fields are fixed by tests); build_classes.py adds its
# features and the 10 other core classes, then writes classes.json.
# =============================================================================================

def build_fighter(feats):
    c = db()
    rows = c.execute("select * from class_table where name='Fighter' order by cast(level as int)").fetchall()
    fr_paras = rtf_fr.load("DRS 03a")
    en_paras = rtf_fr.load("04_", "en")
    i = next(k for k, p in enumerate(fr_paras) if p.text == "Guerrier" and p.bold_all)
    k = next(k for k in range(i, len(fr_paras)) if fr_paras[k].bold_prefix.startswith("Armes et armures"))
    fr_body = fr_paras[k:k + 3]
    j = next(k for k, p in enumerate(en_paras) if p.text.strip() == "FIGHTER")
    k = next(k for k in range(j, len(en_paras)) if en_paras[k].bold_prefix.startswith("Weapon and Armor Proficiency"))
    en_body = en_paras[k:k + 3]
    table = []
    for r in rows:
        lvl = int(r["level"])
        if lvl > 20:
            continue
        bab = int(r["base_attack_bonus"].split("/")[0])
        special = [i18n("Bonus feat", "Don supplémentaire")] if r["special"] == "Bonus feat" else []
        table.append(dict(level=lvl, bab=bab, fort=int(r["fort_save"]), ref=int(r["ref_save"]),
                          will=int(r["will_save"]), special=special))
    fighter = dict(
        id="fighter", name=i18n("Fighter", "Guerrier"), prestige=False, hitDie=10, skillPoints=2,
        classSkills=["climb", "craft", "handle-animal", "intimidate", "jump", "ride", "swim"],
        proficiencies={"weapons": ["simple", "martial"], "armor": ["light", "medium", "heavy", "shield", "tower"]},
        table=table,
        bonusFeatLevels=[t["level"] for t in table if t["special"]],
        bonusFeatList=sorted(f["id"] for f in feats if f["fighterBonus"]),
        text=i18n(clip_paras(fr_paras_html(en_body)), clip_paras(fr_paras_html(fr_body))),
        source=srd_source(srd_urls.anchor_url("classes/fighter.htm", "tableTheFighter"), rtf_fr.file_label("DRS 03a")),
    )
    assert fighter["bonusFeatLevels"] == [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
    return fighter


# =============================================================================================
# Entry point
# =============================================================================================

def main() -> None:
    import build_classes
    import build_creatures
    import build_equipment
    import build_magic
    import build_races
    import build_spells
    import build_properties

    print("Building SRD data into", OUT_SRD)
    counts = {}
    skills = build_skills()
    skill_ids = {s["id"] for s in skills}
    counts["skills.json"] = len(skills)
    counts["synergies.json"] = len(build_synergies(skill_ids))
    feats = build_feats(skill_ids)
    counts["feats.json"] = len(feats)
    weapons, ammo = build_equipment.build_weapons()
    counts["weapons.json"] = len(weapons)
    weapon_ids = {w["id"] for w in weapons}
    feat_ids = {f["id"] for f in feats}
    counts["classes.json"] = len(build_classes.build_all(build_fighter(feats), skill_ids, feat_ids, weapon_ids))
    counts["races.json"] = len(build_races.build_races(skill_ids, weapon_ids))
    spells = build_spells.build_spells()
    counts["spells.json"] = len(spells)
    creatures, companions, summon, _ = build_creatures.build_creatures(weapons, feats, skills, {x["id"] for x in spells})
    counts["creatures.json"] = len(creatures)
    counts["companions.json"] = len(companions["options"])
    counts["summon-lists.json"] = len(summon)
    armor, extras = build_equipment.build_armor()
    counts["armor.json"] = len(armor)
    counts["gear.json"] = len(build_equipment.build_gear(ammo, extras))
    counts["magic-items.json"] = len(build_magic.build_magic_items())
    counts["item-properties.json"] = len(build_properties.build_item_properties())
    counts["carrying-capacity.json"] = len(build_magic.build_carrying_capacity())

    FR.write()
    # The OGL notice must ship with the SRD content.
    ogl = ROOT / "sources" / "OGL.txt"
    if ogl.exists():
        (ROOT / "public").mkdir(exist_ok=True)
        shutil.copyfile(ogl, ROOT / "public" / "OGL.txt")
        print("Copied sources/OGL.txt -> public/OGL.txt")

    print("\nFiles:")
    for k, v in counts.items():
        print(f"  {k:26s} {v:4d}")
    print("\n" + FR.summary())
    if FR.todo:
        print("  still to check in tools/fr_overrides.csv:", ", ".join(t["id"] for t in FR.todo))
    if WEIGHT_LOG:
        print("\nFrench kg differing from lb/2 (kept as printed, house rule #5):")
        for w in WEIGHT_LOG:
            print("  " + w)
    if NOTES:
        print("\nNotes:")
        for n in dict.fromkeys(NOTES):
            print("  - " + n)


if __name__ == "__main__":
    main()
