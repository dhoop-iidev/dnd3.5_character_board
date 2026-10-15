"""The 7 SRD 3.5 races (src/data/srd/races.json), https://www.d20srd.org/srd/races.htm.

Numbers and modifiers are entered by hand from the SRD race bullets (listed next to each value); trait texts and the
race text are the bullets of the English SRD RTF (03_Races) and of the official French SRD (DRS 02), found by regex
and checked at build time. Small-size modifiers (+1 AC/attack, -4 grapple, +4 Hide, 3/4 load) are NOT listed:
the engine derives them from `size`.
"""
from __future__ import annotations

import re

import rtf_fr
import srd_urls
from common import OUT_SRD, esc, i18n, srd_source, write_json


def M(target, value, bonusType="racial", cond=None):
    d = {"target": target, "bonusType": bonusType, "value": value}
    if cond:
        d["condition"] = i18n(*cond)
    return d


LANG = {
    "Common": "Commun", "Dwarven": "Nain", "Elven": "Elfe", "Gnome": "Gnome", "Halfling": "Halfelin", "Orc": "Orque",
    "Giant": "Géant", "Goblin": "Gobelin", "Terran": "Terreux", "Undercommon": "Commun des Profondeurs", "Draconic": "Draconien",
    "Gnoll": "Gnoll", "Sylvan": "Sylvestre", "Abyssal": "Abyssal",
}
ANY_LANG = ("Any (other than secret languages, such as Druidic)",
            "Au choix (à l’exception des langages secrets, tels que la langue des druides)")

ENCHANT = ("vs enchantment spells or effects", "contre les sorts et effets de l’école des enchantements")
GIANTS = ("vs monsters of the giant type (lost when denied Dex bonus to AC)",
          "contre les créatures du type géant (perdu sans bonus de Dex à la CA)")

# Each trait: (name_en, name_fr, regex on the EN bullet, regex on the FR bullet)
RACES = [
    dict(id="human", en="Human", fr="Humain", en_head="HUMANS", fr_head="Humains", anchor="humans", size="medium", speed=30,
         abilities={}, bonusFeat=True, extraSkillPoints=1, favoredClass="any", vision="normal",
         auto=["Common"], bonus=None, modifiers=[], traits=[]),
    dict(id="dwarf", en="Dwarf", fr="Nain", en_head="DWARVES", fr_head="Nains", anchor="dwarves", size="medium", speed=20,
         speedNotReducedByArmor=True, abilities={"con": 2, "cha": -2}, favoredClass="fighter", vision="darkvision", darkvision=60,
         auto=["Common", "Dwarven"], bonus=["Giant", "Gnome", "Goblin", "Orc", "Terran", "Undercommon"],
         weaponFamiliarity=["dwarven-urgrosh", "dwarven-waraxe"],
         modifiers=[
             M("skill.search", 2, cond=("to notice unusual stonework (stonecunning)", "pour remarquer une maçonnerie inhabituelle (connaissance de la pierre)")),
             M("check.str", 4, "untyped", ("to resist being bull rushed or tripped while standing on the ground (stability)",
                                          "pour résister à une bousculade ou un croc-en-jambe, debout sur le sol (stabilité)")),
             M("check.dex", 4, "untyped", ("to resist being bull rushed or tripped while standing on the ground (stability)",
                                          "pour résister à une bousculade ou un croc-en-jambe, debout sur le sol (stabilité)")),
             M("save.all", 2, cond=("vs poison", "contre le poison")),
             M("save.all", 2, cond=("vs spells and spell-like effects", "contre les sorts et pouvoirs magiques")),
             M("attack.all", 1, cond=("vs orcs and goblinoids", "contre les orques et les gobelinoïdes")),
             M("ac", 4, "dodge", GIANTS),
             M("skill.appraise", 2, cond=("for items related to stone or metal", "pour les objets en pierre ou en métal")),
             M("skill.craft", 2, cond=("for Craft related to stone or metal", "pour l’Artisanat lié à la pierre ou aux métaux")),
         ],
         traits=[("Darkvision", "Vision dans le noir", r"^Darkvision", r"^Vision dans le noir"),
                 ("Stonecunning", "Connaissance de la pierre", r"^Stonecunning", r"^Connaissance de la pierre"),
                 ("Stability", "Stabilité", r"^Stability", r"^Stabilité"),
                 ("Speed in armor", "Vitesse en armure", r"base land speed is 20 feet\. However", r"même lorsqu’ils portent une armure")]),
    dict(id="elf", en="Elf", fr="Elfe", en_head="ELVES", fr_head="Elfes", anchor="elves", size="medium", speed=30,
         abilities={"dex": 2, "con": -2}, favoredClass="wizard", vision="lowLight",
         auto=["Common", "Elven"], bonus=["Draconic", "Gnoll", "Gnome", "Goblin", "Orc", "Sylvan"],
         weaponProficiencies=["composite-longbow", "composite-shortbow", "longbow", "longsword", "rapier", "shortbow"],
         modifiers=[M("save.all", 2, cond=ENCHANT), M("skill.listen", 2), M("skill.search", 2), M("skill.spot", 2)],
         traits=[("Sleep immunity", "Immunité contre le sommeil", r"^Immunity to magic sleep", r"^Immunité contre les sorts et effets magiques de type sommeil"),
                 ("Low-light vision", "Vision nocturne", r"^Low-Light Vision", r"^Vision nocturne"),
                 ("Secret doors", "Portes secrètes", r"merely passes within 5 feet", r"Lorsqu’ils passent à moins de 1,50 mètre")]),
    dict(id="gnome", en="Gnome", fr="Gnome", en_head="GNOMES", fr_head="Gnomes", anchor="gnomes", size="small", speed=20,
         abilities={"con": 2, "str": -2}, favoredClass="bard", vision="lowLight",
         auto=["Common", "Gnome"], bonus=["Draconic", "Dwarven", "Elven", "Giant", "Goblin", "Orc"],
         weaponFamiliarity=["gnome-hooked-hammer"],
         modifiers=[M("save.all", 2, cond=("vs illusions", "contre les illusions")),
                    M("attack.all", 1, cond=("vs kobolds and goblinoids", "contre les kobolds et les gobelinoïdes")),
                    M("ac", 4, "dodge", GIANTS), M("skill.listen", 2),
                    M("skill.craft", 2, cond=("Craft (alchemy) only", "Artisanat (alchimie) seulement"))],
         traits=[("Low-light vision", "Vision nocturne", r"^Low-Light Vision", r"^Vision nocturne"),
                 ("Illusion spells", "Sorts d’illusion", r"^Add \+1 to the Difficulty Class", r"^Bonus de \+1 au DD"),
                 ("Speak with burrowing mammals", "Communication avec les animaux fouisseurs", r"speak with a burrowing mammal",
                  r"une fois par jour, ils peuvent s’entretenir"),
                 ("Spell-like abilities", "Pouvoirs magiques", r"^Spell-Like Abilities", r"^Pouvoirs magiques")]),
    dict(id="half-elf", en="Half-elf", fr="Demi-elfe", en_head="HALF-ELVES", fr_head="Demi-elfes", anchor="halfElves", size="medium",
         speed=30, abilities={}, favoredClass="any", vision="lowLight", auto=["Common", "Elven"], bonus=None,
         modifiers=[M("save.all", 2, cond=ENCHANT), M("skill.listen", 1), M("skill.search", 1), M("skill.spot", 1),
                    M("skill.diplomacy", 2), M("skill.gather-information", 2)],
         traits=[("Sleep immunity", "Immunité contre le sommeil", r"^Immunity to sleep", r"^Immunité contre les sorts et effets magiques de type sommeil"),
                 ("Low-light vision", "Vision nocturne", r"^Low-Light Vision", r"^Vision nocturne"),
                 ("Elven blood", "Sang elfique", r"^Elven Blood", r"^Sang elfique")]),
    dict(id="half-orc", en="Half-orc", fr="Demi-orque", en_head="HALF-ORCS", fr_head="Demi-orques", anchor="halfOrcs", size="medium",
         speed=30, abilities={"str": 2, "int": -2, "cha": -2}, favoredClass="barbarian", vision="darkvision", darkvision=60,
         auto=["Common", "Orc"], bonus=["Abyssal", "Draconic", "Giant", "Gnoll", "Goblin"], modifiers=[],
         traits=[("Minimum Intelligence", "Intelligence minimale", r"starting Intelligence score is always at least 3", None),
                 ("Darkvision", "Vision dans le noir", r"^Darkvision", r"^Vision dans le noir"),
                 ("Orc blood", "Sang orque", r"^Orc Blood", r"^Sang orque")]),
    dict(id="halfling", en="Halfling", fr="Halfelin", en_head="HALFLINGS", fr_head="Halfelins", anchor="halflings", size="small",
         speed=20, abilities={"dex": 2, "str": -2}, favoredClass="rogue", vision="normal",
         auto=["Common", "Halfling"], bonus=["Dwarven", "Elven", "Gnome", "Goblin", "Orc"],
         modifiers=[M("skill.climb", 2), M("skill.jump", 2), M("skill.move-silently", 2), M("save.all", 1),
                    M("save.all", 2, "morale", ("vs fear", "contre la terreur")),
                    M("attack.ranged", 1, cond=("with thrown weapons and slings", "avec les armes de jet et les frondes")),
                    M("skill.listen", 2)],
         traits=[]),
]

# Half-orc minimum Int: the French SRD has no matching sentence; own translation of the SRD sentence.
FR_FALLBACK = {
    ("half-orc", "Minimum Intelligence"): "La valeur d’Intelligence de départ d’un demi-orque est toujours d’au moins 3 : si cet "
                                          "ajustement la réduit à 1 ou 2, elle est malgré tout de 3. (Traduction de la phrase du SRD "
                                          "anglais, absente du SRD français.)",
}
HEADS_EN = {"HUMANS", "DWARVES", "ELVES", "GNOMES", "HALF-ELVES", "HALF-ORCS", "HALFLINGS"}
HEADS_FR = {"Humains", "Nains", "Elfes", "Gnomes", "Demi-elfes", "Demi-orques", "Halfelins"}


def bullets(paras, head, heads):
    i = next(k for k, p in enumerate(paras) if p.text.strip() == head)
    out = []
    for p in paras[i + 1:]:
        if p.text.strip() in heads:
            break
        out.append(p.text.lstrip("• ").strip())
    return out


def find(bl, rx, what):
    hits = [b for b in bl if re.search(rx, b)]
    assert hits, f"races: no bullet for {what} ({rx})"
    return hits[0]


def build_races(skill_ids: set[str], weapon_ids: set[str]) -> list[dict]:
    en_p = rtf_fr.load("03_", "en")
    fr_p = rtf_fr.load("DRS 02")
    fr_ref = rtf_fr.file_label("DRS 02")
    out = []
    for r in RACES:
        en_b = bullets(en_p, r["en_head"], HEADS_EN)
        fr_b = bullets(fr_p, r["fr_head"], HEADS_FR)
        traits = []
        for name_en, name_fr, rx_en, rx_fr in r["traits"]:
            t_en = find(en_b, rx_en, f"{r['id']} {name_en}")
            t_fr = find(fr_b, rx_fr, f"{r['id']} {name_fr}") if rx_fr else FR_FALLBACK[(r["id"], name_en)]
            traits.append({"name": i18n(name_en, name_fr), "text": i18n(t_en, t_fr)})
        for m in r["modifiers"]:
            if m["target"].startswith("skill."):
                assert m["target"][6:] in skill_ids, m
        for w in r.get("weaponProficiencies", []) + r.get("weaponFamiliarity", []):
            assert w in weapon_ids, w
        # sanity checks against the bullets
        speed_fr = {30: "9 mètres", 20: "6 mètres"}[r["speed"]]
        assert any(f"{r['speed']} feet" in b for b in en_b) and any(speed_fr in b for b in fr_b), r["id"]
        if r.get("darkvision"):
            assert any("60 feet" in b for b in en_b) and any("18 mètres" in b for b in fr_b), r["id"]

        d = dict(id=r["id"], name=i18n(r["en"], r["fr"]), size=r["size"], speed=r["speed"])
        if r.get("speedNotReducedByArmor"):
            d["speedNotReducedByArmor"] = True
        d["abilityAdjustments"] = r["abilities"]
        if r.get("bonusFeat"):
            d["bonusFeat"] = True
        if r.get("extraSkillPoints"):
            d["extraSkillPoints"] = r["extraSkillPoints"]
        d["favoredClass"] = r["favoredClass"]
        d["vision"] = r["vision"]
        if r.get("darkvision"):
            d["darkvision"] = r["darkvision"]
        d["automaticLanguages"] = [i18n(x, LANG[x]) for x in r["auto"]]
        d["bonusLanguages"] = [i18n(x, LANG[x]) for x in r["bonus"]] if r["bonus"] else [i18n(*ANY_LANG)]
        d["modifiers"] = r["modifiers"]
        if r.get("weaponProficiencies"):
            d["weaponProficiencies"] = r["weaponProficiencies"]
        if r.get("weaponFamiliarity"):
            d["weaponFamiliarity"] = r["weaponFamiliarity"]
        d["traits"] = traits
        d["text"] = i18n("".join(f"<p>{esc(b)}</p>" for b in en_b), "".join(f"<p>{esc(b)}</p>" for b in fr_b))
        d["source"] = srd_source(srd_urls.anchor_url("races.htm", r["anchor"]), fr_ref)
        out.append(d)
    write_json(OUT_SRD / "races.json", out)
    return out
