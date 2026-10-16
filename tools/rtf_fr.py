"""Minimal RTF reader for the French (and English) SRD 3.5 RTF files (sources/DD-3e).

It turns an RTF file into a list of paragraphs:
    Para(style:int|None, text:str, bold_prefix:str, in_table:bool, cells:list[str]|None)

- `style` is the paragraph style number (\\sN): 1..4 are headings in the DRS files.
- `bold_prefix` is the leading bold run of the paragraph (feat/skill/item names are often bold).
- Table rows are emitted as one Para with `cells` set.

Only what the SRD RTFs use is supported (cp1252 escapes, \\uN unicode, groups, \\par, \\cell, \\row).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FR_DIR = ROOT / "sources" / "DD-3e" / "fr" / "rtf-source"
EN_DIR = ROOT / "sources" / "DD-3e" / "en" / "rtf-source"

# Destinations whose content is not document text.
_SKIP_DEST = {
    "fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "header", "footer",
    "headerl", "headerr", "footerl", "footerr", "listtable", "listoverridetable", "rsidtbl",
    "generator", "xmlnstbl", "latentstyles", "themedata", "colorschememapping", "datastore",
    "pgdsctbl", "revtbl", "fldinst", "bkmkstart", "bkmkend", "pnseclvl", "pntext", "pntxta",
    "pntxtb", "listtext", "footnote", "annotation", "atnid", "atnauthor", "xe", "tc", "field_inst",
    "mmathPr", "wgrffmtfilter", "panose", "falt", "ftnsep", "ftnsepc", "ftncn", "aftnsep",
    "aftnsepc", "aftncn", "docvar", "template", "userprops", "nonshppict", "shp", "shpinst",
    "sp", "sn", "sv", "do", "fchars", "lchars", "pgptbl", "oldcprops", "oldpprops", "oldsprops",
    "oldtprops", "protusertbl", "listpicture", "blipuid", "author", "operator", "title",
}

_SPECIAL = {
    "rquote": "\u2019", "lquote": "\u2018", "rdblquote": "\u201d", "ldblquote": "\u201c",
    "emdash": "\u2014", "endash": "\u2013", "bullet": "\u2022", "tab": "\t", "line": "\n",
    "~": "\u00a0", "_": "-", "-": "",
}

_TOKEN = re.compile(
    rb"\\([a-zA-Z]+)(-?\d+)? ?|\\'([0-9a-fA-F]{2})|\\([^a-zA-Z])|([{}])|([\r\n]+)|([^\\{}\r\n]+)"
)


@dataclass
class Para:
    style: int | None
    text: str
    bold_prefix: str = ""
    in_table: bool = False
    cells: list[str] | None = None
    bold_all: bool = False


@dataclass
class _State:
    skip: bool = False
    bold: bool = False
    uc: int = 1
    style: int | None = None


def parse_rtf(path: Path) -> list[Para]:
    data = path.read_bytes()
    # Word "SYMBOL 180" fields (Symbol font ×) carry no text in their result: replace them with a multiplication sign
    # (e.g. "(2 + modificateur d'Int) × 4", lay on hands "niveau × bonus de Charisme").
    data = re.sub(rb"\{\\field\{\\\*\\fldinst SYMBOL 180 [^}]*\}\{\\fldrslt[^}]*\}\}", rb"\\u215?", data)
    stack: list[_State] = []
    st = _State()
    paras: list[Para] = []
    runs: list[tuple[str, bool]] = []  # (text, bold)
    cells: list[str] = []
    cell_runs: list[tuple[str, bool]] = []
    in_table = False
    para_style: int | None = None
    pending_skip_uc = 0
    first_in_group = False

    def run_text(rs):
        return "".join(t for t, _ in rs)

    def emit_para():
        nonlocal runs, para_style
        text = _clean(run_text(runs))
        if text:
            bold = ""
            for t, b in runs:
                if b:
                    bold += t
                elif t.strip():
                    break
                else:
                    bold += t
            bold_all = all(b for t, b in runs if t.strip())
            paras.append(Para(para_style, text, _clean(bold), in_table, None, bold_all))
        runs = []

    def add(text: str):
        if st.skip or not text:
            return
        runs.append((text, st.bold))

    for m in _TOKEN.finditer(data):
        word, arg, hexc, sym, brace, nl, plain = m.groups()
        if brace == b"{":
            stack.append(_State(st.skip, st.bold, st.uc, st.style))
            first_in_group = True
            continue
        if brace == b"}":
            if stack:
                st = stack.pop()
            first_in_group = False
            continue
        if nl:
            continue
        if sym is not None:
            s = sym.decode("latin-1")
            if s == "*":
                st.skip = True
            elif s in "\\{}":
                if pending_skip_uc:
                    pending_skip_uc -= 1
                else:
                    add(s)
            elif s in _SPECIAL:
                add(_SPECIAL[s])
            first_in_group = False
            continue
        if hexc is not None:
            if pending_skip_uc:
                pending_skip_uc -= 1
                continue
            add(bytes([int(hexc, 16)]).decode("cp1252", errors="replace"))
            continue
        if plain is not None:
            txt = plain.decode("cp1252", errors="replace")
            if pending_skip_uc:
                k = min(pending_skip_uc, len(txt))
                txt = txt[k:]
                pending_skip_uc -= k
            add(txt)
            first_in_group = False
            continue
        # control word
        w = word.decode("ascii")
        a = int(arg) if arg is not None else None
        if first_in_group and w in _SKIP_DEST:
            st.skip = True
        first_in_group = False
        if w in _SKIP_DEST:
            st.skip = True
        elif w == "b":
            st.bold = a != 0
        elif w == "plain":
            st.bold = False
        elif w == "uc":
            st.uc = a or 0
        elif w == "u":
            code = a if a >= 0 else a + 65536
            add(chr(code))
            pending_skip_uc = st.uc
        elif w == "s":
            para_style = a
        elif w == "pard":
            para_style = None
            in_table = False
        elif w == "intbl":
            in_table = True
        elif w == "par":
            if in_table:
                runs.append(("\n", False))
            else:
                emit_para()
        elif w == "cell":
            cells.append(_clean(run_text(runs)))
            runs = []
        elif w == "row":
            if any(c for c in cells):
                paras.append(Para(para_style, " | ".join(cells), "", True, cells))
            cells = []
            runs = []
        elif w in _SPECIAL:
            add(_SPECIAL[w])
    emit_para()
    return paras


def _clean(s: str) -> str:
    s = s.replace("\u00a0", " ").replace("\t", " ")
    s = re.sub(r"[ ]{2,}", " ", s)
    s = re.sub(r"\s*\n\s*", " ", s)
    return s.strip()


@lru_cache(maxsize=None)
def load(name_prefix: str, lang: str = "fr") -> list[Para]:
    """Load a DRS file by prefix, e.g. load('DRS 05') or load('08_Feats', 'en')."""
    d = FR_DIR if lang == "fr" else EN_DIR
    for p in sorted(d.glob("*.rtf")):
        if p.name.startswith(name_prefix):
            return parse_rtf(p)
    raise FileNotFoundError(f"{name_prefix} not found in {d}")


def file_label(name_prefix: str) -> str:
    """'DRS 05' -> 'DRS 05 (dons)' (used as Source.frRef)."""
    for p in sorted(FR_DIR.glob("*.rtf")):
        if p.name.startswith(name_prefix):
            return p.stem
    return name_prefix


def sections(paras: list[Para], start: int = 0, end: int | None = None):
    """Split paragraphs into (title_para, body_paras) at each heading-styled paragraph."""
    out = []
    cur = None
    body: list[Para] = []
    for p in paras[start:end]:
        if p.style in (1, 2, 3, 4) and not p.in_table:
            if cur is not None:
                out.append((cur, body))
            cur, body = p, []
        else:
            body.append(p)
    if cur is not None:
        out.append((cur, body))
    return out


def norm(s: str) -> str:
    """Normalise a French/English label for matching (lowercase, no accents, no punctuation)."""
    import unicodedata

    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("\u2019", "'")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()


if __name__ == "__main__":  # quick dump for inspection
    import sys

    paras = load(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "fr")
    for i, p in enumerate(paras):
        flag = "T" if p.in_table else " "
        b = f" [B:{p.bold_prefix}]" if p.bold_prefix else ""
        print(f"{i:5d} s{p.style!s:4} {flag} {p.text[:160]}{b[:80]}")
