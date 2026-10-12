"""magic-items.json (wondrous items, rings, potions/oils, weapon/armor enhancement) and carrying-capacity.json."""
from __future__ import annotations

import re
from collections import Counter, defaultdict

import glossary_fr
import rtf_fr
import srd_urls
from common import (
    OUT_SRD, clip_paras, db, esc, html_paras, i18n, kebab, num, parse_gp, parse_kg_fr, parse_lb,
    parse_po, srd_source, strip_tags, weight, write_json,
)
from ctx import FR, NOTES, WEIGHT_LOG, fr_paras_html, norm

# ---------------------------------------------------------------------------------------------
# EN <-> FR random-item tables (same rows, same prices; equal-price rows are sorted per language)
# ---------------------------------------------------------------------------------------------


def table_rows(paras, title_pred, lang):
    """Rows (name, price) of the d% tables whose title matches title_pred."""
    out, on = [], False
    for p in paras:
        title = p.text if (lang == "fr" and p.bold_all and not p.in_table) or (lang == "en" and p.in_table and p.text.startswith("Table:")) else None
        if title is not None:
            on = title_pred(title)
            continue
        if not on:
            continue
        if not p.cells:
            if lang == "en" and not p.in_table:
                on = False
            continue
        c = [x.strip() for x in p.cells]
        price = parse_po(c[-1]) if lang == "fr" else parse_gp(c[-1])
        if price is None or len(c) < 3:
            continue
        out.append((c[-2], price))
    return out


def align(en_rows, fr_rows, gl_fn, strip_fn=lambda s: s, hand: dict | None = None):
    """Pair EN and FR row names: same price group; hand map (checked against the FR rows) and
    glossary first, then a lone leftover pair."""
    hand = {norm(k): v for k, v in (hand or {}).items()}
    by_en, by_fr = defaultdict(list), defaultdict(list)
    for n, p in en_rows:
        if n not in by_en[p]:
            by_en[p].append(n)
    for n, p in fr_rows:
        if n not in by_fr[p]:
            by_fr[p].append(n)
    pairs, methods = {}, {}
    for price, ens in by_en.items():
        frs = list(by_fr.get(price, []))
        left = []
        for e in ens:
            h = hand.get(norm(e))
            hit = next((f for f in frs if h and norm(f) == norm(h)), None)
            if hit:
                pairs[e], methods[e] = hit, "hand+table"
                frs.remove(hit)
                continue
            g = gl_fn(e)
            hit = next((f for f in frs if g and norm(strip_fn(f)) == norm(g)), None)
            if hit:
                pairs[e], methods[e] = hit, "glossary+table"
                frs.remove(hit)
            else:
                left.append(e)
        if len(left) == 1 and len(frs) == 1:
            pairs[left[0]], methods[left[0]] = frs[0], "table-price"
        elif left and len(left) == len(frs):
            # several rows at one price: keep the order guess, flagged as uncertain
            for e, f in zip(left, frs):
                pairs[e], methods[e] = f, "table-order?"
    return pairs, methods


def plus_split(name: str) -> tuple[str, int | None]:
    m = re.match(r"^(.*?)\s*\(?\+(\d)\)?\s*$", name)
    return (m.group(1).strip(), int(m.group(2))) if m else (name.strip(), None)


# ---------------------------------------------------------------------------------------------
# Wondrous items
# ---------------------------------------------------------------------------------------------

SLOT_RULES = [
    (r"^(amulet|periapt|necklace|medallion|scarab|brooch)", "neck"),
    (r"^(belt|monk's belt)", "waist"),
    (r"^(boots|slippers)", "feet"),
    (r"^(bracers|bracelet)", "arms"),
    (r"^(cloak|cape|mantle|wings of flying)", "shoulders"),
    (r"^(gloves?|gauntlets?)", "hands"),
    (r"^(headband|helm|hat|circlet|phylactery)", "head"),
    (r"^(eyes|goggles)", "eyes"),
    (r"^(robe)", "body"),
    (r"^(vest|vestment|shirt)", "torso"),
]
WONDROUS_MODS = {
    "amulet-of-health": ("ability.con", "enhancement"), "belt-of-giant-strength": ("ability.str", "enhancement"),
    "gloves-of-dexterity": ("ability.dex", "enhancement"), "headband-of-intellect": ("ability.int", "enhancement"),
    "periapt-of-wisdom": ("ability.wis", "enhancement"), "cloak-of-charisma": ("ability.cha", "enhancement"),
    "cloak-of-resistance": ("save.all", "resistance"), "bracers-of-armor": ("ac", "armor"),
    "amulet-of-natural-armor": ("ac", "naturalArmor"),
}
FIXED_MODS = {
    "gauntlets-of-ogre-power": [{"target": "ability.str", "bonusType": "enhancement", "value": 2}],
    "boots-of-elvenkind": [{"target": "skill.move-silently", "bonusType": "competence", "value": 5}],
    "cloak-of-elvenkind": [{"target": "skill.hide", "bonusType": "competence", "value": 5}],
    "eyes-of-the-eagle": [{"target": "skill.spot", "bonusType": "competence", "value": 5}],
    "gloves-of-swimming-and-climbing": [{"target": "skill.swim", "bonusType": "competence", "value": 5},
                                        {"target": "skill.climb", "bonusType": "competence", "value": 5}],
    "boots-of-striding-and-springing": [{"target": "speed", "bonusType": "enhancement", "value": 10},
                                        {"target": "skill.jump", "bonusType": "competence", "value": 5}],
    "stone-of-good-luck-luckstone": [{"target": "save.all", "bonusType": "luck", "value": 1},
                                     {"target": "skill.all", "bonusType": "luck", "value": 1}]
    + [{"target": f"check.{a}", "bonusType": "luck", "value": 1} for a in ("str", "dex", "con", "int", "wis", "cha")],
}


def slot_for(name: str) -> str | None:
    n = name.lower()
    for rx, slot in SLOT_RULES:
        if re.match(rx, n):
            return slot
    return None


def fr_item_desc(paras, fr_base: str):
    """French entry: paragraph with bold prefix = name, up to and including the aura/NLS line."""
    key = norm(fr_base)
    for i, p in enumerate(paras):
        if p.bold_prefix and not p.bold_all and norm(p.bold_prefix) == key:
            out = [p]
            if "NLS" in p.text:
                return out
            for q in paras[i + 1:i + 12]:
                if q.bold_prefix and not q.bold_all and "NLS" not in q.text and q.text[:1].isupper() and q.bold_prefix.endswith("."):
                    break
                out.append(q)
                if "NLS " in q.text:
                    break
            return out
    return []


def fr_aura_weight(desc) -> float | None:
    for p in desc:
        m = re.search(r"Poids ([\d ,]+ ?(?:kg|g))", p.text)
        if m:
            return parse_kg_fr(m.group(1))
    return None


SCHOOL_FR = {"abjuration": "abjuration", "conjuration": "invocation", "divination": "divination",
             "enchantment": "enchantement", "evocation": "evocation", "illusion": "illusion",
             "necromancy": "necromancie", "transmutation": "transmutation", "universal": "universel"}


def fr_aura_entries(paras):
    """French item entries: bold name paragraph followed by an aura line 'École force ; NLS n ; … ; Prix …'."""
    out = []
    for i, p in enumerate(paras):
        if not (p.bold_prefix and not p.bold_all and p.bold_prefix.endswith(".")):
            continue
        for j in range(i, min(i + 40, len(paras))):
            q = paras[j]
            if j > i and q.bold_prefix and not q.bold_all and q.bold_prefix.endswith(".") and "NLS" not in q.text:
                break
            m = re.search(r"NLS (\d+)", q.text)
            if m:
                school = norm(q.text.split(";")[0]).split()
                prix = q.text.split("Prix", 1)[1] if "Prix" in q.text else ""
                prices = [float(x.replace(" ", "")) for x in re.findall(r"(\d[\d ]*)\s*po", prix)]
                out.append(dict(name=p.bold_prefix.rstrip(".").strip(), cl=int(m.group(1)), schools=school,
                                prices=prices, paras=paras[i:j + 1]))
                break
    return out


def aura_match(en_name, aura, cl, price, entries, gl):
    """Pick the French entry for an English item: glossary name, else unique (CL, school, price)."""
    if gl:
        for e in entries:
            if norm(e["name"]) == norm(gl):
                return e, "glossary+rtf"
    school = next((SCHOOL_FR[w] for w in norm(aura or "").split() if w in SCHOOL_FR), None)
    if cl is None or school is None:
        return None, ""
    c = [e for e in entries if e["cl"] == cl and school in e["schools"]]
    if price:
        c = [e for e in c if not e["prices"] or any(abs(x - price) < 0.5 for x in e["prices"])]
    if len(c) == 1:
        return c[0], "aura+price"
    return None, ""


# Wondrous items the glossary lacks and the aura data can't separate; French entry names read in DRS 26a/26b
# (still checked against the parsed French entries at build time).
HAND_WONDROUS = {
    "Elixir of Hiding": "Élixir de discrétion instinctive", "Elixir of Sneaking": "Élixir de déplacement furtif",
    "Elixir of Swimming": "Élixir de nage", "Elixir of Vision": "Élixir d’acuité visuelle",
    "Elixir of Love": "Philtre d’amour", "Golem Manual": "Traité de création des golems",
    "Ioun Stones": "Pierre ioun", "Strand of Prayer Beads": "Chapelet de prières",
    "Vestment, Druid's": "Chasuble de druide", "Boots of Teleportation": "Bottes de téléportation",
}
# Full names of variants that share one French entry (rows of the French d% tables)
HAND_WONDROUS_FULL = {
    "Feather Token, Whip": "Plume magique (fouet)", "Pearl of Power, Two Spells": "Perle de thaumaturgie (deux sorts)",
    "Strand of Prayer Beads, Standard": "Chapelet de prières courant",
}


def build_wondrous():
    c = db()
    en_tab = table_rows(rtf_fr.load("32_", "en"), lambda t: "Wondrous Items" in t, "en")
    fr_p = rtf_fr.load("DRS 26a")
    fr_tab = table_rows(fr_p, lambda t: t.startswith("Table : objets merveilleux"), "fr")
    pairs, methods = align(en_tab, fr_tab, lambda e: glossary_fr.lookup(plus_split(e)[0], "objet"),
                           lambda f: plus_split(f)[0])
    # base-name map (without +N) by vote
    votes = defaultdict(Counter)
    for e, f in pairs.items():
        votes[norm(plus_split(e)[0])][(plus_split(f)[0], methods[e])] += 1
    base_map = {k: v.most_common(1)[0][0] for k, v in votes.items()}
    full_map = {norm(e): f for e, f in pairs.items() if methods[e] != "table-order?"}
    methods_by_norm = {norm(e): m for e, m in methods.items()}
    fr_desc_paras = fr_p + rtf_fr.load("DRS 26b")
    fr_entries = fr_aura_entries(fr_desc_paras)
    fr_ref = "DRS 26a/26b (objets merveilleux)"
    en_min_price = defaultdict(list)
    for n, pr in en_tab:
        en_min_price[norm(plus_split(n)[0].split(" type ")[0])].append(pr)

    items = []
    for r in c.execute("select * from item where category='Wondrous' and subcategory='None' order by name"):
        r = dict(r)
        en = r["name"]
        base, plus = plus_split(en)
        tname = en
        m = re.match(r"^(.*), (.*)$", base)  # 'Feather Token, Anchor' -> 'Feather token, anchor' (table naming)
        key = norm(base)
        hit = base_map.get(key)
        if not hit and m:
            hit = base_map.get(norm(f"{m.group(1)}, {m.group(2)}"))
        gl = glossary_fr.lookup(base, "objet")
        cl = int(r["caster_level"]) if (r["caster_level"] or "").isdigit() else None
        price0 = parse_gp(r["price"])
        if price0 is None:
            cands = [v for k, v in en_min_price.items() if k.startswith(norm(base).rstrip("s"))]
            price0 = min(min(v) for v in cands) if cands else None
        hand = HAND_WONDROUS.get(re.sub(r", (Standard|Lesser|Greater)$", "", base))
        ent, method = aura_match(en, r["aura"], cl, price0, fr_entries, hand or gl)
        if hand and ent:
            method = "hand+rtf"
        fr_base = ent["name"] if ent else None
        if not ent and hit and hit[1] in ("glossary+table", "table-price"):
            fr_base, method = hit[0], hit[1]
        iid = kebab(en)
        suffix = f" +{plus}" if plus is not None else ""
        if re.search(r"\((1st|2nd|3rd|\dth|two spells)\)", en, re.I):
            lvl = re.search(r"\((.*?)\)", en).group(1)
            suffix = " (" + {"two spells": "deux sorts"}.get(lvl.lower(), re.sub(r"(st|nd|rd|th)$", "", lvl) + ("er" if lvl == "1st" else "e") + " niveau") + ")"
        fr_full = fr_base + suffix if fr_base else None
        tab = full_map.get(norm(en)) or HAND_WONDROUS_FULL.get(en)
        if en in HAND_WONDROUS_FULL:
            method = "hand+table"
        if tab and (", " in base or plus is not None or not fr_full):
            tb, tp = plus_split(tab)
            fr_full = tb.strip() + (f" +{tp}" if tp else "")
            method = method or methods_by_norm.get(norm(en), "table")
        guess = (hit[0] if hit else (gl or {"Figurines of Wondrous Power": "Figurines merveilleuses"}.get(en, en))) + ("" if hit and "+" in hit[0] else suffix)
        fr_name = FR.resolve(iid, en, fr_full, guess, method)
        fr_base_name = re.sub(r"\s*\+\d$|\s*\(.*\)$", "", fr_name)
        desc = ent["paras"] if ent else fr_item_desc(fr_desc_paras, fr_base_name)
        price = parse_gp(r["price"])
        if price is None:
            price = price0 or 0
            NOTES.append(f"magic-items: {iid} comes in several versions with different prices; priceGp = lowest ({num(price)} gp), versions in the text.")
        lb = parse_lb(r["weight"]) if r["weight"] not in (None, "None") else None
        if r["weight"] and "pair" not in (r["weight"] or "") and lb is None and r["weight"] != "None":
            NOTES.append(f"magic-items: {iid} weight '{r['weight']}' not parsed")
        kg = fr_aura_weight(desc) if lb else None
        d = dict(id=iid, name=i18n(en, fr_name), kind="wondrous")
        slot = slot_for(en)
        if slot:
            d["slot"] = slot
        d.update(priceGp=num(price), casterLevel=int(r["caster_level"]) if (r["caster_level"] or "").isdigit() else None,
                 weight=weight(lb, kg, WEIGHT_LOG, iid))
        if d["casterLevel"] is None:
            del d["casterLevel"]
        mods = None
        base_id = kebab(base)
        if base_id in WONDROUS_MODS and plus is not None:
            t, bt = WONDROUS_MODS[base_id]
            mods = [{"target": t, "bonusType": bt, "value": plus}]
        elif iid in FIXED_MODS:
            mods = FIXED_MODS[iid]
        if mods:
            d["modifiers"] = mods
        url = srd_urls.anchor_url("magicItems/wondrousItems.htm",
                                  [srd_urls.camel(base), srd_urls.camel(base, False),
                                   srd_urls.camel(re.sub(r"^(.*), (.*)$", r"\1 \2", base)),
                                   srd_urls.camel(re.sub(r"^(.*), (.*)$", r"\2 \1", base)),
                                   srd_urls.camel(re.sub(r",.*$|\s*\(.*\)$", "", base))], "wondrousItemDescriptions")
        d["text"] = i18n(clip_paras(html_paras(r["full_text"])), clip_paras(fr_paras_html(desc)) or f"<p>{esc(fr_name)}</p>")
        d["source"] = srd_source(url, fr_ref)
        items.append(d)
    return items


# ---------------------------------------------------------------------------------------------
# Rings
# ---------------------------------------------------------------------------------------------

def de(fr_noun: str) -> str:
    """'de' + noun with elision: 'd’escalade', 'de protection'."""
    n = fr_noun[0].lower() + fr_noun[1:]
    return ("d’" if re.match(r"^[aeiouyhéèêàâîôû]", n, re.I) else "de ") + n


def ring_en_name(table_name: str) -> str:
    base, plus = plus_split(table_name)
    m = re.match(r"^(.*), (improved|minor|major|greater)$", base, re.I)
    if m:
        base = f"{m.group(2).lower()} {m.group(1).lower()}"
    nm = f"Ring of {base[0].lower() + base[1:]}"
    return nm + (f" +{plus}" if plus else "")


# Ring/potion table rows the glossary can't pair (same price); French rows read in DRS 24 / DRS 27.
HAND_RINGS = {
    "Climbing, improved": "Escalade supérieure", "Jumping, improved": "Saut supérieur",
    "Swimming, improved": "Nage supérieure", "Climbing": "Escalade", "Jumping": "Saut", "Swimming": "Nage",
    "Sustenance": "Subsistance", "Friend shield (pair)": "Protection mutuelle (une paire)",
    "Spell storing": "Stockage de sorts", "Shooting stars": "Feu d’étoiles", "Protection +5": "Protection +5",
    "Spell storing, major": "Stockage de sorts majeurs", "Spell storing, minor": "Stockage de sorts mineurs",
    "Elemental command (air)": "Contrôle des éléments (Air)", "Elemental command (earth)": "Contrôle des éléments (Terre)",
    "Elemental command (fire)": "Contrôle des éléments (Feu)", "Elemental command (water)": "Contrôle des éléments (Eau)",
    "Wizardry (I)": "Arcanes (premiers)", "Invisibility": "Invisibilité",
}
HAND_POTIONS = {
    "Hide from animals (potion)": "Invisibilité pour les animaux (potion)",
    "Hide from undead (potion)": "Invisibilité pour les morts-vivants (potion)",
    "Protection from (alignment) (potion)": "Protection contre (un alignement) (potion)",
    "Enlarge person (potion)": "Agrandissement (potion)", "Reduce person (potion)": "Rapetissement (potion)",
    "Bear’s endurance (potion)": "Endurance de l’ours (potion)", "Eagle’s splendor (potion)": "Splendeur de l’aigle (potion)",
    "Fox’s cunning (potion)": "Ruse du renard (potion)", "Owl’s wisdom (potion)": "Sagesse du hibou (potion)",
    "Resist energy (type) 10 (potion)": "Résistance aux énergies destructives (une énergie, 10) (potion)",
    "Resist energy (type) 20 (potion)": "Résistance aux énergies destructives (une énergie, 20) (potion)",
    "Resist energy (type) 30 (potion)": "Résistance aux énergies destructives (une énergie, 30) (potion)",
    "Heroism (potion)": "Héroïsme (potion)", "Rage (potion)": "Rage (potion)",
    "Magic circle against (alignment) (potion)": "Cercle magique contre (un alignement) (potion)",
    "Protection from energy (type) (potion)": "Protection contre les énergies destructives (une énergie) (potion)",
    "Bull’s strength (potion)": "Force de taureau (potion)", "Cat’s grace (potion)": "Grâce féline (potion)",
    "Cure light wounds (potion)": "Soins légers (potion)", "Cure moderate wounds (potion)": "Soins modérés (potion)",
    "Cure serious wounds (potion)": "Soins importants (potion)", "Invisibility (potion or oil)": "Invisibilité (potion ou huile)",
    "Levitate (potion or oil)": "Lévitation (potion ou huile)",
    **{f"Greater magic fang +{b} (potion)": f"Morsure magique suprême (+{b}) (potion)" for b in range(1, 6)},
    **{f"Greater magic weapon +{b} (oil)": f"Arme magique suprême (+{b}) (huile)" for b in range(1, 6)},
}


def build_rings():
    c = db()
    en_tab = table_rows(rtf_fr.load("30_", "en"), lambda t: t == "Table: Rings", "en")
    fr_p = rtf_fr.load("DRS 24")
    fr_tab = table_rows(fr_p, lambda t: t == "Table : anneaux", "fr")
    pairs, methods = align(en_tab, fr_tab, lambda e: glossary_fr.lookup("ring of " + plus_split(e)[0].split(",")[0], "objet"),
                           lambda f: "anneau " + de(plus_split(f)[0]), HAND_RINGS)
    db_rows = {norm(r["name"]): dict(r) for r in c.execute("select * from item where category='Ring' and reference='SRD 3.5 MagicItemsIII'")}
    out = []
    for e, price in en_tab:
        name_en = ring_en_name(e)
        iid = kebab(name_en)
        if any(d["id"] == iid for d in out):
            continue
        fr_row = pairs.get(e)
        method = methods.get(e, "")
        if method == "table-order?":
            fr_row, method = None, ""
        fr_full = None
        if fr_row:
            fb, fplus = plus_split(fr_row)
            fr_full = f"Anneau {de(fb)}" + (f" +{fplus}" if fplus else "")
        fr_name = FR.resolve(iid, name_en, fr_full, glossary_fr.lookup(name_en, "objet"), method)
        base, plus = plus_split(e)
        # database row: 'Protection, Ring +1', 'Climbing, Improved', 'Ring of Elemental Command (Water)'
        dbr = db_rows.get(norm(e)) or db_rows.get(norm(f"{base}, Ring +{plus}")) or db_rows.get(norm(base))
        fr_desc = []
        if fr_row:
            fb = plus_split(fr_row)[0]
            for i, p in enumerate(fr_p):
                if p.bold_prefix and not p.bold_all and norm(p.bold_prefix) == norm(fb):
                    fr_desc = [p] + [q for q in fr_p[i + 1:i + 4] if not q.bold_prefix][:2]
                    break
        d = dict(id=iid, name=i18n(name_en, fr_name), kind="ring", slot="ring", priceGp=num(price))
        if dbr and (dbr["caster_level"] or "").isdigit():
            d["casterLevel"] = int(dbr["caster_level"])
        d["weight"] = {"lb": 0, "kg": 0}
        mods = None
        if base.lower() == "protection" and plus:
            mods = [{"target": "ac", "bonusType": "deflection", "value": plus}]
        sk = {"climbing": "climb", "jumping": "jump", "swimming": "swim"}.get(base.split(",")[0].lower())
        if sk:
            mods = [{"target": f"skill.{sk}", "bonusType": "competence", "value": 10 if "improved" in base.lower() else 5}]
        if mods:
            d["modifiers"] = mods
        anchor = srd_urls.camel(base.split(",")[0]) + ("Improved" if "improved" in base.lower() else "") + \
            ("Major" if "major" in base.lower() else "") + ("Minor" if "minor" in base.lower() else "") + \
            ("Greater" if "greater" in base.lower() else "")
        url = srd_urls.anchor_url("magicItems/rings.htm", [anchor, srd_urls.camel(base)], "tableRings")
        d["text"] = i18n(clip_paras(html_paras(dbr["full_text"]) if dbr else [esc(name_en)]),
                         clip_paras(fr_paras_html(fr_desc)) or f"<p>{esc(fr_name)}</p>")
        d["source"] = srd_source(url, "DRS 24 (anneaux, armes)")
        out.append(d)
    NOTES.append("magic-items: rings have no weight in the SRD (weight 0); French ring names are 'Anneau de/d’ + table name' from DRS 24.")
    return out


# ---------------------------------------------------------------------------------------------
# Potions and oils
# ---------------------------------------------------------------------------------------------

POTION_MODS = {
    "bulls-strength": [("ability.str", "enhancement", 4)], "cats-grace": [("ability.dex", "enhancement", 4)],
    "bears-endurance": [("ability.con", "enhancement", 4)], "eagles-splendor": [("ability.cha", "enhancement", 4)],
    "foxs-cunning": [("ability.int", "enhancement", 4)], "owls-wisdom": [("ability.wis", "enhancement", 4)],
    "mage-armor": [("ac", "armor", 4)], "heroism": [("attack.all", "morale", 2), ("save.all", "morale", 2), ("skill.all", "morale", 2)],
    "jump": [("skill.jump", "enhancement", 10)],
    "haste": [("attack.all", "untyped", 1), ("ac", "dodge", 1), ("save.ref", "dodge", 1), ("speed", "enhancement", 30)],
}
UNIT_FR = {"round": ("round", "rounds"), "minute": ("minute", "minutes"), "hour": ("heure", "heures"), "day": ("jour", "jours")}


def potion_duration(text: str, cl: int) -> dict:
    t = re.sub(r"\s*\(D\)|\s*;.*$|\s*or until.*$|\s*\(see text\)", "", text or "").strip()
    m = re.match(r"^Concentration \+ (\d+) rounds?/level", t, re.I)
    if m:
        n = int(m.group(1)) * cl
        return i18n(f"Concentration + {n} rounds (CL {cl})", f"Concentration + {n} rounds (NLS {cl})")
    m = re.match(r"^(\d+) (round|min\.|minute|hour|day)s?\.?/(?:level|lvl)", t, re.I)
    if m:
        n = int(m.group(1)) * cl
        unit = {"min.": "minute"}.get(m.group(2).lower(), m.group(2).lower())
        en = f"{n} {unit}{'s' if n > 1 else ''} (CL {cl})"
        fr = f"{n} {UNIT_FR[unit][n > 1]} (NLS {cl})"
        return i18n(en, fr)
    m = re.match(r"^(\d+) (round|min\.|minute|hour|day)s?\.?$", t, re.I)
    if m:
        n = int(m.group(1))
        unit = {"min.": "minute"}.get(m.group(2).lower(), m.group(2).lower())
        return i18n(f"{n} {unit}{'s' if n > 1 else ''}", f"{n} {UNIT_FR[unit][n > 1]}")
    if t.lower().startswith("instantaneous"):
        return i18n("Instantaneous", "Instantanée")
    if t.lower().startswith("permanent"):
        return i18n("Permanent", "Permanente")
    NOTES.append(f"potions: duration '{text}' kept as text")
    return i18n(text, text)


def potion_level_cl(levels: str, price: float) -> tuple[int, int]:
    """(spell level, caster level) consistent with price = level × CL × 50 gp.
    Prefers the level whose CL is the minimum for a full caster (2 × level − 1), as the SRD table does."""
    nums = sorted({int(x) for x in re.findall(r"\b(\d)\b", levels or "")}) or [1]
    valid = []
    for lv in nums:
        cl = price / (50 * (lv or 0.5))
        if abs(cl - round(cl)) < 1e-6 and round(cl) >= max(1, 2 * lv - 1):
            valid.append((lv, int(round(cl))))
    for lv, cl in valid:
        if cl == max(1, 2 * lv - 1):
            return lv, cl
    if valid:
        return min(valid, key=lambda x: x[1])
    lv = nums[0]
    return lv, max(1, round(price / (50 * lv)))


def potion_spell_name(row: str) -> tuple[str, str, int | None]:
    """'Shield of faith +3 (potion)' -> ('Shield of faith', 'potion', 3)."""
    kind = "oil" if "(oil)" in row else "potion"
    s = re.sub(r"\s*\((potion|oil|potion or oil)\)$", "", row).strip()
    base, plus = plus_split(s)
    return base, kind, plus


def build_potions():
    c = db()
    spells = {norm(r["name"]): dict(r) for r in c.execute("select * from spell")}
    en_tab = table_rows(rtf_fr.load("30_", "en"), lambda t: t == "Table: Potions and Oils", "en")
    fr_tab = table_rows(rtf_fr.load("DRS 27"), lambda t: t == "Table : potions et huiles", "fr")

    def gl(e):
        b = potion_spell_name(e)[0]
        b = re.sub(r"\s*\(.*?\)|\s*\d+/magic|\s+\d+$", "", b).strip()
        return glossary_fr.lookup(b, "sort")

    def fr_strip(f):
        return re.sub(r"\s*\((potion|huile|potion ou huile)\)$|\s*\(\+\d\)|\s*\+\d", "", f).strip()

    pairs, methods = align(en_tab, fr_tab, gl, lambda f: re.sub(r"\s*\(.*?\)|\s*\d+/magie|\s+\d+$", "", fr_strip(f)).strip(), HAND_POTIONS)
    out = []
    for e, price in en_tab:
        base, kind, plus = potion_spell_name(e.replace("’", "'"))
        lookup = re.sub(r"\s*\(alignment\)", " evil", re.sub(r"\s*\(type\)", "", base))
        lookup = re.sub(r"\s+\d+/magic$|\s+\d+$", "", lookup).strip()
        m_gl = re.match(r"^(Greater|Lesser) (.*)$", lookup)
        sp = spells.get(norm(lookup)) or (spells.get(norm(f"{m_gl.group(2)}, {m_gl.group(1)}")) if m_gl else None)
        if not sp:
            NOTES.append(f"potions: spell '{lookup}' not found in the spell table")
        lvl, cl = potion_level_cl(sp["level"] if sp else "", price)
        suffix = re.sub(r"^.*?((?:\s\d+/magic|\s\d+))?$", r"\1", base) if re.search(r"\s\d+(/magic)?$", base) else ""
        en_name = f"{'Oil' if kind == 'oil' else 'Potion'} of {base[0].lower() + base[1:]}" + (f" +{plus}" if plus else "")
        iid = kebab(en_name)
        fr_row = pairs.get(e)
        method = methods.get(e, "")
        if method == "table-order?":
            fr_row, method = None, ""
        fr_full = None
        if fr_row:
            fk = "Huile" if "(huile)" in fr_row else "Potion"
            fb = fr_strip(fr_row)
            fr_full = f"{fk} {de(fb)}" + (f" +{plus}" if plus else "")
        guess_spell = gl(e)
        guess = f"{'Huile' if kind == 'oil' else 'Potion'} {de(guess_spell)}" if guess_spell else None
        fr_name = FR.resolve(iid, en_name, fr_full, guess, method)
        spell_fr = re.sub(r"^(Potion|Huile) (de |d’)", "", fr_name)
        dur = potion_duration(sp["duration"], cl) if sp else i18n("see spell", "voir le sort")
        spell_url = f"https://www.d20srd.org/srd/spells/{srd_urls.camel(sp['name'] if sp else lookup, False)}.htm"
        short = (sp["short_description"] or "").strip() if sp else ""
        txt_en = [f"Duplicates the spell <i><a href=\"{spell_url}\">{esc(base.lower())}</a></i> (spell level {lvl}, caster level {cl}). {esc(short)}".strip(),
                  "Drinking a potion (or applying an oil) is a standard action that provokes attacks of opportunity. "
                  "Price = spell level × caster level × 50 gp (0-level spells count as ½)."]
        txt_fr = [f"Reproduit le sort <i>{esc(spell_fr)}</i> (niveau de sort {lvl}, niveau de lanceur de sorts {cl}).",
                  "Boire une potion (ou appliquer une huile) est une action simple qui provoque des attaques d’opportunité. "
                  "Prix = niveau du sort × niveau de lanceur de sorts × 50 po (sorts de niveau 0 : ½)."]
        d = dict(id=iid, name=i18n(en_name, fr_name), kind="potion", priceGp=num(price), casterLevel=cl,
                 weight={"lb": 0.1, "kg": 0.05})
        key = kebab(base)
        mods = None
        if key in POTION_MODS:
            mods = [{"target": t, "bonusType": bt, "value": v} for t, bt, v in POTION_MODS[key]]
        elif key == "barkskin" and plus:
            mods = [{"target": "ac", "bonusType": "naturalArmor", "value": plus}]
        elif key == "shield-of-faith" and plus:
            mods = [{"target": "ac", "bonusType": "deflection", "value": plus}]
        elif key == "protection-from-alignment":
            cond = i18n("vs attacks/effects of the chosen alignment", "contre les attaques et effets de l’alignement choisi")
            mods = [{"target": "ac", "bonusType": "deflection", "value": 2, "condition": cond},
                    {"target": "save.all", "bonusType": "resistance", "value": 2, "condition": cond}]
        if mods:
            d["modifiers"] = mods
        d["duration"] = dur
        d["text"] = i18n(clip_paras(txt_en), clip_paras(txt_fr))
        d["source"] = srd_source(srd_urls.anchor_url("magicItems/potionsAndOils.htm", "tablePotionsandOils"),
                                 "DRS 27 (parchemins, potions, sceptres)")
        out.append(d)
    NOTES.append("potions: every row of the SRD Table: Potions and Oils; spell level and caster level chosen so that price = level × CL × 50 gp with the minimum CL for that level (as in the SRD table); weight 1/10 lb / 50 g (vial, rulings R22).")
    return out


# ---------------------------------------------------------------------------------------------
# Weapon / armor enhancement bonuses
# ---------------------------------------------------------------------------------------------

def build_enhancements():
    out = []
    for b in range(1, 6):
        out.append(dict(
            id=f"weapon-enhancement-{b}", name=i18n(f"Weapon enhancement +{b}", f"Bonus d’altération d’arme +{b}"),
            kind="weaponProperty", priceGp=2000 * b * b, casterLevel=3 * b, weight={"lb": 0, "kg": 0},
            modifiers=[{"target": "attack.weapon", "bonusType": "enhancement", "value": b},
                       {"target": "damage.weapon", "bonusType": "enhancement", "value": b}],
            text=i18n(f"<p>+{b} enhancement bonus on attack and damage rolls with this weapon. Price shown is the bonus only: "
                      f"total = weapon cost + 300 gp (masterwork) + {2000 * b * b:,} gp. All magic weapons are masterwork; "
                      "the masterwork +1 on attacks does not stack with the enhancement bonus.</p>",
                      f"<p>Bonus d’altération de +{b} aux jets d’attaque et de dégâts avec cette arme. Le prix indiqué est celui du bonus : "
                      f"total = prix de l’arme + 300 po (arme de maître) + {2000 * b * b:,} po. Toute arme magique est une arme de maître ; "
                      "le +1 de l’arme de maître ne se cumule pas avec le bonus d’altération.</p>".replace(",", " ")),
            source=srd_source(srd_urls.anchor_url("magicItems/magicWeapons.htm", ["magicWeaponBasics", "casterLevelforWeapons"]),
                              "DRS 24 (anneaux, armes)")))
        for what, fr_what, tgt, mw in (("armor", "d’armure", "ac.armor", 150), ("shield", "de bouclier", "ac.shield", 150)):
            out.append(dict(
                id=f"{what}-enhancement-{b}", name=i18n(f"{what.capitalize()} enhancement +{b}", f"Bonus d’altération {fr_what} +{b}"),
                kind="armorProperty", priceGp=1000 * b * b, casterLevel=3 * b, weight={"lb": 0, "kg": 0},
                modifiers=[{"target": tgt, "bonusType": "enhancement", "value": b}],
                text=i18n(f"<p>+{b} enhancement bonus to the {what} bonus (does not apply against touch attacks). Price shown is the bonus only: "
                          f"total = {what} cost + 150 gp (masterwork) + {1000 * b * b:,} gp. Magic {what}s are masterwork (armor check penalty 1 better).</p>",
                          (f"<p>Bonus d’altération de +{b} au bonus {fr_what} (ne s’applique pas contre les attaques de contact). Le prix indiqué est celui du bonus : "
                           f"total = prix {'de l’armure' if what == 'armor' else 'du bouclier'} + 150 po (objet de maître) + {1000 * b * b:,} po. "
                           f"{'Une armure magique' if what == 'armor' else 'Un bouclier magique'} est toujours de maître (malus d’armure aux tests réduit de 1).</p>").replace(",", " ")),
                source=srd_source(srd_urls.anchor_url("magicItems/magicArmor.htm", ["casterLevelforArmorandShields"]),
                                  "DRS 25 (armures, baguettes, bâtons)")))
    NOTES.append("magic-items: enhancement properties use targets 'attack.weapon'/'damage.weapon' (the weapon they are applied to) and 'ac.armor'/'ac.shield' "
                 "(enhancement to the armor or shield bonus, so armor and shield enhancements don't collide) — not in the types.ts Target comment yet.")
    return out


def build_magic_items():
    items = build_wondrous() + build_rings() + build_potions() + build_enhancements()
    ids = [d["id"] for d in items]
    dup = [k for k, v in Counter(ids).items() if v > 1]
    assert not dup, dup
    write_json(OUT_SRD / "magic-items.json", items)
    NOTES.append("magic-items: amulet of natural armor / barkskin use bonusType 'naturalArmor' on 'ac' (SRD: enhancement bonus to natural armor; "
                 "equivalent for a creature without natural armor, non-stacking between them).")
    return items


# ---------------------------------------------------------------------------------------------
# Carrying capacity (SRD Table: Carrying Capacity; kg as printed in DRS 11)
# ---------------------------------------------------------------------------------------------

EN_CAPACITY = {  # Str: (light, medium, heavy) maximum in lb — https://www.d20srd.org/srd/carryingCapacity.htm
    1: (3, 6, 10), 2: (6, 13, 20), 3: (10, 20, 30), 4: (13, 26, 40), 5: (16, 33, 50), 6: (20, 40, 60),
    7: (23, 46, 70), 8: (26, 53, 80), 9: (30, 60, 90), 10: (33, 66, 100), 11: (38, 76, 115), 12: (43, 86, 130),
    13: (50, 100, 150), 14: (58, 116, 175), 15: (66, 133, 200), 16: (76, 153, 230), 17: (86, 173, 260),
    18: (100, 200, 300), 19: (116, 233, 350), 20: (133, 266, 400), 21: (153, 306, 460), 22: (173, 346, 520),
    23: (200, 400, 600), 24: (233, 466, 700), 25: (266, 533, 800), 26: (306, 613, 920), 27: (346, 693, 1040),
    28: (400, 800, 1200), 29: (466, 933, 1400),
}


def build_carrying_capacity():
    fr = {}
    for p in rtf_fr.load("DRS 11"):
        if p.cells and len(p.cells) == 4 and p.cells[0].strip().isdigit():
            s = int(p.cells[0])
            light = parse_kg_fr(p.cells[1])
            med = parse_kg_fr(p.cells[2].split("–")[-1])
            heavy = parse_kg_fr(p.cells[3].split("–")[-1])
            fr[s] = (light, med, heavy)
    rows = []
    for s, lbs in EN_CAPACITY.items():
        kgs = fr.get(s)
        assert kgs, s
        row = {"str": s}
        for k, lb, kg in zip(("light", "medium", "heavy"), lbs, kgs):
            row[k] = weight(lb, kg, WEIGHT_LOG, f"carrying Str {s} {k}")
        rows.append(row)
    write_json(OUT_SRD / "carrying-capacity.json", rows)
    return rows
