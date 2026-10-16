"""d20srd.org URL builder.

d20srd anchors are the SRD heading in "camelCase" with punctuation removed and the
first letter lower-cased, keeping the SRD title case (small words like "of", "and", "or"
stay lower case): "Amulet of Health" -> amuletofHealth, "Weapon Focus" -> weaponFocus,
"Shield, heavy wooden or steel" -> shieldHeavyWoodenorSteel.

The anchor ids really present on each page are cached in tools/d20srd_anchors.json
(run `python tools/srd_urls.py --refresh` once, needs internet). The build is offline:
`anchor_url()` only returns an anchor that exists in that cache, otherwise the fallback.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BASE = "https://www.d20srd.org/srd/"
CACHE = Path(__file__).resolve().parent / "d20srd_anchors.json"

PAGES = [
    "feats.htm",
    "equipment/weapons.htm",
    "equipment/armor.htm",
    "equipment/goodsAndServices.htm",
    "magicItems/wondrousItems.htm",
    "magicItems/rings.htm",
    "magicItems/potionsAndOils.htm",
    "magicItems/magicWeapons.htm",
    "magicItems/magicArmor.htm",
    "magicItems/creatingMagicItems.htm",
    "conditionSummary.htm",
    "carryingCapacity.htm",
    "specialMaterials.htm",
    "classes/barbarian.htm",
    "classes/bard.htm",
    "classes/cleric.htm",
    "classes/druid.htm",
    "classes/fighter.htm",
    "classes/monk.htm",
    "classes/paladin.htm",
    "classes/ranger.htm",
    "classes/rogue.htm",
    "classes/sorcererWizard.htm",
    "races.htm",
    "magicOverview/spellDescriptions.htm",
    "skills/usingSkills.htm",
    "skills/skillsSummary.htm",
]

# Monster pages used by creatures.json (build_creatures.CATALOG; checked there). Refresh only these with
# `python tools/srd_urls.py --refresh-monsters`.
MONSTER_PAGES = [f"monsters/{p}.htm" for p in (
    "ape", "arrowhawk", "badger", "bearBlack", "bearBrown", "bearPolar", "bison", "boar", "camel", "cheetah", "crocodile",
    "crocodileGiant", "dinosaur", "direApe", "direBadger", "direBat", "direBear", "direBoar", "direLion", "direRat",
    "direShark", "direTiger", "direWeasel", "direWolf", "direWolverine", "dog", "dogRiding", "eagle", "eagleGiant",
    "elemental", "elephant", "genie", "girallon", "griffon", "hawk", "hippogriff", "horse", "invisibleStalker", "leopard",
    "lion", "lizardMonitor", "monkey", "octopus", "octopusGiant", "owl", "owlGiant", "pony", "porpoise", "rhinoceros",
    "roc", "salamander", "satyr", "seaCat", "shark", "snake", "sprite", "squid", "squidGiant", "thoqqua", "tiger",
    "tojanida", "unicorn", "whale", "wolf", "wolverine", "xorn",
    # wild shape forms (animals and plants not on the druid lists)
    "assassinVine", "baboon", "bat", "cat", "donkey", "fungus", "hyena", "lizard", "mantaRay", "mule", "phantomFungus",
    "ponyWar", "rat", "raven", "shamblingMound", "swarm", "tendriculos", "toad", "treant", "weasel",
    # Summon Monster I-IX base creatures (build_creatures.SUMMON_MONSTER) and the celestial / fiendish templates
    "achaierai", "archon", "avoral", "bralani", "chaosBeast", "couatl", "demon", "devil", "giantBee",
    "giantBombardierBeetle", "giantFireBeetle", "giantPrayingMantis", "giantStagBeetle", "giantWasp", "hellHound",
    "howler", "leonal", "lillend", "mephit", "monstrousCentipede", "monstrousScorpion", "monstrousSpider", "nightHag",
    "shadowMastiff", "xill", "yethHound", "celestialCreature", "fiendishCreature")]
PAGES += MONSTER_PAGES

_SMALL = {"of", "and", "or", "the", "in", "a", "an", "to", "by", "with", "on", "for", "than", "at"}


def camel(name: str, keep_small_lower: bool = True) -> str:
    """'Shield, heavy wooden or steel' -> 'shieldHeavyWoodenorSteel'."""
    words = re.findall(r"[A-Za-z0-9]+", name.replace("'", ""))
    out = []
    for i, w in enumerate(words):
        if i == 0:
            out.append(w[0].lower() + w[1:])
        elif keep_small_lower and w.lower() in _SMALL:
            out.append(w.lower())
        else:
            out.append(w[0].upper() + w[1:])
    return "".join(out)


_anchors: dict[str, list[str]] | None = None


def anchors(page: str) -> set[str]:
    global _anchors
    if _anchors is None:
        _anchors = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    return set(_anchors.get(page, []))


def has_anchor(page: str, anchor: str) -> bool:
    return anchor in anchors(page)


def page_url(page: str) -> str:
    return BASE + page


def anchor_url(page: str, candidates: list[str] | str, fallback: str | None = None) -> str:
    """First candidate anchor that exists on the page; else fallback anchor; else the bare page."""
    if isinstance(candidates, str):
        candidates = [candidates]
    known = anchors(page)
    for c in candidates:
        if c and c in known:
            return f"{BASE}{page}#{c}"
        # case-insensitive match (d20srd capitalization is irregular)
        for k in known:
            if c and k.lower() == c.lower():
                return f"{BASE}{page}#{k}"
    if fallback:
        return f"{BASE}{page}#{fallback}"
    return BASE + page


def feat_url(name: str) -> str:
    return anchor_url("feats.htm", [camel(name), camel(name, False)])


def skill_url(name: str) -> str:
    """Skill pages: skills/<camelCase>.htm (one page per skill)."""
    base = re.sub(r"\s*\(.*\)", "", name)
    return f"{BASE}skills/{camel(base, False)}.htm"


def refresh(pages: list[str] | None = None) -> None:
    """Fetch the anchors of `pages` (default: all PAGES) and merge them into the cache."""
    import urllib.request

    data = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() and pages else {}
    for p in pages or PAGES:
        req = urllib.request.Request(BASE + p, headers={"User-Agent": "Mozilla/5.0 (dnd-playboard data build)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            html = r.read().decode("utf-8", errors="replace")
        ids = sorted(set(re.findall(r'\b(?:id|name)="([^"]+)"', html)))
        data[p] = ids
        print(p, len(ids))
    CACHE.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if "--refresh" in sys.argv:
        refresh()
    elif "--refresh-monsters" in sys.argv:
        refresh(MONSTER_PAGES)
    else:
        print(feat_url("Weapon Focus"), skill_url("Decipher Script"))
