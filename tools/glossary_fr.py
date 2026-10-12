"""EN -> FR glossary from sources/DD-3e/fr/GlossaireDD3-DD5.pdf (D&D 3.x part only).

The PDF's text layer loses accented characters (non-embedded WinAnsi fonts without
ToUnicode), so this module decodes the page content streams itself (cp1252).
Each entry looks like:  "<english> = <french> ; <category>."  with the English term in bold.

Result: {normalised english: [(french, category), ...]}  cached in tools/.cache/glossary.json.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "sources" / "DD-3e" / "fr" / "GlossaireDD3-DD5.pdf"
CACHE = Path(__file__).resolve().parent / ".cache" / "glossary.json"
BOLD = {"/F2", "/F5"}


def _norm_en(s: str) -> str:
    s = s.lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _page_lines(reader, page):
    from pypdf.generic import ContentStream

    cs = ContentStream(page.get_contents(), reader)
    lines, cur, font = [], [], None

    def dec(x):
        return bytes(x.original_bytes if hasattr(x, "original_bytes") else x).decode("cp1252", "replace")

    for ops, op in cs.operations:
        if op == b"Tf":
            font = str(ops[0])
        elif op in (b"Td", b"TD"):
            if abs(float(ops[1])) > 0.5 and cur:
                lines.append(cur)
                cur = []
        elif op in (b"Tm", b"T*"):
            if cur:
                lines.append(cur)
                cur = []
        elif op == b"Tj":
            cur.append((font, dec(ops[0])))
        elif op == b"TJ":
            cur.append((font, "".join(dec(x) for x in ops[0] if not isinstance(x, (int, float)) and not hasattr(x, "as_numeric"))))
    if cur:
        lines.append(cur)
    return lines


def _extract() -> dict[str, list[list[str]]]:
    import pypdf

    reader = pypdf.PdfReader(str(PDF))
    entries: list[str] = []
    for i in range(2, 62):  # D&D 3.x part (the D&D 5 glossary starts at page 63)
        for ln in _page_lines(reader, reader.pages[i]):
            text = "".join(t for _, t in ln)
            if text.startswith("Glossaire D&D") or re.match(r"Page \d+ sur", text):
                continue
            first = next(((f, t) for f, t in ln if t.strip()), None)
            if first and first[0] in BOLD and " = " in text:
                entries.append(text)
            elif entries:
                entries[-1] += " " + text
    out: dict[str, list[list[str]]] = {}
    for e in entries:
        e = re.sub(r"\s+", " ", e).strip()
        m = re.match(r"(.+?) = (.+?) ; (.*)$", e)
        if not m:
            m = re.match(r"(.+?) = (.+?)\s*;?\s*$", e)
            if not m:
                continue
            en, fr, cat = m.group(1), m.group(2), ""
        else:
            en, fr, cat = m.groups()
        fr = fr.strip().rstrip(".")
        out.setdefault(_norm_en(en), []).append([fr, cat.strip().rstrip(".")])
    return out


@lru_cache(maxsize=None)
def glossary() -> dict[str, list[list[str]]]:
    if CACHE.exists() and CACHE.stat().st_mtime >= PDF.stat().st_mtime:
        return json.loads(CACHE.read_text(encoding="utf-8"))
    data = _extract()
    CACHE.parent.mkdir(exist_ok=True)
    CACHE.write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
    return data


def lookup(en: str, category_hint: str | tuple[str, ...] | None = None) -> str | None:
    """French term for an English term; prefers entries whose category contains a hint
    (e.g. 'don', 'compétence', 'équipement', 'objet merveilleux', 'sort', 'état')."""
    rows = glossary().get(_norm_en(en))
    if not rows:
        return None
    if category_hint:
        hints = (category_hint,) if isinstance(category_hint, str) else category_hint
        for fr, cat in rows:
            if any(h in cat for h in hints):
                return _clean_fr(fr)
        return None
    return _clean_fr(rows[0][0])


def _clean_fr(fr: str) -> str:
    fr = fr.split(" OU ")[0].strip()
    fr = re.sub(r"\s*\(ou [^)]*\)", "", fr)
    fr = re.sub(r"\s*\((?:f|m|f: [^)]*)\)$", "", fr)
    return fr.strip()


if __name__ == "__main__":
    import sys

    g = glossary()
    print(len(g), "entries")
    for q in sys.argv[1:] or ["weapon focus", "whirlwind attack", "greatsword", "full plate", "amulet of health", "shaken"]:
        print(q, "->", g.get(_norm_en(q)))
