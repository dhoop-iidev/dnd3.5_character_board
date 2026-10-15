"""Spells (src/data/srd/spells.json): every spell of the ranger spell list (levels 1-4), with its level on every
core class list.

English: Andargor SRD SQLite (`spell`). French: official French SRD, DRS 22a-d (spell entries) and DRS 21 (spell
lists: one-line summaries, and the "Sorts de rôdeur" list used as a check). An English spell is matched to the French
entry with the same core class levels and school (HAND_FR settles the rare ties); French entries that only say
"semblable à X" inherit the missing header lines from X, as the SRD rule says.
"""
from __future__ import annotations

import re

import rtf_fr
from common import OUT_SRD, clip_paras, db, esc, html_paras, i18n, srd_source, write_json
from ctx import NOTES, fr_paras_html, norm

LIST_EN = {"Bard": "bard", "Cleric": "cleric", "Druid": "druid", "Paladin": "paladin", "Ranger": "ranger",
           "Sorcerer/Wizard": "sorcerer-wizard"}
LIST_FR = {"Bard": "bard", "Prê": "cleric", "Dru": "druid", "Pal": "paladin", "Rôd": "ranger", "Ens/Mag": "sorcerer-wizard"}
SCHOOL_FR = {"Abjuration": "Abjuration", "Conjuration": "Invocation", "Divination": "Divination", "Enchantment": "Enchantement",
             "Evocation": "Évocation", "Illusion": "Illusion", "Necromancy": "Nécromancie", "Transmutation": "Transmutation"}
SUBSCHOOL_FR = {"Compulsion": "coercition", "Charm": "charme", "Healing": "guérison", "Summoning": "convocation",
                "Teleportation": "téléportation", "Creation": "création", "Calling": "appel", "Glamer": "chimère",
                "Figment": "hallucination", "Pattern": "mirage", "Phantasm": "fantasme", "Shadow": "ombre", "Scrying": "scrutation"}
# English name -> French DRS 22 heading, for ties of the (levels, school) signature (the choice must be one of the tied
# candidates; checked at build time). Identified from the French spell descriptions.
HAND_FR: dict[str, str] = {
    "Detect Animals or Plants": "Détection de la faune ou de la flore", "Detect Snares and Pits": "Détection des collets et des fosses",
    "Diminish Plants": "Rabougrissement des plantes", "Plant Growth": "Croissance végétale",
    "Magic Fang, Greater": "Morsure magique suprême", "Magic Fang": "Morsure magique", "Entangle": "Enchevêtrement",
    "Longstrider": "Grand pas", "Pass without Trace": "Passage sans trace", "Reduce Animal": "Rapetissement d’animal",
    "Tree Shape": "Forme d’arbre", "Snare": "Collet", "Spike Growth": "Croissance d’épines",
}
FIELDS = {  # French header label -> SpellDef field
    "Composantes": "components", "Temps d’incantation": "castingTime", "Portée": "range", "Cible": "target", "Cibles": "target",
    "Zone d’effet": "area", "Effet": "effect", "Durée": "duration", "Jet de sauvegarde": "save",
    "Résistance à la magie": "spellResistance", "Cible ou zone d’effet": "target/area", "Cible, effet ou zone d’effet": "any",
    "Cible ou effet": "target/effect", "Zone d’effet ou cible": "target/area", "Cible ou cibles": "target",
    "Cible/effet": "target/effect", "Cibles ou effet": "target/effect",
}
# Obvious misprints of the French SRD, corrected against the English SRD (each must still be found in the source).
FR_ERRATA = {
    # DRS 22: "jusqu'à un maximum de +35"; English SRD and the DRS 21 list line both say +15.
    "cure-serious-wounds": [("jusqu’à un maximum de +35", "jusqu’à un maximum de +15")],
}
SPELL_FILES = ["DRS 22a", "DRS 22b", "DRS 22c", "DRS 22d"]
# d20srd page names that do not follow the camelCase rule of the spell name.
URL_FIX = {"Magic Fang, Greater": "magicFangGreater", "Summon Nature's Ally I": "summonNaturesAllyI",
           "Summon Nature's Ally II": "summonNaturesAllyII", "Summon Nature's Ally III": "summonNaturesAllyIII",
           "Summon Nature's Ally IV": "summonNaturesAllyIV"}


def spell_url(name: str) -> str:
    if name in URL_FIX:
        page = URL_FIX[name]
    else:
        words = re.findall(r"[A-Za-z0-9]+", name.replace("'", ""))
        page = words[0].lower() + "".join(w[0].upper() + w[1:] for w in words[1:])
    return f"https://www.d20srd.org/srd/spells/{page}.htm"


def levels(s: str, table: dict) -> dict:
    out = {}
    for part in s.split(","):
        m = re.match(r"^\s*(.+?)\s+(\d)\s*$", part)
        if m and m.group(1).strip() in table:
            out[table[m.group(1).strip()]] = int(m.group(2))
    return out


def fr_spell_entries() -> list[dict]:
    out = []
    for f in SPELL_FILES:
        ps = rtf_fr.load(f)
        starts = [i for i, p in enumerate(ps) if p.bold_all and not p.in_table and i + 2 < len(ps)
                  and any(q.text.startswith("Niveau :") for q in ps[i + 1:i + 3])]
        for n, i in enumerate(starts):
            end = starts[n + 1] if n + 1 < len(starts) else len(ps)
            e = {"name": ps[i].text, "file": f, "fields": {}, "body": []}
            for p in ps[i + 1:end]:
                m = re.match(r"^([^:]{3,40}?) : (.*)$", p.text)
                if p.text.startswith("Niveau :"):
                    e["level"] = p.text[len("Niveau :"):].strip()
                elif "level" not in e and not e["body"]:
                    e["school"] = p.text
                elif m and m.group(1) in FIELDS and not e["body"]:
                    e["fields"][m.group(1)] = m.group(2).strip()
                else:
                    e["body"].append(p)
            out.append(e)
    return out


def fr_list_summaries() -> tuple[dict, set]:
    """DRS 21: {norm(name): summary} over all lists, and the set of names on the ranger list."""
    ps = rtf_fr.load("DRS 21")
    summ, ranger, in_ranger = {}, set(), False
    for p in ps:
        if p.text.startswith("Sorts de rôdeur"):
            in_ranger = True
            continue
        if p.bold_all and not p.in_table:
            in_ranger = False if not p.text.startswith("Sorts de rôdeur") else in_ranger
            continue
        b = p.bold_prefix.strip()
        if b.endswith("."):
            name = re.sub(r"\s*\((M|F|X|FD|PX)(, ?(M|F|X|FD|PX))*\)\s*$", "", b[:-1]).strip()
            name = re.sub(r"^\d\s+", "", name)
            summ.setdefault(norm(name), p.text[len(b):].strip())
            if in_ranger:
                ranger.add(norm(name))
    return summ, ranger


def en_school(r) -> str:
    s = r["school"]
    if r["subschool"] and r["subschool"] != "None":
        s += f" ({r['subschool']})"
    if r["descriptor"] and r["descriptor"] != "None":
        s += f" [{r['descriptor']}]"
    return s


def nz(v):
    return None if v is None or v.strip() in ("None", "") else v.strip()


def build_spells() -> list[dict]:
    c = db()
    fr_all = fr_spell_entries()
    by_norm = {norm(e["name"]): e for e in fr_all}
    summaries, ranger_fr = fr_list_summaries()
    out = []
    for r in c.execute("select * from spell where level like '%Ranger%' order by name"):
        en = r["name"]
        lv = levels(r["level"], LIST_EN)
        if "ranger" not in lv:
            continue
        school_fr = SCHOOL_FR[r["school"]]
        if nz(r["subschool"]):
            school_fr += f" ({SUBSCHOOL_FR[r['subschool']]})"
        cands = [e for e in fr_all if levels(e.get("level", ""), LIST_FR) == lv and e.get("school", "").startswith(school_fr)]
        if en in HAND_FR:
            cands = [e for e in cands if norm(e["name"]) == norm(HAND_FR[en])]
        assert len(cands) == 1, f"spell {en}: {len(cands)} French candidates {[e['name'] for e in cands]}"
        fr = cands[0]
        if norm(fr["name"]) not in ranger_fr and not any(norm(fr["name"]).rstrip("s") == x.rstrip("s") for x in ranger_fr):
            NOTES.append(f"spells: {fr['name']} ({en}) has 'Rôd' in DRS 22 but is missing from the DRS 21 ranger list")

        # French header lines, inherited from the spell named in "semblable à X" when missing.
        fields = dict(fr["fields"])
        first = fr["body"][0].text if fr["body"] else ""
        m = re.search(r"(?:semblable à|même principe que|fonctionne comme) (.+?), (?:si ce n’est|excepté|sauf)", first)
        if m:
            base = by_norm.get(norm(m.group(1)))
            assert base, f"spell {en}: base spell '{m.group(1)}' not found"
            for k, v in base["fields"].items():
                fields.setdefault(k, v)
        fr_f: dict[str, str] = {}
        for label, v in fields.items():
            fr_f.setdefault(FIELDS[label], v)

        en_f = {"target": nz(r["target"]), "area": nz(r["area"]), "effect": nz(r["effect"])}
        if en_f["target"] and en_f["target"] == en_f["area"]:
            en_f["area"] = None  # SRD "Target or Area" line duplicated in both columns
        d = dict(id=re.sub(r"[^a-z0-9]+", "-", en.lower().replace("'", "")).strip("-"), name=i18n(en, fr["name"]),
                 school=i18n(en_school(r), fr["school"]), level=dict(sorted(lv.items())), components=r["components"],
                 castingTime=i18n(r["casting_time"], fr_f["castingTime"]), range=i18n(r["range"], fr_f["range"]))
        for k in ("target", "area", "effect"):
            if not en_f[k]:
                continue
            v = fr_f.get(k) or fr_f.get("target/area" if k in ("target", "area") else "") or fr_f.get("target/effect" if k in ("target", "effect") else "") or fr_f.get("any")
            assert v, f"spell {en}: no French {k} in {fields}"
            d[k] = i18n(en_f[k], v)
        d["duration"] = i18n(r["duration"], fr_f["duration"])
        # Personal spells have no save / SR line in the SRD; the database stores "None"/"No" (or nothing).
        save_en, sr_en = nz(r["saving_throw"]) or "None", nz(r["spell_resistance"]) or "No"
        if "save" not in fr_f:
            assert save_en == "None", (en, save_en, fields)
        if "spellResistance" not in fr_f:
            assert sr_en == "No", (en, sr_en, fields)
        d["save"] = i18n(save_en, fr_f.get("save", "aucun"))
        d["spellResistance"] = i18n(sr_en, fr_f.get("spellResistance", "non"))
        s_fr = summaries.get(norm(fr["name"])) or next((v for k, v in summaries.items() if k.rstrip("s") == norm(fr["name"]).rstrip("s")), None)
        assert s_fr, f"spell {en}: no DRS 21 summary for {fr['name']}"
        d["summary"] = i18n(r["short_description"], s_fr)
        d["text"] = i18n(clip_paras(html_paras(r["full_text"]), 6000), clip_paras(fr_paras_html(fr["body"]), 6000)
                         or f"<p>{esc(fr['name'])}</p>")
        for a, b in FR_ERRATA.get(d["id"], []):
            assert a in d["text"]["fr"], (d["id"], a)
            d["text"]["fr"] = d["text"]["fr"].replace(a, b)
            NOTES.append(f"spells: French SRD misprint corrected in {d['id']}: '{a}' -> '{b}'")
        d["source"] = srd_source(spell_url(en), f"{rtf_fr.file_label(fr['file'])}, {rtf_fr.file_label('DRS 21')}")
        out.append(d)
    assert len(out) == len({d["id"] for d in out})
    write_json(OUT_SRD / "spells.json", out)
    return out
