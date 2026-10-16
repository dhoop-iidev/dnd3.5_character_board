# Um, actually… — full review of 2026-10-16

**Scope:** the whole app.
- **Chikibidouille's build:** the fixture and its tests.
- **Core engine:** compute, stacking, validate, progression, prereq, proficiency.
- **Newer features:** races/size, the cleric (domains, turning, spontaneous casting, domain slots), multiclass spellcasting, summoning (Summon Nature's Ally, Summon Monster, celestial/fiendish templates), animal companions and wild shape.
- **Everything else:** all data, and the UI texts that state rules.

**Sources:**
- `sources/dnd35.db`, `sources/srd-v3.5/` and the official French SRD (DRS);
- *Sword and Fist* pp. 38–39, *Tome of Battle*;
- PHB/MM errata 2006 (read in the archived PDFs) and the official 3.5 FAQ 6/30/2008;
- house rules #1–24 and rulings Q/R/T/C1–C6.

**Method:** four reviewers worked in parallel. Each bug was reproduced with temporary Vitest files, deleted afterwards. Nothing was fixed.

## Meaningful

### Core and Chikibidouille

**M1. Ki damage forgets damage bonuses from effects**
- **Rule:** maximum weapon damage + the usual modifiers (*S&F* p. 39; ruling Q10).
- **Code:** `compute.ts:1019`. `staticBeforePa` is taken before the effects' damage parts are added.
- **Repro:** +1 morale damage → greatsword 2d6+9, but ki stays 20 (expected 21).

**M2. Combat Reflexes allows attacks of opportunity while flat-footed**
- **Rule:** [feats.htm#combatReflexes](https://www.d20srd.org/srd/feats.htm#combatReflexes).
- **Code:** the flat-footed condition's `noAoO` flag is shown whatever the feats.
- **Repro:** Chikibidouille, flat-footed condition → "no attacks of opportunity". Expected: 4.

**M3. Uncanny dodge is defeated by the flat-footed *condition* (not by the toggle), and dodge bonuses are always stripped**
- **Rule:** keeps the Dex bonus when caught flat-footed ([barbarian.htm#uncannyDodge](https://www.d20srd.org/srd/classes/barbarian.htm#uncannyDodge); ToB p. 22).
- **Code:** `compute.ts:775-783`. `otherDexLoss` counts the condition's own `ac.noDex`.
- **Repro:** barbarian 2, Dex 14 → the toggle gives 12, the condition gives 10. Chikibidouille at warblade 2 → 20 (expected 21).

### Cleric

**M4. Improved Turning does nothing**
- **Rule:** "as if you were one level higher" ([feats.htm](https://www.d20srd.org/srd/feats.htm)).
- **Code:** `compute.ts:1195`.
- **Repro:** cleric 1 with the feat → turning level 1 (expected 2), damage 2d6+2 (expected +3).

**M5. Alignment domains aren't checked**
- **Rule:** "only if his alignment matches that domain" ([cleric.htm](https://www.d20srd.org/srd/classes/cleric.htm)).
- **Repro:** an LG cleric with Evil + Chaos gets no warning.

**M6. Domain-slot spells show the cleric-list level and DC**
- **Code:** `Spells.svelte:105`.
- **Repro:** *fire storm* in the Fire domain's 7th-level slot → DC 18+Wis (expected 17+Wis; also *earthquake*).

### Summons and companions

**M7. A creature's Str penalty gets multiplied by 1½ or ½**
- **Rule:** a penalty applies in full ([combatStatistics.htm#damage](https://www.d20srd.org/srd/combat/combatStatistics.htm)); the printed hawk shows 1d4−2.
- **Code:** `creature.ts:187`.
- **Repro:** owl companion at druid 6 → 1d4−1 (expected 1d4−2).

**M8. Companion Multiattack is applied to every animal, and the "second attack at −5" is missing**
- **Rule:** [druid.htm#animalCompanion](https://www.d20srd.org/srd/classes/druid.htm#animalCompanion). Multiattack only with 3+ natural attacks; otherwise a second attack with the primary weapon at −5.
- **Repro at druid 9:**
  - heavy horse hooves +7 (expected +4);
  - camel bite +8 (expected +5, plus a second bite at −5);
  - wolf: missing second bite at +5.

**M9. Companion bonus HD give no ability increases, feats or skill points, and nothing says so**
- **Rule:** druid.htm#animalCompanion; [improvingMonsters.htm](https://www.d20srd.org/srd/improvingMonsters.htm).
- **Repro:** wolf at druid 9 (8 HD) should have +2 ability increases and 2 feats.

### Wild shape

**M10. Combat Expertise in wild shape: the AC bonus applies, but the attack penalty doesn't**
- **Code:** the natural-attack block in `compute.ts`.
- **Repro:** Combat Expertise 2 → bite stays 13 (expected 11), AC goes to 16.

**M11. Elemental wild shape offers the invisible stalker and the thoqqua**
- **Rule:** air, earth, fire, water elementals only ([druid.htm#wildShape](https://www.d20srd.org/srd/classes/druid.htm#wildShape)).
- **Code:** `wildShape.ts:19` filters on the creature type only.

**M12. Elemental forms don't give the elemental's feats or Ex/Su/Sp abilities**
- **Rule:** SRD druid 16th level: "She also gains the elemental's feats". **Confirmed** in the PHB errata 02/2006 PDF: the errata only replaces sentence 3 of wild shape and adds two sentences, so the 16th-level paragraph stands.
- **Repro:** druid 16, Large air elemental → slam +13 (expected +18 with Weapon Finesse), initiative +7 (expected +11 with Improved Initiative).

## Minor

### Core
- **Bane:** its +2 enhancement doesn't stack with the weapon's own enhancement; it should raise it ([magicWeapons.htm#bane](https://www.d20srd.org/srd/magicItems/magicWeapons.htm#bane)). Repro: greatsword +2 bane → +16 (expected +18).
- **Wizard bonus-feat picker is empty:** `progression.ts:126` keeps only general feats.
- **Combat Expertise is added on top of total defense** (ruling R16). Repro: AC 30, expected 25.
- **Two-handed weapon + heavy shield strapped on:** not flagged (ruling R27).
- **Bastard sword held two-handed** is a martial weapon; the app applies −4 and an error.
- **Unconscious/paralyzed/dying/petrified** don't get the helpless −4 AC vs melee.
- **Minimum 1 hp:** applied to the total instead of per level (only with rolled HP).
- **Ki damage of a Small weapon master** uses the Medium dice.
- **Weapon Master entry check** ignores material masterwork (adamantine).
- **A stored weapon still attacks.**

### Cleric
- **War domain** grants Martial Weapon Proficiency even for an exotic or simple deity weapon.
- **Extra Turning** doesn't add to domain turning pools, which are shown as raw text ("3 + Cha", English only).
- **"Other" prerequisites are never checked:** turning ability for Extra/Improved Turning, caster level for item creation.
- **Energy vs alignment** misses spelled-out alignments ("Lawful Good").
- **Spontaneous casting** uses the slot level instead of the prepared spell's level, and ignores blocked levels.
- **Blocked slots** offer spells of other blocked levels (also in the domain slot).
- **Opposed-alignment spells** aren't flagged ([cleric.htm](https://www.d20srd.org/srd/classes/cleric.htm)).
- **Summons and the cleric:**
  - the Animal domain's *Summon Nature's Ally IV/VIII* aren't offered to a cleric;
  - the Good/Evil domain +1 caster level isn't applied to an aligned summon;
  - blocked summon levels are still offered.
- **TurningBlock text:** in rebuke mode it should say the undead cower (+2 to attack them), and commanding is limited to total HD ≤ cleric level; the 60 ft range is missing.

### Summons and companions
- **Celestial charger:** Hit Dice stored as 8d10 only (the 7d8 cleric HD are lost). Max HP 155 (expected 211); the card shows 8 HD (expected 15).
- **Zero-damage attacks** show as 1 (octopus/squid arms, bebilith web).
- **Summon Nature's Ally table notes are lost:**
  - alignments: [NG] giant eagle/owl, [CN] satyr, [NE] salamanders, [CG] unicorn…;
  - variants: satyr pipes, pixie arrows;
  - "aquatic only" markers.
- **Templated animals still say "animal"** on the card; they become magical beasts.
- **No warning** when summoning an opposed-alignment outsider.

### Wild shape
- **Coins don't meld** (60 lb carried for 3,000 gp).
- **Carrying capacity:** biped multipliers used for quadruped forms.
- **Small characters' weapons and armor** weigh as much as Medium ones (they should weigh half).
- **The data's `strDamageFactor` is ignored:** an octopus's grab-only arms deal 1 damage.

## Nitpicks
- **Labels and texts:**
  - Turning breakdown label "Renvoi supplémentaire": the official French feat name is "Emprise sur les morts-vivants".
  - Combat label "+2 CA / +4 CA" ignores the Tumble 5 ranks bonus (the computed value is right).
  - Stale comment on `ActiveEffect.rounds` ("end of turn").
  - Wrong source cited on the attacks-of-opportunity line when Combat Reflexes is the better value.
  - The +8 Climb from a climb speed lacks the "can always take 10" note.
  - "No spellcasting without Natural Spell" overstates it: only verbal/somatic components are blocked.
  - The summon count isn't capped by list (1 / 1d3 / 1d4+1).
- **Data:**
  - *Earthquake* French summary "1,50 m/niv." is an official misprint (24 m).
  - Subschools: *mislead* (figment, glamer) and *gate* (creation or calling).
- **Code:** regex `[+-−]` in `creature.ts:78` is a character range; it works by luck.

## Checked and correct
- **Chikibidouille, level 9 (Fighter 6 / WM 2 / Warblade 1):** the whole sheet is correct.
  - HP 128; BAB +9/+4; Fort +11, Ref +9 (+8 flat-footed), Will +1.
  - AC 21/11/20 (tank 23); initiative +3; grapple +13; AoO 4; speed 6 m; light load.
  - Greatsword +16/+11, 2d6+8, 19–20/×2, ki 20; longbow +12/+7; short sword +13/+8.
  - All skills and warnings; the WM 3 variant.
  - Old saves v1 to v6 all load; share links are correct.
- **Data against dnd35.db:**
  - all class tables;
  - 68 weapons, 18 armors, 45 skills, feat prerequisites;
  - magic items, materials, properties, conditions;
  - all 231 cleric-list spells and 198 domain spell levels;
  - the 22 domains, with official French names.
- **Creature data:** all 195 creatures (stat blocks, apart from the celestial charger), every summon list entry, the celestial/fiendish template bands, the companion table and lists.
- **Rules engines:** turning (uses, check, damage, table, paladin −3); spells per day, domain slots, bonus spells, blocked slots kept; multiclass casting (C6).
- **Wild shape:** uses, sizes, legal forms (apart from M11), ability swap, size tables, hit points kept, natural attacks (apart from M10), melding, duration and healing.
- **Races:** all 7.

## Open questions (for the user / DM)
1. **Dire animals as companions:** do they keep their printed good Will save? The SRD says companions have good Fort and Ref.
2. **Fiendish animal summons:** does a fiendish animal (evil alignment, no evil subtype) make *Summon Monster* an evil spell?
3. **Camel and horse companions:** whose only natural attacks are secondary — what is their "second attack with the primary natural weapon"?
4. **Wild armor in wild shape:** keep only the armor bonus and enhancement (SRD text), or also its other properties (fortification…), max Dex and armor check penalty?
5. **Dwarf druid in wild shape:** does the dwarf's "not slowed by armor or load" still apply to the form's speed?
6. **Knowledge domain and the homebrew skill:** does "Connaissances des monstres" (#4) become a class skill?
7. **Domain slot at a blocked spell level:** keep the slot (as now, for lower spells) or no slot?
8. **Sun domain with negative energy:** greater turning, or greater rebuking?

## Verdict
Chikibidouille's numbers are right as built, and the data (classes, spells, domains, creatures) is the most reliable part of the app. Before trusting them at the table, fix:
- **Chikibidouille:** M1 (ki with buffs), M2 (AoO when flat-footed) and M3 (uncanny dodge).
- **New characters:** M4–M12, chiefly Improved Turning, the domain DC, companion attacks and elemental wild shape.

## Resolution (2026-10-16)
Everything above is fixed, with a regression test per finding in `src/engine/__tests__/review-2026-10-16.test.ts`.

- **Core:**
  - **M1:** ki damage = maximum dice (Small dice for a Small character) + every damage modifier except Power Attack.
  - **M2:** Combat Reflexes lifts "no attacks of opportunity" while flat-footed.
  - **M3:** uncanny dodge ignores the flat-footed condition's own Dex loss and keeps dodge bonuses.
  - **Minors:**
    - bane = enhancement +2 over the weapon's own;
    - wizard bonus feats (item creation, metamagic) offered;
    - Combat Expertise off during total defense;
    - two-handed weapon + shield flagged (buckler: −1 attack);
    - bastard sword / dwarven waraxe two-handed = martial (`AttackLine.proficient`);
    - helpless conditions bring the −4 AC vs melee;
    - minimum 1 hp per level;
    - adamantine (masterwork material) accepted for the Weapon Master;
    - stored weapons don't attack.
- **Cleric:**
  - **M4:** Improved Turning +1 turning level.
  - **M5:** alignment domains checked; spells with an opposed alignment flagged; alignments parsed in any form (`engine/alignment.ts`).
  - **M6:** domain-slot spells show the domain level and DC.
  - **Minors:**
    - War grants Martial Weapon Proficiency only for a martial deity weapon;
    - domain turning pools computed (3 + Cha + 4 per Extra Turning, one shared pool per domain);
    - turning and caster level prerequisites checked (also wild shape for Natural Spell, wizard level for Spell Mastery);
    - spontaneous casting by the prepared spell's level;
    - blocked levels never offered;
    - Animal domain summons, Good/Evil domain +1 caster level and opposed-alignment warning in the summons box;
    - summon count capped by list;
    - rebuke texts (cower, +2, command limit, 60 ft);
    - French "Emprise sur les morts-vivants".
- **Creatures:**
  - **M7:** Str penalties in full.
  - **M8:** Multiattack only with 3+ natural attacks, otherwise a second primary attack at −5.
  - **M9:** bonus-HD feats, ability increases and skill points shown as described only.
  - **Minors:**
    - charger 15 HD (211 max hp);
    - "0" damage;
    - Summon Nature's Ally alignments, aquatic marks and variant notes;
    - templated animals become magical beasts;
    - regex fixed.
- **Wild shape:**
  - **M10:** Combat Expertise on natural attacks.
  - **M11:** only air, earth, fire and water elementals.
  - **M12:** elemental forms gain the elemental's feats; its abilities are shown.
  - **Minors:**
    - coins meld;
    - quadruped carrying capacity (data: `quadruped` on every creature);
    - Small characters' weapons and armor weigh half;
    - grab-only arms deal no damage;
    - "can always take 10" note;
    - Natural Spell wording.
- **Nitpicks:**
  - *earthquake* French summary 24 m;
  - Tumble labels;
  - stale comment;
  - attacks of opportunity source.
  - Subschools *gate* (creation or calling) and *mislead* (figment, glamer): only the first is stored; reported, not changed.
- **Open questions:** see rulings-classes.md C7–C14.
  - Settled by the books: 1, 2, 4, 5, 7.
  - Pending house rules: 3 (#25), 6 (#27) and 8 (#26). The app follows the strict reading meanwhile.
