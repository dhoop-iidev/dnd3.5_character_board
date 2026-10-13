# Combat rules (D&D 3.5)

Rule base: 3.5 SRD only (no 5e, no 3.0 except Weapon Master). Summaries in our own words.
Format: `FORMULA:` = computed value, `CHECK:` = constraint/warning, `RULE:` = table behaviour. Each line ends with its source.
French terms checked on regles-donjons-dragons.com (page given), otherwise `(FR?)`.
Stacking of all the "Σ bonuses" below follows `docs/rules/bonus-types.md`.

URL shorthands (full URLs, used below):
- CS = https://www.d20srd.org/srd/combat/combatStatistics.htm
- AIC = https://www.d20srd.org/srd/combat/actionsInCombat.htm
- SA = https://www.d20srd.org/srd/combat/specialAttacks.htm
- AOO = https://www.d20srd.org/srd/combat/attacksOfOpportunity.htm
- INIT = https://www.d20srd.org/srd/combat/initiative.htm
- IAD = https://www.d20srd.org/srd/combat/injuryandDeath.htm
- CM = https://www.d20srd.org/srd/combat/combatModifiers.htm
- FR combat index: https://regles-donjons-dragons.com/page1530.html

## 1. Attack rolls — Jet d'attaque (page1531)
- RULE: attack roll = d20 + attack bonus; hit if total ≥ target AC. Natural 1 always misses, natural 20 always hits and is a threat. — CS#attackRoll, CS#automaticMissesAndHits
- FORMULA: melee attack bonus = BAB + Str mod + size mod + Σ applicable bonuses (weapon enhancement or masterwork +1, Weapon Focus +1, morale, luck, flanking +2, charge +2, …) − penalties (Power Attack, fighting defensively −4, Combat Expertise, nonproficiency −4, two-weapon…) — CS#attackBonus
- FORMULA: ranged attack bonus = BAB + Dex mod + size mod + range penalty + Σ applicable bonuses. FR: malus de portée — CS#attackBonus
- FORMULA: size modifier (attack & AC): Colossal −8, Gargantuan −4, Huge −2, Large −1, Medium +0, Small +1, Tiny +2, Diminutive +4, Fine +8. FR: modificateur de taille — CS (Table: Size Modifiers)
- FORMULA: BAB = Σ class BABs (multiclass BABs stack). FR: bonus de base à l'attaque — CS#baseAttackBonus
- CHECK: character (Fighter 6 + Weapon Master 3) → BAB = 6 + 3 = +9 (WM table in `docs/rules/weapon-master.md`).
- RULE: shooting/throwing into melee −4 (unless Precise Shot or target ≥10 ft from nearest ally). — AIC#shootingorThrowingintoaMelee
- RULE: nonproficient weapon −4 on attack. Nonproficient armor/shield: its armor check penalty applies to attack rolls and all Str/Dex-based checks. — CM#weaponArmorAndShieldProficiency
- RULE: attacker modifiers: dazzled −1; entangled −2; flanking +2 (melee); invisible attacker +2; higher ground +1 (melee); prone −4 (melee, most ranged impossible); shaken/frightened −2; squeezing −4. — CM#favorableandUnfavorableConditions

## 2. Iterative attacks / full attack — Attaque à outrance (page1542)
- FORMULA: attacks from BAB: 1st at BAB, then one extra at each −5 step while BAB ≥ +6 / +11 / +16 → max 4 attacks from BAB (+6/+1, +11/+6/+1, +16/+11/+6/+1). — CS#baseAttackBonus
- CHECK: character BAB +9 → full attack +9/+4 (before Str and other modifiers, which apply to each attack).
- RULE: extra attacks only with the full attack (full-round) action; attacks made from highest to lowest bonus; targets chosen as you go; only movement allowed is one 5-ft step (before, between or after). — AIC#fullAttack
- RULE: after the first attack you may switch to a move action instead of the rest of the attacks (no distance if you already took a 5-ft step). FR: "conversion d'attaque à outrance en attaque normale" — AIC#decidingbetweenanAttackoraFullAttack
- RULE: an attack of opportunity is made at your normal (full) attack bonus even if you already attacked this round. — AOO#makinganAttackofOpportunity
- RULE: Cleave's extra attack ignores the normal attack-count limit (same weapon, same bonus as the attack that dropped the foe; once per round; no 5-ft step before it). — AIC#cleave ; https://www.d20srd.org/srd/feats.htm#cleave
- RULE: Whirlwind Attack (full attack action): give up normal attacks, one melee attack at full BAB against each opponent in reach; forfeits all extra attacks from feats/spells/abilities. FR: Attaque en rotation (page280) — https://www.d20srd.org/srd/feats.htm#whirlwindAttack

## 3. Damage — Dégâts (page1532)
- FORMULA: melee damage = weapon dice + Str contribution + Σ damage bonuses (weapon enhancement, Power Attack, luck…) — CS#damage
- FORMULA: Str contribution: primary hand ×1 Str mod; off hand ×½ Str bonus; two-handed (or one-handed weapon in two hands) ×1½ Str bonus; light weapon in two hands still ×1. FR: main non directrice / arme à deux mains — CS#strengthBonus, CS#offHandWeapon, CS#wieldingaWeaponTwoHanded ; https://www.d20srd.org/srd/equipment/weapons.htm#lightOneHandedandTwoHandedMeleeWeapons
- CHECK: ×1½ and ×½ apply to a Str **bonus**; a Str penalty applies in full (rounding down per theBasics). See Q8.
- FORMULA: thrown weapons and slings add Str mod. Non-composite bows: Str **penalty** applies, bonus doesn't. Composite bows: add Str bonus up to the bow's strength rating; if Str bonus < rating, −2 on attack. Other projectile weapons (crossbows): no Str. — CS#strengthBonus ; https://www.d20srd.org/srd/equipment/weapons.htm#projectileWeapons , weapons.htm#longbowComposite
- FORMULA: Power Attack: choose N ≤ BAB; −N on all melee attacks, +N melee damage (+2N with a two-handed weapon or a one-handed weapon in two hands; light weapons get no damage bonus); lasts until your next turn. FR: Attaque en puissance (page279) — https://www.d20srd.org/srd/feats.htm#powerAttack
- CHECK: minimum damage on a hit = 1. — CS#minimumDamage
- RULE: nonlethal with a lethal weapon (or lethal with a nonlethal one, incl. unarmed): −4 on the attack. — IAD#nonlethalDamagewithaWeaponthatDealsLethalDamage
- RULE: greatsword (épée à deux mains): 2d6 (Medium), 19–20/×2, two-handed martial, slashing, 8 lb. — https://www.d20srd.org/srd/equipment/weapons.htm (Table: Weapons)

## 4. Critical hits — Coups critiques (page1540)
- RULE: threat = natural roll inside the weapon's threat range (default 20) **that also hits**; a natural 20 always hits. A roll below 20 that misses is not a threat. FR: zone de critique possible — AIC#criticalHits, AIC#increasedThreatRange
- RULE: confirmation = second attack roll with the same modifiers; crit if it hits the AC (no need for another 20). FR: jet de critique — AIC#criticalHits
- FORMULA: crit damage = roll the damage (dice + all usual modifiers, incl. Str and Power Attack) **multiplier** times and add. Default ×2. FR: facteur de critique — AIC#criticalHits ; weapons.htm#critical
- CHECK: extra damage dice beyond the weapon's normal damage (sneak attack, flaming…) are never multiplied. — AIC#criticalHits ; CS#multiplyingDamage
- CHECK: when several multipliers apply, each works off the original damage: ×2 and ×2 = ×3 (not ×4). — CS#multiplyingDamage ; https://www.d20srd.org/srd/theBasics.htm#multiplying
- CHECK: threat-range expanders don't stack: Improved Critical (doubles range: 19–20 → 17–20; needs BAB +8, FR: Science du critique, page341), keen, keen edge — only one applies. — https://www.d20srd.org/srd/feats.htm#improvedCritical ; https://www.d20srd.org/srd/magicItems/magicWeapons.htm#keen
- CHECK: creatures immune to critical hits take no extra crit damage; weapon "on crit" effects still trigger on a confirmed crit against them. — https://www.d20srd.org/srd/magicItems/magicWeapons.htm#magicWeaponsandCriticalHits
- NOTE: Weapon Master "Increased multiplier" / "Ki critical" interact here; see `docs/rules/weapon-master.md` and Q9.

## 5. Armor Class — Classe d'armure (page1533)
- FORMULA: AC = 10 + armor bonus + shield bonus + Dex mod (≤ max Dex) + size mod + natural armor + deflection + Σ dodge + other — CS#armorClass
- FORMULA: touch AC = AC without armor, shield and natural armor bonuses (and without their enhancement bonuses). FR: attaque de contact — CS#touchAttacks ; theBasics.htm#enhancementBonus
- FORMULA: flat-footed AC = AC without a positive Dex modifier and without dodge bonuses. FR: pris au dépourvu (page1537) — INIT#flatFooted ; CS#dodgeBonuses
- FORMULA: max Dex to AC = min(armor max Dex, load max Dex). FR: bonus de Dextérité maximal (page411) — https://www.d20srd.org/srd/equipment/armor.htm#maximumDexBonus ; https://www.d20srd.org/srd/carryingCapacity.htm#encumbrancebyArmor
- CHECK: full plate: armor +8, max Dex +1, armor check penalty −6 (−5 masterwork/magic), speed 20 ft (Medium, base 30), 50 lb; +2 enhancement → armor bonus 10. Character Dex +3 → only +1 counts. — https://www.d20srd.org/srd/equipment/armor.htm (Table: Armor and Shields), armor.htm#masterworkArmor
- RULE: defender modifiers: cover +4 (improved cover +8; also +2/+4 Reflex); prone −4 vs melee, +4 vs ranged; kneeling/sitting −2 melee, +2 ranged; helpless −4 vs melee and Dex treated as 0 (−5); pinned −4 vs others; blinded, cowering, stunned −2 and lose Dex; grappling: lose Dex vs non-grappled foes; squeezing −4. — CM#favorableandUnfavorableConditions, CM#cover, CM#helplessDefenders
- RULE: concealment 20% miss chance, total concealment 50%; several concealment sources don't stack. — CM#concealmentMissChance
- RULE: charge: −2 AC until start of your next turn. — SA#attackingonaCharge

## 6. Initiative — Initiative (page1537)
- FORMULA: initiative = d20 + Dex mod + Σ bonuses (Improved Initiative +4, FR: Science de l'initiative). — INIT#initiativeChecks ; https://www.d20srd.org/srd/feats.htm#improvedInitiative
- CHECK: competence bonuses don't apply to initiative. — https://www.d20srd.org/srd/theBasics.htm#competenceModifier
- RULE: ties → higher total initiative modifier, then reroll. Flat-footed until first turn: no Dex to AC, no AoO (unless Combat Reflexes). — INIT#initiativeChecks, INIT#flatFooted

## 7. Saving throws — Jets de sauvegarde (page1536)
- FORMULA: save = d20 + base save + ability mod + Σ bonuses (resistance, luck, morale, …). Fortitude (Vigueur) = Con; Reflex (Réflexes) = Dex; Will (Volonté) = Wis. — CS#savingThrows
- FORMULA: base save = Σ class base saves (multiclass bases stack). FR: bonus de base au jet de sauvegarde — CS#baseSaveBonus
- RULE: natural 1 always fails, natural 20 always succeeds. — CS#automaticFailuresandSuccesses

## 8. Attacks of opportunity — Attaque d'opportunité (page1538)
- RULE: you threaten every square you can attack in melee (normally adjacent squares; reach weapons: 10 ft incl. diagonals, not adjacent). Unarmed = no threat. FR: espace contrôlé, allonge — AOO#threatenedSquares, AOO#reachWeapons
- RULE: provoked by leaving a threatened square or by a distracting action inside it (see action tables). 5-ft step and withdraw avoid them. — AOO#provokinganAttackofOpportunity
- FORMULA: AoO per round = 1 (+ Dex mod with Combat Reflexes, FR: Attaques réflexes, page281). Still max one AoO per opportunity; leaving several squares threatened by the same foe = one opportunity. — AOO#combatReflexes ; https://www.d20srd.org/srd/feats.htm#combatReflexes
- CHECK: flat-footed → no AoO, unless Combat Reflexes. — feats.htm#combatReflexes
- CHECK: no AoO against a target with cover or total concealment; none while using total defense. — CM#coverandAttacksofOpportunity, CM#totalConcealment, AIC#totalDefense
- RULE: Mobility: +4 dodge AC vs AoO from moving out of/within a threatened area. FR: Souplesse du serpent — https://www.d20srd.org/srd/feats.htm#mobility
- NOTE: Weapon Master "Superior Combat Reflexes" changes this count; see `docs/rules/weapon-master.md`.

## 9. Actions — Round de combat (page1539)
- RULE: a round (6 s): one standard + one move action, or one full-round action; plus free actions; one swift action per turn; a move can replace the standard. FR: action simple / de mouvement / complexe / libre (pages 1540–1543). Swift/immediate: (FR?) — AIC#actionTypes, AIC#swiftActions
- RULE: standard action: attack (single), total defense, aid another, bull rush, feint, sunder, … — AIC#standardActions
- RULE: move action: move your speed, draw/sheathe a weapon (free with a move if BAB ≥ +1), stand up from prone (provokes). — AIC#moveActions
- RULE: full-round action: full attack, charge, run, withdraw, coup de grace. — AIC#fullRoundActions
- RULE: 5-ft step (pas de placement, page1544): no AoO; only if you move no other distance this round; not in difficult terrain/darkness; one per round. — AIC#take5FootStep
- RULE: charge (page1596): move ≥10 ft and ≤ 2× speed in a straight, clear line to the nearest attack square; one melee attack +2; −2 AC until your next turn; no 5-ft step. — SA#charge
- RULE: run (courir): ×4 speed (×3 in heavy armor or heavy load), straight line, lose Dex to AC (unless Run feat). — AIC#run ; carryingCapacity.htm
- RULE: withdraw (retraite): up to 2× speed; the starting square isn't threatened by visible foes; no 5-ft step. — AIC#withdraw
- RULE: total defense (défense totale): standard action, +4 dodge AC for 1 round (+6 with 5 ranks Tumble); no AoO; can't combine with fighting defensively or Combat Expertise. — AIC#totalDefense ; https://www.d20srd.org/srd/skills/tumble.htm
- RULE: fighting defensively (combattre sur la défensive): with attack or full attack, −4 on all attacks, +2 dodge AC (+3 with 5 ranks Tumble) until next turn. — AIC#fightingDefensivelyasaStandardAction ; skills/tumble.htm
- FORMULA: Combat Expertise (Expertise du combat, page302): with melee attack/full attack, −N attack, +N dodge AC, N ≤ 5 and N ≤ BAB; until your next action. — https://www.d20srd.org/srd/feats.htm#combatExpertise
- RULE: Spring Attack (Attaque éclair, page277): with a melee attack action, move before and after (total ≤ speed, ≥5 ft each side), no AoO from the target. **Not usable in heavy armor.** — https://www.d20srd.org/srd/feats.htm#springAttack
- CHECK: Spring Attack while wearing heavy armor (the character's full plate) → warning "feat unusable in heavy armor". See Q10.

## 10. Special attacks relevant to a greatsword fighter — Attaques spéciales (page1593)
- RULE sunder (destruction, page1601): slashing/bludgeoning melee attack against a held weapon/shield; provokes AoO (not with Improved Sunder); opposed attack rolls, two-handed weapon +4, light −4, +4 per size category larger; win → roll damage to the object (hardness/HP). Worn armor can't be sundered. Improved Sunder: no AoO, +4. — SA#sunder ; feats.htm#improvedSunder
- RULE trip (croc-en-jambe, page1599): unarmed melee touch attack (provokes unless Improved Trip or a trip weapon), then Str check vs target's higher of Str/Dex; ±4 per size category vs Medium; +4 if target more than two legs/stable; loser may be tripped back. Greatsword is not a trip weapon. — SA#trip ; feats.htm#improvedTrip
- RULE bull rush (bousculade, page1595): standard action or part of a charge; target at most one size larger; provokes AoO (Improved Bull Rush: not from defender, +4); opposed Str checks, ±4 per size category vs Medium, +2 if charging, +4 stability; win → push 5 ft (+5 ft per 5 points of margin if you follow). — SA#bullRush. (FR site table marks bull rush as not provoking; SRD says it does — use SRD, see Q11.)
- RULE disarm (désarmement, page1600): melee attack; provokes AoO (Improved Disarm: no); opposed attack rolls, two-handed +4, light −4, +4 per size category larger, −4 if target item isn't a melee weapon; fail → defender may disarm you back. — SA#disarm
- FORMULA grapple check (lutte, page1604) = BAB + Str mod + special size mod (Colossal +16, Gargantuan +12, Huge +8, Large +4, Medium 0, Small −4, Tiny −8, Diminutive −12, Fine −16). FR: modificateur de taille spécial — SA#grappleChecks
- RULE grapple: AoO (Improved Grapple: no), melee touch to grab, opposed grapple check to hold; grapplers threaten no squares, lose Dex vs others; only unarmed/natural/light weapons at −4 inside a grapple (greatsword unusable). — SA#startingaGrapple, SA#grapplingConsequences
- RULE feint (feinte): standard action, Bluff vs Sense Motive (+ target BAB); success → target loses Dex to AC vs your next melee attack. — SA#feint
- RULE aid another (aider quelqu'un): attack vs AC 10 → ally gets +2 attack or +2 AC vs that foe. — SA#aidAnother

## 11. Speed and encumbrance — Vitesse de déplacement (page1535)
- FORMULA: speed = racial base (human 30 ft = 6 squares) reduced by medium/heavy armor or medium/heavy load (human 30 → 20 ft); shields don't affect speed. — CS#speed ; https://www.d20srd.org/srd/equipment/armor.htm#speed
- CHECK: armor vs load: use the worse value in each category (max Dex, check penalty, speed, run multiplier); never add them. — https://www.d20srd.org/srd/carryingCapacity.htm#weight
- FORMULA: load table: medium load → max Dex +3, check −3, 30 → 20 ft, run ×4; heavy load → max Dex +1, check −6, 30 → 20 ft, run ×3. — carryingCapacity.htm (Table: Carrying Loads)
- FORMULA: double move = 2× speed; run = 4× (3× in heavy armor/heavy load). — CS#speed
- NOTE: the French books give distances in metres (9 m / 6 m, 1,50 m per square). See Q12.

## 12. Damage reduction and energy resistance
- RULE DR (réduction des dégâts, page2162): subtract N from each weapon/natural-attack hit unless the weapon has the listed quality (magic = ≥ +1 enhancement; material; alignment; "—" = nothing bypasses). Energy, spells, spell-like and supernatural damage ignore DR. — https://www.d20srd.org/srd/specialAbilities.htm#damageReduction
- CHECK: several DRs don't stack; use the best for the situation. — same URL
- RULE energy resistance (résistance aux énergies destructives, page2167): subtract N from each attack of that energy type; resistance from a creature ability does not stack with resistance from a spell. — https://www.d20srd.org/srd/specialAbilities.htm#resistanceToEnergy

## 13. Hit points, dying, nonlethal — Blessures et mort (page1547)
- FORMULA: HP state: > 0 normal; = 0 disabled (hors de combat); −1..−9 dying (mourant), unconscious; ≤ −10 dead (mort). — IAD#effectsofHitPointDamage
- RULE: disabled: one move OR standard action per turn; a standard (or strenuous) action deals 1 damage after it → dying. Half speed. — IAD#disabled0HitPoints ; https://www.d20srd.org/srd/conditionSummary.htm#disabled
- RULE: dying: lose 1 HP per round; each round 10% chance to become stable (stable, page1585); DC 15 Heal check or any healing stabilizes. — IAD#stableCharactersandRecovery. Timing differs between pages, see Q13.
- RULE: massive damage: one attack dealing ≥ 50 damage → DC 15 Fortitude or die. (FR?) — IAD#massiveDamage
- RULE: temporary HP are lost first; a Con increase is not temporary HP. — IAD#temporaryHitPoints
- FORMULA: nonlethal damage (dégâts non-létaux) tracked separately: nonlethal = current HP → staggered (chancelant: one move or standard action); nonlethal > current HP → unconscious. Heals 1 per hour per character level; healing spells remove the same amount. — IAD#nonlethalDamage, IAD#staggeredandUnconscious
- NOTE: HP maximum uses maxed hit dice (house-rules #9).

## 14. Character consistency checks (from `docs/character-baseline.md`)
- CHECK: BAB +9 → two attacks (+9/+4). — CS#baseAttackBonus
- CHECK: full plate +2 → armor check penalty −5 (−6 + 1 masterwork), matches Climb +3 in the baseline; Jump is −5 once the speed modifier (20 ft in full plate) is applied (um_actually review M1). — armor.htm#masterworkArmor
- CHECK: Dex +3 limited to +1 in full plate (max Dex +1). — armor.htm#maximumDexBonus
- CHECK: Spring Attack can't be used in full plate (heavy armor). — feats.htm#springAttack (Q10)
- CHECK: Improved Critical needs BAB +8 (met at level 9 if chosen later). — feats.htm#improvedCritical

## Open questions / ambiguities
- Q8 Str penalty with ×1½ / ×½ — Resolved: see rulings-combat-equipment.md#r08-strength-penalty-with-two-handed-and-off-hand-weapons
- Q9 Weapon Master crits — Generic part resolved; WM wording still open: see rulings-combat-equipment.md#r09-critical-multiplier-changes-and-maximum-damage-generic-35-part
- Q10 Spring Attack in heavy armor — Resolved: see rulings-combat-equipment.md#r10-spring-attack-in-heavy-armor
- Q11 Bull rush and AoO — Resolved: see rulings-combat-equipment.md#r11-bull-rush-and-attacks-of-opportunity
- Q12 Distances in French — Convention resolved (display needs a house-rules entry): see rulings-combat-equipment.md#r12-distances-in-french
- Q13 Dying timing — Resolved: see rulings-combat-equipment.md#r13-dying-when-the-stabilization-roll-starts
- Q14 Helpless double counting — Resolved: see rulings-combat-equipment.md#r14-helpless-ac-4-vs-melee-or-attacker-4
- Q15 Fighting defensively + Combat Expertise — Resolved: see rulings-combat-equipment.md#r16-fighting-defensively-and-combat-expertise-together
- Q16 Swift/immediate actions — Resolved: see rulings-combat-equipment.md#r17-swift-and-immediate-actions
