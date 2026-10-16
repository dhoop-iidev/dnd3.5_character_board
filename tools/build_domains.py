"""Cleric domains (src/data/srd/domains.json): the 22 SRD domains (https://www.d20srd.org/srd/spellLists/clericDomains.htm).

English: granted powers and spell-list footnotes as printed in the English SRD RTF (17_SpellListI, "CLERIC DOMAINS"),
spell slots from the same lines, checked against the dnd35.db `domain` table and the "domain:<id>" levels of
spells.json. French: DRS 21 "Domaines de prêtre" (Pouvoir(s) accordé(s), footnotes, numbered spell lists); the French
names come from the "Domaine de ..." headings (= the DD-3e glossary, category "domaine de prêtre"). French lines that
contradict the 3.5 SRD are corrected in FR_ERRATA (each must still be found in the source). The machine-readable
`effects` are written by hand below from the SRD text.

Run alone: python tools/build_domains.py (reads src/data/srd/spells.json; build_data.py calls build_domains()).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import rtf_fr  # noqa: E402
from build_spells import DOMAINS, FR_LIST_ALIAS  # noqa: E402
from common import OUT_SRD, db, esc, i18n, srd_source, write_json  # noqa: E402
from ctx import NOTES, norm  # noqa: E402

PAGE = "https://www.d20srd.org/srd/spellLists/clericDomains.htm"
KNOWLEDGE = ["knowledge-arcana", "knowledge-architecture-and-engineering", "knowledge-dungeoneering",
             "knowledge-geography", "knowledge-history", "knowledge-local", "knowledge-nature",
             "knowledge-nobility-and-royalty", "knowledge-religion", "knowledge-the-planes"]


def _turn(mode: str, en: str, fr: str, per_day: str) -> dict:
    return {"mode": mode, "creatures": i18n(en, fr), "perDay": per_day}


def _elemental(rebuke: tuple[str, str], turn: tuple[str, str]) -> dict:
    """Air/Earth/Fire/Water: turn or destroy the opposed element, rebuke/command/bolster the own element; one pool of
    3 + Cha modifier uses per day. DomainDef.turning holds one entry: the rebuke one, the turned creatures in the text."""
    return _turn("rebuke",
                 f"{rebuke[0]} creatures (rebuke, command or bolster); {turn[0]} creatures: turn or destroy",
                 f"créatures {rebuke[1]} (intimider, contrôler ou augmenter le moral) ; créatures {turn[1]} : renvoyer ou détruire",
                 "3 + Cha")


# Machine-readable parts of the granted powers (SRD text above each entry; skill/feat ids of skills.json/feats.json).
EFFECTS: dict[str, dict] = {
    # Turn or destroy earth creatures ... Rebuke, command, or bolster air creatures ... 3 + Cha modifier per day.
    "air": {"turning": _elemental(("air", "de l’air"), ("earth", "de la terre"))},
    # Speak with animals once per day (spell-like); Knowledge (nature) is a class skill.
    "animal": {"classSkills": ["knowledge-nature"], "usesPerDay": "1/day: speak with animals (Sp)"},
    # You cast chaos spells at +1 caster level ([Chaotic] descriptor).
    "chaos": {"casterLevelBonus": {"descriptor": "chaotic", "value": 1}},
    # Death touch once per day (Su): 1d6 per cleric level >= current hp: dies.
    "death": {"usesPerDay": "1/day: death touch (Su)"},
    # Smite once per day (Su): +4 attack, + cleric level damage.
    "destruction": {"usesPerDay": "1/day: smite (Su)"},
    "earth": {"turning": _elemental(("earth", "de la terre"), ("air", "de l’air"))},
    "evil": {"casterLevelBonus": {"descriptor": "evil", "value": 1}},
    "fire": {"turning": _elemental(("fire", "du feu"), ("water", "de l’eau"))},
    "good": {"casterLevelBonus": {"descriptor": "good", "value": 1}},
    # You cast healing spells (Conjuration [Healing]) at +1 caster level.
    "healing": {"casterLevelBonus": {"subschool": "healing", "value": 1}},
    # All Knowledge skills are class skills; divination spells at +1 caster level.
    "knowledge": {"classSkills": KNOWLEDGE, "casterLevelBonus": {"school": "divination", "value": 1}},
    "law": {"casterLevelBonus": {"descriptor": "lawful", "value": 1}},
    # Good fortune once per day (Ex): reroll one roll just made.
    "luck": {"usesPerDay": "1/day: reroll (Ex)"},
    # Use spell completion / spell trigger items as a wizard of half the cleric level (min. 1st); always on.
    "magic": {"usesPerDay": "at will: scrolls, wands (spell completion/trigger) as a wizard of ½ cleric level (min. 1)"},
    # Rebuke or command plant creatures, 3 + Cha modifier per day (Su); Knowledge (nature) is a class skill.
    "plant": {"classSkills": ["knowledge-nature"],
              "turning": _turn("rebuke", "plant creatures (rebuke or command)", "créatures végétales (intimider ou contrôler)", "3 + Cha")},
    # Protective ward once per day (Su): resistance bonus = cleric level on the next save, 1 hour.
    "protection": {"usesPerDay": "1/day: protective ward (Su)"},
    # Feat of strength once per day (Su): enhancement bonus to Str = cleric level for 1 round.
    "strength": {"usesPerDay": "1/day: feat of strength (Su), 1 round"},
    # Once per day, a greater turning in place of a regular turning (turned undead are destroyed).
    "sun": {"turning": _turn("greater-turning", "undead (turned undead are destroyed instead)",
                             "morts-vivants (ceux qui seraient renvoyés sont détruits)", "1/day")},
    # Freedom of movement for a total of 1 round per cleric level per day (Su); Survival is a class skill.
    "travel": {"classSkills": ["survival"], "usesPerDay": "rounds/day = cleric level: freedom of movement (Su)"},
    "trickery": {"classSkills": ["bluff", "disguise", "hide"]},
    # Martial Weapon Proficiency (if necessary) and Weapon Focus with the deity's favored weapon.
    "war": {"grantsFeats": ["martial-weapon-proficiency:$deityWeapon", "weapon-focus:$deityWeapon"]},
    "water": {"turning": _elemental(("water", "de l’eau"), ("fire", "du feu"))},
}

# DRS 21 lines that contradict the 3.5 SRD: domain id -> [(old, new)]; new None drops the paragraph.
FR_ERRATA: dict[str, list[tuple[str, str | None]]] = {
    "travel": [
        # SRD: "This granted power is a supernatural ability." (the 3.0 power was extraordinary)
        ("Ce pouvoir extraordinaire semblable au sort", "Ce pouvoir surnaturel semblable au sort"),
        # 3.0 skill name: Wilderness Lore became Survival (Survie) in 3.5.
        ("Sens de la nature est une compétence de classe.", "Survie est une compétence de classe."),
    ],
    "water": [("augmenter le moral des les créatures", "augmenter le moral des créatures")],  # misprint
    # 3.0 footnote (endure elements against fire or cold only); the 3.5 SRD Sun list has no footnote.
    "sun": [("* Endurance au feu ou au froid uniquement.", None)],
    # Favored weapons of the PHB deities: not in the SRD (no deities); the English SRD does not print it.
    "war": [("Les armes de prédilection des dieux de la guerre sont les suivantes", None)],
}


# DRS 21 domain-list slots that still print the 3.0 spell (the English SRD 3.5 and the DRS 22 level lines have the
# 3.5 one): (domain, level) -> French name printed.
FR_LIST_STALE = {
    ("magic", 1): "Aura indétectable",  # 3.0 Nystul's undetectable aura; 3.5 magic aura (Aura magique, DRS 22 "Magie 1")
    ("travel", 1): "Repli expéditif",  # 3.0 expeditious retreat; 3.5 longstrider (Grand pas, DRS 22 "Voyage 1")
}


def en_domains() -> dict[str, dict]:
    """English SRD RTF: {domain id: {"power": [paragraphs], "notes": [footnotes], "spells": {level: name}}}."""
    ps = rtf_fr.load("17_SpellListI", "en")
    start = next(i for i, p in enumerate(ps) if p.text.strip() == "CLERIC DOMAINS")
    by_en = {en.upper(): d for d, (en, _) in DOMAINS.items()}
    out: dict[str, dict] = {}
    cur = None
    for p in ps[start + 1:]:
        t = p.text.strip()
        m = re.match(r"^([A-Z]+) DOMAIN$", t)
        if m:
            cur = out.setdefault(by_en[m.group(1)], {"power": [], "notes": [], "spells": {}})
            continue
        if cur is None or not t or t.endswith("Domain Spells"):
            continue
        m = re.match(r"^(\d) (.+?)(?: (?:M|F|XP|X|DF)(?:[/, ] ?(?:M|F|XP|X|DF))*)?\**:\s", t)
        if m:
            cur["spells"][int(m.group(1))] = m.group(2).strip()
        elif t.startswith("*"):
            cur["notes"].append(t)
        else:
            cur["power"].append(t)
    assert set(out) == set(DOMAINS), set(DOMAINS) ^ set(out)
    return out


def fr_domains() -> dict[str, dict]:
    """DRS 21 "Domaines de prêtre": {domain id: {"power": [...], "notes": [...], "spells": {level: French name}}}."""
    ps = rtf_fr.load("DRS 21")
    start = next(i for i, p in enumerate(ps) if p.text.startswith("Domaines de prêtre"))
    by_fr = {norm(fr): d for d, (_, fr) in DOMAINS.items()}
    out: dict[str, dict] = {}
    cur = None
    for p in ps[start + 1:]:
        t = p.text.strip()
        if p.bold_all and t.startswith("Sorts de rôdeur"):
            break
        m = re.match(r"^Domaine (?:de l’|de la |du )(.+)$", t)
        if p.bold_all and m:
            cur = out.setdefault(by_fr[norm(m.group(1))], {"power": [], "notes": [], "spells": {}})
            continue
        if cur is None or not t or t.startswith("Sorts du domaine"):
            continue
        m = re.match(r"^(\d)\.? (.+?)\s*(?:\((?:M|F|X|FD|PX)(?:, ?(?:M|F|X|FD|PX))*\))?\**\.\s", t)
        if m:
            cur["spells"][int(m.group(1))] = m.group(2).strip()
        elif t.startswith("*"):
            cur["notes"].append(t)
        else:
            cur["power"].append(t)
    assert set(out) == set(DOMAINS), set(DOMAINS) ^ set(out)
    return out


def paras_html(paras: list[str]) -> str:
    out = []
    for t in paras:
        m = re.match(r"^((?:Granted Powers?|Pouvoirs? accordés?) ?:)\s*(.*)$", t)
        out.append(f"<p><b>{esc(m.group(1))}</b> {esc(m.group(2))}</p>" if m else f"<p>{esc(t)}</p>")
    return "".join(out)


def build_domains(spells: list[dict] | None = None) -> list[dict]:
    if spells is None:
        spells = json.loads((OUT_SRD / "spells.json").read_text(encoding="utf-8"))
    by_en = {s["name"]["en"].lower(): s for s in spells}
    by_fr = {norm(s["name"]["fr"]): s for s in spells}
    alias = {norm(v): norm(k) for k, v in FR_LIST_ALIAS.items()}
    en, fr = en_domains(), fr_domains()
    c = db()
    rows = {r["name"]: r for r in c.execute("select * from domain where reference = 'SRD 3.5 SpellListI'")}
    out = []
    for did, (name_en, name_fr) in DOMAINS.items():
        e, f = en[did], fr[did]
        for old, new in FR_ERRATA.get(did, []):
            hits = [i for i, t in enumerate(f["power"] + f["notes"]) if old in t]
            assert len(hits) == 1, (did, old)
            lst, i = (f["power"], hits[0]) if hits[0] < len(f["power"]) else (f["notes"], hits[0] - len(f["power"]))
            if new is None:
                lst.pop(i)
            else:
                lst[i] = lst[i].replace(old, new)
            NOTES.append(f"domains: French SRD corrected in {did}: '{old}' -> {new!r}")
        assert len(e["notes"]) == len(f["notes"]), (did, e["notes"], f["notes"])
        assert sorted(e["spells"]) == list(range(1, 10)) and sorted(f["spells"]) == list(range(1, 10)), did
        row = rows[name_en]
        slots = {}
        for lv in range(1, 10):
            s = by_en.get(e["spells"][lv].lower().replace("’", "'"))
            assert s, f"domain {did} {lv}: '{e['spells'][lv]}' not in spells.json"
            # dnd35.db domain table: same spell (it prints "greater teleport" for "Teleport, Greater").
            db_name = row[f"spell_{lv}"].lower()
            m = re.match(r"^(mass|greater|lesser) (.+)$", db_name)
            assert db_name == s["name"]["en"].lower() or (m and f"{m.group(2)}, {m.group(1)}" == s["name"]["en"].lower()), (did, lv, db_name)
            assert s["level"].get(f"domain:{did}") == lv, f"{s['id']}: level domain:{did} != {lv}"
            # French list: the same spell (French name of spells.json, or its DRS 21 list alias).
            nf = norm(f["spells"][lv])
            sf = by_fr.get(nf) or by_fr.get(alias.get(nf, ""))
            if sf is not s:
                assert FR_LIST_STALE.get((did, lv)) == f["spells"][lv], f"domain {did} {lv}: DRS 21 '{f['spells'][lv]}' != {s['name']['fr']}"
                NOTES.append(f"domains: DRS 21 {did} {lv} prints the 3.0 spell '{f['spells'][lv]}'; SRD 3.5: {s['name']['fr']} ({s['id']})")
            slots[str(lv)] = s["id"]
        d = {
            "id": did,
            "name": i18n(name_en, name_fr),
            "grantedPower": i18n(paras_html(e["power"] + e["notes"]), paras_html(f["power"] + f["notes"])),
            "spells": slots,
            "effects": EFFECTS[did],
            "source": srd_source(f"{PAGE}#{did}Domain", rtf_fr.file_label("DRS 21")),
        }
        out.append(d)
    write_json(OUT_SRD / "domains.json", out)
    return out


if __name__ == "__main__":
    ds = build_domains()
    print(f"domains.json: {len(ds)} domains")
    for n in dict.fromkeys(NOTES):
        print(" -", n)
