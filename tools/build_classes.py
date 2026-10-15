"""Core base classes (src/data/srd/classes.json): the 11 SRD 3.5 classes with level tables, spells per day,
class features and choice lists.

Numbers (BAB, saves, spells per day / known, class skills) come from the Andargor SRD SQLite (`class`,
`class_table`). Feature texts come from the English SRD RTF (04_ClassesI, 05_ClassesII) and the official
French SRD (DRS 03a, DRS 03b); feature names and the "Special" column are paired EN/FR through the
CLASSES catalog below. The French tables are parsed too and their spells-per-day must match the database.

Called from build_data.py (the fighter dict built there is kept as is; only `features` is added).
"""
from __future__ import annotations

import re

import rtf_fr
import srd_urls
from common import OUT_SRD, clip_paras, db, i18n, kebab, srd_source, write_json
from ctx import NOTES, fr_paras_html, norm

# ---------------------------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------------------------
# Feature spec keys:
#   id, en, fr          base id and names (official French names from DRS 03)
#   en_start, fr_start  start of the SRD paragraph describing it (EN RTF / DRS)
#   anchor              d20srd anchor(s) on the class page
#   en_re, fr_re        regex matching the item in the table "Special" column (levels come from the table)
#   levels              explicit levels for features that are not in the Special column
#   grantsFeats, modifiers, computed, text (hand-written {en, fr} replacing the SRD paragraphs)

def F(id, en, fr, en_start, fr_start, anchor, en_re=None, fr_re=None, levels=None, **kw):
    d = dict(id=id, en=en, fr=fr, en_start=en_start, fr_start=fr_start, anchor=anchor, en_re=en_re, fr_re=fr_re,
             levels=levels)
    d.update(kw)
    return d


def cond(en, fr):
    return {"en": en, "fr": fr}


SPELLS_EN, SPELLS_FR = "Spells:", "Sorts."
ENCH = cond("vs spells and effects of the enchantment school", "contre les sorts et effets de l’école des enchantements")

CLASSES = [
    dict(id="barbarian", en="Barbarian", fr="Barbare", page="classes/barbarian.htm", table="tableTheBarbarian",
         weapons=["simple", "martial"], armor=["light", "medium", "shield"], features=[
            F("fast-movement", "Fast movement", "Déplacement accéléré", "Fast Movement (Ex):", "Déplacement accéléré (Ext).",
              "barbarianFastMovement", r"^fast movement", r"^déplacement accéléré"),
            F("illiteracy", "Illiteracy", "Illettrisme", "Illiteracy:", "Illettrisme.", "illiteracy", r"^illiteracy", r"^illettrisme"),
            F("rage", "Rage", "Rage de berserker", "Rage (Ex):", "Rage de berserker (Ext).", "rage", r"^rage \d", r"^rage \("),
            F("uncanny-dodge", "Uncanny dodge", "Esquive instinctive", "Uncanny Dodge (Ex):", "Esquive instinctive (Ext).",
              "uncannyDodge", r"^uncanny dodge", r"^esquive instinctive$"),
            F("trap-sense", "Trap sense", "Sens des pièges", "Trap Sense (Ex):", "Sens des pièges (Ext).", "trapSense",
              r"^trap sense", r"^sens des pièges"),
            F("improved-uncanny-dodge", "Improved uncanny dodge", "Esquive instinctive supérieure", "Improved Uncanny Dodge (Ex):",
              "Esquive instinctive supérieure (Ext).", "improvedUncannyDodge", r"^improved uncanny dodge", r"^esquive instinctive supérieure"),
            F("damage-reduction", "Damage reduction", "Réduction des dégâts", "Damage Reduction (Ex):", "Réduction des dégâts (Ext).",
              "damageReduction", r"^damage reduction", r"^réduction des dégâts"),
            F("greater-rage", "Greater rage", "Rage de grand berserker", "Greater Rage (Ex):", "Rage de grand berserker (Ext).",
              "greaterRage", r"^greater rage", r"^rage de grand berserker"),
            F("indomitable-will", "Indomitable will", "Volonté indomptable", "Indomitable Will (Ex):", "Volonté indomptable (Ext).",
              "indomitableWill", r"^indomitable will", r"^volonté indomptable"),
            F("tireless-rage", "Tireless rage", "Rage sans fatigue", "Tireless Rage (Ex):", "Rage sans fatigue (Ext).",
              "tirelessRage", r"^tireless rage", r"^rage sans fatigue"),
            F("mighty-rage", "Mighty rage", "Rage de maître berserker", "Mighty Rage (Ex):", "Rage de maître berserker (Ext).",
              "mightyRage", r"^mighty rage", r"^rage de maître berserker"),
         ]),
    dict(id="bard", en="Bard", fr="Barde", page="classes/bard.htm", table="tableTheBard",
         weapons=["simple", "longsword", "rapier", "sap", "short-sword", "shortbow", "whip"], armor=["light", "shield"],
         spellcasting=dict(ability="cha", kind="arcane", style="spontaneous", list="bard", casterLevel="full", maxSpellLevel=6),
         features=[
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "bardSpells", levels=[1]),
            F("bardic-music", "Bardic music", "Musique de barde", "Bardic Music:", "Musique de barde.", "bardicMusic",
              r"^bardic music", r"^musique de barde"),
            F("bardic-knowledge", "Bardic knowledge", "Savoir bardique", "Bardic Knowledge:", "Savoir bardique.", "bardicKnowledge",
              r"^bardic knowledge", r"^savoir bardique"),
            F("countersong", "Countersong", "Contre-chant", "Countersong (Su):", "Contre-chant (Sur).", "countersong",
              r"^countersong", r"^contre-chant"),
            F("fascinate", "Fascinate", "Fascination", "Fascinate (Sp):", "Fascination (Mag).", "fascinate", r"^fascinate", r"^fascination"),
            F("inspire-courage", "Inspire courage", "Inspiration vaillante", "Inspire Courage (Su):", "Inspiration vaillante (Sur).",
              "inspireCourage", r"^inspire courage", r"^inspiration vaillante"),
            F("inspire-competence", "Inspire competence", "Inspiration talentueuse", "Inspire Competence (Su):",
              "Inspiration talentueuse (Sur).", "inspireCompetence", r"^inspire competence", r"^inspiration talentueuse"),
            F("suggestion", "Suggestion", "Suggestion", "Suggestion (Sp):", "Suggestion (Mag).", "suggestion", r"^suggestion$", r"^suggestion$"),
            F("inspire-greatness", "Inspire greatness", "Inspiration héroïque", "Inspire Greatness (Su):", "Inspiration héroïque (Sur).",
              "inspireGreatness", r"^inspire greatness", r"^inspiration héroïque"),
            F("song-of-freedom", "Song of freedom", "Chant de liberté", "Song of Freedom (Sp):", "Chant de liberté (Mag).",
              "songofFreedom", r"^song of freedom", r"^chant de liberté"),
            F("inspire-heroics", "Inspire heroics", "Inspiration intrépide", "Inspire Heroics (Su):", "Inspiration intrépide (Sur).",
              "inspireHeroics", r"^inspire heroics", r"^inspiration intrépide"),
            F("mass-suggestion", "Mass suggestion", "Suggestion de groupe", "Mass Suggestion (Sp):", "Suggestion de groupe (Mag).",
              "massSuggestion", r"^mass suggestion", r"^suggestion de groupe"),
         ]),
    dict(id="cleric", en="Cleric", fr="Prêtre", page="classes/cleric.htm", table="tableTheCleric",
         weapons=["simple"], armor=["light", "medium", "heavy", "shield"],
         spellcasting=dict(ability="wis", kind="divine", style="prepared", list="cleric", casterLevel="full", maxSpellLevel=9),
         features=[
            F("aura", "Aura", "Aura", "Aura (Ex):", "Aura (Ext).", "aura", levels=[1]),
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "clericSpells", levels=[1]),
            F("domains", "Deity, domains, and domain spells", "Dieux, domaines et sorts de domaines", "Deity, Domains, and Domain Spells:",
              "Dieux, domaines et sorts de domaines.", "deityDomainsandDomainSpells", levels=[1]),
            F("spontaneous-casting", "Spontaneous casting", "Incantation spontanée", "Spontaneous Casting:", "Incantation spontanée.",
              "clericSpontaneousCasting", levels=[1]),
            F("turn-or-rebuke-undead", "Turn or rebuke undead", "Renvoi ou intimidation des morts-vivants", "Turn or Rebuke Undead (Su):",
              "Renvoi ou intimidation des morts-vivants (Sur).", "turnorRebukeUndead", r"^turn or rebuke undead", r"^renvoi ou intimidation"),
         ]),
    dict(id="druid", en="Druid", fr="Druide", page="classes/druid.htm", table="tableTheDruid",
         weapons=["club", "dagger", "dart", "quarterstaff", "scimitar", "sickle", "shortspear", "sling", "spear"],
         armor=["light", "medium", "shield"],
         spellcasting=dict(ability="wis", kind="divine", style="prepared", list="druid", casterLevel="full", maxSpellLevel=9),
         features=[
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "druidSpells", levels=[1]),
            F("spontaneous-casting", "Spontaneous casting", "Incantation spontanée", "Spontaneous Casting:", "Incantation spontanée.",
              "druidSpontaneousCasting", levels=[1]),
            F("animal-companion", "Animal companion", "Compagnon animal", "Animal Companion (Ex):", "Compagnon animal (Ext).",
              "animalCompanion", r"^animal companion", r"^compagnon animal"),
            F("nature-sense", "Nature sense", "Instinct naturel", "Nature Sense (Ex):", "Instinct naturel (Ext).", "natureSense",
              r"^nature sense", r"^instinct naturel",
              modifiers=[{"target": "skill.knowledge-nature", "bonusType": "untyped", "value": 2},
                         {"target": "skill.survival", "bonusType": "untyped", "value": 2}]),
            F("wild-empathy", "Wild empathy", "Empathie sauvage", "Wild Empathy (Ex):", "Empathie sauvage (Ext).", "wildEmpathy",
              r"^wild empathy", r"^empathie sauvage"),
            F("woodland-stride", "Woodland stride", "Déplacement facilité", "Woodland Stride (Ex):", "Déplacement facilité (Ext).",
              "woodlandStride", r"^woodland stride", r"^déplacement facilité"),
            F("trackless-step", "Trackless step", "Absence de traces", "Trackless Step (Ex):", "Absence de traces.", "tracklessStep",
              r"^trackless step", r"^absence de traces"),
            F("resist-natures-lure", "Resist nature’s lure", "Résistance à l’appel de la nature", "Resist Nature’s Lure (Ex):",
              "Résistance à l’appel de la nature.", "resistNaturesLure", r"^resist nature", r"^résistance à l’appel"),
            F("wild-shape", "Wild shape", "Forme animale", "Wild Shape (Su):", "Forme animale (Sur).", "wildShape",
              r"^wild shape", r"^forme animale"),
            F("venom-immunity", "Venom immunity", "Immunité contre le venin", "Venom Immunity (Ex):", "Immunité contre le venin (Ext).",
              "venomImmunity", r"^venom immunity", r"^immunité contre le venin"),
            F("a-thousand-faces", "A thousand faces", "Mille visages", "A Thousand Faces (Su):", "Mille visages (Sur).", "aThousandFaces",
              r"^a thousand faces", r"^mille visages"),
            F("timeless-body", "Timeless body", "Éternelle jeunesse", "Timeless Body (Ex):", "Éternelle jeunesse (Ext).",
              "druidTimelessBody", r"^timeless body", r"^éternelle jeunesse"),
         ]),
    dict(id="monk", en="Monk", fr="Moine", page="classes/monk.htm", table="tableTheMonk",
         weapons=["club", "light-crossbow", "heavy-crossbow", "dagger", "handaxe", "javelin", "kama", "nunchaku", "quarterstaff",
                  "sai", "shuriken-5", "siangham", "sling"], armor=[],
         features=[
            F("ac-bonus", "AC bonus", "Bonus à la CA", "AC Bonus (Ex):", "Bonus à la CA (Ext).", "aCBonus", levels=[1]),
            F("bonus-feat", "Bonus feat", "Don supplémentaire", "Bonus Feat:", "Dons supplémentaires.", "bonusFeat",
              r"^bonus feat", r"^don supplémentaire"),
            F("flurry-of-blows", "Flurry of blows", "Déluge de coups", "Flurry of Blows (Ex):", "Déluge de coups (Ext).",
              "flurryofBlows", r"^flurry of blows", r"^déluge de coups"),
            F("unarmed-strike", "Unarmed strike", "Combat à mains nues", "Unarmed Strike:", "Combat à mains nues.", "unarmedStrike",
              r"^unarmed strike", r"^combat à mains nues", grantsFeats=["improved-unarmed-strike"]),
            F("evasion", "Evasion", "Esquive totale", "Evasion (Ex):", "Esquive totale (Ext).", "monkEvasion", r"^evasion", r"^esquive totale"),
            F("fast-movement", "Fast movement", "Déplacement accéléré", "Fast Movement (Ex):", "Déplacement accéléré (Ext).",
              "monkFastMovement", levels=[3]),
            F("still-mind", "Still mind", "Sérénité", "Still Mind (Ex):", "Sérénité (Ext).", "stillMind", r"^still mind", r"^sérénité",
              modifiers=[{"target": "save.all", "bonusType": "untyped", "value": 2, "condition": ENCH}]),
            F("ki-strike", "Ki strike", "Frappe ki", "Ki Strike (Su):", "Frappe ki (Sur).", "kiStrike", r"^ki strike", r"^frappe ki"),
            F("slow-fall", "Slow fall", "Chute ralentie", "Slow Fall (Ex):", "Chute ralentie (Ext).", "slowFall", r"^slow fall", r"^chute ralentie"),
            F("purity-of-body", "Purity of body", "Pureté physique", "Purity of Body (Ex):", "Pureté physique (Ext).", "purityofBody",
              r"^purity of body", r"^pureté physique"),
            F("wholeness-of-body", "Wholeness of body", "Plénitude physique", "Wholeness of Body (Su):", "Plénitude physique (Sur).",
              "wholenessofBody", r"^wholeness of body", r"^plénitude physique"),
            F("improved-evasion", "Improved evasion", "Esquive extraordinaire", "Improved Evasion (Ex):", "Esquive extraordinaire (Ext).",
              "monkImprovedEvasion", r"^improved evasion", r"^esquive extraordinaire"),
            F("diamond-body", "Diamond body", "Corps de diamant", "Diamond Body (Su):", "Corps de diamant (Sur).", "diamondBody",
              r"^diamond body", r"^corps de diamant"),
            F("greater-flurry", "Greater flurry", "Déluge supérieur", "Flurry of Blows (Ex):", "Déluge supérieur (Ext).", "greaterFlurry",
              r"^greater flurry", r"^déluge supérieur"),
            F("abundant-step", "Abundant step", "Pas chassé", "Abundant Step (Su):", "Pas chassé (Sur).", "abundantStep",
              r"^abundant step", r"^pas chassé"),
            F("diamond-soul", "Diamond soul", "Âme de diamant", "Diamond Soul (Ex):", "Âme de diamant (Ext).", "diamondSoul",
              r"^diamond soul", r"^âme de diamant"),
            F("quivering-palm", "Quivering palm", "Paume vibratoire", "Quivering Palm (Su):", "Paume vibratoire (Sur).", "quiveringPalm",
              r"^quivering palm", r"^paume vibratoire"),
            F("timeless-body", "Timeless body", "Éternelle jeunesse", "Timeless Body (Ex):", "Éternelle jeunesse (Ext).",
              "monkTimelessBody", r"^timeless body", r"^éternelle jeunesse"),
            F("tongue-of-the-sun-and-moon", "Tongue of the sun and moon", "Langues du soleil et de la lune",
              "Tongue of the Sun and Moon (Ex):", "Langues du soleil et de la lune (Ext).", "tongueoftheSunandMoon",
              r"^tongue of the sun", r"^langues du soleil"),
            F("empty-body", "Empty body", "Désertion de l’âme", "Empty Body (Su):", "Désertion de l’âme (Sur).", "emptyBody",
              r"^empty body", r"^désertion de l’âme"),
            F("perfect-self", "Perfect self", "Perfection de l’être", "Perfect Self:", "Perfection de l’être.", "perfectSelf",
              r"^perfect self", r"^perfection de l’être"),
         ]),
    dict(id="paladin", en="Paladin", fr="Paladin", page="classes/paladin.htm", table="tableThePaladin",
         weapons=["simple", "martial"], armor=["light", "medium", "heavy", "shield"],
         spellcasting=dict(ability="wis", kind="divine", style="prepared", list="paladin", casterLevel="half", maxSpellLevel=4),
         features=[
            F("aura-of-good", "Aura of good", "Aura de Bien", "Aura of Good (Ex):", "Aura de Bien (Ext).", "auraofGood",
              r"^aura of good", r"^aura de bien"),
            F("detect-evil", "Detect evil", "Détection du Mal", "Detect Evil (Sp):", "Détection du Mal (Mag).", "detectEvil",
              r"^detect evil", r"^détection du mal"),
            F("smite-evil", "Smite evil", "Châtiment du Mal", "Smite Evil (Su):", "Châtiment du Mal.", "smiteEvil",
              r"^smite evil", r"^châtiment du mal"),
            F("divine-grace", "Divine grace", "Grâce divine", "Divine Grace (Su):", "Grâce divine (Sur).", "divineGrace",
              r"^divine grace", r"^grâce divine"),
            F("lay-on-hands", "Lay on hands", "Imposition des mains", "Lay on Hands (Su):", "Imposition des mains (Sur).", "layonHands",
              r"^lay on hands", r"^imposition des mains"),
            F("aura-of-courage", "Aura of courage", "Aura de bravoure", "Aura of Courage (Su):", "Aura de bravoure (Sur).",
              "auraofCourage", r"^aura of courage", r"^aura de bravoure"),
            F("divine-health", "Divine health", "Santé divine", "Divine Health (Ex):", "Santé divine (Sur).", "divineHealth",
              r"^divine health", r"^santé divine"),
            F("turn-undead", "Turn undead", "Renvoi des morts-vivants", "Turn Undead (Su):", "Renvoi des morts-vivants (Sur).",
              "turnUndead", r"^turn undead", r"^renvoi des morts-vivants"),
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "paladinSpells", levels=[4]),
            F("special-mount", "Special mount", "Destrier de paladin", "Special Mount (Sp):", "Destrier de paladin (Mag).",
              "specialMount", r"^special mount", r"^destrier de paladin"),
            F("remove-disease", "Remove disease", "Guérison des maladies", "Remove Disease (Sp):", "Guérison des maladies (Mag).",
              "removeDisease", r"^remove disease", r"^guérison des maladies"),
         ]),
    dict(id="ranger", en="Ranger", fr="Rôdeur", page="classes/ranger.htm", table="tableTheRanger",
         weapons=["simple", "martial"], armor=["light", "shield"],
         spellcasting=dict(ability="wis", kind="divine", style="prepared", list="ranger", casterLevel="half", maxSpellLevel=4),
         features=[
            F("favored-enemy", "Favored enemy", "Ennemi juré", "Favored Enemy (Ex):", "Ennemis jurés (Ext).", "favoredEnemy",
              r"^\d+(st|nd|rd|th) favored enemy", r"^\d+(er|e) ennemi juré", computed=True,
              improvement=cond("<p>New favored enemy, chosen on Table: Ranger Favored Enemies. In addition, the bonus against one "
                               "favored enemy (which may be the new one) increases by +2.</p>",
                               "<p>Nouvel ennemi juré, choisi sur la Table : ennemis jurés du rôdeur. De plus, le bonus contre un "
                               "ennemi juré (le nouveau compris) augmente de +2.</p>")),
            F("track", "Track", "Pistage", "Track:", "Pistage.", "track", r"^track$", r"^pistage$", grantsFeats=["track"], computed=True),
            F("wild-empathy", "Wild empathy", "Empathie sauvage", "Wild Empathy (Ex):", "Empathie sauvage (Ext).", "wildEmpathy",
              r"^wild empathy", r"^empathie sauvage"),
            F("combat-style", "Combat style", "Style de combat", "Combat Style (Ex):", "Style de combat (Ext).", "combatStyle",
              r"^combat style$", r"^style de combat", computed=True),
            F("endurance", "Endurance", "Endurance", "Endurance:", "Endurance.", "endurance", r"^endurance", r"^endurance",
              grantsFeats=["endurance"], computed=True),
            F("animal-companion", "Animal companion", "Compagnon animal", "Animal Companion (Ex):", "Compagnon animal (Ext).",
              "animalCompanion", r"^animal companion", r"^compagnon animal"),
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "rangerSpells", levels=[4]),
            F("improved-combat-style", "Improved combat style", "Science du style de combat", "Improved Combat Style (Ex):",
              "Science du style de combat (Ext).", "improvedCombatStyle", r"^improved combat style", r"^science du style de combat",
              computed=True),
            F("woodland-stride", "Woodland stride", "Déplacement facilité", "Woodland Stride (Ex):", "Déplacement facilité (Ext).",
              "woodlandStride", r"^woodland stride", r"^déplacement facilité"),
            F("swift-tracker", "Swift tracker", "Pistage accéléré", "Swift Tracker (Ex):", "Pistage accéléré (Ext).", "swiftTracker",
              r"^swift tracker", r"^pistage accéléré"),
            F("evasion", "Evasion", "Esquive totale", "Evasion (Ex):", "Esquive totale (Ext).", "rangerEvasion", r"^evasion", r"^esquive totale"),
            F("combat-style-mastery", "Combat style mastery", "Maîtrise du style de combat", "Combat Style Mastery (Ex):",
              "Maîtrise du style de combat (Ext).", "combatStyleMastery", r"^combat style mastery", r"^maîtrise du style de combat",
              computed=True),
            F("camouflage", "Camouflage", "Camouflage", "Camouflage (Ex):", "Camouflage (Ext).", "camouflage", r"^camouflage", r"^camouflage"),
            F("hide-in-plain-sight", "Hide in plain sight", "Discrétion totale", "Hide in Plain Sight (Ex):", "Discrétion totale (Ext).",
              "hideinPlainSight", r"^hide in plain sight", r"^discrétion totale"),
         ]),
    dict(id="rogue", en="Rogue", fr="Roublard", page="classes/rogue.htm", table="tableTheRogue",
         weapons=["simple", "hand-crossbow", "rapier", "sap", "shortbow", "short-sword"], armor=["light"],
         features=[
            F("sneak-attack", "Sneak attack", "Attaque sournoise", "Sneak Attack:", "Attaque sournoise.", "sneakAttack",
              r"^sneak attack", r"^attaque sournoise"),
            F("trapfinding", "Trapfinding", "Recherche des pièges", "Trapfinding:", "Recherche des pièges.", "trapfinding",
              r"^trapfinding", r"^recherche des pièges"),
            F("evasion", "Evasion", "Esquive totale", "Evasion (Ex):", "Esquive totale (Ext).", "rogueEvasion", r"^evasion", r"^esquive totale"),
            F("trap-sense", "Trap sense", "Sens des pièges", "Trap Sense (Ex):", "Sens des pièges (Ext).", "trapSense",
              r"^trap sense", r"^sens des pièges"),
            F("uncanny-dodge", "Uncanny dodge", "Esquive instinctive", "Uncanny Dodge (Ex):", "Esquive instinctive.", "uncannyDodge",
              r"^uncanny dodge", r"^esquive instinctive$"),
            F("improved-uncanny-dodge", "Improved uncanny dodge", "Esquive instinctive supérieure", "Improved Uncanny Dodge (Ex):",
              "Esquive instinctive supérieure (Ext).", "improvedUncannyDodge", r"^improved uncanny dodge", r"^esquive instinctive supérieure"),
            F("special-ability", "Special ability", "Pouvoir spécial", "Special Abilities:", "Pouvoirs spéciaux.", "specialAbilities",
              r"^special ability", r"^pouvoir spécial"),
         ],
         choices={"specialAbility": [
             ("crippling-strike", "Crippling strike", "Attaque handicapante"), ("defensive-roll", "Defensive roll", "Roulé-boulé"),
             ("improved-evasion", "Improved evasion", "Esquive extraordinaire"), ("opportunist", "Opportunist", "Opportunisme"),
             ("skill-mastery", "Skill mastery", "Maîtrise des compétences"), ("slippery-mind", "Slippery mind", "Esprit fuyant"),
             ("feat", "Feat", "Don")]}),
    dict(id="sorcerer", en="Sorcerer", fr="Ensorceleur", page="classes/sorcererWizard.htm", table="tableTheSorcerer",
         weapons=["simple"], armor=[],
         spellcasting=dict(ability="cha", kind="arcane", style="spontaneous", list="sorcerer-wizard", casterLevel="full", maxSpellLevel=9),
         features=[
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "sorcererSpells", levels=[1]),
            F("summon-familiar", "Summon familiar", "Appel de familier", "Familiar:", "Appel de familier.", "sorcererFamiliar",
              r"^summon familiar", r"^appel de familier"),
         ]),
    dict(id="wizard", en="Wizard", fr="Magicien", page="classes/sorcererWizard.htm", table="tableTheWizard",
         weapons=["club", "dagger", "heavy-crossbow", "light-crossbow", "quarterstaff"], armor=[],
         spellcasting=dict(ability="int", kind="arcane", style="prepared", list="sorcerer-wizard", casterLevel="full", maxSpellLevel=9),
         features=[
            F("spells", "Spells", "Sorts", SPELLS_EN, SPELLS_FR, "wizardSpells", levels=[1]),
            F("spellbooks", "Spellbooks", "Grimoire", "Spellbooks:", "Grimoire.", "spellbooks", levels=[1]),
            F("school-specialization", "School specialization", "École de prédilection", "School Specialization", "École de prédilection",
              "schoolSpecialization", levels=[1]),
            F("summon-familiar", "Summon familiar", "Appel de familier", "Familiar:", "Appel de familier.", "wizardFamiliar",
              r"^summon familiar", r"^appel de familier"),
            F("scribe-scroll", "Scribe Scroll", "Écriture de parchemins", "Scribe Scroll:", "Écriture de parchemins.", "scribeScroll",
              r"^scribe scroll", r"^écriture de parchemins", grantsFeats=["scribe-scroll"]),
            F("bonus-feat", "Bonus feat", "Don supplémentaire", "Bonus Feats:", "Dons supplémentaires.", "bonusFeats",
              r"^bonus feat", r"^don supplémentaire"),
         ],
         choices={"school": [
             ("abjuration", "Abjuration", "Abjuration"), ("conjuration", "Conjuration", "Invocation"),
             ("divination", "Divination", "Divination"), ("enchantment", "Enchantment", "Enchantement"),
             ("evocation", "Evocation", "Évocation"), ("illusion", "Illusion", "Illusion"),
             ("necromancy", "Necromancy", "Nécromancie"), ("transmutation", "Transmutation", "Transmutation")]}),
]

FIGHTER_FEATURES = [
    F("bonus-feat", "Bonus feat", "Don supplémentaire", "Bonus Feats:", "Dons supplémentaires.", "bonusFeats",
      r"^bonus feat", r"^don supplémentaire"),
]

# SRD Table: Ranger Favored Enemies (https://www.d20srd.org/srd/classes/ranger.htm#tableRangerFavoredEnemies);
# French names as printed in DRS 03b "Table : ennemis jurés du rôdeur" (checked at build time).
FAVORED_ENEMIES = [
    ("aberration", "Aberration", "Aberration"), ("animal", "Animal", "Animal"), ("construct", "Construct", "Créature artificielle"),
    ("dragon", "Dragon", "Dragon"), ("elemental", "Elemental", "Élémentaire"), ("fey", "Fey", "Fée"), ("giant", "Giant", "Géant"),
    ("humanoid-aquatic", "Humanoid (aquatic)", "Humanoïde (aquatique)"), ("humanoid-dwarf", "Humanoid (dwarf)", "Humanoïde (nain)"),
    ("humanoid-elf", "Humanoid (elf)", "Humanoïde (elfe)"), ("humanoid-goblinoid", "Humanoid (goblinoid)", "Humanoïde (goblinoïde)"),
    ("humanoid-gnoll", "Humanoid (gnoll)", "Humanoïde (gnoll)"), ("humanoid-gnome", "Humanoid (gnome)", "Humanoïde (gnome)"),
    ("humanoid-halfling", "Humanoid (halfling)", "Humanoïde (halfelin)"), ("humanoid-human", "Humanoid (human)", "Humanoïde (humain)"),
    ("humanoid-orc", "Humanoid (orc)", "Humanoïde (orque)"), ("humanoid-reptilian", "Humanoid (reptilian)", "Humanoïde (reptilien)"),
    ("magical-beast", "Magical beast", "Créature magique"), ("monstrous-humanoid", "Monstrous humanoid", "Humanoïde monstrueux"),
    ("ooze", "Ooze", "Vase"), ("outsider-air", "Outsider (air)", "Extérieur (Air)"), ("outsider-chaotic", "Outsider (chaotic)", "Extérieur (Chaos)"),
    ("outsider-earth", "Outsider (earth)", "Extérieur (Terre)"), ("outsider-evil", "Outsider (evil)", "Extérieur (Mal)"),
    ("outsider-fire", "Outsider (fire)", "Extérieur (Feu)"), ("outsider-good", "Outsider (good)", "Extérieur (Bien)"),
    ("outsider-lawful", "Outsider (lawful)", "Extérieur (Loi)"), ("outsider-native", "Outsider (native)", "Extérieur (natif)"),
    ("outsider-water", "Outsider (water)", "Extérieur (Eau)"), ("plant", "Plant", "Plante"), ("undead", "Undead", "Mort-vivant"),
    ("vermin", "Vermin", "Vermine"),
]
COMBAT_STYLES = [("archery", "Archery", "Combat à distance"), ("two-weapon", "Two-weapon combat", "Combat à deux armes")]

FEATURE_START = re.compile(r"^[^.:]{2,60} \((Ex|Su|Sp|Ext|Sur|Mag)\)\s*[:.]")


# ---------------------------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------------------------

def split_items(s: str | None) -> list[str]:
    if not s or s.strip() in ("None", "—", "-"):
        return []
    s = re.sub(r"\s+", " ", s)
    out, depth, cur = [], 0, ""
    for ch in s:
        depth += (ch == "(") - (ch == ")")
        if ch == "," and depth == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return [x for x in out if x]


def cap(s: str) -> str:
    return s[:1].upper() + s[1:]


def section(paras, start_pred, end_pred):
    i = next(k for k, p in enumerate(paras) if start_pred(k, p))
    j = next((k for k in range(i + 1, len(paras)) if end_pred(paras[k])), len(paras))
    return paras[i:j]


def feature_paras(sec, start: str, what: str):
    ns = norm(start)
    k = next((k for k, p in enumerate(sec) if not p.in_table and norm(p.text).startswith(ns)), None)
    assert k is not None, f"{what}: paragraph '{start}' not found"
    out = [sec[k]]
    for p in sec[k + 1:]:
        if p.in_table:
            continue
        if p.bold_prefix or (p.style in (1, 2, 3, 4)) or FEATURE_START.match(p.text) or re.match(r"^[A-Z][A-Z ’'-]{3,}$", p.text):
            break
        out.append(p)
    return out


def fr_table(sec, title_prefix: str):
    """Rows of a French class table: {level: cells}, plus the header cells."""
    i = next(k for k, p in enumerate(sec) if not p.in_table and p.text.startswith(title_prefix))
    rows, header = {}, None
    for p in sec[i + 1:]:
        if not p.in_table:
            if rows:
                break
            continue
        if p.cells and p.cells[0].strip() == "Niveau":
            header = [c.strip() for c in p.cells]
        elif p.cells and re.fullmatch(r"\d+", p.cells[0].strip()):
            rows[int(p.cells[0])] = [c.strip() for c in p.cells]
    return header, rows


def slot(v: str | None):
    if v is None or v.strip() in ("None", "—", "-", ""):
        return None
    m = re.match(r"^(\d+)", v.strip())
    return int(m.group(1))


def class_skill_ids(text: str, skill_ids: set[str]) -> list[str]:
    out = []
    for part in split_items(text):
        if part.startswith("Knowledge (all"):
            out += sorted(s for s in skill_ids if s.startswith("knowledge-"))
            continue
        part = re.sub(r"\s*\(n/a\)", "", part)
        m = re.match(r"^Knowledge \((.+)\)$", part)
        sid = "knowledge-" + kebab(m.group(1)) if m else kebab(part)
        assert sid in skill_ids, (text, sid)
        out.append(sid)
    return sorted(set(out))


def feature_url(page: str, spec: dict, table_anchor: str) -> str:
    cands = spec["anchor"] if isinstance(spec["anchor"], list) else [spec["anchor"]]
    url = srd_urls.anchor_url(page, cands + [srd_urls.camel(spec["en"]), srd_urls.camel(spec["en"], False)])
    if "#" not in url:
        NOTES.append(f"classes: no d20srd anchor for {page} {spec['id']}, using the class table anchor")
        url = srd_urls.anchor_url(page, table_anchor)
    return url


# ---------------------------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------------------------

def build_features(cid, specs, en_sec, fr_sec, special_by_level, page, table_anchor, fr_ref):
    """One ClassFeatureDef per feature per level gained/improved. Returns (features, special per level)."""
    feats, special_rows = [], {}
    texts = {}

    def text_of(spec):
        if spec["id"] not in texts:
            en = feature_paras(en_sec, spec["en_start"], f"{cid}.{spec['id']} EN")
            fr = feature_paras(fr_sec, spec["fr_start"], f"{cid}.{spec['id']} FR")
            texts[spec["id"]] = i18n(clip_paras(fr_paras_html(en), 1500), clip_paras(fr_paras_html(fr), 1500))
        return texts[spec["id"]]

    def make(spec, fid, level, name, text):
        d = dict(id=fid, level=level, name=name, text=text,
                 source=srd_source(feature_url(page, spec, table_anchor), fr_ref))
        for k in ("modifiers", "grantsFeats"):
            if spec.get(k) and fid == spec["id"]:
                d[k] = spec[k]
        if spec.get("computed"):
            d["computed"] = True
        return d

    seen: dict[str, int] = {}
    for level in range(1, 21):
        en_items, fr_items = special_by_level.get(level, ([], []))
        pairs = []
        used_fr = set()
        for it in en_items:
            spec = next((s for s in specs if s["en_re"] and re.search(s["en_re"], it, re.I)), None)
            assert spec, f"{cid} {level}: no feature for special item '{it}'"
            k = next((k for k, f in enumerate(fr_items) if k not in used_fr and re.search(spec["fr_re"], f, re.I)), None)
            assert k is not None, f"{cid} {level}: no French item for '{it}' in {fr_items}"
            used_fr.add(k)
            pairs.append((spec, it, fr_items[k]))
        assert len(used_fr) == len(fr_items), f"{cid} {level}: unmatched French items {fr_items}"
        special_rows[level] = [i18n(cap(e), cap(f)) for _, e, f in pairs]
        for spec, e, f in pairs:
            if spec["id"] not in seen:
                seen[spec["id"]] = level
                feats.append(make(spec, spec["id"], level, i18n(cap(e), cap(f)), text_of(spec)))
            else:
                first = seen[spec["id"]]
                txt = spec.get("improvement") or i18n(
                    f"<p>{spec['en']} improves at level {level}: {e}. See the level {first} entry for the full rules.</p>",
                    f"<p>Amélioration de l’aptitude {spec['fr']} au niveau {level} : {f}. "
                    f"Voir l’entrée du niveau {first} pour la règle complète.</p>")
                feats.append(make(spec, f"{spec['id']}-{level}", level, i18n(cap(e), cap(f)), txt))
    for spec in specs:
        if spec["levels"]:
            for lv in spec["levels"]:
                feats.append(make(spec, spec["id"], lv, i18n(spec["en"], spec["fr"]), text_of(spec)))
        else:
            assert spec["id"] in seen, f"{cid}: feature {spec['id']} never appears in the table"
    feats.sort(key=lambda d: (d["level"], d["id"]))
    ids = [f["id"] for f in feats]
    assert len(ids) == len(set(ids)), (cid, ids)
    return feats, special_rows


def build_all(fighter: dict, skill_ids: set[str], feat_ids: set[str], weapon_ids: set[str]) -> list[dict]:
    c = db()
    en_all = {"04_": rtf_fr.load("04_", "en"), "05_": rtf_fr.load("05_", "en")}
    fr_all = {"DRS 03a": rtf_fr.load("DRS 03a"), "DRS 03b": rtf_fr.load("DRS 03b")}
    en_heads = {"BARBARIAN", "BARD", "CLERIC", "DRUID", "FIGHTER", "MONK", "PALADIN", "RANGER", "ROGUE", "SORCERER", "WIZARD"}
    fr_heads = {"Barbare", "Barde", "Prêtre", "Druide", "Guerrier", "Moine", "Paladin", "Rôdeur", "Roublard", "Ensorceleur",
                "Magicien", "Personnages multiclassés"}

    def sections(cdef):
        en_file = "04_" if cdef["en"] in ("Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk") else "05_"
        fr_file = next(f for f, ps in fr_all.items() if any(p.text == cdef["fr"] and p.bold_all for p in ps))
        en_sec = section(en_all[en_file], lambda k, p: p.text.strip() == cdef["en"].upper(),
                         lambda p: p.text.strip() in en_heads)
        fr_sec = section(fr_all[fr_file], lambda k, p: p.text == cdef["fr"] and p.bold_all and not p.in_table,
                         lambda p: p.bold_all and not p.in_table and p.text in fr_heads)
        return en_sec, fr_sec, fr_file

    out = []
    for cdef in [dict(id="fighter", en="Fighter", fr="Guerrier", page="classes/fighter.htm", table="tableTheFighter",
                      features=FIGHTER_FEATURES)] + CLASSES:
        en_sec, fr_sec, fr_file = sections(cdef)
        fr_ref = rtf_fr.file_label(fr_file)
        header, fr_rows = fr_table(fr_sec, "Table : l")
        assert sorted(fr_rows) == list(range(1, 21)), (cdef["id"], sorted(fr_rows))
        rows = [r for r in c.execute("select * from class_table where name=? order by cast(level as int)", (cdef["en"],))
                if int(r["level"]) <= 20]
        special = {int(r["level"]): (split_items(r["special"]), split_items(fr_rows[int(r["level"])][5])) for r in rows}
        feats, special_rows = build_features(cdef["id"], cdef["features"], en_sec, fr_sec, special, cdef["page"], cdef["table"], fr_ref)
        if cdef["id"] == "fighter":
            assert [s for r in fighter["table"] for s in r["special"]] == [s for lv in range(1, 21) for s in special_rows[lv]]
            fighter["features"] = feats
            out.append(fighter)
            continue

        meta = c.execute("select * from class where name=?", (cdef["en"],)).fetchone()
        sc = cdef.get("spellcasting")
        fr_spell_cols = {}
        if sc:
            for k, h in enumerate(header):
                m = re.match(r"^(\d+)(er|e)?$", h)
                if m and k > 5:
                    fr_spell_cols[int(m.group(1))] = k
        table = []
        for r in rows:
            lvl = int(r["level"])
            row = dict(level=lvl, bab=int(r["base_attack_bonus"].split("/")[0]), fort=int(r["fort_save"]),
                       ref=int(r["ref_save"]), will=int(r["will_save"]), special=special_rows[lvl])
            if sc:
                spd = [slot(r[f"slots_{i}"]) for i in range(10)]
                fr_spd = [slot(fr_rows[lvl][fr_spell_cols[i]]) if i in fr_spell_cols else None for i in range(10)]
                assert spd == fr_spd, (cdef["id"], lvl, spd, fr_spd)
                row["spellsPerDay"] = spd
                if sc["style"] == "spontaneous":
                    row["spellsKnown"] = [slot(r[f"spells_known_{i}"]) for i in range(10)]
            table.append(row)

        en_body = feature_paras(en_sec, "Weapon and Armor Proficiency:", cdef["id"])
        fr_body = feature_paras(fr_sec, "Armes et armures.", cdef["id"])
        for w in cdef["weapons"]:
            assert w in ("simple", "martial") or w in weapon_ids, (cdef["id"], w)
        for f in feats:
            for g in f.get("grantsFeats", []):
                assert g in feat_ids, (cdef["id"], g)
        d = dict(
            id=cdef["id"], name=i18n(cdef["en"], cdef["fr"]), prestige=False, hitDie=int(meta["hit_die"].lstrip("d")),
            skillPoints=int(meta["skill_points"]), classSkills=class_skill_ids(meta["class_skills"], skill_ids),
            proficiencies={"weapons": cdef["weapons"], "armor": cdef["armor"]}, table=table, features=feats,
        )
        if sc:
            d["spellcasting"] = sc
        choices = {}
        if cdef["id"] == "ranger":
            fr_cells = {norm(x) for r in fr_sec if r.in_table and r.cells for x in r.cells}
            for _, en, fr in FAVORED_ENEMIES:
                assert norm(fr) in fr_cells, f"favored enemy FR not in DRS 03b: {fr}"
            choices["favoredEnemy"] = [{"id": i, "name": i18n(en, fr)} for i, en, fr in FAVORED_ENEMIES]
            choices["combatStyle"] = [{"id": i, "name": i18n(en, fr)} for i, en, fr in COMBAT_STYLES]
        for key, opts in cdef.get("choices", {}).items():
            choices[key] = [{"id": i, "name": i18n(en, fr)} for i, en, fr in opts]
        if choices:
            d["choices"] = choices
        d["text"] = i18n(clip_paras(fr_paras_html(en_body)), clip_paras(fr_paras_html(fr_body)))
        d["source"] = srd_source(srd_urls.anchor_url(cdef["page"], cdef["table"]), fr_ref)
        out.append(d)

    NOTES.append("classes: cleric spells per day store the base slots only (the SRD '+1' domain slot is described in the "
                 "'domains' feature); monk table columns (flurry, unarmed damage, AC bonus, speed) are not stored.")
    write_json(OUT_SRD / "classes.json", out)
    return out
