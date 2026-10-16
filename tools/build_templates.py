"""Templates of summoned creatures (src/data/srd/templates.json, TemplateDef[] in src/data/types.ts).

Scope: the two templates that the Summon Monster I-IX table applies to animals and vermin
(https://www.d20srd.org/srd/spells/summonMonsterI.htm):
- celestial creature, https://www.d20srd.org/srd/monsters/celestialCreature.htm
- fiendish creature, https://www.d20srd.org/srd/monsters/fiendishCreature.htm

English: the local English SRD HTML (sources/srd-v3.5/monsters/monsters-b-c.html and monsters-e-f.html; dnd35.db has no
template entries). French: official French SRD, DRS 35 ("Créature céleste", "Créature fiélon"). The Hit Dice table, the
spell resistance (HD + 5, max 25), the darkvision range and the smite paragraph are parsed from both languages and must
agree; the texts are kept as printed.

Run alone: python tools/build_templates.py (writes templates.json and prints the notes).
"""
from __future__ import annotations

import re

import rtf_fr
import srd_urls
from common import OUT_SRD, ROOT, clip_paras, esc, i18n, srd_source, write_json
from ctx import NOTES, fr_paras_html

# id -> (English heading id, local HTML file, d20srd page, French heading, smite English head, smite French head)
TEMPLATES = {
    "celestial": ("celestial-creature", "monsters/monsters-b-c.html", "monsters/celestialCreature.htm",
                  "Créature céleste", "Smite Evil", "Châtiment du Mal"),
    "fiendish": ("fiendish-creature", "monsters/monsters-e-f.html", "monsters/fiendishCreature.htm",
                 "Créature fiélon", "Smite Good", "Châtiment du Bien"),
}
FR_FILE = "DRS 35"
# Energy types of the resistance column (SRD -> official French term, checked in the French column heading).
ENERGY_FR = {"acid": "acide", "cold": "froid", "electricity": "électricité", "fire": "feu", "sonic": "son"}
TEXT_MAX = 6000
# "12 or more" (the last band has no upper bound): TemplateDef.bands[].maxHD needs a number.
OPEN_MAX_HD = 99


def _en_section(fname: str, hid: str) -> tuple[list[str], list[list[str]]]:
    """Paragraphs (HTML, <strong>/<em> as <b>/<i>) and table rows of the English SRD section, up to the next <h2>."""
    html = (ROOT / "sources" / "srd-v3.5" / fname).read_text(encoding="utf-8")
    m = re.search(rf'<h2 id="{re.escape(hid)}">', html)
    assert m, hid
    rest = html[m.end():]
    sec = rest[:re.search(r"<h2[ >]", rest).start()]
    rows = [[re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S)]
            for tr in re.findall(r"<tr>(.*?)</tr>", sec, flags=re.S)]
    sec = re.sub(r"<table.*?</table>", "", sec, flags=re.S)
    paras = []
    for p in re.findall(r"<p>(.*?)</p>", sec, flags=re.S):
        p = re.sub(r"\s+", " ", p).strip()
        p = re.sub(r"</?strong>", lambda x: x.group(0).replace("strong", "b"), p)
        p = re.sub(r"</?em>", lambda x: x.group(0).replace("em", "i"), p)
        paras.append(p)
    # A paragraph split in two by the HTML source (fiendish Challenge Rating line): joined back.
    out: list[str] = []
    for p in paras:
        if out and not re.search(r"[.:)]$", re.sub(r"<[^>]+>", "", out[-1])):
            out[-1] = f"{out[-1]} {p}"
        else:
            out.append(p)
    return out, rows


def _fr_section(heading: str):
    """French paragraphs from the template heading to the next entry heading (the "Création de ..." sub-heading is
    kept as a bold paragraph), and the table rows."""
    ps = rtf_fr.load(FR_FILE)
    i = next(n for n, p in enumerate(ps) if p.text == heading and p.bold_all and not p.in_table)
    body, rows = [], []
    for p in ps[i + 1:]:
        if p.bold_all and not p.in_table and not p.text.startswith("Création de"):
            break
        if p.in_table:
            rows.append([c.strip() for c in p.cells])
        else:
            body.append(p)
    return body, rows


def _hd_range(s: str) -> tuple[int, int]:
    m = re.match(r"^(\d+)\s*[–-]\s*(\d+)$", s) or re.match(r"^(\d+) (?:or more|et plus)$", s)
    assert m, s
    return int(m.group(1)), int(m.group(2)) if m.lastindex == 2 else OPEN_MAX_HD


def build_template(tid: str) -> dict:
    hid, fname, page, fr_head, smite_en, smite_fr = TEMPLATES[tid]
    en, en_rows = _en_section(fname, hid)
    fr_ps, fr_rows = _fr_section(fr_head)
    fr = fr_paras_html(fr_ps)
    # Bold "Création de ..." sub-heading kept as a bold paragraph, like the English "Creating a ..." heading (h3).
    fr = [f"<b>{esc(p.text)}</b>" if p.bold_all else h for p, h in zip(fr_ps, fr)]
    # The smite head is in italics, as in the English SRD ("<i>Smite Evil (Su):</i>").
    fr = [re.sub(rf"^({re.escape(smite_fr)} \(Sur\)\.)", r"<i>\1</i>", h) for h in fr]
    creating = re.search(rf'<h3 id="([^"]+)">([^<]+)</h3>', (ROOT / "sources" / "srd-v3.5" / fname).read_text(encoding="utf-8")
                         .split(f'<h2 id="{hid}">')[1])
    k = next(n for n, p in enumerate(en) if p.startswith("“"))  # first paragraph of the "Creating a ..." section
    en = en[:k] + [f"<b>{creating.group(2)}</b>"] + en[k:]

    # Hit Dice bands: English and French tables must give the same numbers.
    head_en, head_fr = en_rows[0], fr_rows[0]
    energies = [e for e in ENERGY_FR if e in head_en[1].lower()]
    assert energies and all(ENERGY_FR[e] in head_fr[1].lower() for e in energies), (head_en, head_fr)
    bands = []
    assert len(en_rows) == len(fr_rows), (en_rows, fr_rows)
    for re_, rf in zip(en_rows[1:], fr_rows[1:]):
        lo, hi = _hd_range(re_[0])
        assert (lo, hi) == _hd_range(rf[0]), (re_, rf)
        assert re_[1] == rf[1], (re_, rf)
        dr_en, dr_fr = re_[2], rf[2]
        assert dr_fr == dr_en.replace("magic", "magie"), (dr_en, dr_fr)
        res = int(re_[1])
        bands.append({"minHD": lo, "maxHD": hi, "dr": dr_en,
                      "resistances": i18n(", ".join(f"{e} {res}" for e in energies),
                                          ", ".join(f"{ENERGY_FR[e]} {res}" for e in energies))})
    assert bands[0]["minHD"] == 1 and all(a["maxHD"] + 1 == b["minHD"] for a, b in zip(bands, bands[1:])), bands

    # Spell resistance HD + 5 (max 25), darkvision 60 ft. / 18 m, smite paragraph.
    plain_en = " ".join(re.sub(r"<[^>]+>", "", p) for p in en)
    plain_fr = " ".join(p.text for p in fr_ps)
    m = re.search(r"Spell resistance equal to (?:the creature’s )?HD \+ (\d+) \(maximum (\d+)\)", plain_en)
    mf = re.search(r"Résistance à la magie égale à (\d+) \+ son nombre de DV \((\d+) maximum\)", plain_fr)
    assert m and mf and m.groups() == mf.groups() and m.group(2) == "25", (m, mf)
    assert "Darkvision out to 60 feet" in plain_en and "Vision dans le noir sur 18 mètres" in plain_fr
    smite_e = next(p for p in en if re.sub(r"<[^>]+>", "", p).startswith(smite_en))
    smite_f = next(p.text for p in fr_ps if p.text.startswith(smite_fr))
    for s in (re.sub(r"<[^>]+>", "", smite_e), smite_f):
        assert "+20" in s, s  # extra damage = HD, maximum +20

    url = srd_urls.BASE + page
    assert srd_urls.anchors(page), f"{page}: not in d20srd_anchors.json (python tools/srd_urls.py --refresh-monsters)"
    name_en = re.sub(r"<[^>]+>", "", re.search(rf'<h2 id="{hid}">([^<]+)</h2>',
                                               (ROOT / "sources" / "srd-v3.5" / fname).read_text(encoding="utf-8")).group(1))
    return {
        "id": tid, "name": i18n(name_en, fr_head),
        "text": i18n(clip_paras(en, TEXT_MAX), clip_paras(fr, TEXT_MAX)),
        "bands": bands, "srPlusHD": int(m.group(1)),
        "smite": i18n(re.sub(r"</?b>", "", smite_e).strip(), re.sub(rf"^({re.escape(smite_fr)} \(Sur\)\.)", r"<i>\1</i>", esc(smite_f))),
        "darkvision": 60,
        "source": srd_source(url, rtf_fr.file_label(FR_FILE)),
    }


def build_templates() -> list[dict]:
    out = [build_template(t) for t in TEMPLATES]
    write_json(OUT_SRD / "templates.json", out)
    NOTES.append(f"templates: the open last band ('12 or more' / '12 et plus') is stored with maxHD {OPEN_MAX_HD}; "
                 "bands[].dr is the English SRD string (types.ts has no I18n there; French prints '5/magie')")
    return out


if __name__ == "__main__":
    t = build_templates()
    print(f"{len(t)} templates: " + ", ".join(x["id"] for x in t))
    print("\n".join(NOTES))
