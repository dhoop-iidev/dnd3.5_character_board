# Um, actually… — review of 2026-10-16 (barbarian, monk, paladin, rogue)

**Scope:** the new support for the four classes.
- **Data and engine:** `engine/classFeatures.ts`; the class parts of `compute.ts`; the paladin's mount in `creature.ts`; the rogue's special abilities and feat slot; the alignment and multiclass checks.
- **UI:** `ClassFeaturesBlock`, `classActions`, the turn bar, the mount in the Companions pane.
- **Examples:** barbarian 8, monk 8, paladin 8, rogue 10.
- **Rulings:** C15–C20 and house rule #28.
- **Existing pieces re-checked:** fast movement, monk AC, trap sense, uncanny dodge, divine grace, paladin turning and spells, the class tables.

**Sources:**
- SRD 3.5: local HTML and d20srd.
- `sources/dnd35.db`.
- The official French SRD (DRS 03a and 03b).
- The official 3.5 FAQ of 6/30/2008.
- *Tome of Battle* p. 22.

**Method:** four reviewers, one per class. Every finding was reproduced with a temporary Vitest file, deleted afterwards. All findings were then fixed, each with a regression test in `classes-bmpr.test.ts`.

## Meaningful
**Paladin**
- **P1.** Three paladin-only spells were missing: *bless weapon*, *heal mount* and *holy sword*.
  - The builder only built the cleric, druid and ranger lists.
  - The list now has 45 spells (16/9/11/9 by level), as in `dnd35.db`.
- **P2.** Smite evil applied to every attack of a full attack.
  - The SRD says "one normal melee attack".
  - Fix: the bonus now applies to the first attack, and the damage is shown as a "first attack only" line.
- **P3.** A mounted lance was computed as two-handed: Str ×1.5, Power Attack ×2, and a false shield warning.
  - The SRD says "While mounted, you can wield a lance with one hand".
  - Fix: a new "Mounted" option in the Combat options.
- **P4.** The mount's "share saving throws" was not applied.
  - The SRD and the FAQ (p. 22) say the mount uses the better of its own base saves and the paladin's.

**Monk**
- **K1.** The shuriken was never treated as a monk weapon: its data id is `shuriken-5`. The example's shuriken also had a wrong id.
- **K2.** Fast movement was added on top of other enhancement bonuses to speed, such as boots or haste.
  - The SRD calls it "an enhancement bonus to her speed", and same-type bonuses don't stack.

**Rogue and shared code**
- **R1.** Weapon Finesse was used even when the shield penalty made it worse than Strength. The feat says "may use", so it is a choice.
- **R2.** French feminine alignments ("Chaotique bonne", "Loyale bonne", "Neutre bonne") were misread, which hid ex-paladins and wrongly flagged Good-domain clerics.
- **(Found while building the examples)**
  - Weapon Finesse was not applied to manufactured weapons at all.
  - The monk's unarmed strike did not count as proficient, so Weapon Focus (unarmed strike) failed its prerequisites.
  - Monk bonus feats were flagged as having "lost" prerequisites they don't need.

## Minor (all fixed)
**Barbarian**
- A barbarian who was already fatigued when the rage ends becomes exhausted.
- Illiteracy is noted for a pure barbarian only.
- Indomitable will applies only while raging.
- Rage doesn't apply to a lawful (ex-)barbarian.
- Removing the rage from the effect list now ends it properly, with fatigue. It can't be paused, and its duration can't be edited.
- The rage text now includes spell-completion items (scrolls). It also says the duration uses the raged Con.
- French name: "Rage de maître berserker".
- A new day also clears the once-per-encounter rage lock.

**Monk**
- A shield removes fast movement.
- Quarterstaff label in a flurry: Str ×1.
- Tiny and Huge unarmed damage (FAQ p. 20).
- The unarmed strike can be the off-hand weapon for two-weapon fighting (FAQ pp. 19–20).
- Rapid Shot with shuriken in a flurry: −2 on all attacks (FAQ p. 20).
- A gauntlet uses the monk's unarmed damage (FAQ p. 22).
- French names: "Éternelle jeunesse", "Langues du soleil et de la lune".
- Perfect self text: treated as an outsider "for spells and magical effects".

**Paladin**
- Mount *Command* text corrected: ½ paladin level per day, fewer HD, Concentration DC 21 when ridden.
- An ex-paladin loses the mount.
- Official French names for the mount's abilities: Lien télépathique, Transfert d'effet magique, Transfert de jet de sauvegarde, Vitesse supérieure, Injonction.
- The French "×" was dropped from the RTF (lay on hands, skill points…): seven texts fixed.
- A Wis 10 paladin no longer gets a useless "blocked" 1st-level slot.
- The mount's breakdown labels say "mount".

**Rogue and shared code**
- An ex-bard keeps his abilities (warning text fixed).
- An ex-druid loses wild empathy, wild shape and the companion, not only spells.
- Evasion and improved evasion are shown from the best class, for monk/rogues.
- A special ability recorded at a level that doesn't grant one is ignored and flagged.
- Gear made for Small characters weighs a quarter, and ammunition half (Table: Goods and Services, note 1).
- Improved uncanny dodge counts only the levels of classes that grant uncanny dodge, warblade included (*ToB* p. 22, ruling C21).

## Nitpicks left as is
- **Barbarian:**
  - The rage effect is labelled "Rage" whatever its level.
  - "End of encounter" leaves a running rage active.
- **Monk:**
  - Speak Language is marked unusable while raging. This is harmless.
  - Fast movement applies to land speed only.
  - A hand-made "unarmed strike" item is hidden for a monk.
- **Paladin:** a shark mount's improved speed applies to land speed only.

## Open questions (pending house rules)
- **#28:** is smite damage multiplied on a critical hit?
- **#29:** Power Attack with a quarterstaff in a flurry: ×2 (app now) or ×1?
- **#30:** Weapon Finesse with a nonproficient shield: does the shield penalty apply twice (app now) or once?

## Checked and correct
- **Class data:** the four class tables (BAB, saves, specials, spells per day), skill points, class skills and proficiencies match `dnd35.db` and the SRD. The French feature names match DRS 03a and 03b.
- **Rage:**
  - +4/+6/+8 untyped Str and Con, Will morale +2/+3/+4, −2 to AC, touch and flat-footed;
  - 3 + the raged Con modifier rounds, +2 hp per level;
  - forbidden skills and Combat Expertise;
  - once per encounter, fatigue afterwards, tireless at 17th;
  - damage reduction 1/— to 5/—, fast movement (FAQ p. 10).
- **Monk:**
  - unarmed damage by size and level; flurry −2/−1/0 with 1 or 2 extra attacks on total BAB (FAQ p. 21);
  - ki strike; the amulet of mighty fists;
  - AC bonus (Wis bonus only, kept when flat-footed or vs touch, kept with bracers);
  - Stunning Fist uses and DC; wholeness of body; diamond soul; slow fall; the bonus feat lists.
- **Paladin:**
  - smite uses; lay on hands = level × Cha bonus with Cha 12 or more; remove disease per week;
  - divine grace; turning at paladin level − 3; spells at caster level ½;
  - the mount table (bonus d8 HD, natural armor, Str added, Int set, spell resistance at 15th).
- **Rogue:**
  - sneak attack on every qualifying attack (FAQ p. 24); the special abilities with their French names;
  - trap sense stacking between classes; uncanny dodge; skill points.
- **Rule checks:** class alignments; monk and paladin can't take a new level after multiclassing.
- **Examples:** after the fixes, all four examples check out against hand calculations.
  - Barbarian 8: greataxe +14/+9, 1d12+7; rage 3/day for 7 rounds.
  - Monk 8: unarmed 1d10 at +10/+5, flurry +9/+9/+4; AC 19; 50 ft.
  - Paladin 8: longsword +13/+8; AC 22; mount 8 HD, 88 hp.
  - Rogue 10: short sword +15/+10 with Weapon Finesse; sneak attack 5d6; AC 23.

## Verdict
The four classes' numbers match the books, as far as the reviewers checked, and every finding above is fixed and tested. Three edge cases (#28–#30) wait for the DM.
