"""item-properties.json: SRD magic weapon / armor / shield special abilities (ItemPropertyDef[]).

Source rows: dnd35.db `item`, category Weapon / Armor / 'Armor, Shield' / Shield, subcategory 'None',
special_ability 'Yes' (the core, non-epic, non-psionic SRD abilities).
- Price "+N bonus" -> bonusEquivalent N; "+N gp" -> bonusEquivalent 0 + flatPriceGp.
- Fortification (one db row, "varies") is split into light / moderate / heavy (SRD fortification table);
  ghost touch has one weapon and one armor/shield entry.
- appliesTo follows the SRD tables (Table: Melee / Ranged Weapon Special Abilities, Table: Armor / Shield
  Special Abilities); ammunition is added for the ranged-table abilities that act on a hit.
- effects are written by hand from the SRD text (WEAPON_PROPS / ARMOR_PROPS below); French names are the headings of the
  French SRD entries (DRS 24 / DRS 25), checked at build time against the parsed French entries and prices.
"""
from __future__ import annotations

import re

import rtf_fr
import srd_urls
from common import OUT_SRD, clip_paras, db, esc, html_paras, i18n, parse_gp, write_json
from ctx import FR, NOTES, fr_paras_html, norm

TEXT_MAX = 1200
WEAPON_PAGE = "magicItems/magicWeapons.htm"
ARMOR_PAGE = "magicItems/magicArmor.htm"
FR_WEAPON = "DRS 24 (anneaux, armes)"
FR_ARMOR = "DRS 25 (armures, baguettes, bâtons)"

# ---------------------------------------------------------------------------------------------
# French entries (bold heading "Nom." + paragraphs up to the next heading) in the special-ability sections
# ---------------------------------------------------------------------------------------------


def fr_section(file: str, start: str, end: str) -> dict[str, list]:
    paras = rtf_fr.load(file)
    i = next(k for k, p in enumerate(paras) if p.text.startswith(start))
    j = next(k for k in range(i + 1, len(paras)) if paras[k].text.strip() == end)
    out: dict[str, list] = {}
    cur = None
    for p in paras[i + 1:j]:
        if p.in_table:
            continue
        if p.bold_prefix and not p.bold_all and p.bold_prefix.endswith("."):
            cur = []
            out[norm(p.bold_prefix.rstrip("."))] = cur
            heading = p.bold_prefix.rstrip(".").strip()
            cur.append(heading)
        if cur is not None:
            cur.append(p)
    # value: [heading, para, para…]
    return out


def fr_price(paras) -> tuple[int, int] | None:
    """(bonusEquivalent, flatPriceGp) from the French aura line 'Prix bonus de +N' / 'Prix +N po'."""
    for p in paras:
        m = re.search(r"Prix bonus de \+(\d)", p.text)
        if m:
            return int(m.group(1)), 0
        m = re.search(r"Prix \+([\d  ]+) po", p.text)
        if m:
            return 0, int(re.sub(r"\D", "", m.group(1)))
    return None


# Obvious errors of the French SRD text, corrected against the English SRD (each must be found).
FR_ERRATA = [
    ("axiomatic", "aux créatures d’alignement loyal", "aux créatures d’alignement chaotique",
     "the French SRD says axiomatic deals +2d6 against lawful creatures; English SRD: against chaotic"),
    ("shock", "Sur commande, une arme de feu génère un halo d’électricité", "Sur commande, une arme de foudre génère un halo d’électricité",
     "the French SRD calls the shock weapon 'une arme de feu'"),
    ("bane", "Prix bonus de +2", "Prix bonus de +1",
     "the French SRD bane entry says +2 bonus; its own table and the English SRD say +1"),
]

# ---------------------------------------------------------------------------------------------
# Hand data: per property (EN name, db row, FR heading, appliesTo, anchor, effects)
# ---------------------------------------------------------------------------------------------

E = {  # energy / damage types
    "fire": i18n("fire", "feu"), "cold": i18n("cold", "froid"), "electricity": i18n("electricity", "électricité"),
    "sonic": i18n("sonic", "son"), "acid": i18n("acid", "acide"), "untyped": i18n("untyped", "sans type"),
    "nonlethal": i18n("nonlethal", "non létal"),
}
AMMO_NOTE = ("Bows, crossbows and slings with this ability bestow it on their ammunition.",
             "Les arcs, arbalètes et frondes dotés de cette propriété la transmettent à leurs projectiles.")


def notes(en: str, fr: str, ammo: bool = False) -> dict:
    if ammo:
        en, fr = f"{en} {AMMO_NOTE[0]}".strip(), f"{fr} {AMMO_NOTE[1]}".strip()
    return i18n(en, fr)


def energy(kind: str, burst: bool) -> dict:
    e = {"extraDamage": [{"dice": "1d6", "type": E[kind]}]}
    if burst:
        e["critExtraDamage"] = {"dice": "1d10", "type": E[kind]}
        e["notes"] = notes(
            f"+1d6 {E[kind]['en']} on every hit while active. On a confirmed critical: +1d10 {E[kind]['en']} (×2), +2d10 (×3), +3d10 (×4), even when the energy is not active.",
            f"+1d6 de {E[kind]['fr']} à chaque coup tant qu’elle est activée. Sur un coup critique confirmé : +1d10 de {E[kind]['fr']} (×2), +2d10 (×3), +3d10 (×4), même si l’énergie n’est pas activée.",
            True)
    else:
        e["notes"] = notes(f"+1d6 {E[kind]['en']} damage on a hit while active (command word).",
                           f"+1d6 points de dégâts de {E[kind]['fr']} par coup tant qu’elle est activée (mot de commande).", True)
    return e


def aligned(vs_en: str, vs_fr: str, align_en: str, align_fr: str, opp_en: str, opp_fr: str) -> dict:
    return {
        "extraDamage": [{"dice": "2d6", "type": E["untyped"], "condition": i18n(f"vs {vs_en} creatures", f"contre les créatures {vs_fr}")}],
        "notes": notes(f"The weapon is {align_en}-aligned (overcomes DR/{align_en}). A {opp_en} creature wielding it gains one negative level while it holds it.",
                       f"L’arme est alignée sur le {align_fr} (ignore la RD/{align_fr}). Une créature {opp_fr} qui la manie subit un niveau négatif tant qu’elle la tient.",
                       True),
    }


def resistance_fr_notes(kind: str, n: int) -> str:
    art = {"acid": "l’acide", "electricity": "l’électricité", "fire": "le feu", "cold": "le froid", "sonic": "le son"}[kind]
    return f"Résistance {n} contre {art} (absorbe les {n} premiers points de dégâts de ce type par attaque)."


def skill_bonus(skill: str, value: int, en: str, fr: str) -> dict:
    return {"modifiers": [{"target": f"skill.{skill}", "bonusType": "competence", "value": value}],
            "notes": i18n(f"+{value} competence bonus on {en} checks (the armor check penalty still applies).",
                          f"Bonus d’aptitude de +{value} aux tests de {fr} (le malus d’armure aux tests s’applique toujours).")}


MELEE, RANGED, AMMO, ARMOR, SHIELD = "melee", "ranged", "ammunition", "armor", "shield"

# id: (english name, db row name, french heading, appliesTo, d20srd anchor, effects[, fixed bonusEquivalent])
WEAPON_PROPS = {
    "anarchic": ("Anarchic", "Anarchic", "Anarchique", [MELEE, RANGED, AMMO], "anarchic",
                 aligned("lawful", "loyales", "chaotic", "Chaos", "lawful", "loyale")),
    "axiomatic": ("Axiomatic", "Axiomatic", "Axiomatique", [MELEE, RANGED, AMMO], "axiomatic",
                  aligned("chaotic", "chaotiques", "lawful", "Loi", "chaotic", "chaotique")),
    "holy": ("Holy", "Holy", "Sainte", [MELEE, RANGED, AMMO], "holy",
             aligned("evil", "mauvaises", "good", "Bien", "evil", "mauvaise")),
    "unholy": ("Unholy", "Unholy", "Impie", [MELEE, RANGED, AMMO], "unholy",
               aligned("good", "bonnes", "evil", "Mal", "good", "bonne")),
    "bane": ("Bane", "Bane", "Tueuse", [MELEE, RANGED, AMMO], "bane", {
        "extraDamage": [{"dice": "2d6", "type": E["untyped"], "condition": i18n("vs the designated foe", "contre l’adversaire désigné")}],
        "attackBonus": {"value": 2, "condition": i18n("vs the designated foe", "contre l’adversaire désigné")},
        "damageBonus": {"value": 2, "condition": i18n("vs the designated foe", "contre l’adversaire désigné")},
        "notes": notes("Against its designated creature type or subtype, the enhancement bonus is 2 higher (+2 attack and damage) and the weapon deals +2d6 damage.",
                       "Contre le type ou sous-type de créature désigné, le bonus d’altération augmente de 2 (+2 à l’attaque et aux dégâts) et l’arme inflige +2d6 points de dégâts.",
                       True)}),
    "brilliant-energy": ("Brilliant energy", "Brilliant Energy", "Lumière", [MELEE, RANGED, AMMO], "brilliantEnergy", {
        "notes": i18n("Ignores armor and shield bonuses to AC (and their enhancement bonuses); Dex, deflection, dodge and natural armor still apply. "
                      "Cannot harm undead, constructs or objects. Sheds light like a torch. Melee weapons, thrown weapons and ammunition only.",
                      "Ignore les bonus d’armure et de bouclier à la CA (et leurs bonus d’altération) ; Dextérité, parade, esquive et armure naturelle comptent. "
                      "Ne blesse ni morts-vivants, ni créatures artificielles, ni objets. Éclaire comme une torche. Armes de corps à corps, armes de jet et munitions uniquement.")}),
    "dancing": ("Dancing", "Dancing", "Dansante", [MELEE], "dancing", {
        "notes": i18n("As a standard action, loose it to fight on its own for 4 rounds with your base attack bonus; no attacks of opportunity. "
                      "Grabbing it back is a free action; it can't dance again for 4 rounds.",
                      "Par une action simple, on la lâche pour qu’elle combatte seule pendant 4 rounds avec le bonus de base à l’attaque du porteur ; pas d’attaque d’opportunité. "
                      "La reprendre est une action libre ; elle ne peut plus danser pendant 4 rounds.")}),
    "defending": ("Defending", "Defending", "Gardienne", [MELEE], "defending", {
        "notes": i18n("At the start of your turn (free action), move some or all of the weapon's enhancement bonus to AC, as a bonus that stacks with all others, until your next turn.",
                      "Au début de son tour (action libre), le porteur transfère tout ou partie du bonus d’altération de l’arme à sa CA (bonus cumulable avec tous les autres) jusqu’à son tour suivant.")}),
    "disruption": ("Disruption", "Disruption", "Destruction", [MELEE], "disruption", {
        "notes": i18n("Bludgeoning weapons only. An undead creature struck must succeed on a DC 14 Will save or be destroyed.",
                      "Armes contondantes uniquement. Un mort-vivant touché doit réussir un jet de Volonté DD 14 sous peine d’être détruit.")}),
    "distance": ("Distance", "Distance", "Longue portée", [RANGED], "distance", {
        "notes": i18n("Ranged weapons only. Doubles the range increment.", "Armes à distance uniquement. Double le facteur de portée.")}),
    "flaming": ("Flaming", "Flaming", "Feu", [MELEE, RANGED, AMMO], "flaming", energy("fire", False)),
    "flaming-burst": ("Flaming burst", "Flaming Burst", "Feu intense", [MELEE, RANGED, AMMO], "flamingBurst", energy("fire", True)),
    "frost": ("Frost", "Frost", "Froid", [MELEE, RANGED, AMMO], "frost", energy("cold", False)),
    "icy-burst": ("Icy burst", "Icy Burst", "Froid intense", [MELEE, RANGED, AMMO], "icyBurst", energy("cold", True)),
    "shock": ("Shock", "Shock", "Foudre", [MELEE, RANGED, AMMO], "shock", energy("electricity", False)),
    "shocking-burst": ("Shocking burst", "Shocking Burst", "Foudre intense", [MELEE, RANGED, AMMO], "shockingBurst", energy("electricity", True)),
    "ghost-touch-weapon": ("Ghost touch (weapon)", "Ghost Touch", "Spectrale", [MELEE], "ghostTouchWeapon", {
        "notes": i18n("Deals normal damage to incorporeal creatures (no 50% miss chance). Counts as corporeal or incorporeal, whichever is better for the wielder.",
                      "Inflige des dégâts normaux aux créatures intangibles (pas de 50 % de chances de rater). Compte comme tangible ou intangible, au choix le plus favorable.")}),
    "keen": ("Keen", "Keen", "Acérée", [MELEE], "keen", {
        "keen": True,
        "notes": i18n("Piercing or slashing weapons only. Doubles the threat range; doesn't stack with Improved Critical or keen edge.",
                      "Armes perforantes ou tranchantes uniquement. Double la zone de critique possible ; ne se cumule pas avec Science du critique ni affûtage.")}),
    "ki-focus": ("Ki focus", "Ki Focus", "Focalisation ki", [MELEE], "kiFocus", {
        "notes": i18n("Melee weapons only. The wielder can deliver special ki attacks (stunning attack, ki strike, quivering palm, Stunning Fist) through the weapon.",
                      "Armes de corps à corps uniquement. Le porteur peut canaliser ses attaques ki (frappe ki, paume vibratoire, Coup étourdissant…) à travers l’arme.")}),
    "merciful": ("Merciful", "Merciful", "Miséricordieuse", [MELEE, RANGED, AMMO], "merciful", {
        "extraDamage": [{"dice": "1d6", "type": E["nonlethal"]}],
        "notes": notes("+1d6 damage, and all damage the weapon deals is nonlethal. Can be suppressed on command.",
                       "+1d6 points de dégâts, et tous les dégâts de l’arme sont non létaux. Peut être réprimée sur commande.", True)}),
    "mighty-cleaving": ("Mighty cleaving", "Mighty Cleaving", "Enchaînement", [MELEE], "mightyCleaving", {
        "notes": i18n("A wielder with the Cleave feat can make one additional cleave attempt per round.",
                      "Un porteur doté du don Enchaînement peut tenter une attaque d’enchaînement supplémentaire par round.")}),
    "returning": ("Returning", "Returning", "Boomerang", [MELEE, RANGED], "returning", {
        "notes": i18n("Thrown weapons only. Flies back to the thrower just before their next turn; catching it is a free action.",
                      "Armes de jet uniquement. Revient vers le lanceur juste avant son tour suivant ; l’attraper est une action libre.")}),
    "seeking": ("Seeking", "Seeking", "Traqueuse", [RANGED, AMMO], "seeking", {
        "notes": i18n("Ranged weapons only. Negates miss chances such as concealment (the wielder must still aim at the right square).",
                      "Armes à distance uniquement. Annule les chances de rater, dues par exemple au camouflage (il faut tout de même viser la bonne case).")}),
    "speed": ("Speed", "Speed", "Rapidité", [MELEE, RANGED], "speed", {
        "extraAttack": True,
        "notes": i18n("On a full attack, one extra attack at full base attack bonus. Doesn't stack with haste.",
                      "Lors d’une attaque à outrance, une attaque supplémentaire au bonus de base à l’attaque maximal. Ne se cumule pas avec rapidité (sort).")}),
    "spell-storing": ("Spell storing", "Spell Storing", "Stockage de sort", [MELEE], "spellStoring", {
        "notes": i18n("Stores one targeted spell of up to 3rd level (casting time 1 standard action); when the weapon damages a creature, the wielder can cast it on that creature as a free action.",
                      "Contient un sort ciblé du 3e niveau maximum (temps d’incantation 1 action simple) ; quand l’arme blesse une créature, le porteur peut le lui lancer par une action libre.")}),
    "throwing": ("Throwing", "Throwing", "Lancer", [MELEE], "throwing", {
        "notes": i18n("Melee weapons only. The weapon gains a range increment of 10 ft and can be thrown by a wielder proficient with it.",
                      "Armes de corps à corps uniquement. L’arme acquiert un facteur de portée de 3 m et peut être lancée par un porteur formé à son maniement.")}),
    "thundering": ("Thundering", "Thundering", "Tonnerre", [MELEE, RANGED, AMMO], "thundering", {
        "critExtraDamage": {"dice": "1d8", "type": E["sonic"]},
        "notes": notes("On a confirmed critical: +1d8 sonic (×2), +2d8 (×3), +3d8 (×4); the target must succeed on a DC 14 Fortitude save or be permanently deafened.",
                       "Sur un coup critique confirmé : +1d8 de son (×2), +2d8 (×3), +3d8 (×4) ; la cible doit réussir un jet de Vigueur DD 14 sous peine d’être définitivement sourde.", True)}),
    "vicious": ("Vicious", "Vicious", "Vicieuse", [MELEE], "vicious", {
        "extraDamage": [{"dice": "2d6", "type": E["untyped"]}],
        "notes": i18n("Melee weapons only. Each hit deals +2d6 damage to the opponent and 1d6 damage to the wielder.",
                      "Armes de corps à corps uniquement. Chaque coup inflige +2d6 points de dégâts à la cible et 1d6 points de dégâts au porteur.")}),
    "vorpal": ("Vorpal", "Vorpal", "Vorpale", [MELEE], "vorpal", {
        "notes": i18n("Slashing weapons only. On a natural 20 confirmed as a critical hit, severs the opponent's head (if it has one); most creatures die, some (oozes, golems, most undead) are unaffected.",
                      "Armes tranchantes uniquement. Sur un 20 naturel confirmé en coup critique, tranche la tête de la cible (si elle en a une) ; la plupart des créatures meurent, certaines (vases, golems, la plupart des morts-vivants) ne sont pas affectées.")}),
    "wounding": ("Wounding", "Wounding", "Sanglante", [MELEE], "wounding", {
        "notes": i18n("Each hit deals 1 point of Constitution damage (blood loss); not multiplied on a critical. Creatures immune to critical hits are immune.",
                      "Chaque coup inflige 1 point d’affaiblissement temporaire de Constitution ; non multiplié par un critique. Les créatures immunisées contre les coups critiques y sont immunisées.")}),
}

ENERGIES = [("acid", "Acid"), ("cold", "Cold"), ("electricity", "Electricity"), ("fire", "Fire"), ("sonic", "Sonic")]
FR_RES = {"acid": "Résistance à l’acide", "cold": "Résistance au froid", "electricity": "Résistance à l’électricité",
          "fire": "Résistance au feu", "sonic": "Résistance au son"}

ARMOR_PROPS = {
    "animated": ("Animated", "Animated", "Animé", [SHIELD], "animated", {
        "notes": i18n("On command the shield floats near the wielder and protects her with both hands free; shield penalties (armor check, arcane failure, nonproficiency) still apply.",
                      "Sur commande, le bouclier flotte près du porteur et le protège en lui laissant les deux mains libres ; les pénalités du bouclier (malus d’armure, échec des sorts profanes, non-formation) s’appliquent toujours.")}),
    "arrow-catching": ("Arrow catching", "Arrow Catching", "Interception de projectiles", [SHIELD], "arrowCatching", {
        "modifiers": [{"target": "ac", "bonusType": "deflection", "value": 1, "condition": i18n("vs ranged attacks", "contre les attaques à distance")}],
        "notes": i18n("+1 deflection bonus to AC against ranged weapons. Projectiles and thrown weapons aimed at targets within 5 ft are diverted to the wearer, and ranged attacks against the wearer ignore miss chances. Can be switched off by command.",
                      "Bonus de parade de +1 à la CA contre les armes à distance. Les projectiles et armes de jet visant une cible à 1,50 m ou moins sont détournés vers le porteur, et les attaques à distance contre lui ignorent les chances de rater. Se désactive sur commande.")}),
    "arrow-deflection": ("Arrow deflection", "Arrow Deflection", "Antiprojectiles", [SHIELD], "arrowDeflection", {
        "notes": i18n("As the Deflect Arrows feat: once per round, deflect a ranged weapon that would hit (DC 20 Reflex save, + the weapon's enhancement bonus); not when flat-footed.",
                      "Comme le don Parade de projectiles : une fois par round, détourne une arme à distance qui devrait toucher (jet de Réflexes DD 20 + bonus d’altération de l’arme) ; pas si le porteur est pris au dépourvu.")}),
    "bashing": ("Bashing", "Bashing", "Attaque", [SHIELD], "bashing", {
        "notes": i18n("Light and heavy shields only. A shield bash deals damage as a shield two sizes larger (Medium: light 1d6, heavy 1d8) and the shield acts as a +1 weapon when bashing.",
                      "Rondache et écu uniquement. Un coup de bouclier inflige les dégâts d’un bouclier de deux catégories de taille supérieures (taille M : rondache 1d6, écu 1d8) et le bouclier compte comme une arme +1 pour ces attaques.")}),
    "blinding": ("Blinding", "Blinding", "Aveuglant", [SHIELD], "blinding", {
        "notes": i18n("Twice per day on command: everyone within 20 ft except the wielder must succeed on a DC 14 Reflex save or be blinded for 1d4 rounds.",
                      "Deux fois par jour sur commande : toutes les créatures à 6 m ou moins (sauf le porteur) doivent réussir un jet de Réflexes DD 14 sous peine d’être aveuglées pendant 1d4 rounds.")}),
    "etherealness": ("Etherealness", "Etherealness", "Éthérée", [ARMOR], "etherealness", {
        "notes": i18n("Once per day on command, the wearer becomes ethereal (as ethereal jaunt) for as long as desired; once back, not again that day.",
                      "Une fois par jour sur commande, le porteur devient éthéré (comme forme éthérée) aussi longtemps qu’il le souhaite ; une fois revenu, pas avant le lendemain.")}),
    "ghost-touch-armor": ("Ghost touch (armor)", "Ghost Touch", "Spectral(e)", [ARMOR, SHIELD], "ghostTouchArmor", {
        "notes": i18n("The armor (or shield) bonus and its enhancement bonus count against the attacks of incorporeal creatures.",
                      "Le bonus d’armure (ou de bouclier) et son bonus d’altération comptent contre les attaques des créatures intangibles.")}),
    "glamered": ("Glamered", "Glamered", "Mimétisme", [ARMOR], "glamered", {
        "notes": i18n("On command the armor looks like normal clothing (it keeps all its properties, including weight); only true seeing reveals it.",
                      "Sur commande, l’armure prend l’apparence de vêtements ordinaires (elle conserve toutes ses propriétés, poids compris) ; seule vision lucide la révèle.")}),
    "invulnerability": ("Invulnerability", "Invulnerability", "Invulnérabilité", [ARMOR], "invulnerability", {
        "notes": i18n("The wearer has damage reduction 5/magic.", "Le porteur bénéficie d’une réduction des dégâts de 5/magie.")}),
    "reflecting": ("Reflecting", "Reflecting", "Réfléchissant", [SHIELD], "reflecting", {
        "notes": i18n("Once per day, reflects a spell back at its caster, exactly like spell turning.",
                      "Une fois par jour, renvoie un sort à son lanceur, exactement comme renvoi des sorts.")}),
    "undead-controlling": ("Undead controlling", "Undead Controlling", "Contrôle des morts-vivants", [ARMOR, SHIELD], "undeadControlling", {
        "notes": i18n("The wearer can control up to 26 HD of undead per day (as control undead); control ends at dawn.",
                      "Le porteur peut contrôler jusqu’à 26 DV de morts-vivants par jour (comme contrôle des morts-vivants) ; le contrôle cesse à l’aube.")}),
    "wild": ("Wild", "Wild", "Forme animale", [ARMOR, SHIELD], "wild", {
        "notes": i18n("The wearer keeps the armor (or shield) bonus and its enhancement bonus while in wild shape; the armor is then invisible.",
                      "Le porteur conserve le bonus d’armure (ou de bouclier) et son bonus d’altération sous forme animale ; l’armure est alors invisible.")}),
}

for lvl, (pfx_en, pfx_fr, sfx_id) in enumerate([("", "", ""), ("Improved", " supérieure", "improved"), ("Greater", " suprême", "greater")]):
    for kind, en in ENERGIES:
        n = 10 * (lvl + 1)
        pid = f"{sfx_id + '-' if sfx_id else ''}{kind}-resistance"
        name = f"{pfx_en + ' ' if pfx_en else ''}{en if not pfx_en else en.lower()} resistance"
        db_name = f"{en} Resistance" + (f", {pfx_en}" if pfx_en else "")
        anchor = f"{kind}Resistance{pfx_en}"
        ARMOR_PROPS[pid] = (name, db_name, FR_RES[kind] + pfx_fr, [ARMOR, SHIELD], anchor,
                            {"notes": i18n(f"Resistance {n} against {kind}: absorbs the first {n} points of {kind} damage per attack.",
                                           resistance_fr_notes(kind, n))})

for lvl, (pfx_en, pfx_fr, sfx_id) in enumerate([("", "", ""), ("Improved", " supérieure", "improved"), ("Greater", " suprême", "greater")]):
    v = 5 * (lvl + 1)
    for base_id, base_en, base_fr, skill, sk_en, sk_fr, anchor in (
            ("shadow", "Shadow", "Ombre", "hide", "Hide", "Discrétion", "shadow"),
            ("silent-moves", "Silent moves", "Déplacement furtif", "move-silently", "Move Silently", "Déplacement silencieux", "silentMoves"),
            ("slick", "Slick", "Graisseuse", "escape-artist", "Escape Artist", "Évasion", "slick")):
        pid = f"{sfx_id + '-' if sfx_id else ''}{base_id}"
        name = f"{pfx_en + ' ' if pfx_en else ''}{base_en if not pfx_en else base_en.lower()}"
        db_name = base_en.title() + (f", {pfx_en}" if pfx_en else "")
        # "Déplacement furtif" is masculine: supérieur; "Ombre", "Graisseuse": supérieure
        fr_sfx = " supérieur" if base_id == "silent-moves" and pfx_fr == " supérieure" else pfx_fr
        ARMOR_PROPS[pid] = (name, db_name, base_fr + fr_sfx, [ARMOR], anchor + pfx_en,
                            skill_bonus(skill, v, sk_en, sk_fr))

FORTIFICATION = [("light", "Light", "légère", 1, 25), ("moderate", "Moderate", "intermédiaire", 3, 75), ("heavy", "Heavy", "lourde", 5, 100)]
for fid, en, fr, bonus, pct in FORTIFICATION:
    ARMOR_PROPS[f"{fid}-fortification"] = (
        f"{en} fortification", "Fortification", f"Défense {fr}", [ARMOR, SHIELD], "fortification",
        {"notes": i18n(f"{pct}% chance that a critical hit or sneak attack against the wearer is negated (damage rolled normally).",
                       f"{pct} % de chances qu’un coup critique ou une attaque sournoise contre le porteur soit annulé (dégâts normaux).")},
        bonus,
    )

for sr, bonus in ((13, 2), (15, 3), (17, 4), (19, 5)):
    ARMOR_PROPS[f"spell-resistance-{sr}"] = (
        f"Spell resistance ({sr})", f"Spell Resistance ({sr})", f"Résistance à la magie ({sr})", [ARMOR, SHIELD], "spellResistance",
        {"notes": i18n(f"The wearer has spell resistance {sr} while wearing it.", f"Le porteur bénéficie d’une résistance à la magie de {sr} tant qu’il la porte.")},
        bonus,
    )

# French heading of the entry holding the text (variants share one entry).
FR_ENTRY = {"Défense légère": "Défense", "Défense intermédiaire": "Défense", "Défense lourde": "Défense",
            **{f"Résistance à la magie ({sr})": "Résistance à la magie" for sr in (13, 15, 17, 19)}}

# SRD text of the variant, appended to the shared entry.
VARIANT_TEXT = {
    **{f"{fid}-fortification": (f"<b>{en}:</b> {pct}% chance for normal damage; price +{b} bonus.",
                                f"<b>{fr.capitalize()} :</b> {pct} % de chances que les dégâts soient normaux ; prix bonus de +{b}.")
       for fid, en, fr, b, pct in FORTIFICATION},
}


def price_of(row_price: str) -> tuple[int, int | None]:
    m = re.search(r"\+(\d) bonus", row_price)
    if m:
        return int(m.group(1)), None
    gp = parse_gp(row_price)
    assert gp, row_price
    return 0, int(gp)


def build_item_properties():
    c = db()
    rows = {}
    for r in c.execute("select * from item where category in ('Weapon','Armor','Armor, Shield','Shield') "
                       "and subcategory='None' and special_ability='Yes'"):
        rows[(r["name"], r["category"] == "Weapon")] = dict(r)
    fr_w = fr_section("DRS 24", "Description des propriétés spéciales des armes", "Armes spécifiques")
    fr_a = fr_section("DRS 25", "Description des propriétés spéciales des armures", "Armures spécifiques")
    errata = {pid: [] for pid, *_ in FR_ERRATA}
    for pid, old, new, why in FR_ERRATA:
        errata[pid].append((old, new, why))

    out, used_rows = [], set()
    for is_weapon, table in ((True, WEAPON_PROPS), (False, ARMOR_PROPS)):
        page = WEAPON_PAGE if is_weapon else ARMOR_PAGE
        fr_ref = FR_WEAPON if is_weapon else FR_ARMOR
        fr_entries = fr_w if is_weapon else fr_a
        for pid, spec in table.items():
            name_en, db_name, fr_name_hand, applies, anchor, effects = spec[:6]
            fixed_bonus = spec[6] if len(spec) > 6 else None
            r = rows.get((db_name, is_weapon))
            assert r, (pid, db_name)
            used_rows.add((db_name, is_weapon))
            if fixed_bonus is not None:
                bonus, flat = fixed_bonus, None
            else:
                bonus, flat = price_of(r["price"])

            # French entry: hand heading checked against the parsed French SRD entries
            entry_key = norm(FR_ENTRY.get(fr_name_hand, fr_name_hand))
            fr_body = fr_entries.get(entry_key)
            assert fr_body, (pid, fr_name_hand)
            fr_name = FR.resolve(pid, name_en, fr_name_hand, None, "hand+rtf")
            fr_paras = fr_paras_html(fr_body[1:])
            for old, new, why in errata.get(pid, []):
                hit = [k for k, p in enumerate(fr_paras) if old in p]
                assert hit, (pid, old)
                for k in hit:
                    fr_paras[k] = fr_paras[k].replace(old, new)
                NOTES.append(f"item-properties: {pid} French text corrected ({why}).")
            if fixed_bonus is None and pid not in errata:
                fp = fr_price(fr_body[1:])
                if fp and fp != (bonus, flat or 0):
                    NOTES.append(f"item-properties: {pid} French price {fp} differs from the English SRD ({bonus}, {flat}); English kept.")

            en_paras = html_paras(r["full_text"])
            extra = VARIANT_TEXT.get(pid)
            if pid.startswith("spell-resistance-"):
                sr = pid.rsplit("-", 1)[1]
                extra = (f"<b>This version:</b> spell resistance {sr}; price +{bonus} bonus.",
                         f"<b>Cette version :</b> résistance à la magie {sr} ; prix bonus de +{bonus}.")
            if extra:
                en_paras = en_paras[:1] + [extra[0]] + en_paras[1:]
                fr_paras = fr_paras[:1] + [extra[1]] + fr_paras[1:]

            d = dict(id=pid, name=i18n(name_en, fr_name), appliesTo=applies, bonusEquivalent=bonus)
            if flat:
                d["flatPriceGp"] = flat
            d["requiresEnhancement"] = True
            d["effects"] = effects
            d["text"] = i18n(clip_paras(en_paras, TEXT_MAX), clip_paras(fr_paras, TEXT_MAX) or f"<p>{esc(fr_name)}</p>")
            url = srd_urls.anchor_url(page, anchor)
            assert "#" in url and url.endswith("#" + anchor) or url.lower().endswith("#" + anchor.lower()), (pid, url)
            d["source"] = {"srdUrl": url, "frRef": fr_ref}
            out.append(d)

    missing = set(rows) - used_rows
    assert not missing, missing
    ids = [d["id"] for d in out]
    assert len(ids) == len(set(ids)), ids
    write_json(OUT_SRD / "item-properties.json", out)
    NOTES.append("item-properties: appliesTo follows the SRD special-ability tables (melee / ranged / armor / shield); 'ammunition' is added to "
                 "ranged-table abilities that act on a hit (SRD: bows, crossbows and slings bestow them on their ammunition). "
                 "Fortification is split into light/moderate/heavy, ghost touch into weapon and armor entries.")
    NOTES.append("item-properties: bane also carries damageBonus +2 (SRD: its effective enhancement bonus is +2 better vs the designated foe).")
    return out


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(len(build_item_properties()))
    for n in NOTES:
        print(n)
