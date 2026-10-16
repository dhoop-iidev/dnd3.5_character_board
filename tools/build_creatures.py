"""Creatures (src/data/srd/creatures.json), animal companions (companions.json) and Summon Nature's Ally lists
(summon-lists.json).

Scope: every creature on the SRD druid animal companion lists (base list + alternative lists of 4th, 7th, 10th, 13th,
16th level, https://www.d20srd.org/srd/classes/druid.htm#animalCompanion) and on the Summon Nature's Ally I-IX table
(https://www.d20srd.org/srd/spells/summonNaturesAllyI.htm), plus every other SRD animal and plant (druid wild shape forms,
https://www.d20srd.org/srd/classes/druid.htm#wildShape; WILD_SHAPE below).

English: Andargor SRD SQLite (`monster` stat block columns, `full_text` for the description; `class` Druid full_text and
`spell` Summon Nature's Ally IX full_text for the lists, which are parsed and must give exactly the hand catalog below).
French: official French SRD, DRS 33 (animaux) and DRS 35-40 (monstres) stat blocks, paragraph form or multi-column
tables; a French block is matched to the English creature by its numbers (Hit Dice line + ability scores), never by
name. DRS 03a (druid: companion table and lists) and DRS 22a (Summon Nature's Ally table) are cross-checked.

Ids: kebab-case English in "family first" order, as the SRD lists name them ("Shark, Large" -> shark-large,
"Bear, black" -> bear-black, "Dire wolf" -> dire-wolf, "Arrowhawk, juvenile" -> arrowhawk-juvenile); the four
elementals of a list size take the element last: elemental-small-air ... elemental-elder-water.
"""
from __future__ import annotations

import html as _html
import re
from fractions import Fraction

import rtf_fr
import srd_urls
from common import OUT_SRD, clip_paras, db, esc, html_paras, i18n, kebab, srd_source, strip_tags, write_json
from ctx import NOTES, fr_paras_html, norm

MONSTER_BASE = "https://www.d20srd.org/srd/monsters/"

# ---------------------------------------------------------------------------------------------
# Catalog: id -> (dnd35.db monster name, d20srd page, anchor or None)
# Pages and anchors are taken from the d20srd monster index (https://www.d20srd.org/indexes/monsters.htm) and
# checked against tools/d20srd_anchors.json (srd_urls.MONSTER_PAGES, refreshed online).
# ---------------------------------------------------------------------------------------------
ELEMENT_SIZES = {"small": "Small", "medium": "Medium", "large": "Large", "huge": "Huge", "greater": "Greater", "elder": "Elder"}
ELEMENTS = ["air", "earth", "fire", "water"]

CATALOG: dict[str, tuple[str, str, str | None]] = {
    "ape": ("Ape", "ape.htm", None),
    "arrowhawk-juvenile": ("Juvenile Arrowhawk", "arrowhawk.htm", None),
    "arrowhawk-adult": ("Adult Arrowhawk", "arrowhawk.htm", None),
    "arrowhawk-elder": ("Elder Arrowhawk", "arrowhawk.htm", None),
    "badger": ("Badger", "badger.htm", None),
    "bear-black": ("Bear, Black", "bearBlack.htm", None),
    "bear-brown": ("Bear, Brown", "bearBrown.htm", None),
    "bear-polar": ("Bear, Polar", "bearPolar.htm", None),
    "bison": ("Bison", "bison.htm", None),
    "boar": ("Boar", "boar.htm", None),
    "camel": ("Camel", "camel.htm", None),
    "cheetah": ("Cheetah", "cheetah.htm", None),
    "crocodile": ("Crocodile", "crocodile.htm", None),
    "crocodile-giant": ("Crocodile, Giant", "crocodileGiant.htm", None),
    "deinonychus": ("Deinonychus", "dinosaur.htm", "deinonychus"),
    "dire-ape": ("Dire Ape", "direApe.htm", None),
    "dire-badger": ("Dire Badger", "direBadger.htm", None),
    "dire-bat": ("Dire Bat", "direBat.htm", None),
    "dire-bear": ("Dire Bear", "direBear.htm", None),
    "dire-boar": ("Dire Boar", "direBoar.htm", None),
    "dire-lion": ("Dire Lion", "direLion.htm", None),
    "dire-rat": ("Dire Rat", "direRat.htm", None),
    "dire-shark": ("Dire Shark", "direShark.htm", None),
    "dire-tiger": ("Dire Tiger", "direTiger.htm", None),
    "dire-weasel": ("Dire Weasel", "direWeasel.htm", None),
    "dire-wolf": ("Dire Wolf", "direWolf.htm", None),
    "dire-wolverine": ("Dire Wolverine", "direWolverine.htm", None),
    "djinni": ("Djinni", "genie.htm", "djinni"),
    "dog": ("Dog", "dog.htm", None),
    "dog-riding": ("Dog, Riding", "dogRiding.htm", None),
    "eagle": ("Eagle", "eagle.htm", None),
    "eagle-giant": ("Eagle, Giant", "eagleGiant.htm", None),
    "elasmosaurus": ("Elasmosaurus", "dinosaur.htm", "elasmosaurus"),
    "elephant": ("Elephant", "elephant.htm", None),
    "girallon": ("Girallon", "girallon.htm", None),
    "griffon": ("Griffon", "griffon.htm", None),
    "grig": ("Grig", "sprite.htm", "grig"),
    "hawk": ("Hawk", "hawk.htm", None),
    "hippogriff": ("Hippogriff", "hippogriff.htm", None),
    "horse-heavy": ("Horse, Heavy", "horse.htm", "horseHeavy"),
    "horse-light": ("Horse, Light", "horse.htm", "horseLight"),
    "invisible-stalker": ("Invisible Stalker", "invisibleStalker.htm", None),
    "janni": ("Janni", "genie.htm", "janni"),
    "leopard": ("Leopard", "leopard.htm", None),
    "lion": ("Lion", "lion.htm", None),
    "lizard-monitor": ("Lizard, Monitor", "lizardMonitor.htm", None),
    "megaraptor": ("Megaraptor", "dinosaur.htm", "megaraptor"),
    "monkey": ("Monkey", "monkey.htm", None),
    "nixie": ("Nixie", "sprite.htm", "nixie"),
    "octopus": ("Octopus", "octopus.htm", None),
    "octopus-giant": ("Octopus, Giant", "octopusGiant.htm", None),
    "owl": ("Owl", "owl.htm", None),
    "owl-giant": ("Owl, Giant", "owlGiant.htm", None),
    "pixie": ("Pixie", "sprite.htm", "pixie"),
    "pony": ("Pony", "pony.htm", None),
    "porpoise": ("Porpoise", "porpoise.htm", None),
    "rhinoceros": ("Rhinoceros", "rhinoceros.htm", None),
    "roc": ("Roc", "roc.htm", None),
    "salamander-flamebrother": ("Flamebrother Salamander", "salamander.htm", None),
    "salamander-average": ("Average Salamander", "salamander.htm", None),
    "salamander-noble": ("Noble Salamander", "salamander.htm", None),
    "satyr": ("Satyr", "satyr.htm", None),
    "sea-cat": ("Sea Cat", "seaCat.htm", None),
    "shark-medium": ("Shark, Medium", "shark.htm", None),
    "shark-large": ("Shark, Large", "shark.htm", None),
    "shark-huge": ("Shark, Huge", "shark.htm", None),
    "snake-constrictor": ("Constrictor Snake", "snake.htm", "constrictorSnake"),
    "snake-constrictor-giant": ("Constrictor Snake, Giant", "snake.htm", "constrictorSnakeGiant"),
    "snake-small-viper": ("Snake, Small Viper", "snake.htm", "viperSnake"),
    "snake-medium-viper": ("Snake, Medium Viper", "snake.htm", "viperSnake"),
    "snake-large-viper": ("Snake, Large Viper", "snake.htm", "viperSnake"),
    "snake-huge-viper": ("Snake, Huge Viper", "snake.htm", "viperSnake"),
    "squid": ("Squid", "squid.htm", None),
    "squid-giant": ("Squid, Giant", "squidGiant.htm", None),
    "thoqqua": ("Thoqqua", "thoqqua.htm", None),
    "tiger": ("Tiger", "tiger.htm", None),
    "tojanida-juvenile": ("Juvenile Tojanida", "tojanida.htm", None),
    "tojanida-adult": ("Adult Tojanida", "tojanida.htm", None),
    "tojanida-elder": ("Elder Tojanida", "tojanida.htm", None),
    "triceratops": ("Triceratops", "dinosaur.htm", "triceratops"),
    "tyrannosaurus": ("Tyrannosaurus", "dinosaur.htm", "tyrannosaurus"),
    "unicorn": ("Unicorn", "unicorn.htm", None),
    "unicorn-celestial-charger": ("Celestial Charger, 7th-Level Cleric", "unicorn.htm", "celestialCharger"),
    "whale-baleen": ("Baleen Whale", "whale.htm", "baleenWhale"),
    "whale-cachalot": ("Cachalot Whale", "whale.htm", "cachalotWhale"),
    "whale-orca": ("Orca", "whale.htm", "orca"),
    "wolf": ("Wolf", "wolf.htm", None),
    "wolverine": ("Wolverine", "wolverine.htm", None),
    "xorn-minor": ("Minor Xorn", "xorn.htm", None),
    "xorn-average": ("Average Xorn", "xorn.htm", None),
    "xorn-elder": ("Elder Xorn", "xorn.htm", None),
}
# Every other SRD creature of type animal or plant (druid wild shape forms, https://www.d20srd.org/srd/classes/druid.htm#wildShape),
# not on a companion or summon list. The epic SRD (legendary animals, mu spore, elder treant) and the psionic SRD (udoroot)
# are left out: they have no French SRD entry (WILD_SHAPE_EXCLUDED).
WILD_SHAPE: dict[str, tuple[str, str, str | None]] = {
    "baboon": ("Baboon", "baboon.htm", None),
    "bat": ("Bat", "bat.htm", None),
    "cat": ("Cat", "cat.htm", None),
    "donkey": ("Donkey", "donkey.htm", None),
    "hyena": ("Hyena", "hyena.htm", None),
    "lizard": ("Lizard", "lizard.htm", None),
    "manta-ray": ("Manta Ray", "mantaRay.htm", None),
    "mule": ("Mule", "mule.htm", None),
    "pony-war": ("Pony, War", "ponyWar.htm", None),
    "rat": ("Rat", "rat.htm", None),
    "raven": ("Raven", "raven.htm", None),
    "snake-tiny-viper": ("Snake, Tiny Viper", "snake.htm", "viperSnake"),
    "toad": ("Toad", "toad.htm", None),
    "warhorse-heavy": ("Warhorse, Heavy", "horse.htm", "warhorseHeavy"),
    "warhorse-light": ("Warhorse, Light", "horse.htm", "warhorseLight"),
    "weasel": ("Weasel", "weasel.htm", None),
    # plants
    "assassin-vine": ("Assassin Vine", "assassinVine.htm", None),
    "fungus-violet": ("Violet Fungus", "fungus.htm", "violetFungus"),
    "phantom-fungus": ("Phantom Fungus", "phantomFungus.htm", None),
    "shambling-mound": ("Shambling Mound", "shamblingMound.htm", None),
    "tendriculos": ("Tendriculos", "tendriculos.htm", None),
    "treant": ("Treant", "treant.htm", None),
}
# dnd35.db `reference` of the SRD parts without a French SRD counterpart (epic and psionic monsters).
WILD_SHAPE_EXCLUDED_REFS = ("SRD 3.5 EpicMonsters", "SRD 3.5 PsionicMonsters")
WILD_SHAPE_TYPES = ("Animal", "Plant")
# In scope but not built: their stat blocks print "—" where CreatureDef (src/data/types.ts) needs a number. Swarms have no
# grapple (https://www.d20srd.org/srd/typesSubtypes.htm#swarmSubtype: "cannot grapple") and a swarm attack with no
# attack roll; the shrieker has no Reflex save (no Dex). They wait for a types.ts change (grapple / saves nullable,
# a swarm attack kind).
WILD_SHAPE_BLOCKED: dict[str, str] = {
    "Bat Swarm": "grapple — and swarm attack without an attack bonus",
    "Rat Swarm": "grapple — and swarm attack without an attack bonus",
    "Shrieker": "Reflex save — (no Dex score)",
}
CATALOG.update(WILD_SHAPE)
for _el in ELEMENTS:
    for _k, _v in ELEMENT_SIZES.items():
        CATALOG[f"elemental-{_k}-{_el}"] = (f"{_el.capitalize()} Elemental, {_v}", "elemental.htm", f"{_el}Elemental")

# SRD list labels (druid companion lists, Summon Nature's Ally table) -> creature ids. Labels are compared after
# dropping "(animal)"-style group tags, footnote marks and the [alignment; variant] notes.
LABELS: dict[str, list[str]] = {
    "badger": ["badger"], "camel": ["camel"], "dire rat": ["dire-rat"], "dog": ["dog"], "riding dog": ["dog-riding"],
    "eagle": ["eagle"], "hawk": ["hawk"], "horse (light or heavy)": ["horse-light", "horse-heavy"], "owl": ["owl"],
    "pony": ["pony"], "snake (small or medium viper)": ["snake-small-viper", "snake-medium-viper"], "wolf": ["wolf"],
    "crocodile": ["crocodile"], "porpoise": ["porpoise"], "medium shark": ["shark-medium"], "squid": ["squid"],
    "ape": ["ape"], "bear, black": ["bear-black"], "bison": ["bison"], "boar": ["boar"], "cheetah": ["cheetah"],
    "dire badger": ["dire-badger"], "dire bat": ["dire-bat"], "dire weasel": ["dire-weasel"], "leopard": ["leopard"],
    "lizard, monitor": ["lizard-monitor"], "shark, large": ["shark-large"], "snake, constrictor": ["snake-constrictor"],
    "snake, large viper": ["snake-large-viper"], "wolverine": ["wolverine"], "bear, brown": ["bear-brown"],
    "dire wolverine": ["dire-wolverine"], "crocodile, giant": ["crocodile-giant"], "deinonychus": ["deinonychus"],
    "dire ape": ["dire-ape"], "dire boar": ["dire-boar"], "dire wolf": ["dire-wolf"], "elasmosaurus": ["elasmosaurus"],
    "lion": ["lion"], "rhinoceros": ["rhinoceros"], "snake, huge viper": ["snake-huge-viper"], "tiger": ["tiger"],
    "bear, polar": ["bear-polar"], "dire lion": ["dire-lion"], "megaraptor": ["megaraptor"], "shark, huge": ["shark-huge"],
    "snake, giant constrictor": ["snake-constrictor-giant"], "whale, orca": ["whale-orca"], "dire bear": ["dire-bear"],
    "elephant": ["elephant"], "octopus, giant": ["octopus-giant"], "dire shark": ["dire-shark"], "dire tiger": ["dire-tiger"],
    "squid, giant": ["squid-giant"], "triceratops": ["triceratops"], "tyrannosaurus": ["tyrannosaurus"],
    # Summon Nature's Ally only
    "monkey": ["monkey"], "octopus": ["octopus"], "snake, small viper": ["snake-small-viper"],
    "dire rat": ["dire-rat"], "hippogriff": ["hippogriff"], "shark, medium": ["shark-medium"],
    "snake, medium viper": ["snake-medium-viper"], "eagle, giant": ["eagle-giant"], "owl, giant": ["owl-giant"],
    "satyr": ["satyr"], "thoqqua": ["thoqqua"], "arrowhawk, juvenile": ["arrowhawk-juvenile"],
    "salamander, flamebrother": ["salamander-flamebrother"], "sea cat": ["sea-cat"], "tojanida, juvenile": ["tojanida-juvenile"],
    "unicorn": ["unicorn"], "xorn, minor": ["xorn-minor"], "arrowhawk, adult": ["arrowhawk-adult"], "griffon": ["griffon"],
    "janni": ["janni"], "nixie": ["nixie"], "tojanida, adult": ["tojanida-adult"], "girallon": ["girallon"],
    "pixie": ["pixie"], "salamander, average": ["salamander-average"], "whale, baleen": ["whale-baleen"],
    "xorn, average": ["xorn-average"], "arrowhawk, elder": ["arrowhawk-elder"], "djinni": ["djinni"],
    "invisible stalker": ["invisible-stalker"], "whale, cachalot": ["whale-cachalot"], "xorn, elder": ["xorn-elder"],
    "roc": ["roc"], "salamander, noble": ["salamander-noble"], "tojanida, elder": ["tojanida-elder"], "grig": ["grig"],
    "unicorn, celestial charger": ["unicorn-celestial-charger"],
}
for _k in ELEMENT_SIZES:
    LABELS[f"elemental, {_k}"] = [f"elemental-{_k}-{el}" for el in ELEMENTS]
LABELS["elemental, small (any)"] = LABELS.pop("elemental, small")
for _k in ("medium", "large", "huge", "greater"):
    LABELS[f"elemental, {_k} (any)"] = LABELS.pop(f"elemental, {_k}")

DRUID_URL_PAGE, DRUID_ANCHOR = "classes/druid.htm", "animalCompanion"


def label_key(s: str) -> str:
    s = _html.unescape(s).replace("*", "")
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = re.sub(r"\((animal|dinosaur|sprite|genie)\)", "", s)
    s = re.sub(r"\s+", " ", s).strip().rstrip("1").strip().lower()
    return s


def tokens(html_text: str) -> list[str]:
    return [t.strip() for t in re.split(r"<[^>]+>", html_text) if t.strip()]


def companion_lists() -> list[tuple[int, int, list[str]]]:
    """(minimum druid level, level adjustment, creature ids) from the SRD druid text; checked against LABELS."""
    t = db().execute("select full_text from class where name='Druid'").fetchone()[0]
    i = t.find("Animal Companion (Ex):")
    para = strip_tags(t[i:t.find("</p>", i)])
    m = re.search(r"following list: (.+?)\. If the campaign.+?also available: (.+?)\. This animal", para)
    base_labels = re.split(r",\s*(?:or\s+|and\s+)?", m.group(1) + ", " + m.group(2))
    out = [(1, 0, [x for lab in base_labels for x in LABELS[label_key(lab)]])]
    j = t.find("Alternative Animal Companions")
    cur = None
    for tok in tokens(t[j:]):
        h = re.match(r"(\d+)\w\w Level or Higher \(Level -(\d+)\)", tok)
        if h:
            cur = (int(h.group(1)), -int(h.group(2)), [])
            out.append(cur)
        elif tok.startswith("1 Available"):
            break
        elif cur and tok != "1" and not tok.startswith("("):
            assert label_key(tok) in LABELS, f"companion list label {tok!r} not in LABELS"
            cur[2].extend(LABELS[label_key(tok)])
    assert [(a, b) for a, b, _ in out] == [(1, 0), (4, -3), (7, -6), (10, -9), (13, -12), (16, -15)], out
    return out


def summon_lists() -> dict[int, list[str]]:
    """Spell level -> creature ids, from the Summon Nature's Ally table (SRD, printed with the IX spell)."""
    t = db().execute("select full_text from spell where name=\"Summon Nature's Ally IX\"").fetchone()[0]
    j = t.find("Summon Nature's Ally</")
    if j < 0:
        j = t.find("1st Level")
    out: dict[int, list[str]] = {}
    lvl, skip = None, False
    counts: dict[int, int] = {}
    for tok in tokens(t[j:]):
        h = re.match(r"^(\d)\w\w Level$", tok)
        if h:
            lvl = int(h.group(1))
            out[lvl] = []
            continue
        if skip:
            skip = False
            continue
        if tok.startswith("*Can"):
            skip = True  # "*Can't cast | irresistible dance |"
            continue
        if lvl is None or tok in ("1", "Summon Nature's Ally") or tok.startswith("(") or tok.startswith("1 May"):
            continue
        k = label_key(tok)
        assert k in LABELS, f"Summon Nature's Ally label {tok!r} not in LABELS"
        out[lvl].extend(x for x in LABELS[k] if x not in out[lvl])
        counts[lvl] = counts.get(lvl, 0) + 1
    assert sorted(out) == list(range(1, 10)), out.keys()
    # Cross-check: the French table (DRS 22a, after the IX spell) has as many entries per level, except FR_SNA_SLIPS.
    ps = rtf_fr.load("DRS 22a")
    i = next(n for n, p in enumerate(ps) if p.text == "Convocation d’alliés naturels" and ps[n + 1].text == "Niveau 1")
    fr_counts: dict[int, int] = {}
    lvl = None
    for p in ps[i + 1:]:
        h = re.match(r"^Niveau (\d)$", p.text)
        if h:
            lvl = int(h.group(1))
        elif p.text.startswith("*"):
            break
        else:
            fr_counts[lvl] = fr_counts.get(lvl, 0) + 1
    for lv in range(1, 10):
        if fr_counts.get(lv) != counts[lv]:
            assert lv in FR_SNA_SLIPS and fr_counts.get(lv) == counts[lv] + FR_SNA_SLIPS[lv][0], (lv, fr_counts.get(lv), counts[lv])
            NOTES.append(f"summon-lists: DRS 22a level {lv} list: {FR_SNA_SLIPS[lv][1]} (the English SRD list is used)")
    return out


# Known slips of the French Summon Nature's Ally table (entries difference, explanation).
FR_SNA_SLIPS = {1: (-1, "the wolf (Loup) is missing"), 4: (-1, "the brown bear (Ours brun) is missing")}
# Also checked by hand: DRS 22a level 2 prints "Serpent venimeux, taille P" where the SRD has the Medium viper.


# ---------------------------------------------------------------------------------------------
# French stat blocks (DRS 33, 35-40)
# ---------------------------------------------------------------------------------------------
FR_FILES = ["DRS 33", "DRS 35", "DRS 36", "DRS 37", "DRS 38", "DRS 39", "DRS 40"]
FR_END_LABEL = "Ajustement de niveau"


# Misspelt labels in the French stat blocks.
FR_LABEL_FIX = {"Atatque à outrance": "Attaque à outrance", "Espace occupé /allonge": "Espace occupé/allonge",
                "Attaque de base": "Attaque de base/lutte"}


def _field(text: str) -> tuple[str, str] | None:
    m = re.match(r"^([^:]{3,40}?) ?: ?(.*)$", text)
    return (FR_LABEL_FIX.get(m.group(1).strip(), m.group(1).strip()), m.group(2).strip()) if m else None


def _is_table_head(ps, i: int) -> bool:
    """A table stat block starts with a row (empty first cell) of names, a row of types, then "Dés de vie"."""
    return (i + 2 < len(ps) and ps[i].in_table and bool(ps[i].cells) and not ps[i].cells[0].strip()
            and ps[i + 2].in_table and (ps[i + 2].cells or [""])[0].startswith("Dés de vie"))


def fr_blocks() -> list[dict]:
    """Every French stat block: {name, typeText, fields{label: value}, file, body[Para]}. The columns of a table share
    one body: the family text printed before the table (DRS 33) and the text after it (DRS 35-40)."""
    out: list[dict] = []
    for f in FR_FILES:
        ps = rtf_fr.load(f)
        i, n = 0, len(ps)
        pre: list = []  # text of the last family heading (e.g. "Cétacé", "Serpent"), shared by its blocks
        family = ""
        while i < n:
            p = ps[i]
            group: list[dict] = []
            if (not p.in_table and p.bold_all and i + 2 < n and not ps[i + 1].in_table
                    and ps[i + 2].text.startswith("Dés de vie")):
                b = {"name": p.text, "typeText": ps[i + 1].text, "fields": {}, "file": f}
                j = i + 2
                while j < n and not ps[j].in_table:
                    kv = _field(ps[j].text)
                    if not kv:
                        break
                    if kv[0] == "Attaque" and "Attaque" in b["fields"]:  # DRS 33 elephant: 2nd "Attaque" = full attack
                        kv = ("Attaque à outrance", kv[1])
                    b["fields"][kv[0]] = kv[1]
                    j += 1
                    if kv[0] == FR_END_LABEL:
                        break
                group, i = [b], j
            elif _is_table_head(ps, i):
                j = i
                while _is_table_head(ps, j):
                    names, types = ps[j].cells[1:], ps[j + 1].cells[1:]
                    cols = [{"name": nm.strip(), "typeText": tt.strip(), "fields": {}, "file": f}
                            for nm, tt in zip(names, types) if nm.strip()]
                    j += 2
                    last = None
                    while j < n and ps[j].in_table and ps[j].cells and not _is_table_head(ps, j):
                        lab = ps[j].cells[0].strip().rstrip(" :").strip()
                        lab = FR_LABEL_FIX.get(lab, lab)
                        if not lab and not last:
                            break
                        for c, v in zip(cols, ps[j].cells[1:]):
                            if lab:
                                c["fields"][lab] = v.strip()
                            elif v.strip():  # continuation row of the field above
                                c["fields"][last] = (c["fields"][last] + " " + v.strip()).strip()
                        last = lab or last
                        j += 1
                    group += cols
                i = j
            else:
                if not p.in_table and p.bold_all and p.text not in FR_BODY_HEADINGS:
                    pre, family = [], p.text
                else:
                    pre.append(p)
                i += 1
                continue
            # Body: following paragraphs up to the next block or the next heading that is not part of the entry.
            fam = norm(family).split()[0] if family else "-"
            shared = ps[i - 1].in_table or any(fam in norm(b["name"]).split() or b["name"] in FR_FAMILY.get(family, ())
                                               for b in group)
            body = list(pre) if shared else []
            while i < n:
                q = ps[i]
                if (not q.in_table and q.bold_all and q.text not in FR_BODY_HEADINGS) or _is_table_head(ps, i):
                    break
                body.append(q)
                i += 1
            for b in group:
                b["body"] = body
            out += group
    return out


FR_BODY_HEADINGS = {"Combat"}
# Family headings whose text applies to blocks that do not repeat the family name.
FR_FAMILY = {"Cétacé": ("Baleine", "Cachalot", "Orque épaulard")}


# ---------------------------------------------------------------------------------------------
# Stat block parsing
# ---------------------------------------------------------------------------------------------
SIZES = ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]
SIZE_AC = dict(zip(SIZES, [8, 4, 2, 1, 0, -1, -2, -4, -8]))  # https://www.d20srd.org/srd/combat/combatStatistics.htm
SIZE_GRAPPLE = dict(zip(SIZES, [-16, -12, -8, -4, 0, 4, 8, 12, 16]))  # https://www.d20srd.org/srd/combat/specialAttacks.htm#grapple
ABIL_EN = {"Str": "str", "Dex": "dex", "Con": "con", "Int": "int", "Wis": "wis", "Cha": "cha"}
ABIL_FR = {"For": "str", "Dex": "dex", "Con": "con", "Int": "int", "Sag": "wis", "Cha": "cha"}
# Monster feats (https://www.d20srd.org/srd/monsterFeats.htm) are not in feats.json (core feats only); their ids are
# still listed in featIds because the engine needs Multiattack (secondary attacks at -2 instead of -5).
MONSTER_FEATS = {"multiattack", "flyby-attack", "improved-natural-attack", "awesome-blow", "hover", "wingover",
                 "ability-focus", "multiweapon-fighting", "snatch"}
# Good saves by creature type (https://www.d20srd.org/srd/typesSubtypes.htm); elementals by subtype.
GOOD_SAVES = {"animal": {"fort", "ref"}, "magical-beast": {"fort", "ref"}, "fey": {"ref", "will"},
              "outsider": {"fort", "ref", "will"}, "elemental:air": {"ref"}, "elemental:fire": {"ref"},
              "elemental:earth": {"fort"}, "elemental:water": {"fort"}}
# Dire animals have three good saves (https://www.d20srd.org/srd/monsters/direAnimal.htm: "good Fortitude, Reflex,
# and Will saves" in the animal type advancement); checked like the other types.
GOOD_SAVES_DIRE = {"fort", "ref", "will"}
# Natural weapons with an enhancement bonus stated in the creature text: unicorn horn "+3 magic weapon"
# (https://www.d20srd.org/srd/monsters/unicorn.htm).
NATURAL_ENH = {("unicorn", "horn"): 3, ("unicorn-celestial-charger", "horn"): 3}
SAVE_FEATS = {"great-fortitude": "fort", "lightning-reflexes": "ref", "iron-will": "will"}

# dnd35.db typos fixed against the SRD (d20srd page, checked online): id -> {column: (wrong, right)}.
DB_FIX = {
    # https://www.d20srd.org/srd/monsters/elemental.htm#earthElemental (Elder): "2 slams +27 melee (2d10+11/19-20)"
    "elemental-elder-earth": {"full_attack": ("slams +27", "2 slams +27")},
    # stray footnote digit after the damage in the database field
    "elemental-greater-earth": {"full_attack": ("(2d10+10) 2", "(2d10+10)")},
    # Base Attack/Grapple missing in the database; https://www.d20srd.org/srd/monsters/xorn.htm: +3/+1, +7/+10, +15/+26
    # https://www.d20srd.org/srd/monsters/tiger.htm: "Alertness, Improved Natural Attack (bite), and ... (claw)."
    "tiger": {"feats": ("Improved Natural Weapon (bite), and Improved Natural Weapon (claw).",
                        "Improved Natural Attack (bite), Improved Natural Attack (claw)")},
    "xorn-minor": {"base_attack": ("None", "+3"), "grapple": ("None", "+1")},
    "xorn-average": {"base_attack": ("None", "+7"), "grapple": ("None", "+10")},
    "xorn-elder": {"base_attack": ("None", "+15"), "grapple": ("None", "+26")},
}
# French block names: the table columns of a few families only print the variant ("Jeune", "Flamion"); the list
# label of DRS 22a is used instead. One misprint ("très grand taille").
FR_NAME = {
    "tojanida-juvenile": ("Jeune", "Tojanida, jeune"), "tojanida-adult": ("Adulte", "Tojanida, adulte"),
    "tojanida-elder": ("Ancien", "Tojanida, ancien"), "salamander-flamebrother": ("Flamion", "Salamandre, flamion"),
    "shark-huge": ("Requin, très grand taille", "Requin, très grande taille"),
}


# English creature -> French block name, where the French block has a number that differs from the SRD.
FR_MATCH = {
    # https://www.d20srd.org/srd/monsters/elemental.htm#fireElemental: elder Int 6 (DRS 37: Int 10)
    "elemental-elder-fire": ("Élémentaire du Feu, seigneur", "French SRD (DRS 37) prints Int 10, English SRD Int 6 (kept; "
                             "the other elder elementals have Int 10, so the English SRD is probably wrong)"),
    "elemental-greater-fire": ("Élémentaire du Feu, noble", "French SRD (DRS 37) prints Int 8, English SRD Int 6 (kept; "
                               "the other greater elementals have Int 8, so the English SRD is probably wrong)"),
}
# Extra damage text the French full attack line leaves out (official term of the special attack in the same block).
EXTRA_FR = {"plus disease": "plus maladie"}
# French stat block lines that contradict the English SRD (or misprints): id -> [(field, French as printed, fixed)].
FR_FIELD_ERRATA = {
    # https://www.d20srd.org/srd/monsters/horse.htm#warhorseHeavy: "Low-light vision, scent" (DRS 33: vision dans le noir)
    "warhorse-heavy": [("Particularités", "odorat, vision dans le noir", "odorat, vision nocturne")],
    # https://www.d20srd.org/srd/monsters/toad.htm: "Amphibious, low-light vision" (DRS 33: —); terms from DRS 35-38
    "toad": [("Particularités", "—", "amphibie, vision nocturne")],
    # https://www.d20srd.org/srd/monsters/treant.htm: "Damage reduction 10/slashing" (DRS 39: 10/perforant)
    "treant": [("Particularités", "réduction des dégâts (10/perforant)", "réduction des dégâts (10/tranchant)")],
    "fungus-violet": [("Particularités", "vison nocturne", "vision nocturne")],  # misprint
}


def mod(score: int | None) -> int:
    return 0 if score is None else (score - 10) // 2


def signed(s: str) -> int:
    return int(re.match(r"^[+-]?\d+", s.replace("–", "-").replace("−", "-").strip()).group())


def split_top(s: str, seps: tuple[str, ...]) -> list[str]:
    """Split on any separator outside parentheses/brackets."""
    out, depth, cur, i = [], 0, "", 0
    while i < len(s):
        ch = s[i]
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if depth == 0:
            sep = next((x for x in seps if s.startswith(x, i)), None)
            if sep:
                out.append(cur.strip())
                cur, i = "", i + len(sep)
                continue
        cur += ch
        i += 1
    out.append(cur.strip())
    return [x for x in out if x]


def parse_hd(s: str) -> tuple[dict, int, str, list]:
    """'2d8+4 (13 hp)' -> ({count, die, bonus}, hp, match key, dice groups)."""
    s = s.replace("–", "-").replace(" ", "")
    m = re.match(r"^(.+?)\((\d+)(?:hp|pv)\)", s)
    dice, hp = m.group(1), int(m.group(2))
    groups = [(Fraction(c), int(d)) for c, d in re.findall(r"(\d+/\d+|\d+)d(\d+)", dice)]
    bonus = sum(int(x) for x in re.findall(r"([+-]\d+)(?![d\d/])", re.sub(r"\d+/\d+|\d+d\d+", "", dice)))
    c0 = groups[0][0]
    d = {"count": int(c0) if c0.denominator == 1 else float(c0), "die": groups[0][1], "bonus": bonus}
    return d, hp, f"{dice}|{hp}", groups


def parse_abilities(s: str, names: dict) -> dict:
    out = {}
    for part in s.split(","):
        m = re.match(r"^\s*(\w+)\s+(\S+)", part)
        v = m.group(2).strip()
        out[names[m.group(1)]] = None if v in ("-", "—", "–") else int(re.match(r"\d+", v).group())
    assert set(out) == set(names.values()), s
    return out


def parse_speed(s: str) -> dict:
    s = s.split(";")[0]  # janni: "... in chainmail; base land speed 30 ft. ..." (the printed speed is kept)
    out: dict = {"land": 0}
    for part in split_top(s, (",",)):
        m = re.match(r"^(?:(fly|swim|climb|burrow)\s+)?(\d+) ft\.?(.*)$", part.strip(), re.I)
        assert m, (s, part)
        kind = (m.group(1) or "land").lower()
        out[kind] = int(m.group(2))
        man = re.search(r"\((clumsy|poor|average|good|perfect)\)", m.group(3))
        if kind == "fly" and man:
            out["flyManeuver"] = man.group(1)
    return out


def parse_speed_fr(s: str) -> dict:
    """French speed line in metres -> feet (1,50 m = 5 ft), without the fly maneuverability."""
    out: dict = {"land": 0}
    kinds = {"vol": "fly", "nage": "swim", "escalade": "climb", "creusement": "burrow"}
    for part in split_top(s.split(";")[0], (", ",)):
        m = re.match(r"^(?:(vol|nage|escalade|creusement)\s+)?(\d+(?:,\d+)?) m", part.strip(), re.I)
        if m:
            out[kinds.get((m.group(1) or "").lower(), "land")] = round(float(m.group(2).replace(",", ".")) / 0.3)
    return out


ARMOR_WORDS = ("armor", "chainmail", "bracers", "mail", "plate", "shield", "leather")


def parse_ac(s: str) -> tuple[dict, dict]:
    """AC line -> (CreatureDef.ac, {component: value})."""
    m = re.match(r"^(\d+) \((.*)\), touch (\d+), flat-footed (\d+)$", s.strip())
    assert m, s
    comps: dict[str, int] = {}
    for part in split_top(m.group(2), (",",)):
        pm = re.match(r"^([+-]\d+) (.+)$", part.strip())
        k = pm.group(2).strip().lower()
        comps[k] = comps.get(k, 0) + int(pm.group(1))
    ac = {"total": int(m.group(1)), "touch": int(m.group(3)), "flatFooted": int(m.group(4)),
          "natural": comps.get("natural", 0), "dexMod": comps.get("dex", 0), "sizeMod": comps.get("size", 0),
          "other": sum(v for k, v in comps.items() if k not in ("size", "dex", "natural"))}
    return ac, comps


def parse_feet(s: str) -> float:
    s = s.strip()
    m = re.match(r"^(\d+)-(\d+)/(\d+) ft", s) or re.match(r"^(\d+)/(\d+) ft", s) or re.match(r"^(\d+) ft", s)
    assert m, s
    g = [int(x) for x in m.groups()]
    v = g[0] + g[1] / g[2] if len(g) == 3 else (g[0] / g[1] if len(g) == 2 else g[0])
    return int(v) if float(v).is_integer() else v


def parse_saves(s: str, names=("Fort", "Ref", "Will")) -> dict:
    return {k: signed(re.search(n + r"\s+([+\-–]\d+)", s).group(1)) for k, n in zip(("fort", "ref", "will"), names)}


EN_ATK = re.compile(r"^(?:(\d+) )?(.+?) ([+-]\d+(?:/[+-]\d+)*) (melee|ranged)( touch)?\*? \((.+?)\)(/x\d)?$", re.I)
FR_ATK = re.compile(r"^(?:(\d+) )?(.+?) \(([+–-]\d+(?:/[+–-]\d+)*) (corps à corps|distance|contact à distance|contact)\*?, (.+?)\)$")


def parse_damage(d: str, tail: str | None = None) -> tuple[str, str | None, str | None]:
    """'1d8+3/x3 plus 1d6 fire' -> ('1d8+3', '×3', 'plus 1d6 fire'); critical as '19-20/×2' or '×3'."""
    d = d.replace("*", "").replace("–", "-").strip()
    m = re.match(r"^([0-9d+\-]+)(?:/([0-9]+-20))?(?:/[x×](\d))?\s*(.*)$", d)
    assert m, d
    dmg, rng, mult, extra = m.group(1), m.group(2), m.group(3), m.group(4).strip() or None
    if tail:
        mult = tail.strip("/x")
    crit = (f"{rng}/×{mult or 2}" if rng else f"×{mult}") if (rng or mult) else None
    return dmg, crit, extra


def parse_en_attacks(s: str) -> list[list[dict]]:
    """Full attack line -> routines (split on 'or') -> attacks. No attack ("—": bat, toad) -> one empty routine."""
    if s.strip() in ("-", "—", "None"):
        return [[]]
    out = []
    for routine in split_top(s, ("; or ", " or ")):
        atks = []
        for a in split_top(routine, (" and ",)):
            m = EN_ATK.match(a.strip())
            assert m, f"attack not parsed: {a!r} in {s!r}"
            dmg, crit, extra = parse_damage(m.group(6), m.group(7))
            kind = m.group(4).lower()
            if m.group(5):
                kind = {"melee": "touch", "ranged": "rangedTouch"}[kind]
            atks.append({"count": int(m.group(1) or 1), "name": m.group(2).strip(),
                         "bonuses": [int(x) for x in re.findall(r"[+-]\d+", m.group(3))],
                         "kind": kind, "damage": dmg, "critical": crit, "extra": extra})
        out.append(atks)
    return out


def parse_fr_attacks(s: str) -> list[list[dict]]:
    if s.strip() in ("-", "—", "–", ""):
        return [[]]
    out = []
    for routine in split_top(s, (" ; ou ", "; ou ", " ou ")):
        atks = []
        for a in split_top(routine, (" et ", ", ")):
            m = FR_ATK.match(a.strip())
            assert m, f"French attack not parsed: {a!r} in {s!r}"
            dm = re.match(r"^([0-9d+\-]+)(?:\s*[/,]\s*[0-9]+-\d+)?(?:\s*[/,]\s*[x×]\d)?\s*(.*)$", m.group(5).replace("–", "-").replace("*", "").strip())
            extra = re.sub(r"^plus(?=\d)", "plus ", dm.group(2).strip()) if dm else ""  # "plus1d8" misprint
            atks.append({"count": int(m.group(1) or 1), "name": re.sub(r"^(et|puis) ", "", m.group(2).strip()),
                         "bonus": signed(m.group(3).split("/")[0]), "extra": extra or None})
        out.append(atks)
    return out


def cap(s: str) -> str:
    return s[:1].upper() + s[1:]


def dash(s: str | None) -> str:
    return "—" if s is None or s.strip() in ("", "-", "—", "None") else s.strip()


# ---------------------------------------------------------------------------------------------
# Texts
# ---------------------------------------------------------------------------------------------

def en_texts(full_text: str) -> tuple[list[str], list[str]]:
    """(description + combat intro paragraphs, special ability paragraphs) from the Andargor full_text."""
    t = re.sub(r"<table.*?</table>", "", full_text, flags=re.S)
    t = re.sub(r"<p/>", "", t)
    i = t.find("<div topic='Combat'")
    desc = [p for p in html_paras(t[:i] if i >= 0 else t) if p.strip() not in ("<p/>", "")]
    combat = [p for p in html_paras(t[i:]) if p.strip() not in ("<p/>", "")] if i >= 0 else []
    if i < 0:  # no Combat heading (whales): the special abilities start at the first bold paragraph
        k = next((n for n, p in enumerate(desc) if p.startswith("<b>")), len(desc))
        desc, combat = desc[:k], desc[k:]
    k = next((n for n, p in enumerate(combat) if p.startswith("<b>")), len(combat))
    return desc + combat[:k], combat[k:]


# dnd35.db full_text of the snakes has no family / Combat text: the English SRD HTML (sources/srd-v3.5) sections
# are used instead (heading ids).
EN_HTML = {
    "snake-constrictor": ["snake", "constrictor-snake", "constrictor-snake--combat"],
    "snake-constrictor-giant": ["snake", "constrictor-snake", "constrictor-snake--combat", "constrictor-snake-giant"],
    **{f"snake-{k}-viper": ["snake", "viper-snake", "viper-snake--combat"] for k in ("tiny", "small", "medium", "large", "huge")},
    # Wild shape forms whose dnd35.db full_text holds the whole family page (all the horses, shrieker + violet fungus) or
    # no bold special ability heads (bat). "id@k": the k-th part of the section split at its stat block tables (horse
    # combat section: 0 combat text, 1 heavy horse, 2 light horse, 3 heavy warhorse, 4 light warhorse); "file:id" for
    # a section of another file.
    "warhorse-heavy": ["horse", "horse--combat@0", "horse--combat@3"],
    "warhorse-light": ["horse", "horse--combat@0", "horse--combat@4"],
    "bat": ["bat", "bat--combat"],
    "fungus-violet": ["monsters/monsters-e-f.html:fungus", "fungus--combat", "violet-fungus", "violet-fungus--combat"],
}
EN_HTML_FILE = "monsters/monsters-animals.html"


def en_html_texts(ids: list[str]) -> tuple[list[str], list[str]]:
    """Paragraphs of the given heading sections of the local English SRD HTML, split like en_texts()."""
    from common import ROOT
    fname = EN_HTML_FILE
    if ":" in ids[0]:  # "file:first heading id"
        fname, first = ids[0].split(":")
        ids = [first] + ids[1:]
    html = (ROOT / "sources" / "srd-v3.5" / fname).read_text(encoding="utf-8")
    desc, special = [], []
    for hid in ids:
        in_special = False
        hid, _, part = hid.partition("@")
        m = re.search(rf'<h\d id="{re.escape(hid)}">', html)
        assert m, hid
        rest = html[m.end():]
        e = re.search(r"<h\d[ >]", rest)  # the section stops at the next heading of any level
        sec = rest[:e.start()] if e else rest
        if part:  # only the k-th part between the stat block tables
            sec = re.split(r"<table.*?</table>", sec, flags=re.S)[int(part)]
        sec = re.sub(r"<table.*?</table>", "", sec, flags=re.S)
        for p in re.findall(r"<p>(.*?)</p>", sec, flags=re.S):
            p = re.sub(r"\s+", " ", p).strip().replace("<strong>", "<b>").replace("</strong>", "</b>")
            p = re.sub(r"^([A-Z][\w’' ]+ \((?:Ex|Su|Sp)\):|Skills:)", r"<b>\1</b>", p)
            in_special = p.startswith("<b>") or (in_special and not p.startswith("<"))
            (special if in_special else desc).append(p)
    return desc, special


def fr_texts(body) -> tuple[list[str], list[str]]:
    """(description paragraphs, special ability paragraphs): a paragraph starting with a bold "Name (Ext)." head opens
    a special ability, the plain paragraphs after it continue it until the next heading."""
    desc, special, in_special = [], [], False
    for q in body:
        if q.in_table:
            continue
        if q.bold_all:
            in_special = False
            continue
        if q.bold_prefix and q.bold_prefix.strip().endswith("."):
            in_special = True
        (special if in_special else desc).append(q)
    return fr_paras_html(desc), fr_paras_html(special)


TEXT_MAX, SPECIAL_MAX = 2000, 6000


# ---------------------------------------------------------------------------------------------
# Celestial charger: the French SRD has no entry (DRS 38 stops at the unicorn). Its French texts are written here
# with the official terms (skills.json, feats.json, DRS 22 spell names, DRS 38 unicorn entry); checked at build time.
# ---------------------------------------------------------------------------------------------
CHARGER_SPELLS_FR = [  # 0..4th level, as printed in the SRD (https://www.d20srd.org/srd/monsters/unicorn.htm#celestialCharger)
    ["détection de la magie", "détection du poison (2)", "lumière", "stimulant (2)"],
    ["bénédiction (2)", "apaisement des animaux*", "brume de dissimulation", "regain d’assurance", "sanctuaire", "bouclier de la foi"],
    ["aide* (2)", "messager animal", "restauration partielle", "délivrance de la paralysie", "protection d’autrui"],
    ["prière", "protection contre les énergies destructives", "délivrance des malédictions", "lumière brûlante (2)"],
    ["marche dans les airs", "puissance divine", "châtiment sacré*", "restauration"],
]
CHARGER_FR = {
    "name": "Licorne, destrier céleste",  # DRS 22a, Summon Nature's Ally table
    "specialAttacks": "renvoi des morts-vivants (13/jour), châtiment du Mal, sorts",
    "specialQualities": "cercle magique contre le Mal, empathie sauvage, immunité contre le charme, la coercition et le poison, "
                        "odorat, pouvoirs magiques, réduction des dégâts (10/magie), résistance à l’acide (10), au froid (10) "
                        "et à l’électricité (10), résistance à la magie (20), vision dans le noir (18 m), vision nocturne",
    "skillsExtra": {"(+17 aboveground)": "(+17 en surface)"},
    "attacks": {"Horn": "Corne", "hooves": "Sabots"},
    "text": "<p>Le destrier céleste décrit ici est une licorne céleste de 8 DV possédant sept niveaux de prêtre.</p>",
    "special": [
        "Le DD de la neutralisation du poison du destrier céleste (DD 20) tient compte de ses DV supplémentaires et de sa "
        "valeur de Charisme modifiée.",
        "Les armes naturelles du destrier céleste sont considérées comme des armes magiques pour ce qui est d’ignorer la "
        "réduction des dégâts.",
        "<b>Châtiment du Mal (Sur).</b> Une fois par jour, le destrier céleste peut porter une attaque de corps à corps normale "
        "qui inflige 15 points de dégâts supplémentaires à un adversaire mauvais.",
    ],
}


def charger_spells_fr(spell_heads: set[str]) -> str:
    for lvl in CHARGER_SPELLS_FR:
        for s in lvl:
            assert norm(re.sub(r"\*|\(\d\)", "", s)) in spell_heads, f"charger: French spell {s!r} not a DRS 22 heading"
    ords = ["0", "1er", "2e", "3e", "4e"]
    parts = " ; ".join(f"{o} — " + ", ".join(f"<i>{s}</i>" for s in lvl) for o, lvl in zip(ords, CHARGER_SPELLS_FR))
    return (f"<i>Sorts de prêtre préparés</i> (6/7/6/5/4 ; DD de sauvegarde 18 + niveau du sort) : {parts}.</p>"
            "<p>* Sort de domaine. Domaines : Bien et Faune.")


def translate_list(en: str, table: dict[str, str], extra: dict[str, str]) -> str:
    """'Alertness, Skill Focus (Survival)' -> French, item by item, through the given EN -> FR name table."""
    out = []
    for item in split_top(en, (",",)):
        for a, b in extra.items():
            item = item.replace(a, b)
        m = re.match(r"^(.+?)(\s*\(([^)]*)\))?(\s*[+-]\d+.*)?$", item)
        base, par, rest = m.group(1).strip(), m.group(3), m.group(4) or ""
        full = f"{base} ({par})" if par else base
        if norm(full) in table:
            out.append(table[norm(full)] + rest)
        else:
            assert norm(base) in table, f"no French name for {base!r}"
            par_fr = table.get(norm(par), par) if par else None
            out.append(table[norm(base)] + (f" ({par_fr})" if par_fr else "") + rest)
    return ", ".join(sorted(out, key=norm))


# ---------------------------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------------------------

def _weapon_names(weapons: list[dict]) -> dict[str, dict]:
    return {w["name"]["en"].lower(): w for w in weapons}


def build_attacks(cid: str, r, en_routines, fr_routines, abil, feat_names, feat_ids, size, bab, weapons, exc, idx=0) -> list[dict]:
    """Full-attack routine `idx` ("or" alternatives) -> CreatureAttack[], with the consistency checks (exceptions
    appended to `exc`)."""
    routine, fr_routine = en_routines[idx], fr_routines[idx] if fr_routines else None
    if fr_routine is not None:
        assert len(fr_routine) == len(routine), (cid, routine, fr_routine)
    wnames = _weapon_names(weapons)
    finesse, multi = "weapon-finesse" in feat_ids, "multiattack" in feat_ids
    strm, dexm = mod(abil["str"]), mod(abil["dex"])
    is_weapon = []
    for a in routine:
        base = re.sub(r"^\+\d ", "", a["name"]).lower()
        is_weapon.append(wnames.get(base))
    n_natural = sum(a["count"] for a, w in zip(routine, is_weapon) if not w and "ray" not in a["name"].lower())
    out = []
    first_natural = True
    for n, (a, w) in enumerate(zip(routine, is_weapon)):
        name_l = a["name"].lower()
        ench = int(re.match(r"^\+(\d) ", a["name"]).group(1)) if re.match(r"^\+(\d) ", a["name"]) else 0
        ench += NATURAL_ENH.get((cid, name_l), 0)
        ray = "ray" in name_l
        ranged = a["kind"] in ("ranged", "rangedTouch")
        light = w is None or w["handedness"] in ("light", "unarmed") or w["id"] in ("rapier", "whip", "spiked-chain")
        use_dex = ranged or (finesse and light and dexm > strm)
        abil_mod = dexm if use_dex else strm
        focus = 0
        for f in feat_names:
            fm = re.match(r"Weapon Focus \((.+)\)", f)
            if fm and (fm.group(1).lower().rstrip("s") in name_l or name_l.rstrip("s").rstrip("e") in fm.group(1).lower()):
                focus = 1
        expected = bab + abil_mod + SIZE_AC[size] + focus + ench
        bonus = a["bonuses"][0]
        if w is not None:
            role = "weapon"
        elif ray:
            role = "primary"
        elif bonus == expected:
            role = "primary"
        elif bonus == expected - (2 if multi else 5):
            role = "secondary"
        else:
            role = "primary" if first_natural else "secondary"
            exc.append(f"{cid}: {a['name']} attack +{bonus} != computed +{expected} (BAB {bab:+d}, "
                       f"{'Dex' if use_dex else 'Str'} {abil_mod:+d}, size {SIZE_AC[size]:+d}"
                       f"{', Weapon Focus +1' if focus else ''}{f', +{ench} weapon' if ench else ''})")
        if w is not None and bonus != expected:
            exc.append(f"{cid}: {a['name']} (weapon) attack +{bonus} != computed +{expected}")
        if not w and not ray:
            first_natural = False
        # Str on damage (https://www.d20srd.org/srd/combat/actionsInCombat.htm#strengthBonus,
        # https://www.d20srd.org/srd/monsters/intro.htm natural weapons: sole attack 1.5, secondary 0.5)
        if ray or a["damage"] == "0" or (w is not None and w["kind"] == "ranged"):
            factor = 0
        elif w is not None:
            factor = 1.5 if w["handedness"] == "twoHanded" else 1
        elif role == "secondary":
            factor = 0.5
        else:
            factor = 1.5 if n_natural == 1 and all(x is None for x in is_weapon) else 1
        dm = re.search(r"d\d+([+-]\d+)$", a["damage"])
        printed = int(dm.group(1)) if dm else 0
        if "d" not in a["damage"]:
            printed = None  # flat damage ("1", "0")
        if factor == 0:
            exp_dmg = strm if (strm < 0 and w is not None and "bow" in w["id"] and "crossbow" not in w["id"]) else 0
        else:
            exp_dmg = strm if strm < 0 else int(factor * strm // 1)
        exp_dmg += ench
        if printed is not None and printed != exp_dmg:
            alt = [f for f in (1.5, 1, 0.5) if strm > 0 and int(f * strm) + ench == printed]
            exc.append(f"{cid}: {a['name']} damage {a['damage']} bonus {printed:+d} != {factor} x Str {strm:+d}"
                       f"{f' +{ench}' if ench else ''} = {exp_dmg:+d}" + (f" (printed matches factor {alt[0]})" if alt else ""))
        fr_a = fr_routine[n] if fr_routine is not None else None
        if fr_a is not None:
            if fr_a["bonus"] != bonus:
                exc.append(f"{cid}: French SRD prints {fr_a['name']} {fr_a['bonus']:+d}, English {a['name']} {bonus:+d} (English kept)")
            if fr_a["count"] != a["count"]:
                exc.append(f"{cid}: French SRD prints {fr_a['count']} x {fr_a['name']}, English {a['count']} x {a['name']} (English kept)")
            if a["extra"] and not fr_a["extra"]:
                fr_a = dict(fr_a, extra=EXTRA_FR[a["extra"]])
                exc.append(f"{cid}: French SRD omits '{a['extra']}' after the {fr_a['name']} damage; '{fr_a['extra']}' used")
            assert bool(fr_a["extra"]) == bool(a["extra"]), (cid, a, fr_a)
            if a["extra"] and re.findall(r"\d+d\d+", a["extra"]) != re.findall(r"\d+d\d+", fr_a["extra"]):
                exc.append(f"{cid}: French SRD prints '{fr_a['extra']}' after the {fr_a['name']} damage, English '{a['extra']}'")
        name_fr = cap(fr_a["name"]) if fr_a else CHARGER_FR["attacks"][a["name"]]
        d = {"name": i18n(cap(a["name"]), name_fr), "bonus": bonus, "damage": a["damage"]}
        if a["extra"]:
            d["extra"] = i18n(a["extra"], fr_a["extra"])
        d.update(kind=a["kind"], role=role, count=a["count"], attackAbility="dex" if use_dex else "str",
                 strDamageFactor=factor)
        if a["critical"]:
            d["critical"] = a["critical"]
        # Iterative attacks of a weapon (+9/+4): the following bonuses, as printed.
        if len(a["bonuses"]) > 1:
            d["iterative"] = a["bonuses"][1:]
        out.append(d)
    return out


def build_creatures(weapons: list[dict] | None = None, feats: list[dict] | None = None,
                    skills: list[dict] | None = None, spell_ids: set[str] | None = None):
    import json
    if weapons is None:
        weapons = json.loads((OUT_SRD / "weapons.json").read_text(encoding="utf-8"))
        feats = json.loads((OUT_SRD / "feats.json").read_text(encoding="utf-8"))
        skills = json.loads((OUT_SRD / "skills.json").read_text(encoding="utf-8"))
        spell_ids = {s["id"] for s in json.loads((OUT_SRD / "spells.json").read_text(encoding="utf-8"))}
    feat_ids_all = {f["id"] for f in feats}
    c = db()
    comp = companion_lists()
    sna = summon_lists()
    used = {x for _, _, ids in comp for x in ids} | {x for ids in sna.values() for x in ids}
    assert not used & set(WILD_SHAPE), used & set(WILD_SHAPE)
    # Wild shape scope: every dnd35.db animal / plant outside the epic and psionic SRD is in the catalog.
    by_name = {v[0]: k for k, v in CATALOG.items()}
    scope = c.execute(f"select name, reference from monster where type in ({','.join('?' * len(WILD_SHAPE_TYPES))})",
                      WILD_SHAPE_TYPES).fetchall()
    scope = [tuple(x) for x in scope]
    in_scope = {by_name.get(n, n) for n, ref in scope if not ref.startswith(WILD_SHAPE_EXCLUDED_REFS) and n not in WILD_SHAPE_BLOCKED}
    assert in_scope <= set(CATALOG), in_scope - set(CATALOG)
    assert used | in_scope == set(CATALOG), (used | in_scope) ^ set(CATALOG)
    for n, ref in sorted(scope):
        if ref.startswith(WILD_SHAPE_EXCLUDED_REFS):
            NOTES.append(f"creatures: {n} ({ref}) left out: epic / psionic SRD, no French SRD entry")
        elif n in WILD_SHAPE_BLOCKED:
            NOTES.append(f"creatures: {n} left out: {WILD_SHAPE_BLOCKED[n]} (CreatureDef needs a number)")

    # French blocks indexed by (Hit Dice line, ability scores).
    fr_index: dict[tuple, list[dict]] = {}
    all_blocks = fr_blocks()
    for b in all_blocks:
        if "Dés de vie" not in b["fields"] or "Caractéristiques" not in b["fields"]:
            continue
        key = (parse_hd(b["fields"]["Dés de vie"])[2], tuple(parse_abilities(b["fields"]["Caractéristiques"], ABIL_FR).values()))
        fr_index.setdefault(key, []).append(b)
    # Translation table for the charger (skills.json, feats.json names).
    tr = {norm(s["name"]["en"]): s["name"]["fr"] for s in skills}
    tr.update({norm(f["name"]["en"]): f["name"]["fr"] for f in feats})
    tr.update({norm("Survival"): "Survie", norm("Knowledge"): "Connaissances", norm("nature"): "nature",
               norm("religion"): "religion"})
    spell_heads = {norm(p.text) for f in ("DRS 22a", "DRS 22b", "DRS 22c", "DRS 22d") for p in rtf_fr.load(f)
                   if p.bold_all and not p.in_table}
    unicorn_fr = None

    out, exc = [], []
    for cid, (dbname, page, anchor) in sorted(CATALOG.items()):
        r = dict(c.execute("select * from monster where name=?", (dbname,)).fetchone())
        for col, (a, b) in DB_FIX.get(cid, {}).items():
            assert a in r[col], (cid, col, r[col])
            r[col] = r[col].replace(a, b)
            NOTES.append(f"creatures: dnd35.db {col} of {dbname} corrected: '{a}' -> '{b}' (SRD)")
        size = r["size"].lower()
        hd, hp, hdkey, groups = parse_hd(r["hit_dice"])
        abil = parse_abilities(r["abilities"], ABIL_EN)
        frs = fr_index.get((hdkey, tuple(abil.values())), [])
        if cid in FR_MATCH:  # the French block differs on a number: matched by name, the English number is kept
            name, why = FR_MATCH[cid]
            assert not frs, cid
            frs = [b for b in all_blocks if b["name"] == name]
            exc.append(f"{cid}: {why}")
        if len(frs) > 1:  # same Hit Dice and abilities (cheetah / leopard, giant eagle / owl): the speeds separate them
            sp = {k: v for k, v in parse_speed(r["speed"]).items() if k != "flyManeuver"}
            frs = [b for b in frs if parse_speed_fr(b["fields"]["Vitesse de déplacement"]) == sp]
        assert len(frs) <= 1, (cid, [b["name"] for b in frs])
        fr = frs[0] if frs else None
        if cid == "unicorn":
            unicorn_fr = fr
        assert fr or cid == "unicorn-celestial-charger", f"{cid}: no French stat block with HD {r['hit_dice']} and {r['abilities']}"
        ff = dict(fr["fields"]) if fr else {}
        for field, a, b in FR_FIELD_ERRATA.get(cid, []):
            assert a in ff[field], (cid, field, ff[field])
            ff[field] = ff[field].replace(a, b)
            exc.append(f"{cid}: French SRD ({fr['file']}) {field} '{a}' corrected to '{b}' (English SRD)")
        if fr:  # the French block is checked against the English one; differences are reported (English kept)
            babfr, grpfr = ff["Attaque de base/lutte"].split("/")
            sp_en = {k: v for k, v in parse_speed(r["speed"]).items() if k != "flyManeuver"}
            for what, a, b in (
                    ("saves", parse_saves(ff["Jets de sauvegarde"], ("Vig", "Réf", "Vol")), parse_saves(r["saves"])),
                    ("BAB/grapple", (signed(babfr), signed(grpfr)), (signed(r["base_attack"]), signed(r["grapple"]))),
                    ("initiative", signed(ff["Initiative"].split()[0]), signed(r["initiative"])),
                    ("AC (total, touch, flat-footed)", re.findall(r"(?<![+–-])\d+(?! (?:taille|Dex|naturelle))", ff["Classe d’armure"]),
                     re.findall(r"(?<![+-])\d+(?! (?:size|Dex|natural))", r["armor_class"])),
                    ("speed", parse_speed_fr(ff["Vitesse de déplacement"]), sp_en)):
                if a != b:
                    exc.append(f"{cid}: French SRD ({fr['file']}) {what} {a} != English {b} (English kept)")
        name_fr = fr["name"] if fr else CHARGER_FR["name"]
        if cid in FR_NAME:
            assert name_fr == FR_NAME[cid][0], (cid, name_fr)
            name_fr = FR_NAME[cid][1]

        # Numbers
        typ = kebab(r["type"])
        desc = dash(r["descriptor"])
        type_en = f"{size.capitalize()} {r['type'].lower()}" + (f" ({desc.lower()})" if desc != "—" else "")
        type_fr = fr["typeText"] if fr else unicorn_fr["typeText"]
        speed = parse_speed(r["speed"])
        ac, comps = parse_ac(r["armor_class"])
        bab, grapple = signed(r["base_attack"]), signed(r["grapple"])
        saves = parse_saves(r["saves"])
        feat_names = [x.strip() for x in split_top(dash(r["feats"]), (",",)) if x.strip() != "—"]
        bonus_names = [x.strip() for x in split_top(dash(r["bonus_feats"]), (",",)) if x.strip() != "—"]
        fids = []
        for f in feat_names + bonus_names:
            fid = kebab(re.sub(r"\s*\(.*\)", "", f))
            if fid in feat_ids_all or fid in MONSTER_FEATS:
                fids.append(fid)
            else:
                exc.append(f"{cid}: feat {f!r} has no id in feats.json (left out of featIds)")
        fids = sorted(set(fids))

        # Consistency checks (reported, never fatal: the printed SRD numbers are kept)
        exp_hp = int(sum(cnt * Fraction(die + 1, 2) for cnt, die in groups)) + hd["bonus"]
        if exp_hp != hp:
            exc.append(f"{cid}: hp {hp} != average of {r['hit_dice'].split(' (')[0]} = {exp_hp}")
        if ac["total"] != 10 + sum(comps.values()):
            exc.append(f"{cid}: AC {ac['total']} != 10 + components {comps}")
        armorish = sum(v for k, v in comps.items() if k in ("natural",) or any(w in k for w in ARMOR_WORDS))
        if ac["touch"] != ac["total"] - armorish:
            exc.append(f"{cid}: touch AC {ac['touch']} != {ac['total'] - armorish}")
        ff_exp = ac["total"] - max(ac["dexMod"], 0) - comps.get("dodge", 0)
        if ac["flatFooted"] != ff_exp:
            exc.append(f"{cid}: flat-footed AC {ac['flatFooted']} != {ff_exp}")
        if ac["sizeMod"] != SIZE_AC[size]:
            exc.append(f"{cid}: AC size modifier {ac['sizeMod']} != {SIZE_AC[size]} for {size}")
        if ac["dexMod"] != mod(abil["dex"]):
            exc.append(f"{cid}: AC Dex {ac['dexMod']} != Dex modifier {mod(abil['dex'])}")
        exp_grp = bab + mod(abil["str"]) + SIZE_GRAPPLE[size]
        if grapple != exp_grp:
            exc.append(f"{cid}: grapple {grapple:+d} != BAB + Str + size = {exp_grp:+d}")
        exp_init = mod(abil["dex"]) + (4 if "improved-initiative" in fids else 0)
        if signed(r["initiative"]) != exp_init:
            exc.append(f"{cid}: initiative {r['initiative']} != Dex{' + Improved Initiative' if exp_init != mod(abil['dex']) else ''} = {exp_init:+d}")
        gkey = typ if typ != "elemental" else f"elemental:{next((e for e in ELEMENTS if e in desc.lower()), '')}"
        if gkey in GOOD_SAVES and len(groups) == 1:
            n = int(hd["count"]) if hd["count"] >= 1 else 1
            for k, ab in (("fort", "con"), ("ref", "dex"), ("will", "wis")):
                good = GOOD_SAVES_DIRE if cid.startswith("dire-") else GOOD_SAVES[gkey]
                base = 2 + n // 2 if k in good else n // 3
                e = base + mod(abil[ab]) + sum(2 for f, s in SAVE_FEATS.items() if s == k and f in fids)
                if saves[k] != e:
                    exc.append(f"{cid}: {k} save {saves[k]:+d} != base {base} + {ab} {mod(abil[ab]):+d} (+ save feats) = {e:+d}")

        en_routines = parse_en_attacks(r["full_attack"])
        fr_routines = parse_fr_attacks(ff["Attaque à outrance"]) if fr else None
        if fr_routines is not None:
            assert len(fr_routines) == len(en_routines), (cid, r["full_attack"], ff["Attaque à outrance"])
        attacks = build_attacks(cid, r, en_routines, fr_routines, abil, feat_names + bonus_names, fids, size, bab, weapons, exc)
        # Alternative full attacks ("or" in the stat block), e.g. arrowhawk: electricity ray or bite.
        alt_attacks = [build_attacks(cid, r, en_routines, fr_routines, abil, feat_names + bonus_names, fids, size, bab, weapons, exc, i)
                       for i in range(1, len(en_routines))]

        # Texts
        feats_en = ", ".join(sorted(feat_names + [f"{b} (B)" for b in bonus_names], key=str.lower)) or "—"
        if fr:
            feats_fr = re.sub(r"(?<=[a-zéèêàâîïôûç\)])S(?=,|$|\s)", " (S)", ff.get("Dons", "—")) or "—"
        else:
            feats_fr = translate_list(feats_en, tr, {})
        skills_en = dash(r["skills"])
        skills_fr = dash(ff.get("Compétences")) if fr else translate_list(skills_en, tr, CHARGER_FR["skillsExtra"])
        al_en = dash(r["alignment"])
        if al_en == "—":
            assert typ == "animal", cid
            al_en = "Always neutral"  # animal trait, https://www.d20srd.org/srd/typesSubtypes.htm#animal
        al_fr = (ff.get("Alignement") or "toujours neutre") if fr else unicorn_fr["fields"]["Alignement"]
        desc_en, special_en = en_html_texts(EN_HTML[cid]) if cid in EN_HTML else en_texts(r["full_text"])
        if fr:
            desc_fr, special_fr = fr_texts(fr["body"])
            sa_fr, sq_fr = dash(ff.get("Attaques spéciales")), dash(ff.get("Particularités"))
        else:
            ud, us = fr_texts(unicorn_fr["body"])
            desc_fr = ud + [CHARGER_FR["text"][3:-4]]
            special_fr = us + CHARGER_FR["special"] + [charger_spells_fr(spell_heads)]
            sa_fr, sq_fr = CHARGER_FR["specialAttacks"], CHARGER_FR["specialQualities"]
            exc.append(f"{cid}: not in the French SRD; French texts written in tools/build_creatures.py (CHARGER_FR) "
                       f"from the official terms")
        page_url = f"monsters/{page}"
        assert srd_urls.anchors(page_url), f"{page_url}: not in d20srd_anchors.json (python tools/srd_urls.py --refresh-monsters)"
        if anchor:
            assert srd_urls.has_anchor(page_url, anchor), f"{cid}: #{anchor} not on {page_url}"
        url = MONSTER_BASE + page + (f"#{anchor}" if anchor else "")
        d = {
            "id": cid, "name": i18n(dbname, name_fr), "size": size, "type": typ, "typeText": i18n(type_en, type_fr),
            "hitDice": hd, "hp": hp, "initiative": signed(r["initiative"]), "speed": speed, "ac": ac, "bab": bab,
            "grapple": grapple, "attacks": attacks, **({"altAttacks": alt_attacks} if alt_attacks else {}), "space": parse_feet(r["space"]), "reach": parse_feet(r["reach"]),
            "saves": saves, "abilities": abil, "skills": i18n(skills_en, skills_fr), "feats": i18n(feats_en, feats_fr),
            "featIds": fids, "specialAttacks": i18n(dash(r["special_attacks"]), sa_fr),
            "specialQualities": i18n(dash(r["special_qualities"]), sq_fr),
            "specialAbilities": i18n(clip_paras(special_en, SPECIAL_MAX) or "—", clip_paras(special_fr, SPECIAL_MAX) or "—"),
            "alignment": i18n(al_en, al_fr), "cr": r["challenge_rating"].strip(),
            "text": i18n(clip_paras(desc_en, TEXT_MAX) or f"<p>{esc(dbname)}</p>", clip_paras(desc_fr, TEXT_MAX) or f"<p>{esc(name_fr)}</p>"),
            "source": srd_source(url, rtf_fr.file_label(fr["file"]) if fr else None),
        }
        if not fr:
            d["source"]["frRef"] = f"{rtf_fr.file_label('DRS 38')} (licorne), {rtf_fr.file_label('DRS 22a')} (nom)"
        out.append(d)
    assert len({d["name"]["fr"] for d in out}) == len(out), "duplicate French names"
    write_json(OUT_SRD / "creatures.json", out)

    lists = [{"spellId": f"summon-natures-ally-{ROMAN[lv]}", "level": lv, "creatures": sorted(ids)} for lv, ids in sorted(sna.items())]
    for x in lists:
        assert x["spellId"] in spell_ids, x["spellId"]
    write_json(OUT_SRD / "summon-lists.json", lists)
    companions = build_companions(comp)
    write_json(OUT_SRD / "companions.json", companions)
    for e in exc:
        NOTES.append("creatures: " + e)
    return out, companions, lists, exc


ROMAN = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi", 7: "vii", 8: "viii", 9: "ix"}

# Animal companion special abilities: id, English heading (SRD), French heading (DRS 03a).
COMPANION_SPECIAL = [("link", "Link", "Lien"), ("share-spells", "Share Spells", "Transfert d’effet magique"),
                     ("evasion", "Evasion", "Esquive totale"), ("devotion", "Devotion", "Dévotion"),
                     ("multiattack", "Multiattack", "Attaques multiples"), ("improved-evasion", "Improved Evasion", "Esquive extraordinaire")]


def build_companions(comp) -> dict:
    """SRD Table: The Druid's Animal Companion (dnd35.db Druid full_text) + DRS 03a table and paragraphs."""
    t = db().execute("select full_text from class where name='Druid'").fetchone()[0]
    i = t.find("The Druid's Animal Companion")
    j = t.find("Alternative Animal Companions")
    sec = t[i:j]
    toks = tokens(sec[sec.find("1st-2nd"):sec.find("</table>")])
    rows_en = []
    k = 0
    while k < len(toks):
        m = re.match(r"^(\d+)\w\w-(\d+)\w\w$", toks[k])
        assert m, toks[k:k + 6]
        vals = toks[k + 1:k + 5]
        special = toks[k + 5] if k + 5 < len(toks) and not re.match(r"^\d+\w\w-", toks[k + 5]) else ""
        rows_en.append((int(m.group(1)), int(m.group(2)), [int(v) for v in vals], special))
        k += 6 if special else 5
    ps = rtf_fr.load("DRS 03a")
    head = next(n for n, p in enumerate(ps) if p.in_table and p.cells and p.cells[0] == "Niveau de classe" and "DV sup." in p.cells)
    rows_fr = []
    for p in ps[head + 1:head + 8]:
        a, b = p.cells[0].split("–")
        rows_fr.append((int(a), int(b), [signed(v) for v in p.cells[1:5]], p.cells[5].strip()))
    assert [r[:3] for r in rows_en] == [r[:3] for r in rows_fr], (rows_en, rows_fr)

    # Paragraph texts: SRD "<b>Link (Ex):</b> ..." and DRS 03a "Lien (Ext). ..."
    en_paras = html_paras(re.sub(r"<table.*?</table>", "", sec, flags=re.S))
    special_defs = {}
    for sid, en, fr in COMPANION_SPECIAL:
        k = next(n for n, p in enumerate(en_paras) if re.match(rf"^<([bi])>{re.escape(en)}( \(Ex\))?:</\1>", p))
        pe = en_paras[k]
        for q in en_paras[k + 1:]:  # continuation paragraphs (Share Spells has two)
            if re.match(r"^<[bi]>", q):
                break
            pe += " " + q
        pf = next(p for p in ps[head:head + 40] if re.match(rf"^{re.escape(fr)} \(Ext\)\. ", p.text.replace("'", "’")))
        txt_en = strip_tags(re.sub(r"^<([bi])>.*?</\1>\s*", "", pe))
        txt_fr = re.sub(r"^.*? \(Ext\)\.\s*", "", pf.text, count=1)
        special_defs[norm(en)] = {"id": sid, "name": i18n(en if en != "Share Spells" else "Share spells", fr),
                                  "text": i18n(txt_en, txt_fr)}
    adv = []
    for (lo, hi, vals, sp_en), (_, _, _, sp_fr) in zip(rows_en, rows_fr):
        items = [x.strip() for x in sp_en.split(",") if x.strip()]
        items_fr = [x.strip() for x in sp_fr.replace("'", "’").split(",") if x.strip()]
        special = [special_defs[norm(x)] for x in items]
        assert [s["name"]["fr"] for s in special] == [cap(x) for x in items_fr], (items, items_fr)
        adv.append({"minLevel": lo, "maxLevel": hi, "bonusHD": vals[0], "naturalArmorAdj": vals[1], "strDexAdj": vals[2],
                    "bonusTricks": vals[3], "special": special})
    options = [{"creatureId": cid, "minLevel": lvl, "levelAdjustment": adj} for lvl, adj, ids in comp for cid in ids]
    return {"advancement": adv, "options": options,
            "source": srd_source(srd_urls.anchor_url(DRUID_URL_PAGE, DRUID_ANCHOR), rtf_fr.file_label("DRS 03a"))}


if __name__ == "__main__":  # standalone run (reads the other generated JSON files); build_data.py calls build_creatures()
    cr, co, li, ex = build_creatures()
    print(f"{len(cr)} creatures, {len(co['options'])} companion options, {len(li)} summon lists")
    print("\n".join(ex))
