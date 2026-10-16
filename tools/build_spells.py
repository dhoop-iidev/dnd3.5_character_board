"""Spells (src/data/srd/spells.json): every spell of the bard (levels 0-6), cleric (0-9), druid (0-9), paladin (1-4),
ranger (1-4) and sorcerer/wizard (0-9, with the two wizard-only spells as list "wizard") spell lists and of the 22 SRD
cleric domains, with its level on every core class list and on each core domain ("domain:<id>").

English: Andargor SRD SQLite (`spell`). French: official French SRD, DRS 22a-d (spell entries) and DRS 21 (spell
lists: one-line summaries, and the class lists in LIST_HEAD_FR used as a check: the French entry must be on the list at
the same level; the sorcerer/wizard list starts each school with its abbreviation, "Abjur Alarme."). An English spell
is matched to the French entry with the same core class levels and school + subschool, ties settled by HAND_FR, the
DD-3e glossary name, the domain levels, then the components (FR_HEADER_ERRATA fixes the French header lines that
contradict the SRD, FR_NAME_ERRATA misprinted headings, FR_LIST_NAME_ERRATA DRS 21 list lines that lost words); one
French entry per English spell. French entries that only say "semblable à X" (or "reportez-vous à la description du
sort X") inherit the missing header lines from X (recursively), as the SRD rule says. schoolId / subschool /
descriptors come from the dnd35.db columns (DB_FIX: the few that contradict the d20srd spell page).
"""
from __future__ import annotations

import re

import glossary_fr
import rtf_fr
from common import OUT_SRD, clip_paras, db, esc, html_paras, i18n, srd_source, write_json
from ctx import NOTES, fr_paras_html, norm

# "wizard": the two SRD sorcerer/wizard list spells marked wizard only (mnemonic enhancer Wiz 4, mage's lucubration
# Wiz 6; DRS 21 "Magiciens uniquement", DRS 22 "Mag").
LIST_EN = {"Bard": "bard", "Cleric": "cleric", "Druid": "druid", "Paladin": "paladin", "Ranger": "ranger",
           "Sorcerer/Wizard": "sorcerer-wizard", "Wizard": "wizard"}
LIST_FR = {"Bard": "bard", "Prê": "cleric", "Dru": "druid", "Pal": "paladin", "Rôd": "ranger", "Ens/Mag": "sorcerer-wizard",
           "Mag": "wizard",
           # misprints of the DRS 22 level lines
           "Bar": "bard", "Ens-Mag": "sorcerer-wizard"}
# The 22 SRD cleric domains (https://www.d20srd.org/srd/spellLists/clericDomains.htm): id -> (English, French name as in
# the DRS 21 "Domaine de ..." headings and the DRS 22 level lines).
DOMAINS = {
    "air": ("Air", "Air"), "animal": ("Animal", "Faune"), "chaos": ("Chaos", "Chaos"), "death": ("Death", "Mort"),
    "destruction": ("Destruction", "Destruction"), "earth": ("Earth", "Terre"), "evil": ("Evil", "Mal"),
    "fire": ("Fire", "Feu"), "good": ("Good", "Bien"), "healing": ("Healing", "Guérison"),
    "knowledge": ("Knowledge", "Connaissance"), "law": ("Law", "Loi"), "luck": ("Luck", "Chance"),
    "magic": ("Magic", "Magie"), "plant": ("Plant", "Flore"), "protection": ("Protection", "Protection"),
    "strength": ("Strength", "Force"), "sun": ("Sun", "Soleil"), "travel": ("Travel", "Voyage"),
    "trickery": ("Trickery", "Duperie"), "war": ("War", "Guerre"), "water": ("Water", "Eau"),
}
DOMAIN_EN = {en: f"domain:{d}" for d, (en, _) in DOMAINS.items()}
DOMAIN_FR = {fr: f"domain:{d}" for d, (_, fr) in DOMAINS.items()}
SCHOOL_FR = {"Abjuration": "Abjuration", "Conjuration": "Invocation", "Divination": "Divination", "Enchantment": "Enchantement",
             "Evocation": "Évocation", "Illusion": "Illusion", "Necromancy": "Nécromancie", "Transmutation": "Transmutation",
             "Universal": "Universel"}
SUBSCHOOL_FR = {"Compulsion": "coercition", "Charm": "charme", "Healing": "guérison", "Summoning": "convocation",
                "Teleportation": "téléportation", "Creation": "création", "Calling": "appel",
                # DRS 20: "Hallucination" changes the subject's sensory qualities (= glamer), "chimère" = figment.
                "Glamer": "hallucination", "Figment": "chimère", "Pattern": "mirage",
                "Phantasm": "fantasme", "Shadow": "ombre", "Scrying": "scrutation",
                # two subschools: Gate, Mislead (French order)
                "Creation or Calling": "appel ou création", "Figment, Glamer": "chimère, hallucination"}
# English name -> French DRS 22 heading, for ties of the (levels, school) signature (the choice must be one of the tied
# candidates; checked at build time). Identified from the French spell descriptions.
HAND_FR: dict[str, str] = {
    "Detect Animals or Plants": "Détection de la faune ou de la flore", "Detect Snares and Pits": "Détection des collets et des fosses",
    "Diminish Plants": "Rabougrissement des plantes", "Plant Growth": "Croissance végétale",
    "Magic Fang, Greater": "Morsure magique suprême", "Magic Fang": "Morsure magique", "Entangle": "Enchevêtrement",
    "Longstrider": "Grand pas", "Pass without Trace": "Passage sans trace", "Reduce Animal": "Rapetissement d’animal",
    "Tree Shape": "Forme d’arbre", "Snare": "Collet", "Spike Growth": "Croissance d’épines",
    # Druid list.
    "Air Walk": "Marche dans les airs", "Giant Vermin": "Vermine géante",
    "Animal Shapes": "Métamorphose animale", "Control Plants": "Contrôle des plantes",
    "Animate Plants": "Animation des plantes", "Changestaff": "Bâton sylvanien",
    "Transmute Metal to Wood": "Transmutation du métal en bois",
    "Antipathy": "Aversion", "Sympathy": "Attirance", "Awaken": "Éveil", "Control Winds": "Contrôle des vents",
    "Baleful Polymorph": "Métamorphose funeste", "Transmute Mud to Rock": "Transmutation de la boue en pierre",
    "Transmute Rock to Mud": "Transmutation de la pierre en boue",
    "Bear's Endurance, Mass": "Endurance de l’ours de groupe", "Bull's Strength, Mass": "Force de taureau de groupe",
    "Owl's Wisdom, Mass": "Sagesse du hibou de groupe",
    "Chill Metal": "Métal gelé", "Heat Metal": "Métal brûlant", "Soften Earth and Stone": "Ramollissement de la terre et de la pierre",
    "Warp Wood": "Distorsion du bois", "Wood Shape": "Façonnage du bois",
    "Creeping Doom": "Mort rampante", "Summon Nature's Ally VII": "Convocation d’alliés naturels VII",
    "Elemental Swarm": "Nuée d’élémentaires", "Summon Nature's Ally IX": "Convocation d’alliés naturels IX",
    "Faerie Fire": "Lueur féerique", "Produce Flame": "Flammes", "Flaming Sphere": "Sphère de feu", "Gust of Wind": "Bourrasque",
    "Goodberry": "Baie nourricière", "Shillelagh": "Gourdin magique", "Hallow": "Sanctification", "Unhallow": "Sanctification maléfique",
    "Ironwood": "Bois de fer", "Liveoak": "Chêne animé", "Repel Wood": "Éloignement du bois", "Spellstaff": "Bâton à sort",
    "Reincarnate": "Réincarnation", "Rusting Grasp": "Rouille", "Spike Stones": "Pierres acérées",
    # Cleric list (the DD-3e glossary has the 3.0 name "glyphe de garde divin").
    "Glyph of Warding, Greater": "Glyphe de garde suprême",
    # Bard and sorcerer/wizard lists.
    "Arcane Sight, Greater": "Vision magique suprême", "Black Tentacles": "Tentacules noirs",
    "Command Undead": "Contrôle mineur des morts-vivants", "False Life": "Simulacre de vie",
    "Forceful Hand": "Main impérieuse", "Freezing Sphere": "Sphère glaciale", "Heroism": "Héroïsme", "Rage": "Rage",
    "Heroism, Greater": "Héroïsme suprême", "Hold Monster, Mass": "Immobilisation de monstre de groupe",
    "Hold Person, Mass": "Immobilisation de personne de groupe", "Overland Flight": "Vol supérieur",
    "Ray of Exhaustion": "Rayon d’épuisement", "Resilient Sphere": "Sphère d’isolement",
    "Shadow Conjuration, Greater": "Convocation d’ombres suprême", "Telepathic Bond": "Lien télépathique",
    "Transformation": "Transformation martiale", "Blur": "Flou",
    "Enlarge Person, Mass": "Agrandissement de groupe", "Reduce Person, Mass": "Rapetissement de groupe",
}
# DRS 22 headings misprinted (the DRS 21 list spells them right).
FR_NAME_ERRATA = {"Transformation martialle": "Transformation martiale"}  # DRS 21 Sor/Wiz 6: "Transformation martiale"
# French SRD header lines (DRS 22) that disagree with the English SRD; the English side was checked on the d20srd spell
# pages. French name -> (field, French text, corrected text) or a list of them; field is "level", "school" or a French
# header label. The level line is only used for matching (levels come from the English SRD); the other lines are shown,
# so they are fixed.
FR_HEADER_ERRATA = {
    "Force de taureau": ("level", "Bard 2, Dru 2, Ens/Mag 2, Force 2, Pal 2, Prê 2",  # SRD: no bard (Clr, Drd, Pal, Sor/Wiz 2)
                         "Dru 2, Ens/Mag 2, Force 2, Pal 2, Prê 2"),
    "Nappe de brouillard": ("level", "Ens/Mag 2, Eau 2", "Dru 2, Ens/Mag 2, Eau 2"),  # Drd 2 missing (DRS 21 has it)
    "Façonnage de la pierre": ("level", "Dru 3, Ens/Mag 5, Prê 3, Terre 3", "Dru 3, Ens/Mag 4, Prê 3, Terre 3"),  # SRD Sor/Wiz 4
    "Détection de la magie": ("school", "Universel", "Divination"),  # SRD 3.5: Divination (Universal was 3.0)
    "Tempête vengeresse": ("school", "Invocation (conjuration)", "Invocation (convocation)"),  # SRD: Conjuration (Summoning)
    "Voie végétale": ("school", "Transmutation", "Invocation (téléportation)"),  # SRD: Conjuration (Teleportation)
    "Germes de feu": ("Résistance à la magie", "oui", "non"),  # SRD: Spell Resistance: No
    "Porte dimensionnelle": [("school", "Invocation [téléportation]", "Invocation (téléportation)"),  # SRD: Conjuration (Teleportation)
                             ("Résistance à la magie", "oui ou non (objet)", "non et oui (objet)")],  # SRD: No and Yes (object)
    "Métamorphose universelle": ("Jet de sauvegarde", "Volonté, annule (objet) (voir description)",  # SRD: Fortitude negates
                                 "Vigueur, annule (objet) (voir description)"),
    "Ténèbres maudites": ("Jet de sauvegarde", "Vigueur, partiel", "Volonté, partiel"),  # SRD: Will partial
    "Refuge": ("school", "Transmutation [téléportation]", "Invocation (téléportation)"),  # SRD: Conjuration (Teleportation)
    "Téléportation suprême": ("school", "Invocaion (téléportation)", "Invocation (téléportation)"),  # misprint
    "Vision dans le noir": ("Jet de sauvegarde", "aucun", "Volonté, annule (inoffensif)"),  # SRD: Will negates (harmless)
    # 3.0 school (Conjuration (Creation)) left in the French header; SRD 3.5 flameArrow.htm: Transmutation [Fire].
    "Flèches enflammées": ("school", "Invocation [feu]", "Transmutation [feu]"),
    "Flou": ("school", "Illusion (chimère)", "Illusion (hallucination)"),  # SRD blur.htm: Illusion (Glamer)
}
# DRS 21 list names that differ from the DRS 22 heading, and DRS 22 spells missing from a DRS 21 list (checked by hand:
# the English SRD list has them).
FR_LIST_ALIAS = {"Morsure magique suprême": "Morsure magique aggravée",  # druid list
                 "Soins intensifs de groupe": "Soins critiques de groupe",  # cleric list and Healing domain list
                 "Blessure grave de groupe": "Blessure importante de groupe"}  # cleric list
# The French header uses another of the target / area / effect lines than the English SRD: English field -> French field.
FR_FIELD_FROM = {"Blight": {"target": "effect"}, "Ironwood": {"effect": "target"}, "Stone Tell": {"target": "area"},
                 "Storm of Vengeance": {"effect": "area"}}
# DRS 21 paladin list misprint: "Restauration partielle" printed at 4th level, where the SRD has restoration (Pal 4)
# and lesser restoration at 1st (https://www.d20srd.org/srd/spells/restoration.htm, restorationLesser.htm). SRD kept.
# DRS 21 list lines that lost words: (list, level, printed name) -> name. Bard 6: "Charme-monstre" and "Ruse du renard"
# ("Comme charme-monstre, mais sur 9 m de rayon", "... affecte 1 sujet/niveau") are the mass versions (SRD Brd 6).
FR_LIST_NAME_ERRATA = {("bard", 6, "Charme-monstre"): "Charme-monstre de groupe",
                       ("bard", 6, "Ruse du renard"): "Ruse du renard de groupe",
                       # Bard 5 "Héroïsme. Confère +4 ...": greater heroism (SRD Brd 5; heroism is Brd 2, +2).
                       ("bard", 5, "Héroïsme"): "Héroïsme suprême",
                       ("sorcerer-wizard", 9, "Immobilisation de montre de groupe"): "Immobilisation de monstre de groupe"}
FR_LIST_MISPRINT = {("Restauration partielle", "paladin"), ("Restauration", "paladin")}
FR_LIST_MISSING = {("Soins importants de groupe", "druid"), ("Détection du poison", "ranger"),
                   ("Annihilation de mort-vivant", "cleric")}
FIELDS = {  # French header label -> SpellDef field
    "Composantes": "components", "Temps d’incantation": "castingTime", "Portée": "range", "Cible": "target", "Cibles": "target",
    "Zone d’effet": "area", "Effet": "effect", "Durée": "duration", "Jet de sauvegarde": "save",
    "Résistance à la magie": "spellResistance", "Cible ou zone d’effet": "target/area", "Cible, effet ou zone d’effet": "any",
    "Cible ou effet": "target/effect", "Zone d’effet ou cible": "target/area", "Cible ou cibles": "target",
    "Cible/effet": "target/effect", "Cibles ou effet": "target/effect",
}
# Obvious misprints of the French SRD, corrected against the English SRD (each must still be found in the source).
# Spell-list summaries that contradict the spell's own 3.5 text (the full description wins).
SUMMARY_ERRATA = {
    # 3.5: +1 per four caster levels (https://www.d20srd.org/srd/spells/magicFangGreater.htm); the list says three.
    "magic-fang-greater": [("en", ("+1/three caster levels", "+1/four caster levels")), ("fr", ("dégâts/3 niveaux", "dégâts/4 niveaux"))],
    # 3.0 leftover in the French list: animal growth gives no extra Hit Dice in 3.5.
    "animal-growth": [("fr", ("Double la taille et les DV de", "Double la taille de"))],
    # 3.0 radius (15 ft.) in the French list; 3.5 and the DRS 22 header: 20 ft. = 6 m.
    "silence": [("fr", ("dans un rayon de 4,50 m", "dans un rayon de 6 m"))],
    # Official misprint in the French list: the radius is fixed, 80 ft. = 24 m (SRD earthquake.htm; DRS 22 header
    # "étendue de 24 m de rayon").
    "earthquake": [("fr", ("dans un rayon de 1,50 m/niv.", "dans un rayon de 24 m"))],
    # dnd35.db repeats confusion's line; the SRD bard list (spellLists/bardSpells.htm) and confusionLesser.htm: one
    # creature, 1 round.
    "confusion-lesser": [("en", ("Subjects behave oddly for 1 round/level.", "One creature is confused for 1 round."))],
}

FR_ERRATA = {
    # DRS 22: "jusqu'à un maximum de +35"; English SRD and the DRS 21 list line both say +15.
    "cure-serious-wounds": [("jusqu’à un maximum de +35", "jusqu’à un maximum de +15")],
    # DRS 22: 6d6 for both alignment steps; SRD (https://www.d20srd.org/srd/spells/forbiddance.htm): 12d6 for two.
    "forbiddance": [("(Loi/Chaos et Bien/Mal) : la créature perd 6d6 points de vie", "(Loi/Chaos et Bien/Mal) : la créature perd 12d6 points de vie")],
}
# DRS 21 list headings checked against each built spell (the French entry must be on the list at the same level).
LIST_HEAD_FR = {"Sorts de prêtre": "cleric", "Sorts de druide": "druid", "Sorts de rôdeur": "ranger", "Sorts de paladin": "paladin",
                "Sorts de barde": "bard", "Sorts d’ensorceleur": "sorcerer-wizard"}
# Spell lists built in full (every spell on these lists is in spells.json; the domain lists too).
BUILT_LISTS = ("cleric", "druid", "ranger", "paladin", "bard", "sorcerer-wizard", "wizard")
# DRS 21 list that holds a built list (the wizard-only spells are on the sorcerer/wizard list).
FR_LIST_OF = {"wizard": "sorcerer-wizard"}
# dnd35.db references kept: the core spell chapters (psionic and epic spells are not core; the extra-domain chapter
# repeats Undeath to Death, whose core entry is in SpellsT-Z).
CORE_REFS = ("SRD 3.5 Spells",)
SPELL_FILES = ["DRS 22a", "DRS 22b", "DRS 22c", "DRS 22d"]
# d20srd page names that do not follow the camelCase rule of the spell name.
URL_FIX = {"Magic Fang, Greater": "magicFangGreater", "Summon Nature's Ally I": "summonNaturesAllyI",
           "Summon Nature's Ally II": "summonNaturesAllyII", "Summon Nature's Ally III": "summonNaturesAllyIII",
           "Summon Nature's Ally IV": "summonNaturesAllyIV"}


def spell_url(name: str) -> str:
    if name in URL_FIX:
        page = URL_FIX[name]
    else:
        words = re.findall(r"[A-Za-z0-9]+", name.replace("'", ""))
        page = words[0].lower() + "".join(w[0].upper() + w[1:] for w in words[1:])
    return f"https://www.d20srd.org/srd/spells/{page}.htm"


def levels(s: str, table: dict) -> dict:
    """'Clr 2, Sor/Wiz 3' -> {list id: level} for the names in `table` (tolerates a missing comma: 'Mort 7 Prê 7')."""
    out = {}
    for name, n in re.findall(r"([^\d,]+?)\s+(\d)", s or ""):
        name = name.strip(" ,")
        if name in table:
            out[table[name]] = int(n)
    return out


COMPONENTS_FR = {"V": "V", "S": "G", "M": "M", "F": "F", "DF": "FD", "XP": "PX"}


def glossary_name(en: str) -> str:
    """'Heal, Mass' -> 'Mass Heal' (the glossary's word order)."""
    m = re.match(r"^(.+), (Mass|Greater|Lesser)$", en)
    return f"{m.group(2)} {m.group(1)}" if m else en


def components_key(s: str, fr: bool) -> frozenset:
    """Components as a set of English codes ('V, G, M/FD' and 'V, S, M/DF' give the same key)."""
    inv = {v: k for k, v in COMPONENTS_FR.items()}
    codes = re.findall(r"[A-Z]+", re.sub(r"\(.*?\)", "", s or ""))
    return frozenset(inv.get(c, c) if fr else c for c in codes)


def spell_tags(r) -> dict:
    """schoolId, subschool, descriptors from the dnd35.db columns (lowercase English, kebab-case). Where the SRD gives
    a choice ('Creation or Calling', 'Fire or Cold', 'Figment, Glamer') the subschool is the first one and the
    descriptors are all those that the spell can have; 'see text' descriptors (summon monster, align weapon, planar
    ally, elemental swarm: the descriptor depends on the creature or alignment chosen) give none."""
    out = {"schoolId": r["school"].strip().lower()}
    sub = nz(r["subschool"])
    if sub:
        subs = [x.strip().lower() for x in re.split(r",| or ", sub)]
        out["subschool"] = subs[0]
        if len(subs) > 1:  # SpellDef.subschool holds one string: the others are only reported
            NOTES.append(f"spells: {r['name']}: subschool {sub!r} (\"{'or' if ' or ' in sub else 'and'}\"); "
                         f"subschool stores {subs[0]!r}, not stored: {subs[1:]}")
    desc = nz(r["descriptor"]) or ""
    if desc.lower().startswith("see text"):
        desc = ""
    tags = [re.sub(r"[^a-z]+", "-", t.strip().lower()).strip("-") for t in re.split(r",|\bor\b", desc) if t.strip()]
    out["descriptors"] = list(dict.fromkeys(tags))
    return out


def fr_spell_entries() -> list[dict]:
    out = []
    for f in SPELL_FILES:
        ps = rtf_fr.load(f)
        starts = [i for i, p in enumerate(ps) if p.bold_all and not p.in_table and i + 2 < len(ps)
                  and any(q.text.startswith("Niveau :") for q in ps[i + 1:i + 3])]
        # A few entries print the school line in bold too: it is part of the entry above, not a new spell.
        starts = [i for i in starts if i - 1 not in starts]
        for n, i in enumerate(starts):
            end = starts[n + 1] if n + 1 < len(starts) else len(ps)
            e = {"name": ps[i].text, "file": f, "fields": {}, "body": []}
            for p in ps[i + 1:end]:
                m = re.match(r"^([^:]{3,40}?) ?: (.*)$", p.text)  # "Cibles: ..." (Porte dimensionnelle) too
                if p.text.startswith("Niveau :"):
                    e["level"] = p.text[len("Niveau :"):].strip()
                elif "level" not in e and not e["body"]:
                    e["school"] = p.text
                elif m and m.group(1) in FIELDS and not e["body"]:
                    e["fields"][m.group(1)] = m.group(2).strip()
                elif not e["body"] and e["fields"] and list(e["fields"].values())[-1].endswith(p.text.strip()):
                    pass  # line break inside a header line, read twice (contact glacial: "(jusqu’à 1/niveau)")
                else:
                    e["body"].append(p)
            out.append(e)
    return out


def fr_list_summaries() -> tuple[dict, dict, dict]:
    """DRS 21: {norm(name): summary} over all lists, {list id: {norm(name): {levels}}} for the LIST_HEAD_FR lists (a
    French name can be on a list twice: "Refuge" is Sor/Wiz 4 and 9), and {list id: {norm(name): {level: summary}}}."""
    ps = rtf_fr.load("DRS 21")
    summ: dict[str, str] = {}
    lists: dict[str, dict[str, set[int]]] = {lst: {} for lst in LIST_HEAD_FR.values()}
    list_summ: dict[str, dict[str, dict[int, str]]] = {lst: {} for lst in LIST_HEAD_FR.values()}
    renamed = set()
    cur, lvl = None, None
    for p in ps:
        if p.bold_all and not p.in_table:
            cur = next((lst for head, lst in LIST_HEAD_FR.items() if p.text.startswith(head)), None)
            m = re.search(r"du (?:niveau )?(\d)", p.text)
            lvl = int(m.group(1)) if m else None
            continue
        b = p.bold_prefix.strip()
        if b.endswith("."):
            name, rest = b[:-1], p.text[len(b):]
        else:
            # Sorcerer/wizard list: the first spell of each school starts with the school, not in bold ("Abjur Alarme.");
            # a few lines lost their bold or kept a stray dot ("Métamorphose universelle.", ". Pattes d’araignée.").
            m = re.match(r"^(?:(?:Abjur|Div|Ench|Évoc|Illu|Invoc|Nécro|Trans|Univ) |\. )(.+?)\.(?: |$)", p.text)
            if not m and cur:
                m = re.match(r"^()(.+?)\.(?: |$)", p.text) if b and p.text.startswith(b) else None
            if not m:
                continue
            name, rest = m.group(m.lastindex), p.text[len(m.group(0)):]
        name = re.sub(r"\s*\((M|F|X|FD|PX)(, ?(M|F|X|FD|PX))*\)\s*$", "", name).strip()
        name = re.sub(r"^\d\s+", "", name)
        if (cur, lvl, name) in FR_LIST_NAME_ERRATA:
            renamed.add((cur, lvl, name))
            name = FR_LIST_NAME_ERRATA[(cur, lvl, name)]
        rest = rest.strip()
        for one in split_alignments(name):
            summ.setdefault(norm(one), rest)
            if cur and lvl is not None:
                lists[cur].setdefault(norm(one), set()).add(lvl)
                list_summ[cur].setdefault(norm(one), {})[lvl] = rest
    assert renamed == set(FR_LIST_NAME_ERRATA), set(FR_LIST_NAME_ERRATA) - renamed
    return summ, lists, list_summ


def split_alignments(name: str) -> list[str]:
    """DRS 21 lines that group the four alignment spells: 'Détection de la Loi/du Bien/du Chaos/du Mal' ->
    ['Détection de la Loi', 'Détection du Bien', 'Détection du Chaos', 'Détection du Mal']."""
    parts = name.split("/")
    # Paladin list: 'Protection contre le Chaos/Mal' (no article after the slash: same as the first part).
    m0 = re.match(r"^(.*?\s(?:de la|du|la|le))\s(?:Loi|Bien|Chaos|Mal)$", parts[0])
    if m0 and len(parts) > 1 and all(re.match(r"^(?:Loi|Bien|Chaos|Mal)$", x) for x in parts[1:]):
        art = m0.group(1).rsplit(" ", 1)[-1]
        art = "le" if art in ("la", "le") and parts[1] in ("Chaos", "Mal") else art
        return [parts[0]] + [f"{m0.group(1).rsplit(' ', 1)[0]} {art} {x}" for x in parts[1:]]
    m = re.match(r"^(.*?)\s(?:de la|du|la|le)\s(?:Loi|Bien|Chaos|Mal)$", parts[0])
    if len(parts) < 2 or not m or not all(re.match(r"^(?:de la|du|la|le)\s(?:Loi|Bien|Chaos|Mal)$", x) for x in parts[1:]):
        return [name]
    return [parts[0]] + [f"{m.group(1)} {x}" for x in parts[1:]]


def fr_list_level(lst: dict, name: str):
    """Entry of a French spell name in a DRS 21 dict (its levels, summary...; singular/plural tolerant)."""
    n = norm(name)
    if n in lst:
        return lst[n]
    return next((v for k, v in lst.items() if k.rstrip("s") == n.rstrip("s")), None)


def en_school(r) -> str:
    s = r["school"]
    if r["subschool"] and r["subschool"] != "None":
        s += f" ({r['subschool']})"
    if r["descriptor"] and r["descriptor"] != "None":
        s += f" [{r['descriptor']}]"
    return s


# dnd35.db values that contradict the d20srd spell page (school line of every built spell checked online).
DB_FIX = {
    # https://www.d20srd.org/srd/spells/heroesFeast.htm: Conjuration (Creation); the database has it as a descriptor.
    "Heroes' Feast": {"subschool": "Creation", "descriptor": "None"},
    # symbolOfWeakness.htm, undeathToDeath.htm: Necromancy, no [Death] descriptor.
    "Symbol of Weakness": {"descriptor": "None"}, "Undeath to Death": {"descriptor": "None"},
}


def nz(v):
    return None if v is None or v.strip() in ("None", "") else v.strip()


TIE_LOG: list[str] = []  # how each tie of the (levels, school) signature was settled (for inspection, not printed)


def fr_candidates(r, lv: dict, lvd: dict, fr_all: list[dict]) -> tuple[list[dict], str]:
    """French DRS 22 entries for an English spell row: same core class levels and school (+ subschool); ties settled by
    HAND_FR, the DD-3e glossary name, the domain levels, then the components. Returns (candidates, how the tie went)."""
    en = r["name"]
    school_fr = SCHOOL_FR[r["school"]]
    if nz(r["subschool"]):
        school_fr += f" ({SUBSCHOOL_FR.get(r['subschool'], '?')})"
    cands = [e for e in fr_all if levels(e.get("level", ""), LIST_FR) == lv
             and re.match(re.escape(school_fr) + r"(\s*\[|\s*$)", e.get("school", ""))]
    if len(cands) <= 1:
        return cands, ""
    if en in HAND_FR:
        return [e for e in cands if norm(e["name"]) == norm(HAND_FR[en])], "HAND_FR"
    gl = glossary_fr.lookup(glossary_name(en), "sort")
    keys = (("glossary", lambda e: gl is not None and norm(e["name"]) == norm(gl)),
            ("domain levels", lambda e: levels(e.get("level", ""), DOMAIN_FR) == lvd),
            ("components", lambda e: components_key(e["fields"].get("Composantes", ""), True)
             == components_key(r["components"], False)))
    for label, key in keys:
        narrowed = [e for e in cands if key(e)]
        if narrowed:
            cands = narrowed
        if len(cands) == 1:
            return cands, label
    return cands, "unsettled"


def build_spells() -> list[dict]:
    c = db()
    fr_all = fr_spell_entries()
    renamed = set()
    for e in fr_all:
        if e["name"] in FR_NAME_ERRATA:
            NOTES.append(f"spells: French SRD heading misprint corrected: '{e['name']}' -> '{FR_NAME_ERRATA[e['name']]}'")
            renamed.add(e["name"])
            e["name"] = FR_NAME_ERRATA[e["name"]]
    assert renamed == set(FR_NAME_ERRATA), set(FR_NAME_ERRATA) - renamed
    fixed = []
    for e in fr_all:  # two French spells can share a name (Refuge): the erratum applies to the one with the old line
        fixes = FR_HEADER_ERRATA.get(e["name"], [])
        for field, old, new in [fixes] if isinstance(fixes, tuple) else fixes:
            where = e if field in ("level", "school") else e["fields"]
            if where.get(field) == old:
                where[field] = new
                fixed.append((e["name"], field))
                NOTES.append(f"spells: French SRD {field} line corrected for {e['name']}: '{old}' -> '{new}'")
    wanted = [(n, f[0]) for n, v in FR_HEADER_ERRATA.items() for f in ([v] if isinstance(v, tuple) else v)]
    assert sorted(fixed) == sorted(wanted), set(wanted) ^ set(fixed)
    by_norm = {norm(e["name"]): e for e in fr_all}
    dup_fr = {n for n in by_norm if sum(1 for e in fr_all if norm(e["name"]) == n) > 1}
    summaries, fr_lists, list_summaries = fr_list_summaries()
    out = []
    used_fr: dict[int, str] = {}  # one French entry per English spell
    for r in c.execute("select * from spell order by name"):
        en = r["name"]
        if not r["reference"].startswith(CORE_REFS):
            continue
        r = {**dict(r), **DB_FIX.get(en, {})}
        lv = levels(r["level"], LIST_EN)
        lvd = levels(r["level"], DOMAIN_EN)
        if not any(lst in lv for lst in BUILT_LISTS) and not lvd:
            continue
        cands, how = fr_candidates(r, lv, lvd, fr_all)
        if how:
            TIE_LOG.append(f"{en} -> {cands[0]['name'] if len(cands) == 1 else '?'} ({how})")
        assert len(cands) == 1, f"spell {en}: {len(cands)} French candidates {[e['name'] for e in cands]}"
        fr = cands[0]
        assert id(fr) not in used_fr, f"spell {en}: French entry {fr['name']} already taken by {used_fr[id(fr)]}"
        used_fr[id(fr)] = en
        fr_dom = levels(fr.get("level", ""), DOMAIN_FR)
        if fr_dom != lvd:
            # Domain levels come from the SRD; the French level line is only reported (DRS 22 slips).
            NOTES.append(f"spells: {en} / {fr['name']}: DRS 22 domain levels {fr_dom} differ from the SRD {lvd} (SRD kept)")
        for lst in BUILT_LISTS:
            if lst not in lv:
                continue
            if (fr["name"], lst) in FR_LIST_MISPRINT:
                NOTES.append(f"spells: {fr['name']} ({en}): DRS 21 paladin list misprint (restauration partielle at 4th); SRD level {lv[lst]} kept")
                continue
            fr_list = fr_lists[FR_LIST_OF.get(lst, lst)]
            if (fr["name"], lst) in FR_LIST_MISSING:
                assert fr_list_level(fr_list, fr["name"]) is None, (en, lst)
                NOTES.append(f"spells: {fr['name']} ({en}) is missing from the DRS 21 {lst} list (DRS 22 and the SRD have it)")
                continue
            found = (fr_list_level(fr_list, fr["name"]) or set()) | (fr_list_level(fr_list, FR_LIST_ALIAS.get(fr["name"], "")) or set())
            assert lv[lst] in found, f"spell {en}: {fr['name']} is not on the DRS 21 {lst} list at level {lv[lst]}"

        # French header lines, inherited from the spell named in "semblable à X" when missing (X may itself inherit:
        # cercle magique contre le Chaos -> cercle magique contre le Mal -> protection contre le Mal).
        fields = dict(fr["fields"])
        e = fr
        for _ in range(3):
            first = e["body"][0].text if e["body"] else ""
            m = re.search(r"(?:semblable à |même principe que |même principe qu’|fonctionne comme )(?:celui d’une? |celle créée par |celui que génère )?(.+?), "
                          r"(?:si ce n’est|excepté|sauf|mais)", first)                 or re.search(r"Reportez-vous à la description du sort (.+?), ci-dessus", first)  # confusion mineure
            if not m:
                break
            e = by_norm.get(norm(m.group(1)))
            assert e, f"spell {en}: base spell '{m.group(1)}' not found"
            for k, v in e["fields"].items():
                fields.setdefault(k, v)
        fr_f: dict[str, str] = {}
        for label, v in fields.items():
            fr_f.setdefault(FIELDS[label], v)

        for k in ("castingTime", "range", "duration"):
            assert k in fr_f, f"spell {en}: no French {k} in {fields}"
        en_f = {"target": nz(r["target"]), "area": nz(r["area"]), "effect": nz(r["effect"])}
        if en_f["target"] and en_f["target"] == en_f["area"]:
            en_f["area"] = None  # SRD "Target or Area" line duplicated in both columns
        d = dict(id=re.sub(r"[^a-z0-9]+", "-", en.lower().replace("'", "")).strip("-"), name=i18n(en, fr["name"]),
                 school=i18n(en_school(r), fr["school"]), level=dict(sorted({**lv, **lvd}.items())), **spell_tags(r),
                 components=r["components"],
                 castingTime=i18n(r["casting_time"], fr_f["castingTime"]), range=i18n(r["range"], fr_f["range"]))
        for k in ("target", "area", "effect"):
            if not en_f[k]:
                continue
            v = fr_f.get(k) or fr_f.get("target/area" if k in ("target", "area") else "") or fr_f.get("target/effect" if k in ("target", "effect") else "") or fr_f.get("any")
            if not v and k in FR_FIELD_FROM.get(en, {}):
                v = fr_f.get(FR_FIELD_FROM[en][k])
            if not v:  # the French header uses another line: take it when it is the only one left unused
                spare = [f for f in ("target", "area", "effect") if fr_f.get(f) and not en_f[f]]
                if len(spare) == 1:
                    v = fr_f[spare[0]]
                    NOTES.append(f"spells: {en}: English {k} line paired with the French {spare[0]} line")
            assert v, f"spell {en}: no French {k} in {fields}"
            d[k] = i18n(en_f[k], v)
        d["duration"] = i18n(r["duration"], fr_f["duration"])
        # Personal spells have no save / SR line in the SRD; the database stores "None"/"No" (or nothing).
        save_en, sr_en = nz(r["saving_throw"]) or "None", nz(r["spell_resistance"]) or "No"
        if "save" not in fr_f:
            assert save_en == "None", (en, save_en, fields)
        if "spellResistance" not in fr_f:
            assert sr_en == "No", (en, sr_en, fields)
        d["save"] = i18n(save_en, fr_f.get("save", "aucun"))
        d["spellResistance"] = i18n(sr_en, fr_f.get("spellResistance", "non"))
        # The first DRS 21 line with that name; for a French name shared by two spells, the line of the spell's own
        # list and level (the cleric 7 / Sor/Wiz 9 "Refuge" is not the bard / Sor/Wiz 4 "Refuge").
        names = (fr["name"], FR_LIST_ALIAS.get(fr["name"], fr["name"]))
        own = [(fr_list_level(list_summaries[FR_LIST_OF.get(lst, lst)], n) or {}).get(lv[lst])
               for lst in BUILT_LISTS if lst in lv for n in names]
        s_fr = next((x for x in own if x), None) if norm(fr["name"]) in dup_fr else None
        s_fr = s_fr or next((fr_list_level(summaries, n) for n in names if fr_list_level(summaries, n)), None)
        assert s_fr, f"spell {en}: no DRS 21 summary for {fr['name']}"
        d["summary"] = i18n(r["short_description"], s_fr)
        for lang, (old, new) in SUMMARY_ERRATA.get(d["id"], []):
            assert old in d["summary"][lang], (d["id"], lang, old)
            d["summary"][lang] = d["summary"][lang].replace(old, new)
        d["text"] = i18n(clip_paras(html_paras(r["full_text"]), 6000), clip_paras(fr_paras_html(fr["body"]), 6000)
                         or f"<p>{esc(fr['name'])}</p>")
        for a, b in FR_ERRATA.get(d["id"], []):
            assert a in d["text"]["fr"], (d["id"], a)
            d["text"]["fr"] = d["text"]["fr"].replace(a, b)
            NOTES.append(f"spells: French SRD misprint corrected in {d['id']}: '{a}' -> '{b}'")
        d["source"] = srd_source(spell_url(en), f"{rtf_fr.file_label(fr['file'])}, {rtf_fr.file_label('DRS 21')}")
        out.append(d)
    assert len(out) == len({d["id"] for d in out})
    write_json(OUT_SRD / "spells.json", out)
    return out
