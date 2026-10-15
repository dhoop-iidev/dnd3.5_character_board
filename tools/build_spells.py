"""Spells (src/data/srd/spells.json): every spell of the druid (levels 0-9) and ranger (levels 1-4) spell lists, with its
level on every core class list (cleric domains are out of scope).

English: Andargor SRD SQLite (`spell`). French: official French SRD, DRS 22a-d (spell entries) and DRS 21 (spell
lists: one-line summaries, and the "Sorts de druide" / "Sorts de rôdeur" lists used as a check: the French entry must
be on the list at the same level). An English spell is matched to the French entry with the same core class levels and
school + subschool (HAND_FR settles the ties; FR_HEADER_ERRATA fixes the few French header lines that contradict the
SRD); French entries that only say "semblable à X" inherit the missing header lines from X, as the SRD rule says.
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
    # Druid list.
    "Air Walk": "Marche dans les airs", "Giant Vermin": "Vermine géante",
    "Animal Shapes": "Métamorphose animale", "Control Plants": "Contrôle des plantes",
    "Animate Plants": "Animation des plantes", "Changestaff": "Bâton sylvanien",
    "Transmute Metal to Wood": "Transmutation du métal en bois",
    "Antipathy": "Aversion", "Sympathy": "Attirance", "Awaken": "Éveil", "Control Winds": "Contrôle des vents",
    "Baleful Polymorph": "Métamorphose funeste", "Transmute Mud to Rock": "Transmutation de la boue en pierre",
    "Transmute Rock to Mud": "Transmutation de la pierre en boue",
    "Bear's Endurance, Mass": "Endurance de l’ours de groupe", "Bull's Strength, Mass": "Force de taureau de groupe",
    "Owl's Wisdom, Mass": "Sagesse du hibou de groupe",
    "Chill Metal": "Métal gelé", "Heat Metal": "Métal brûlant", "Soften Earth and Stone": "Ramollissement de la terre et de la pierre",
    "Warp Wood": "Distorsion du bois", "Wood Shape": "Façonnage du bois",
    "Creeping Doom": "Mort rampante", "Summon Nature's Ally VII": "Convocation d’alliés naturels VII",
    "Elemental Swarm": "Nuée d’élémentaires", "Summon Nature's Ally IX": "Convocation d’alliés naturels IX",
    "Faerie Fire": "Lueur féerique", "Produce Flame": "Flammes", "Flaming Sphere": "Sphère de feu", "Gust of Wind": "Bourrasque",
    "Goodberry": "Baie nourricière", "Shillelagh": "Gourdin magique", "Hallow": "Sanctification", "Unhallow": "Sanctification maléfique",
    "Ironwood": "Bois de fer", "Liveoak": "Chêne animé", "Repel Wood": "Éloignement du bois", "Spellstaff": "Bâton à sort",
    "Reincarnate": "Réincarnation", "Rusting Grasp": "Rouille", "Spike Stones": "Pierres acérées",
}
# French SRD header lines (DRS 22) that disagree with the English SRD; the English side was checked on the d20srd spell
# pages. French name -> (field, French text, corrected text); field is "level", "school" or a French header label. The
# level line is only used for matching (levels come from the English SRD); the other lines are shown, so they are fixed.
FR_HEADER_ERRATA = {
    "Force de taureau": ("level", "Bard 2, Dru 2, Ens/Mag 2, Force 2, Pal 2, Prê 2",  # SRD: no bard (Clr, Drd, Pal, Sor/Wiz 2)
                         "Dru 2, Ens/Mag 2, Force 2, Pal 2, Prê 2"),
    "Nappe de brouillard": ("level", "Ens/Mag 2, Eau 2", "Dru 2, Ens/Mag 2, Eau 2"),  # Drd 2 missing (DRS 21 has it)
    "Façonnage de la pierre": ("level", "Dru 3, Ens/Mag 5, Prê 3, Terre 3", "Dru 3, Ens/Mag 4, Prê 3, Terre 3"),  # SRD Sor/Wiz 4
    "Détection de la magie": ("school", "Universel", "Divination"),  # SRD 3.5: Divination (Universal was 3.0)
    "Tempête vengeresse": ("school", "Invocation (conjuration)", "Invocation (convocation)"),  # SRD: Conjuration (Summoning)
    "Voie végétale": ("school", "Transmutation", "Invocation (téléportation)"),  # SRD: Conjuration (Teleportation)
    "Germes de feu": ("Résistance à la magie", "oui", "non"),  # SRD: Spell Resistance: No
    "Vision dans le noir": ("Jet de sauvegarde", "aucun", "Volonté, annule (inoffensif)"),  # SRD: Will negates (harmless)
}
# DRS 21 list names that differ from the DRS 22 heading, and DRS 22 spells missing from a DRS 21 list (checked by hand:
# the English SRD list has them).
FR_LIST_ALIAS = {"Morsure magique suprême": "Morsure magique aggravée"}  # druid list only
# The French header uses another of the target / area / effect lines than the English SRD: English field -> French field.
FR_FIELD_FROM = {"Blight": {"target": "effect"}, "Ironwood": {"effect": "target"}, "Stone Tell": {"target": "area"},
                 "Storm of Vengeance": {"effect": "area"}}
FR_LIST_MISSING = {("Soins importants de groupe", "druid"), ("Détection du poison", "ranger")}
FIELDS = {  # French header label -> SpellDef field
    "Composantes": "components", "Temps d’incantation": "castingTime", "Portée": "range", "Cible": "target", "Cibles": "target",
    "Zone d’effet": "area", "Effet": "effect", "Durée": "duration", "Jet de sauvegarde": "save",
    "Résistance à la magie": "spellResistance", "Cible ou zone d’effet": "target/area", "Cible, effet ou zone d’effet": "any",
    "Cible ou effet": "target/effect", "Zone d’effet ou cible": "target/area", "Cible ou cibles": "target",
    "Cible/effet": "target/effect", "Cibles ou effet": "target/effect",
}
# Obvious misprints of the French SRD, corrected against the English SRD (each must still be found in the source).
# Spell-list summaries that contradict the spell's own 3.5 text (the full description wins).
SUMMARY_ERRATA = {
    # 3.5: +1 per four caster levels (https://www.d20srd.org/srd/spells/magicFangGreater.htm); the list says three.
    "magic-fang-greater": [("en", ("+1/three caster levels", "+1/four caster levels")), ("fr", ("dégâts/3 niveaux", "dégâts/4 niveaux"))],
    # 3.0 leftover in the French list: animal growth gives no extra Hit Dice in 3.5.
    "animal-growth": [("fr", ("Double la taille et les DV de", "Double la taille de"))],
}

FR_ERRATA = {
    # DRS 22: "jusqu'à un maximum de +35"; English SRD and the DRS 21 list line both say +15.
    "cure-serious-wounds": [("jusqu’à un maximum de +35", "jusqu’à un maximum de +15")],
}
# DRS 21 list headings checked against each built spell (the French entry must be on the list at the same level).
LIST_HEAD_FR = {"Sorts de druide": "druid", "Sorts de rôdeur": "ranger"}
# Spell lists built in full (every spell on these lists is in spells.json).
BUILT_LISTS = ("druid", "ranger")
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
        # A few entries print the school line in bold too: it is part of the entry above, not a new spell.
        starts = [i for i in starts if i - 1 not in starts]
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


def fr_list_summaries() -> tuple[dict, dict]:
    """DRS 21: {norm(name): summary} over all lists, and {list id: {norm(name): level}} for the druid and ranger lists."""
    ps = rtf_fr.load("DRS 21")
    summ: dict[str, str] = {}
    lists: dict[str, dict[str, int]] = {lst: {} for lst in LIST_HEAD_FR.values()}
    cur, lvl = None, None
    for p in ps:
        if p.bold_all and not p.in_table:
            cur = next((lst for head, lst in LIST_HEAD_FR.items() if p.text.startswith(head)), None)
            m = re.search(r"du (?:niveau )?(\d)", p.text)
            lvl = int(m.group(1)) if m else None
            continue
        b = p.bold_prefix.strip()
        if b.endswith("."):
            name = re.sub(r"\s*\((M|F|X|FD|PX)(, ?(M|F|X|FD|PX))*\)\s*$", "", b[:-1]).strip()
            name = re.sub(r"^\d\s+", "", name)
            summ.setdefault(norm(name), p.text[len(b):].strip())
            if cur and lvl is not None:
                lists[cur][norm(name)] = lvl
    return summ, lists


def fr_list_level(lst: dict, name: str) -> int | None:
    """Level of a French spell name on a DRS 21 list (singular/plural tolerant)."""
    n = norm(name)
    if n in lst:
        return lst[n]
    return next((v for k, v in lst.items() if k.rstrip("s") == n.rstrip("s")), None)


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
    for e in fr_all:
        if e["name"] in FR_HEADER_ERRATA:
            field, old, new = FR_HEADER_ERRATA[e["name"]]
            where = e if field in ("level", "school") else e["fields"]
            assert where.get(field) == old, (e["name"], field, where.get(field))
            where[field] = new
            NOTES.append(f"spells: French SRD {field} line corrected for {e['name']}: '{old}' -> '{new}'")
    assert all(any(e["name"] == n for e in fr_all) for n in FR_HEADER_ERRATA)
    by_norm = {norm(e["name"]): e for e in fr_all}
    summaries, fr_lists = fr_list_summaries()
    out = []
    for r in c.execute("select * from spell where level like '%Druid%' or level like '%Ranger%' order by name"):
        en = r["name"]
        lv = levels(r["level"], LIST_EN)
        if not any(lst in lv for lst in BUILT_LISTS):
            continue
        school_fr = SCHOOL_FR[r["school"]]
        if nz(r["subschool"]):
            school_fr += f" ({SUBSCHOOL_FR[r['subschool']]})"
        cands = [e for e in fr_all if levels(e.get("level", ""), LIST_FR) == lv
                 and re.match(re.escape(school_fr) + r"(\s*\[|\s*$)", e.get("school", ""))]
        if en in HAND_FR:
            cands = [e for e in cands if norm(e["name"]) == norm(HAND_FR[en])]
        assert len(cands) == 1, f"spell {en}: {len(cands)} French candidates {[e['name'] for e in cands]}"
        fr = cands[0]
        for lst in BUILT_LISTS:
            if lst not in lv:
                continue
            if (fr["name"], lst) in FR_LIST_MISSING:
                assert fr_list_level(fr_lists[lst], fr["name"]) is None, (en, lst)
                NOTES.append(f"spells: {fr['name']} ({en}) is missing from the DRS 21 {lst} list (DRS 22 and the SRD have it)")
                continue
            found = (fr_list_level(fr_lists[lst], fr["name"]), fr_list_level(fr_lists[lst], FR_LIST_ALIAS.get(fr["name"], "")))
            assert lv[lst] in found, f"spell {en}: {fr['name']} is not on the DRS 21 {lst} list at level {lv[lst]}"

        # French header lines, inherited from the spell named in "semblable à X" when missing.
        fields = dict(fr["fields"])
        first = fr["body"][0].text if fr["body"] else ""
        m = re.search(r"(?:semblable à |même principe que |même principe qu’|fonctionne comme )(.+?), (?:si ce n’est|excepté|sauf)", first)
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
            if not v and k in FR_FIELD_FROM.get(en, {}):
                v = fr_f.get(FR_FIELD_FROM[en][k])
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
        s_fr = fr_list_level(summaries, fr["name"])
        assert s_fr, f"spell {en}: no DRS 21 summary for {fr['name']}"
        d["summary"] = i18n(r["short_description"], s_fr)
        for lang, (old, new) in SUMMARY_ERRATA.get(d["id"], []):
            assert old in d["summary"][lang], (d["id"], lang, old)
            d["summary"][lang] = d["summary"][lang].replace(old, new)
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
