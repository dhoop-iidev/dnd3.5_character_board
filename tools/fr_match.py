"""French name registry + tools/fr_overrides.csv.

Every generated entry asks `FrNames.resolve(id, en, auto, guess)`:
- a row in fr_overrides.csv with status 'ok' (hand-checked) always wins;
- otherwise the automatic match (`auto`, found in the French SRD and/or glossary) is used;
- otherwise the `guess` is used and the entry is written to the CSV with status 'todo'.

The CSV is rewritten at each run: 'ok' rows are kept as they are, 'todo' rows are regenerated,
so hand corrections survive (change status to 'ok' after correcting fr_guess).
"""
from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent / "fr_overrides.csv"
FIELDS = ["id", "en", "fr_guess", "status"]


class FrNames:
    def __init__(self) -> None:
        self.manual: dict[str, dict] = {}
        if CSV_PATH.exists():
            with CSV_PATH.open(encoding="utf-8", newline="") as f:
                for row in csv.DictReader(f):
                    if row.get("status", "").strip().lower() == "ok" and row.get("fr_guess", "").strip():
                        self.manual[row["id"]] = row
        self.todo: list[dict] = []
        self.stats: Counter = Counter()
        self.methods: dict[str, str] = {}

    def resolve(self, id_: str, en: str, auto: str | None, guess: str | None = None, method: str = "auto") -> str:
        if id_ in self.manual:
            self.stats["override(ok)"] += 1
            self.methods[id_] = "override"
            return self.manual[id_]["fr_guess"].strip()
        if auto:
            self.stats[f"auto:{method}"] += 1
            self.methods[id_] = method
            return auto
        fr = guess or en
        self.todo.append({"id": id_, "en": en, "fr_guess": fr, "status": "todo"})
        self.stats["todo(guess)"] += 1
        self.methods[id_] = "guess"
        return fr

    def write(self) -> None:
        rows = list(self.manual.values()) + self.todo
        rows.sort(key=lambda r: (r["status"] != "todo", r["id"]))
        with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
            w.writeheader()
            for r in rows:
                w.writerow(r)

    def summary(self) -> str:
        auto = sum(v for k, v in self.stats.items() if k.startswith("auto"))
        parts = ", ".join(f"{k}={v}" for k, v in sorted(self.stats.items()))
        return f"French names: {auto} automatic, {self.stats['override(ok)']} hand overrides, {self.stats['todo(guess)']} guesses left in fr_overrides.csv ({parts})"
