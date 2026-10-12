"""weapons.json, armor.json, gear.json (SRD equipment, French names/kg from DRS 07)."""
from __future__ import annotations

import re

import glossary_fr
import rtf_fr
import srd_urls
from common import (
    OUT_SRD, clip_paras, db, distance, esc, html_paras, i18n, kebab, num, parse_ft, parse_gp,
    parse_kg_fr, parse_lb, parse_po, srd_source, weight, write_json,
)
from ctx import FR, NOTES, WEIGHT_LOG, fr_paras_html, norm


# ---------------------------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------------------------

def display_name(name: str) -> str:
    """SRD table names 'Sword, short' -> 'Short sword', 'Shield, heavy steel' -> 'Heavy steel shield'."""
    m = re.match(r"^(.*?)(\s*\([^()]*\))?$", name)
    base, paren = m.group(1), (m.group(2) or "")
    if base.count(",") != 1 or "(" in base:
        return name
    a, b = [x.strip() for x in base.split(",")]
    if re.search(r"\d", b) or len(b.split()) > 3:
        return name
    return f"{b[0].upper()}{b[1:].lower()} {a.lower()}{paren}"


def match_score(en: dict, fr: dict, gl: str | None) -> float:
    s = 0.0
    if gl:
        g = norm(gl)
        n = fr["name"]
        if g in (norm(n), norm(re.sub(r"\s*\(.*?\)", "", n)), norm(n.split(",")[0])):
            s += 10
    for k in ("price", "kg"):
        a, b = en.get(k), fr.get(k)
        if a is None and b is None:
            s += 1
        elif a is not None and b is not None and abs(a - b) < 0.011:
            s += 2
        else:
            s -= 1
    for k in ("dmgS", "dmgM", "crit", "bonus", "acp", "maxDex", "asf"):
        if k in en and k in fr:
            s += 1.5 if en[k] == fr[k] else -2
    return s


def best_match(en: dict, cands: list[dict], gl: str | None, used: set) -> tuple[dict | None, str]:
    scored = sorted(((match_score(en, f, gl), i, f) for i, f in enumerate(cands) if f["name"] not in used),
                    key=lambda x: (-x[0], x[1]))
    if not scored:
        return None, ""
    top = scored[0]
    if top[0] >= 10:
        return top[2], "glossary+table"
    if top[0] >= 3 and (len(scored) == 1 or scored[1][0] < top[0]):
        return top[2], "table-stats"
    return None, ""


def norm_crit(s: str) -> tuple[int, int]:
    s = (s or "").replace("–", "-").replace("×", "x")
    m = re.match(r"^(\d+)-20/x?(\d)", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.match(r"^x?(\d)", s)
    if m:
        return 20, int(m.group(1))
    return 20, 2


def fr_dmg(s: str) -> str:
    """French table damage with glued footnote digits ('1d23' -> '1d2')."""
    s = s.strip()
    m = re.match(r"^(\d+d(?:12|10|8|6|4|3|2))(?:/(\d+d(?:12|10|8|6|4|3|2)))?", s)
    return m.group(0) if m else s


def fr_desc(paras: list[rtf_fr.Para], fr_name: str, start: int = 0, stop: int | None = None) -> list[rtf_fr.Para]:
    """Description paragraph(s) whose bold prefix is the French name (e.g. 'Arc long.').
    Falls back to shorter leading word groups ('Jarre en terre cuite' -> 'Jarre')."""
    words = norm(fr_name).split()
    for n in range(len(words), 0, -1):
        key = " ".join(words[:n])
        if len(key) < 4:
            break
        for i in range(start, stop or len(paras)):
            p = paras[i]
            bp = norm(p.bold_prefix)
            ok = bp == key or bp.startswith(key + " ")
            if ok and n < len(words):  # shortened key: the rest of the name must appear in the heading
                rest = [w for w in words[n:] if len(w) > 3]
                ok = all(w in bp.split() for w in rest) and bp != key
            if p.bold_prefix and not p.bold_all and ok:
                out = [p]
                for q in paras[i + 1:i + 4]:
                    if q.bold_prefix or q.in_table:
                        break
                    out.append(q)
                return out
    return []


# Items the table/glossary matcher can't separate (same price and weight); French row read in DRS 07.
HAND_FR = {
    "crossbow-bolts-hand-10": "Carreaux (10)", "crossbow-bolts-repeating-5": "Carreaux (5)",
    "common-lamp": "Lampe", "clay-mug-tankard": "Chope en terre cuite",
    "hempen-rope-50-ft": "Corde en chanvre, 15 m", "meat-chunk-of": "Viande, la portion",
}


def hand_match(id_: str, cands: list[dict]):
    name = HAND_FR.get(id_)
    if name:
        for f in cands:
            if f["name"] == name:
                return f, "hand+table"
    return None, ""


def mfr(m: float) -> str:
    return str(m).replace(".", ",")


# ---------------------------------------------------------------------------------------------
# Weapons
# ---------------------------------------------------------------------------------------------

SKIP_WEAPONS = {"Shield, light", "Shield, heavy", "Spiked shield, light", "Spiked shield, heavy", "Spiked armor"}
HAND = {"Unarmed Attacks": "unarmed", "Light Melee Weapons": "light", "One-Handed Melee Weapons": "oneHanded",
        "Two-Handed Melee Weapons": "twoHanded", "Ranged Weapons": "ranged", "Ammunition": "ranged"}
CAT = {"Simple Weapons": "simple", "Martial Weapons": "martial", "Exotic Weapons": "exotic"}
CAT_FR = {"simple": "Armes courantes", "martial": "Armes de guerre", "exotic": "Armes exotiques"}
CAT_FR1 = {"simple": "Arme courante", "martial": "Arme de guerre", "exotic": "Arme exotique"}
HAND_TXT = {"unarmed": ("unarmed attack", "attaque à mains nues"),
            "light": ("light melee weapon", "arme de corps à corps légère"),
            "oneHanded": ("one-handed melee weapon", "arme de corps à corps à une main"),
            "twoHanded": ("two-handed melee weapon", "arme de corps à corps à deux mains"),
            "ranged": ("ranged weapon", "arme à distance")}
DTYPE_FR = {"bludgeoning": "contondant", "piercing": "perforant", "slashing": "tranchant"}


def fr_weapon_rows():
    rows, cat = [], None
    for p in rtf_fr.load("DRS 07"):
        if not p.cells:
            continue
        c = [x.strip() for x in p.cells]
        if c[0] in CAT_FR.values():
            cat = c[0]
            continue
        if c[0] == "Armure":
            break
        if len(c) >= 8 and cat and any(c[1:]):
            name = re.sub(r"(?<=[a-zé)])\d$", "", c[0]).strip()
            crit = c[4]
            crit = norm_crit(crit.replace("/", "/x") if "/" in crit else "x" + crit) if crit not in ("—", "-") else None
            rows.append(dict(name=name, cat=cat,
                             price=parse_po(c[1]) if c[1] not in ("—", "spécial") else None,
                             dmgS=fr_dmg(c[2]), dmgM=fr_dmg(c[3]), crit=crit,
                             kg=parse_kg_fr(c[6]), range=c[5], dtype=c[7]))
    return rows


def weapon_url(name: str) -> str:
    base = re.sub(r"\s*\(.*\)$", "", name)
    cands = [srd_urls.camel(base), srd_urls.camel(base, False)]
    if base.startswith("Crossbow, repeating"):
        cands.append("crossbowRepeating")
    if base in ("Flail", "Flail, heavy"):
        cands.append("flailorHeavyFlail")
    if base.startswith("Bolts"):
        cands.append("bolts")
    return srd_urls.anchor_url("equipment/weapons.htm", cands, "tableWeapons")


def build_weapons():
    c = db()
    fr_rows = fr_weapon_rows()
    fr_paras = rtf_fr.load("DRS 07")
    fr_ref = rtf_fr.file_label("DRS 07")
    used: set = set()
    weapons, ammo = [], []
    for r in c.execute("select * from equipment where family='Weapons' order by id"):
        r = dict(r)
        name = r["name"]
        if name in SKIP_WEAPONS:
            continue
        # rows whose columns are shifted in the Andargor database
        if name == "Whip":
            r.update(range_increment="-", weight="2 lb.", type="Slashing")
        if name == "Bolts (5)":
            r.update(weight="1 lb.")
        if name == "Net":
            r.update(dmg_s="-", dmg_m="-", critical="-", range_increment="10 ft.", weight="6 lb.", type="-")
        cat = CAT[r["category"]]
        disp = display_name(name)
        if name == "Bolts (10)":
            disp = "Crossbow bolts, hand (10)"
        if name == "Bolts (5)":
            disp = "Crossbow bolts, repeating (5)"
        is_ammo = r["subcategory"] == "Ammunition" and not name.startswith("Shuriken")
        lb = parse_lb(r["weight"])
        price = parse_gp(r["cost"]) if r["cost"] not in ("-", "special") else None
        en = dict(price=price, kg=lb / 2 if lb is not None else None)
        if not is_ammo:
            en.update(dmgS=r["dmg_s"], dmgM=r["dmg_m"],
                      crit=norm_crit(r["critical"]) if r["critical"] not in ("-",) else None)
        gl = glossary_fr.lookup(disp, "équipement") or glossary_fr.lookup(name, "équipement")
        cands = [f for f in fr_rows if f["cat"] == CAT_FR[cat]]
        if is_ammo:
            seen = {}
            for f in cands:
                if f["dmgM"] in ("—", "-") and f["name"] != "Filet":
                    seen.setdefault(f["name"], f)
            cands = list(seen.values())
        hit, method = best_match(en, cands, gl, set() if is_ammo else used)
        if hit and not is_ammo:
            used.add(hit["name"])
        wid = kebab(disp)
        if not hit:
            hit, method = hand_match(wid, cands)
        fr_name = FR.resolve(wid, disp, hit["name"] if hit else None, gl, method)
        w = weight(lb, hit["kg"] if hit else None, WEIGHT_LOG, wid)
        url = weapon_url(name)
        desc_fr = fr_desc(fr_paras, re.sub(r"\s*\(.*\)$", "", fr_name), 190, 320)
        en_desc = html_paras(r["full_text"])
        if is_ammo:
            ammo.append(dict(id=wid, name=i18n(disp, fr_name), weight=w, costGp=num(price or 0),
                             text=i18n(clip_paras([f"Ammunition ({cat} weapons table)."] + en_desc),
                                       clip_paras([f"Munitions ({CAT_FR[cat].lower()})."] + fr_paras_html(desc_fr))),
                             source=srd_source(url, fr_ref)))
            continue
        hand = HAND[r["subcategory"]]
        if name.startswith("Shuriken"):
            hand = "ranged"
        crit = norm_crit(r["critical"]) if r["critical"] != "-" else (20, 2)
        if name == "Net":
            crit = (20, 1)
        dtypes = [t for t in ("bludgeoning", "piercing", "slashing") if t in (r["type"] or "").lower()]
        rng = parse_ft(r["range_increment"])
        dmg = {"S": r["dmg_s"] if r["dmg_s"] != "-" else "—", "M": r["dmg_m"] if r["dmg_m"] != "-" else "—"}
        crit_txt = f"{crit[0]}–20/×{crit[1]}" if crit[0] < 20 else f"×{crit[1]}"
        if r["critical"] == "x3/x4":
            crit_txt = "×3/×4"
        typ_en = (r["type"] or "").lower()
        typ_fr = (hit["dtype"].lower() if hit else " ou ".join(DTYPE_FR[t] for t in dtypes)) or "—"
        rng_en = f"; range increment {int(rng)} ft" if rng else ""
        rng_fr = f" ; facteur de portée {mfr(distance(rng)['m'])} m" if rng else ""
        h_en, h_fr = HAND_TXT[hand]
        stats_en = f"{cat.capitalize()} weapon, {h_en}. Damage {dmg['M']} (Medium), {dmg['S']} (Small); critical {crit_txt}; {typ_en}{rng_en}."
        stats_fr = f"{CAT_FR1[cat]}, {h_fr}. Dégâts {dmg['M']} (M), {dmg['S']} (P) ; critique {crit_txt} ; {typ_fr}{rng_fr}."
        if name == "Net":
            stats_en = "Exotic ranged weapon: entangles, deals no damage; range increment 10 ft. (maximum 10 ft.)."
            stats_fr = "Arme exotique à distance : enchevêtre, n’inflige pas de dégâts ; facteur de portée 3 m (portée maximale 3 m)."
        d = dict(id=wid, name=i18n(disp, fr_name), category=cat,
                 kind="ranged" if hand == "ranged" else "melee", handedness=hand, damage=dmg,
                 critRange=crit[0], critMult=crit[1])
        if rng:
            d["rangeIncrement"] = distance(rng)
        d.update(damageTypes=dtypes, weight=w, costGp=num(price or 0),
                 text=i18n(clip_paras([esc(stats_en)] + en_desc), clip_paras([esc(stats_fr)] + fr_paras_html(desc_fr))),
                 source=srd_source(url, fr_ref))
        weapons.append(d)
    write_json(OUT_SRD / "weapons.json", weapons)
    NOTES.append("weapons.json: shield-bash and armor-spike rows of the SRD weapon table are not separate weapons; "
                 "ammunition (arrows, bolts, sling bullets) is in gear.json (no damage/critical of its own); shuriken (5) stays a weapon.")
    NOTES.append("weapons.json: damageTypes lists every type; 'X or Y' (wielder's choice) vs 'X and Y' (both) is kept in the text only. "
                 "Net: critMult 1, no damage. Gnome hooked hammer: critMult 3 (other head ×4, in text). Thrown melee weapons (dagger, spear…) have kind 'melee' + rangeIncrement.")
    return weapons, ammo


# ---------------------------------------------------------------------------------------------
# Armor and shields
# ---------------------------------------------------------------------------------------------

def _sn(x):
    x = (x or "").replace("–", "-").replace("+", "").strip()
    m = re.match(r"^-?\d+", x)
    return int(m.group(0)) if m else None


def fr_armor_rows():
    rows, on = [], False
    for p in rtf_fr.load("DRS 07"):
        if not p.cells:
            continue
        c = [x.strip() for x in p.cells]
        if c[0] == "Armure" and len(c) > 1 and "Prix" in c[1]:
            on = True
            continue
        if not on:
            continue
        if c[0] == "Suppléments":
            break
        if len(c) >= 9 and any(c[1:]):
            bonus = c[2]
            if c[0] == "Pavois":
                bonus = "+4"  # '+43' = +4 with footnote 3
            rows.append(dict(name=c[0], price=parse_po(c[1]), bonus=_sn(bonus),
                             maxDex=_sn(c[3]), acp=_sn(c[4]) or 0, asf=_sn(c[5].replace("%", "")), kg=parse_kg_fr(c[8])))
    return rows


def build_armor():
    c = db()
    fr_rows = fr_armor_rows()
    fr_paras = rtf_fr.load("DRS 07")
    fr_ref = rtf_fr.file_label("DRS 07")
    used: set = set()
    out, extras = [], []
    catmap = {"Light armor": "light", "Medium armor": "medium", "Heavy armor": "heavy", "Shields": "shield"}
    cat_fr = {"light": "Armure légère", "medium": "Armure intermédiaire", "heavy": "Armure lourde",
              "shield": "Bouclier", "tower": "Bouclier (pavois)"}
    cat_en = {"light": "Light armor", "medium": "Medium armor", "heavy": "Heavy armor", "shield": "Shield", "tower": "Shield (tower)"}
    for r in c.execute("select * from equipment where family='Armor and Shields' order by id"):
        r = dict(r)
        name = r["name"]
        if r["subcategory"] == "Extras":
            extras.append(r)
            continue
        cat = catmap[r["subcategory"]]
        if name == "Shield, tower":
            cat = "tower"
        disp = display_name(name) if name.startswith("Shield") else name
        en = dict(price=parse_gp(r["cost"]), bonus=_sn(r["armor_shield_bonus"]), maxDex=_sn(r["maximum_dex_bonus"]),
                  acp=_sn(r["armor_check_penalty"]) or 0, asf=_sn(r["arcane_spell_failure_chance"]))
        lb = parse_lb(r["weight"])
        en["kg"] = lb / 2
        gl = glossary_fr.lookup(disp, "équipement") or glossary_fr.lookup(name, "équipement")
        hit, method = best_match(en, fr_rows, gl, used)
        if hit:
            used.add(hit["name"])
        aid = kebab(disp)
        fr_name = FR.resolve(aid, disp, hit["name"] if hit else None, gl, method)
        s30, s20 = parse_ft(r["speed_30"]), parse_ft(r["speed_20"])
        anchor_c = [srd_urls.camel(name), srd_urls.camel(name, False)]
        if name.startswith("Shield, heavy"):
            anchor_c.append("shieldHeavyWoodenorSteel")
        if name.startswith("Shield, light"):
            anchor_c.append("shieldLightWoodenorSteel")
        if name == "Shield, tower":
            anchor_c.append("shieldTower")
        url = srd_urls.anchor_url("equipment/armor.htm", anchor_c, "tableArmorandShields")
        maxdex_txt = f"+{en['maxDex']}" if en["maxDex"] is not None else "—"
        is_shield = cat in ("shield", "tower")
        stats_en = (f"{cat_en[cat]}: {'shield' if is_shield else 'armor'} bonus +{en['bonus']}, maximum Dex bonus {maxdex_txt}, "
                    f"armor check penalty {en['acp']}, arcane spell failure {en['asf']}%"
                    + (f", speed {int(s30)} ft. (base 30 ft.) / {int(s20)} ft. (base 20 ft.)" if s30 else "") + ".")
        stats_fr = (f"{cat_fr[cat]} : bonus {'de bouclier' if is_shield else 'd’armure'} +{en['bonus']}, bonus de Dex maximal {maxdex_txt}, "
                    f"malus d’armure aux tests {en['acp']}, risque d’échec des sorts profanes {en['asf']} %"
                    + (f", vitesse {mfr(distance(s30)['m'])} m (base 9 m) / {mfr(distance(s20)['m'])} m (base 6 m)" if s30 else "") + ".")
        desc_fr = fr_desc(fr_paras, fr_name, 340, 400)
        out.append(dict(id=aid, name=i18n(disp, fr_name), category=cat, armorBonus=en["bonus"], maxDex=en["maxDex"],
                        acp=en["acp"], arcaneFailure=en["asf"],
                        speed30=distance(s30) if s30 else None, speed20=distance(s20) if s20 else None,
                        weight=weight(lb, hit["kg"] if hit else None, WEIGHT_LOG, aid), costGp=num(en["price"]),
                        text=i18n(clip_paras([esc(stats_en)] + html_paras(r["full_text"])),
                                  clip_paras([esc(stats_fr)] + fr_paras_html(desc_fr))),
                        source=srd_source(url, fr_ref)))
    write_json(OUT_SRD / "armor.json", out)
    return out, extras


# ---------------------------------------------------------------------------------------------
# Gear (goods and services)
# ---------------------------------------------------------------------------------------------

GEAR_SECTIONS = {
    "Adventuring Gear": ("Matériel d’aventurier", "tableAdventuringGear"),
    "Special Substances and Items": ("Substances et objets spéciaux", "tableSpecialSubstancesAndItems"),
    "Tools and Skill Kits": ("Matériel de classe et de compétence", "tableToolsAndSkillKits"),
    "Clothing": ("Vêtements", "tableClothing"),
    "Food, Drink, and Lodging": ("Nourriture, boisson et hébergement", "tableFoodDrinkAndLodging"),
    "Mounts and Related Gear": ("Montures et harnachement", "tableMountsAndRelatedGear"),
}
SKIP_GEAR = re.compile(r"^(Dog|Donkey|Horse|Stabling|Barding|Inn stay|Banquet|Meals)")


def fr_gear_rows():
    """Lines 'Article Prix Poids' of the French goods table (they are plain paragraphs, not RTF cells)."""
    paras = rtf_fr.load("DRS 07")
    rows, section, header = [], None, None
    start = next(i for i, p in enumerate(paras) if p.text == "Table : marchandises et services")
    for p in paras[start + 1:]:
        t = p.text
        if t.startswith("— Poids nul"):
            break
        if p.bold_all:
            if t.startswith("Article") or t.startswith("Service"):
                continue
            section, header = t, None
            continue
        m = re.match(r"^(?P<name>.+?) (?P<price>\d[\d ]*(?:,\d+)? (?:po|pa|pc))\d?(?:‡)?(?: (?P<w>.+))?$", t)
        if not m:
            header = re.sub(r"[‡†]$", "", t).strip()
            continue
        name = m.group("name").strip()
        if header and name[0].isupper() and (name.startswith(("Très", "Moyen", "Bon", "Excellent", "La ", "Le ", "D’", "De ", "Qualité", "Bonne"))):
            full = f"{header}, {name[0].lower()}{name[1:]}"
        else:
            full = name
            header = None if not name.startswith(("Très", "Moyen", "Bon", "Excellent")) else header
        w = m.group("w") or ""
        rows.append(dict(name=full, section=section, price=parse_po(m.group("price")),
                         kg=parse_kg_fr(w) if w.strip() not in ("—", "") else None))
    return rows


def build_gear(ammo: list[dict], armor_extras: list[dict]):
    c = db()
    fr_rows = fr_gear_rows()
    fr_paras = rtf_fr.load("DRS 07")
    fr_ref = rtf_fr.file_label("DRS 07")
    desc_start = next(i for i, p in enumerate(fr_paras) if p.text.startswith("— Poids nul"))
    used: set = set()
    out = list(ammo)
    for r in c.execute("select * from equipment where family='Goods and Services' and category='Item' order by id"):
        r = dict(r)
        name, sub = r["name"], r["subcategory"]
        if sub not in GEAR_SECTIONS or SKIP_GEAR.match(name):
            continue
        disp = name if sub == "Food, Drink, and Lodging" else display_name(name)
        lb = parse_lb(r["weight"])
        price = parse_gp(r["cost"])
        if price is None:
            continue
        en = dict(price=price, kg=lb / 2 if lb is not None else None)
        gl = (glossary_fr.lookup(disp, "équipement") or glossary_fr.lookup(name, "équipement")
              or glossary_fr.lookup(re.sub(r"\s*\(.*\)$", "", disp), "équipement"))
        sec_fr, table_anchor = GEAR_SECTIONS[sub]
        cands = [f for f in fr_rows if f["section"] and norm(f["section"]).startswith(norm(sec_fr)[:12])]
        hit, method = best_match(en, cands, gl, used)
        if hit:
            used.add(hit["name"])
        gid = kebab(re.sub(r"\s*\((empty|per day|per lb\.|sheet)\)", "", disp))
        if not hit:
            hit, method = hand_match(gid, cands)
            if hit:
                used.add(hit["name"])
        fr_name = FR.resolve(gid, disp, hit["name"] if hit else None, gl or {"ale-gallon": "Bière, le gallon"}.get(gid), method)
        base = re.sub(r"\s*\(.*\)$", "", name)
        url = srd_urls.anchor_url("equipment/goodsAndServices.htm",
                                  [srd_urls.camel(base), srd_urls.camel(base, False), srd_urls.camel(re.sub(r",.*$", "", base))],
                                  table_anchor)
        en_desc = html_paras(r["full_text"])
        full = re.sub(r"\s*\(.*\)$", "", fr_name).replace(",", " ")
        desc_fr = fr_desc(fr_paras, full, desc_start)
        if not desc_fr and "," in fr_name:  # 'Cadenas, très simple' -> the shared 'Cadenas.' entry
            base = fr_name.split(",")[0]
            desc_fr = fr_desc(fr_paras, base, desc_start)
            if desc_fr and norm(desc_fr[0].bold_prefix) != norm(base):
                desc_fr = []
        sub_fr = sec_fr.lower()
        out.append(dict(id=gid, name=i18n(disp, fr_name),
                        weight=weight(lb, hit["kg"] if hit else None, WEIGHT_LOG, gid), costGp=num(price),
                        text=i18n(clip_paras(en_desc or [esc(f"{sub} (SRD Table: Goods and Services).")]),
                                  clip_paras(fr_paras_html(desc_fr) or [esc(f"{sec_fr} (Table : marchandises et services).")])),
                        source=srd_source(url, fr_ref)))
    # armor/shield add-ons from the armor table
    extra_fr = {"Armor spikes": "Pointes pour armure", "Gauntlet, locked": "Gantelet d’armes", "Shield spikes": "Pointes pour bouclier"}
    fr_extra_kg = {"Armor spikes": 5, "Gauntlet, locked": 2.5, "Shield spikes": 2.5}
    for r in armor_extras:
        name = r["name"]
        disp = display_name(name)
        gid = kebab(disp)
        lb = 5.0 if name == "Gauntlet, locked" else parse_lb(r["weight"])  # weight column shifted in the database
        fr_name = FR.resolve(gid, disp, extra_fr.get(name), None, "table(armor extras)")
        url = srd_urls.anchor_url("equipment/armor.htm", [srd_urls.camel(name)], "tableArmorandShields")
        out.append(dict(id=gid, name=i18n(disp, fr_name), weight=weight(lb, fr_extra_kg.get(name), WEIGHT_LOG, gid),
                        costGp=num(parse_gp(r["cost"])),
                        text=i18n(clip_paras([esc("Armor/shield add-on: the price and weight are added to the armor or shield.")] + html_paras(r["full_text"])),
                                  clip_paras([esc("Supplément d’armure ou de bouclier : prix et poids s’ajoutent à ceux de l’armure ou du bouclier.")]
                                             + fr_paras_html(fr_desc(rtf_fr.load("DRS 07"), fr_name, 340, 400)))),
                        source=srd_source(url, fr_ref)))
    write_json(OUT_SRD / "gear.json", out)
    NOTES.append("gear.json: adventuring gear, special substances, tools/kits, clothing, food & drink, mount gear, ammunition and armor add-ons "
                 "(spikes, locked gauntlet: price/weight are additions). Animals, transport, lodging, meals and services are left out.")
    return out
