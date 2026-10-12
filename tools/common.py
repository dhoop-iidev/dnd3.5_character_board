"""Shared helpers for the data pipeline (ids, units, prices, HTML clipping, JSON output)."""
from __future__ import annotations

import html as _html
import json
import re
import sqlite3
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "sources" / "dnd35.db"
OUT_SRD = ROOT / "src" / "data" / "srd"
OUT_CUSTOM = ROOT / "src" / "data" / "custom"

MAX_TEXT = 2000


def db() -> sqlite3.Connection:
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def kebab(name: str) -> str:
    s = name.lower().replace("'", "").replace("’", "")
    s = s.replace("+", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def i18n(en: str, fr: str) -> dict:
    return {"en": en, "fr": fr}


# ---------- numbers and units ----------

def num(x: float) -> float | int:
    """Round to 4 decimals and drop .0 so JSON shows 4 instead of 4.0."""
    x = round(float(x), 4)
    return int(x) if x == int(x) else x


def parse_lb(s: str | None) -> float | None:
    """'8 lb.', '1/2 lb.', '1-1/2 lb.', '-', None -> pounds (None if no weight given)."""
    if s is None:
        return None
    s = s.strip().lower()
    if s in ("", "-", "—", "none", "special"):
        return None
    m = re.match(r"\+?\s*(\d+)-(\d+)/(\d+)\s*lb", s)
    if m:
        return int(m.group(1)) + int(m.group(2)) / int(m.group(3))
    m = re.match(r"\+?\s*(\d+/\d+|\d+(?:\.\d+)?|[\d,]+)\s*lb", s)
    if m:
        v = m.group(1).replace(",", "")
        return float(Fraction(v)) if "/" in v else float(v)
    return None


def parse_kg_fr(s: str | None) -> float | None:
    """'1,5 kg', '500 g', '2 kg1' (footnote digit), '—' -> kilograms."""
    if not s:
        return None
    s = s.replace(" ", " ").strip()
    m = re.search(r"(\d[\d ]*(?:,\d+)?)\s*(kg|g)\b", s)
    if not m:
        m = re.search(r"(\d[\d ]*(?:,\d+)?)\s*(kg|g)\d", s)
        if not m:
            return None
    v = float(m.group(1).replace(" ", "").replace(",", "."))
    return v / 1000 if m.group(2) == "g" else v


def weight(lb: float | None, kg_fr: float | None = None, log: list | None = None, label: str = "") -> dict:
    """{lb, kg} with kg = lb / 2 everywhere (house rule #5). A differing French printed value is only logged."""
    lb = lb or 0.0
    if kg_fr is not None and log is not None and abs(kg_fr - lb / 2) > 0.01:
        log.append(f"{label}: {lb} lb -> FR book prints {kg_fr} kg, using lb/2 = {lb / 2}")
    return {"lb": num(lb), "kg": num(lb / 2)}


def ft_to_m(ft: float) -> float:
    """French book convention: 5 ft = 1,5 m (house rule #11)."""
    return num(ft * 0.3)


def distance(ft: float | None) -> dict | None:
    if ft is None:
        return None
    return {"ft": num(ft), "m": ft_to_m(ft)}


def parse_ft(s: str | None) -> float | None:
    if not s:
        return None
    m = re.match(r"\s*(\d+)\s*ft", s)
    return float(m.group(1)) if m else None


def parse_gp(s: str | None) -> float | None:
    """'1,500 gp', '5 sp', '2 cp', '+50 gp', '4,000 gp (one glove)', 'or 50,000 gp' -> gp."""
    if not s:
        return None
    m = re.search(r"([\d,]+(?:\.\d+)?)\s*(gp|sp|cp|pp)\b", s)
    if not m:
        return None
    v = float(m.group(1).replace(",", ""))
    return {"gp": 1, "sp": 0.1, "cp": 0.01, "pp": 10}[m.group(2)] * v


def parse_po(s: str | None) -> float | None:
    """French prices: '1 500 po', '5 pa', '2 pc'."""
    if not s:
        return None
    m = re.search(r"(\d[\d ]*(?:,\d+)?)\s*(po|pa|pc|pp)\b", s.replace(" ", " "))
    if not m:
        return None
    v = float(m.group(1).replace(" ", "").replace(",", "."))
    return {"po": 1, "pa": 0.1, "pc": 0.01, "pp": 10}[m.group(2)] * v


# ---------- text ----------

def strip_tags(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = _html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def html_paras(full_text: str | None) -> list[str]:
    """Paragraph HTML fragments from an Andargor full_text field (headings dropped)."""
    if not full_text:
        return []
    if "<" not in full_text:
        return [esc(x.strip()) for x in re.split(r"\n\s*\n", full_text) if x.strip()]
    t = re.sub(r"<h\d[^>]*>.*?</h\d>", "", full_text, flags=re.S)
    t = re.sub(r"</?div[^>]*>", "", t)
    t = re.sub(r"<table.*?</table>", "", t, flags=re.S)
    paras = re.findall(r"<p[^>]*>(.*?)</p>", t, flags=re.S)
    out = []
    for p in paras:
        p = re.sub(r"\s+", " ", p).strip()
        if strip_tags(p):
            out.append(p)
    return out


def clip_paras(paras: list[str], limit: int = MAX_TEXT) -> str:
    """Join paragraphs as <p>…</p>, whole paragraphs only, stopping before `limit` chars."""
    out, n = [], 0
    for p in paras:
        frag = f"<p>{p}</p>"
        if out and n + len(frag) > limit:
            break
        if not out and len(frag) > limit:
            cut = p[: limit - 10]
            cut = cut[: cut.rfind(" ")] + " …"
            frag = f"<p>{cut}</p>"
        out.append(frag)
        n += len(frag)
    return "".join(out)


def esc(s: str) -> str:
    return _html.escape(s, quote=False)


def first_sentence(text: str, min_len: int = 70) -> str:
    """Headline sentence: skips leading 'Choose …' sentences, adds the next one if very short."""
    text = strip_tags(text)
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-ÝÉ«“(])", text) if p.strip()]
    while len(parts) > 1 and re.match(r"^(Choose|Each time you take this feat, choose|Le personnage choisit (une|un type))", parts[0]):
        parts.pop(0)
    if not parts:
        return text
    s = parts[0]
    if len(s) < min_len and len(parts) > 1:
        s += " " + parts[1]
    return s


# ---------- output ----------

def write_json(path: Path, data) -> None:
    if isinstance(data, list) and data and isinstance(data[0], dict) and "id" in data[0]:
        data = sorted(data, key=lambda d: d["id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def srd_source(url: str, fr_ref: str | None = None) -> dict:
    s = {"srdUrl": url}
    if fr_ref:
        s["frRef"] = fr_ref
    return s
