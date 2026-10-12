"""Shared state for the build: French-name registry, logs, and RTF paragraph helpers."""
from __future__ import annotations

import re

import rtf_fr
from common import esc
from fr_match import FrNames

FR = FrNames()
WEIGHT_LOG: list[str] = []
NOTES: list[str] = []
norm = rtf_fr.norm


def fr_paras_html(paras: list[rtf_fr.Para]) -> list[str]:
    out = []
    for p in paras:
        if p.in_table:
            continue
        t = esc(p.text)
        b = esc(p.bold_prefix) if p.bold_prefix else ""
        if b and t.startswith(b) and b != t:
            t = f"<b>{b}</b>{t[len(b):]}"
        out.append(t)
    return out


def fr_entries(paras: list[rtf_fr.Para], start_re: str | None = None):
    """Group paragraphs into entries that start with a fully bold paragraph.
    Returns list of (title_text, [body paras])."""
    out = []
    cur = None
    for p in paras:
        if p.bold_all and not p.in_table and (start_re is None or re.match(start_re, p.text)):
            cur = (p.text, [])
            out.append(cur)
        elif cur is not None:
            cur[1].append(p)
    return out


