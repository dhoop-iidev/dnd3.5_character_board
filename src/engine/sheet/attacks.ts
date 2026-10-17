// Stage 6 — attacks with each weapon of the active loadout, and the wild shape form's natural attacks.
// Each weapon's attack line is built in steps: the weapon in hand (`weaponInHand`), the attack bonus (`attackBonus`),
// the full-attack bonuses (`iterativeAttacks`), damage (`weaponDamage`), critical threat (`criticalThreat`), extra
// dice (`extraDice`) and notes (`weaponNotes`); what the whole round shares (flurry, smite, two-weapon fighting, sneak
// attack) is set once in `attackEnv`. Rules: docs/rules/combat.md.
import type { Rules } from '../../data/rules'
import type { I18n, WeaponDef } from '../../data/types'
import type { ItemInstance } from '../../model/character'
import { i18n, resolve, type Part, type Stat } from '../stacking'
import { proficientWith } from '../proficiency'
import { flurryStats, kiStrike, MONK_WEAPONS, monkUnarmedDice, sneakAttackDice } from '../classFeatures'
import type { AttackLine, ComputeOptions } from './types'
import { SRD, src, ABILITY_NAMES, SIZE_MOD, maxDice } from './common'
import type { SkillsOut } from './skills'

export function attacksStage(rules: Rules, opts: ComputeOptions, c: SkillsOut) {
  const e = attackEnv(rules, c)
  // ---- attacks per weapon in the active loadout (docs/rules/combat.md)
  const attacks: AttackLine[] = []
  for (const uid of e.wielded) {
    const line = weaponAttack(e, uid)
    if (line) attacks.push(line)
  }
  // Wild shape: the form's natural attacks.
  if (e.shape) attacks.push(...naturalAttacks(e))
  const wmRow = rules.classes.get('weapon-master')
  const { flurry, flurryOn, paladinLvl, pool, furious, rogueLevel, sneak } = e
  return { attacks, flurry, flurryOn, paladinLvl, pool, furious, rogueLevel, sneak, wmRow }
}

/** What the stages so far computed (each stage's output added to the earlier ones). */
export type AttacksOut = SkillsOut & ReturnType<typeof attacksStage>

/** What every attack of the round shares: the weapons in hand (the monk's unarmed strike included), flurry of blows,
 * smite, furious counterstrike, sneak attack and two-weapon fighting. */
function attackEnv(rules: Rules, c: SkillsOut) {
  const {
    abilityPart,
    armor,
    bab,
    char,
    classLevels,
    crusaderLvl,
    expertiseOn,
    feats,
    focusPicks,
    hasFeat,
    itemAcp,
    iterativeBab,
    loadout,
    mod,
    monkLevel,
    monkUnencumbered,
    paladinGood,
    partsFor,
    profArmor,
    proficiency,
    shape,
    shield,
    size,
    sizePart,
    stance,
    strikeDice,
    sumTarget,
    tableSum,
    toggles,
    warbladeLvl,
    wmActive,
    wmLevel,
  } = c
  // Two-weapon fighting (https://www.d20srd.org/srd/combat/specialAttacks.htm#twoWeaponFighting): the first two melee
  // weapons in hand are the primary and off hand when the loadout says so.
  // Wild shape: no manufactured weapons (they meld); the form's natural attacks are added below.
  // Monk: her unarmed strike is always an attack (no item needed), with the monk damage and ki strike; an amulet of
  // mighty fists gives its enhancement (https://www.d20srd.org/srd/classes/monk.htm#unarmedStrike).
  const MONK_UID = 'monk-unarmed'
  const fists = char.inventory.find((i) => i.location === 'worn' && /^amulet-of-mighty-fists-\d$/.test(i.refId))
  const virtualItems = new Map<string, ItemInstance>(
    monkLevel > 0 && !shape
      ? [
          [
            MONK_UID,
            {
              uid: MONK_UID,
              kind: 'weapon',
              refId: 'unarmed-strike',
              quantity: 1,
              location: 'worn',
              enhancement: fists ? Number(fists.refId.slice(-1)) : 0,
            },
          ],
        ]
      : [],
  )
  const findItem = (uid: string) => virtualItems.get(uid) ?? char.inventory.find((i) => i.uid === uid)
  const wielded = shape
    ? []
    : [
        ...virtualItems.keys(),
        ...(loadout?.weapons ?? []).filter((uid) =>
          char.inventory.some(
            (i) => i.uid === uid && i.location === 'worn' && !(monkLevel > 0 && i.refId === 'unarmed-strike'),
          ),
        ),
      ]
  // Flurry of blows: unarmored, no shield, light load; unarmed strikes and special monk weapons only
  // (https://www.d20srd.org/srd/classes/monk.htm#flurryofBlows).
  const flurry = monkLevel > 0 ? { ...flurryStats(monkLevel), available: monkUnencumbered && !shield } : undefined
  const flurryOn = !!flurry?.available && toggles.flurry === true
  // Smite evil: one melee attack, + Cha bonus to attack, + paladin level to damage
  // (https://www.d20srd.org/srd/classes/paladin.htm#smiteEvil).
  const paladinLvl = classLevels['paladin'] ?? 0
  const paladinOk = paladinLvl > 0 && paladinGood
  // Crusader smite (ToB p. 11): + Cha to attack, + crusader level to damage, any foe; uses its own toggle.
  // Crusader steely resolve / furious counterstrike (ToB pp. 10–11): + pool ÷ 5 (min +1 with ≥ 1 point, max +6) on
  // attack and damage rolls during your turn.
  const pool = crusaderLvl ? (char.martial?.pool ?? 0) : 0
  const furious = pool > 0 ? Math.min(6, Math.max(1, Math.floor(pool / 5))) : 0
  const crusaderSmiteOn = crusaderLvl >= 6 && toggles.crusaderSmite === true && !(paladinOk && toggles.smite === true)
  const smiteOn = (paladinOk && toggles.smite === true) || crusaderSmiteOn
  const smiteLvl = crusaderSmiteOn ? crusaderLvl : paladinLvl
  const smiteName = crusaderSmiteOn
    ? i18n('Smite (crusader)', 'Châtiment (croisé)')
    : i18n('Smite evil', 'Châtiment du Mal')
  const rogueLevel = classLevels['rogue'] ?? 0
  const sneak = sneakAttackDice(rogueLevel)
  const sneakLine = sneak
    ? [
        {
          dice: `${sneak}d6`,
          type: i18n('sneak attack', 'attaque sournoise'),
          condition: i18n(
            'target denied its Dex bonus or flanked; ranged within 30 ft; not on a critical',
            'cible privée de son bonus de Dex ou prise en tenaille ; à distance à 9 m ou moins ; non multiplié sur un critique',
          ),
          source: i18n('Rogue', 'Roublard'),
        },
      ]
    : []
  const meleeInHand = wielded.filter((uid) => {
    const it = uid === MONK_UID ? undefined : findItem(uid)
    return it && rules.weapons.get(it.refId)?.kind === 'melee'
  })
  // A monk with one melee weapon can use her unarmed strike as the off-hand weapon (FAQ 6/30/2008 pp. 19-20).
  const twfPool = meleeInHand.length === 1 && virtualItems.has(MONK_UID) ? [...meleeInHand, MONK_UID] : meleeInHand
  const twf = !!loadout?.twoWeapon && twfPool.length >= 2
  const [primaryUid, offUid] = twf ? twfPool : []
  const offWeapon = offUid ? rules.weapons.get(findItem(offUid)!.refId) : undefined
  const offLight = offWeapon?.handedness === 'light' || offWeapon?.handedness === 'unarmed'
  const twfSource = src('combat/specialAttacks.htm#twoWeaponFighting')
  return {
    ...c,
    rules,
    MONK_UID,
    findItem,
    wielded,
    flurry,
    flurryOn,
    paladinLvl,
    paladinOk,
    pool,
    furious,
    crusaderSmiteOn,
    smiteOn,
    smiteLvl,
    smiteName,
    rogueLevel,
    sneak,
    sneakLine,
    twf,
    primaryUid,
    offUid,
    offLight,
    twfSource,
  }
}
type Env = ReturnType<typeof attackEnv>

/** The weapon in hand: its definition (a custom weapon's own dice and critical), hand, grip, family, enhancement, material, special abilities, masterwork, Weapon Master's weapon of choice, name. */
function weaponInHand(e: Env, uid: string) {
  const {
    rules,
    char,
    feats,
    loadout,
    toggles,
    wmActive,
    MONK_UID,
    findItem,
    wielded,
    flurryOn,
    twf,
    primaryUid,
    offUid,
  } = e
  const item = findItem(uid)
  const baseWeapon = item && rules.weapons.get(item.refId)
  // Custom weapon: its own damage dice and critical, on top of the base weapon.
  const cw = item?.custom
  const weapon =
    baseWeapon && cw && (cw.damage || cw.critRange || cw.critMult)
      ? {
          ...baseWeapon,
          damage: cw.damage ? { S: cw.damage, M: cw.damage } : baseWeapon.damage,
          critRange: cw.critRange ?? baseWeapon.critRange,
          critMult: cw.critMult ?? baseWeapon.critMult,
        }
      : baseWeapon
  const monkUnarmed = uid === MONK_UID
  const inFlurry = flurryOn && !!weapon && MONK_WEAPONS.includes(weapon.id)
  if (!item || !weapon) return undefined
  const melee = weapon.kind === 'melee'
  const hand: 'primary' | 'off' | undefined =
    twf && uid === primaryUid ? 'primary' : twf && uid === offUid ? 'off' : undefined
  // Ranged families (https://www.d20srd.org/srd/combat/combatStatistics.htm#strengthBonus): thrown weapons and slings
  // add Str to damage; bows take only a Str penalty (composite ratings not modeled); crossbows ignore Str.
  const family = /crossbow/.test(weapon.id)
    ? 'crossbow'
    : /bow/.test(weapon.id)
      ? 'bow'
      : weapon.id === 'sling'
        ? 'sling'
        : melee
          ? 'melee'
          : 'thrown'
  const enh = item.enhancement ?? 0
  const mat = item.material ? rules.materials.get(item.material) : undefined
  const props = (item.properties ?? []).map((id) => rules.itemProperties.get(id)).filter((d) => !!d)
  const masterwork = item.masterwork || enh > 0 || !!mat?.effects.masterwork
  const choiceFeat = (id: string) => feats.find((f) => f.featId === id && f.choice === weapon.id)
  const weaponOfChoice = wmActive && char.weaponOfChoice === weapon.id && masterwork
  const name: I18n = monkUnarmed
    ? {
        en: `Unarmed strike (monk)${enh ? ` +${enh}` : ''}`,
        fr: `Combat à mains nues (moine)${enh ? ` +${enh}` : ''}`,
      }
    : (item.name ?? {
        en: `${weapon.name.en}${enh ? ` +${enh}` : ''}`,
        fr: `${weapon.name.fr}${enh ? ` +${enh}` : ''}`,
      })
  // A one-handed weapon can be gripped two-handed (Str x1.5, Power Attack x2).
  // A lance is wielded in one hand while mounted (https://www.d20srd.org/srd/equipment/weapons.htm#lance).
  const mountedLance = weapon.id === 'lance' && toggles.mounted === true
  const twoHands =
    !hand &&
    !mountedLance &&
    (weapon.handedness === 'twoHanded' ||
      (weapon.handedness === 'oneHanded' && (loadout?.twoHanded ?? []).includes(uid)))
  return {
    uid,
    item,
    weapon,
    monkUnarmed,
    inFlurry,
    melee,
    hand,
    family,
    enh,
    mat,
    props,
    masterwork,
    choiceFeat,
    weaponOfChoice,
    name,
    mountedLance,
    twoHands,
  }
}
type Held = NonNullable<ReturnType<typeof weaponInHand>>

/** Attack bonus of the first attack: BAB, Str or Dex (Weapon Finesse), size, two-weapon fighting, Rapid Shot, enhancement or masterwork, Weapon Focus, proficiency (weapon, armor, shield), buckler, tower shield, Power Attack, Combat Expertise, flurry, smite, furious counterstrike, discipline focus, fighting defensively, special abilities, other modifiers. */
function attackBonus(e: Env, w: Held) {
  const {
    rules,
    abilityPart,
    armor,
    bab,
    expertiseOn,
    feats,
    focusPicks,
    hasFeat,
    itemAcp,
    mod,
    partsFor,
    profArmor,
    proficiency,
    shield,
    size,
    sizePart,
    tableSum,
    toggles,
    wmLevel,
    findItem,
    wielded,
    flurry,
    furious,
    crusaderSmiteOn,
    smiteOn,
    smiteName,
    offLight,
    twfSource,
  } = e
  const {
    uid,
    weapon,
    monkUnarmed,
    inFlurry,
    melee,
    hand,
    family,
    enh,
    props,
    masterwork,
    choiceFeat,
    weaponOfChoice,
    twoHands,
  } = w
  // Weapon Finesse: Dex instead of Str with a light weapon, rapier, whip or spiked chain (when better); a shield's
  // armor check penalty then applies to the attack (https://www.d20srd.org/srd/feats.htm#weaponFinesse).
  // A nonproficient shield's penalty is already on every attack: Finesse doesn't add it again (FAQ 6/30/2008 p. 51).
  const finesseShieldAcp = shield && profArmor.has(shield.def.category) ? itemAcp(shield) : 0
  const finesse =
    melee &&
    hasFeat('weapon-finesse') &&
    (weapon.handedness === 'light' ||
      weapon.handedness === 'unarmed' ||
      ['rapier', 'whip', 'spiked-chain'].includes(weapon.id)) &&
    mod('dex') + finesseShieldAcp > mod('str')
  const atk: Part[] = [
    ...tableSum('bab'),
    finesse
      ? { ...abilityPart('dex'), label: i18n('Dexterity (Weapon Finesse)', 'Dextérité (Attaque en finesse)') }
      : abilityPart(melee ? 'str' : 'dex'),
  ]
  if (finesse && shield && finesseShieldAcp)
    atk.push({
      sourceId: 'finesse-shield',
      label: i18n(
        `Shield check penalty (Weapon Finesse): ${shield.def.name.en}`,
        `Malus d’armure du bouclier (Attaque en finesse) : ${shield.def.name.fr}`,
      ),
      value: finesseShieldAcp,
      bonusType: 'untyped',
      source: src('feats.htm#weaponFinesse'),
    })
  if (SIZE_MOD[size]) atk.push(sizePart(SIZE_MOD[size]))
  if (hand) {
    // Normal −6/−10; light off-hand weapon −4/−8; Two-Weapon Fighting feat −2/−2 better each.
    let pen = hand === 'primary' ? -6 : -10
    if (offLight) pen += 2
    if (hasFeat('two-weapon-fighting')) pen += hand === 'primary' ? 2 : 6
    atk.push({
      sourceId: 'two-weapon',
      label:
        hand === 'primary'
          ? i18n('Two-weapon fighting: primary hand', 'Combat à deux armes : main directrice')
          : i18n('Two-weapon fighting: off hand', 'Combat à deux armes : main non directrice'),
      value: pen,
      bonusType: 'untyped',
      source: twfSource,
    })
  }
  // Rapid Shot (https://www.d20srd.org/srd/feats.htm#rapidShot): −2 on every ranged attack of the full attack.
  const rapidShot = !melee && toggles.rapidShot === true && hasFeat('rapid-shot')
  if (rapidShot)
    atk.push({
      sourceId: 'rapid-shot',
      label: i18n('Rapid Shot', 'Tir rapide'),
      value: -2,
      bonusType: 'untyped',
      source: src('feats.htm#rapidShot'),
    })
  if (enh > 0)
    atk.push({
      sourceId: `enh:${uid}`,
      label: i18n(`Enhancement +${enh}`, `Altération +${enh}`),
      value: enh,
      bonusType: 'enhancement',
      source: src('magicItems/magicWeapons.htm'),
    })
  else if (masterwork)
    atk.push({
      sourceId: `mw:${uid}`,
      label: i18n('Masterwork', 'De maître'),
      value: 1,
      bonusType: 'enhancement',
      source: src('equipment/weapons.htm#masterworkWeapons'),
    })
  for (const featId of ['weapon-focus', 'greater-weapon-focus']) {
    const f = choiceFeat(featId)
    const def = rules.feats.get(featId)
    if (f && def)
      atk.push({ sourceId: `feat:${featId}`, label: def.name, value: 1, bonusType: 'untyped', source: def.source })
  }
  if (weaponOfChoice && wmLevel >= 3)
    atk.push({
      sourceId: 'wm:superior-weapon-focus',
      label: i18n('Superior Weapon Focus', 'Arme de prédilection suprême'),
      value: 1,
      bonusType: 'untyped',
      source: { book: 'Sword and Fist', page: 39 },
    })
  // Nonproficient weapon: -4 (https://www.d20srd.org/srd/combat/combatModifiers.htm).
  // A bastard sword or dwarven waraxe used two-handed is a martial weapon
  // (https://www.d20srd.org/srd/equipment/weapons.htm#bastardSword).
  const martialGrip = twoHands && ['bastard-sword', 'dwarven-waraxe'].includes(weapon.id)
  // The monk's unarmed strike is a class feature (Improved Unarmed Strike as a bonus feat): no nonproficiency penalty.
  const proficient =
    monkUnarmed || proficientWith(proficiency, weapon) || (martialGrip && proficiency.weapons.has('martial'))
  if (!proficient)
    atk.push({
      sourceId: 'nonproficient-weapon',
      label: i18n('Not proficient with the weapon', 'Arme non maîtrisée'),
      value: -4,
      bonusType: 'untyped',
      source: src('equipment/weapons.htm#weaponCategories'),
    })
  // Nonproficient armor or shield: its armor check penalty applies to attack rolls (rulings R24). Mithral armor is
  // one category lighter for proficiency too (FAQ 6/30/2008 pp. 53–54, rulings C35); a mithral shield keeps its own.
  for (const x of [armor, shield])
    if (x && !profArmor.has(x === armor ? armor.category : x.def.category) && itemAcp(x))
      atk.push({
        sourceId: `nonproficient:${x.item.uid}`,
        label: { en: `Not proficient: ${x.def.name.en}`, fr: `Non maîtrisé : ${x.def.name.fr}` },
        value: itemAcp(x),
        bonusType: 'untyped',
        source: src('equipment/armor.htm#armorProficiency'),
      })
  // Buckler + weapon in the off hand or two-handed: −1 attack (https://www.d20srd.org/srd/equipment/armor.htm#buckler).
  if (shield?.def.id === 'buckler' && melee && (twoHands || hand === 'off'))
    atk.push({
      sourceId: 'buckler',
      label: i18n('Buckler (hand in use)', 'Targe (main occupée)'),
      value: -1,
      bonusType: 'untyped',
      source: src('equipment/armor.htm#buckler'),
    })
  // Tower shield: -2 on attack rolls (https://www.d20srd.org/srd/equipment/armor.htm#towerShield).
  if (shield?.def.category === 'tower')
    atk.push({
      sourceId: 'tower-shield',
      label: i18n('Tower shield', 'Pavois'),
      value: -2,
      bonusType: 'untyped',
      source: src('equipment/armor.htm#towerShield'),
    })
  // Power Attack: the attack penalty applies to every melee attack; the damage bonus doesn't apply to light
  // weapons, except unarmed strikes (https://www.d20srd.org/srd/feats.htm#powerAttack).
  const powerAttackOn = melee && hasFeat('power-attack') && toggles.powerAttack > 0
  const powerAttackAllowed =
    melee && hasFeat('power-attack') && (weapon.handedness !== 'light' || weapon.id.startsWith('unarmed'))
  if (powerAttackOn)
    atk.push({
      sourceId: 'power-attack',
      label: i18n('Power Attack', 'Attaque en puissance'),
      value: -toggles.powerAttack,
      bonusType: 'untyped',
      source: src('feats.htm#powerAttack'),
    })
  if (melee && expertiseOn)
    atk.push({
      sourceId: 'combat-expertise',
      label: i18n('Combat Expertise', 'Expertise du combat'),
      value: -toggles.combatExpertise,
      bonusType: 'untyped',
      source: src('feats.htm#combatExpertise'),
    })
  if (
    inFlurry &&
    melee &&
    toggles.rapidShot === true &&
    hasFeat('rapid-shot') &&
    wielded.some((u) => findItem(u)?.refId === 'shuriken-5')
  )
    atk.push({
      sourceId: 'rapid-shot',
      label: i18n('Rapid Shot (shuriken in the flurry)', 'Tir rapide (shuriken dans le déluge)'),
      value: -2,
      bonusType: 'untyped',
      source: src('feats.htm#rapidShot'),
    })
  if (inFlurry && flurry!.penalty)
    atk.push({
      sourceId: 'flurry',
      label: i18n('Flurry of blows', 'Déluge de coups'),
      value: flurry!.penalty,
      bonusType: 'untyped',
      source: src('classes/monk.htm#flurryofBlows'),
    })
  if (smiteOn && melee && mod('cha') > 0)
    atk.push({
      sourceId: 'smite-evil',
      label: { en: `${smiteName.en} (Cha)`, fr: `${smiteName.fr} (Cha)` },
      value: mod('cha'),
      bonusType: 'untyped',
      source: crusaderSmiteOn ? { book: 'Tome of Battle', page: 11 } : src('classes/paladin.htm#smiteEvil'),
    })
  if (furious)
    atk.push({
      sourceId: 'furious-counterstrike',
      label: i18n('Furious counterstrike (your turn)', 'Riposte furieuse (votre tour)'),
      value: furious,
      bonusType: 'untyped',
      source: { book: 'Tome of Battle', page: 10 },
    })
  // Swordsage discipline focus (p. 16): Weapon Focus with the weapons of the discipline chosen at 1st level (same
  // benefit as the feat: doesn't stack with it).
  if (focusPicks.weapon.some((d) => rules.disciplines.get(d as never)?.associatedWeapons.includes(weapon.id)))
    atk.push({
      sourceId: 'feat:weapon-focus',
      label: i18n('Discipline focus: Weapon Focus', 'Focalisation de discipline : Arme de prédilection'),
      value: 1,
      bonusType: 'untyped',
      source: { book: 'Tome of Battle', page: 16 },
    })
  // Fighting defensively: -4 on all attacks (https://www.d20srd.org/srd/combat/actionsInCombat.htm#fightDefensively).
  if (toggles.fightingDefensively)
    atk.push({
      sourceId: 'fighting-defensively',
      label: i18n('Fighting defensively', 'Combat sur la défensive'),
      value: -4,
      bonusType: 'untyped',
      source: src('combat/actionsInCombat.htm#fightDefensively'),
    })
  // Bane: the weapon's enhancement bonus is 2 better than normal against the foe
  // (https://www.d20srd.org/srd/magicItems/magicWeapons.htm#bane): enhancement enh + 2, best of the two applies.
  const propValue = (pr: (typeof props)[number], v: number) => (pr.id === 'bane' ? enh + v : v)
  for (const pr of props)
    if (pr.effects.attackBonus)
      atk.push({
        sourceId: `prop:${pr.id}`,
        label: pr.name,
        value: propValue(pr, pr.effects.attackBonus.value),
        bonusType: 'enhancement',
        source: pr.source,
        condition: pr.effects.attackBonus.condition,
        situationalOn: toggles.situational[`prop:${pr.id}|${uid}`] ?? false,
        toggleKey: `prop:${pr.id}|${uid}`,
      })
  atk.push(
    ...partsFor([
      melee ? 'attack.melee' : 'attack.ranged',
      'attack.all',
      'attack.weapon',
      ...(family === 'thrown' || family === 'sling' ? ['attack.thrown'] : []),
    ]),
  )
  const attack = resolve(atk)
  return { attack, rapidShot, powerAttackOn, powerAttackAllowed, proficient, propValue }
}
type Bonus = ReturnType<typeof attackBonus>

/** Bonuses of a full attack: iteratives, haste or speed, Rapid Shot, the off hand's attacks, flurry; smite only on the first. */
function iterativeAttacks(e: Env, w: Held, attack: Stat, rapidShot: boolean) {
  const { bab, hasFeat, iterativeBab, mod, sumTarget, flurry, smiteOn } = e
  const { weapon, inFlurry, melee, hand, props } = w
  // Full attack: iteratives, plus one extra attack at full BAB from haste or a speed weapon (not cumulative:
  // https://www.d20srd.org/srd/magicItems/magicWeapons.htm#speed).
  const extra = sumTarget('attack.extra') > 0 || props.some((pr) => pr.effects.extraAttack) ? [attack.total] : []
  const rapid = rapidShot ? [attack.total] : []
  // Off hand: one attack, plus one at −5 (Improved TWF) and one at −10 (Greater TWF).
  const offHand = [
    attack.total,
    ...(hasFeat('improved-two-weapon-fighting') ? [attack.total - 5] : []),
    ...(hasFeat('greater-two-weapon-fighting') ? [attack.total - 10] : []),
  ]
  // Flurry: one extra attack at the highest bonus (two from 11th).
  const flurryExtra = inFlurry ? Array.from({ length: flurry!.extra }, () => attack.total) : []
  const iterativeAll =
    hand === 'off'
      ? offHand
      : [...flurryExtra, ...extra, ...rapid, ...iterativeBab.map((b) => attack.total - (bab.total - b))]
  // Smite evil is one attack: only the first of a full attack gets it (https://www.d20srd.org/srd/classes/paladin.htm#smiteEvil).
  const smiteAtk = smiteOn && melee ? Math.max(0, mod('cha')) : 0
  const iterative = iterativeAll.map((b, i) => (i === 0 ? b : b - smiteAtk))
  return iterative
}
/** Damage bonus: Str (×1.5 two-handed, ×½ off hand, bows and crossbows), enhancement, Weapon Specialization, material, special abilities, furious counterstrike, insightful strike, Power Attack, battle cunning, other modifiers. `paDamage`: the Power Attack part (not maximized by ki damage). */
function weaponDamage(e: Env, w: Held, b: Bonus) {
  const { rules, abilityPart, feats, focusPicks, mod, partsFor, strikeDice, toggles, warbladeLvl, flurry, furious } = e
  const { uid, weapon, inFlurry, melee, hand, family, enh, mat, props, choiceFeat, twoHands } = w
  const { powerAttackOn, powerAttackAllowed, propValue } = b
  const dmg: Part[] = []
  const strMod = mod('str')
  let strDmg = strMod
  // In a flurry, Str ×1 with any monk weapon, even two-handed (quarterstaff).
  if (family === 'melee' && twoHands && strMod > 0 && !inFlurry) strDmg = Math.floor(strMod * 1.5)
  // Off hand: ½ Str bonus (a penalty applies in full).
  if (hand === 'off' && strMod > 0) strDmg = Math.floor(strMod / 2)
  if (family === 'bow') strDmg = Math.min(0, strMod)
  if (family === 'crossbow') strDmg = 0
  if (strDmg !== 0)
    dmg.push({
      ...abilityPart('str', strDmg),
      label:
        hand === 'off' && strMod > 0
          ? i18n('Strength ×½ (off hand)', 'Force ×½ (main non directrice)')
          : family === 'melee' && twoHands && strMod > 0 && !inFlurry
            ? i18n('Strength ×1.5 (two hands)', 'Force ×1,5 (à deux mains)')
            : ABILITY_NAMES.str,
    })
  if (enh > 0)
    dmg.push({
      sourceId: `enh:${uid}`,
      label: i18n(`Enhancement +${enh}`, `Altération +${enh}`),
      value: enh,
      bonusType: 'enhancement',
      source: src('magicItems/magicWeapons.htm'),
    })
  for (const [featId, value] of [
    ['weapon-specialization', 2],
    ['greater-weapon-specialization', 2],
  ] as const) {
    const def = rules.feats.get(featId)
    if (choiceFeat(featId) && def)
      dmg.push({ sourceId: `feat:${featId}`, label: def.name, value, bonusType: 'untyped', source: def.source })
  }
  // Alchemical silver: −1 damage (minimum 1 per hit).
  if (mat?.effects.damage)
    dmg.push({
      sourceId: `material:${mat.id}`,
      label: mat.name,
      value: mat.effects.damage,
      bonusType: 'untyped',
      source: mat.source,
    })
  for (const pr of props)
    if (pr.effects.damageBonus)
      dmg.push({
        sourceId: `prop:${pr.id}`,
        label: pr.name,
        value: propValue(pr, pr.effects.damageBonus.value),
        bonusType: 'enhancement',
        source: pr.source,
        condition: pr.effects.damageBonus.condition,
        situationalOn: toggles.situational[`prop:${pr.id}|${uid}`] ?? false,
        toggleKey: `prop:${pr.id}|${uid}`,
      })
  // Quarterstaff in a flurry, judged per round (house rule #29, SRD Power Attack's double-weapon sentence): one end only
  // → two-handed (×2); both ends → one end one-handed (×1), the other light (no Power Attack damage).
  const staffBoth = inFlurry && weapon.id === 'quarterstaff' && toggles.staffBothEnds === true
  const paFactor = twoHands && !staffBoth ? 2 : 1
  if (furious)
    dmg.push({
      sourceId: 'furious-counterstrike',
      label: i18n('Furious counterstrike (your turn)', 'Riposte furieuse (votre tour)'),
      value: furious,
      bonusType: 'untyped',
      source: { book: 'Tome of Battle', page: 10 },
    })
  if (
    melee &&
    mod('wis') !== 0 &&
    strikeDice.some((d) => d.type === 'strike' && focusPicks.strike.includes(d.discipline))
  )
    dmg.push({
      sourceId: 'insightful-strike',
      label: i18n('Insightful strike (Wis)', 'Frappe perspicace (Sag)'),
      value: mod('wis'),
      bonusType: 'untyped',
      source: { book: 'Tome of Battle', page: 16 },
    })
  const paDamage = powerAttackOn && powerAttackAllowed ? toggles.powerAttack * paFactor : 0
  if (powerAttackOn && powerAttackAllowed) {
    const factor = paFactor
    dmg.push({
      sourceId: 'power-attack',
      label: i18n(`Power Attack (×${factor})`, `Attaque en puissance (×${factor})`),
      value: toggles.powerAttack * factor,
      bonusType: 'untyped',
      source: src('feats.htm#powerAttack'),
    })
  }
  if (melee && warbladeLvl >= 7 && mod('int') > 0)
    dmg.push({
      sourceId: 'battle-cunning',
      label: i18n('Battle cunning', 'Ruse au combat'),
      value: mod('int'),
      bonusType: 'insight',
      source: { book: 'Tome of Battle', page: 23 },
      condition: i18n('vs a flat-footed or flanked foe', 'contre un adversaire pris au dépourvu ou pris en tenaille'),
      situationalOn: toggles.situational[`battle-cunning|${uid}`] ?? false,
      toggleKey: `battle-cunning|${uid}`,
    })
  dmg.push(...partsFor([melee ? 'damage.melee' : 'damage.ranged', 'damage.all', 'damage.weapon']))
  const damage = resolve(dmg)
  return { damage, paDamage, staffBoth }
}
/** Critical threat range (Improved Critical or keen doubles it; Weapon Master's ki critical) and multiplier. */
function criticalThreat(e: Env, w: Held) {
  const { wmLevel } = e
  const { weapon, props, choiceFeat, weaponOfChoice } = w
  // Critical: Improved Critical doubles the range; Ki critical adds +2 after it (Sword and Fist p.39).
  let span = 21 - weapon.critRange
  const improvedCrit = !!choiceFeat('improved-critical')
  const keen = props.some((pr) => pr.effects.keen)
  // Keen and Improved Critical don't stack (https://www.d20srd.org/srd/magicItems/magicWeapons.htm#keen).
  if (improvedCrit || keen || (weaponOfChoice && wmLevel >= 7)) span *= 2
  if (weaponOfChoice && wmLevel >= 7 && improvedCrit) span += 2
  const critMult = resolve([
    { sourceId: 'weapon', label: weapon.name, value: weapon.critMult, bonusType: 'base', source: weapon.source },
  ])
  return { critRange: 21 - span, critMult }
}
/** Extra damage dice: special abilities, sneak attack, smite (flat damage), Tome of Battle strikes, boosts and stances. */
function extraDice(e: Env, w: Held) {
  const { stance, strikeDice, crusaderSmiteOn, smiteOn, smiteLvl, sneakLine } = e
  const { melee, props } = w
  return [
    ...props.flatMap((pr) => (pr.effects.extraDamage ?? []).map((x) => ({ ...x, source: pr.name }))),
    ...sneakLine,
    ...(smiteOn && melee
      ? [
          {
            dice: `${smiteLvl}`,
            type: crusaderSmiteOn ? i18n('smite', 'châtiment') : i18n('smite evil', 'châtiment du Mal'),
            condition: crusaderSmiteOn
              ? i18n(
                  'first attack only; multiplied on a critical (flat damage)',
                  'première attaque seulement ; multiplié sur un critique (dégâts fixes)',
                )
              : i18n(
                  'first attack only, vs evil; multiplied on a critical (flat damage)',
                  'première attaque seulement, contre le Mal ; multiplié sur un critique (dégâts fixes)',
                ),
            source: crusaderSmiteOn ? i18n('Crusader', 'Croisé') : i18n('Paladin', 'Paladin'),
          },
        ]
      : []),
    // Strikes/boosts/stances add dice to melee attacks (not multiplied on a critical, Tome of Battle p. 43).
    ...(melee
      ? [...(stance ? [stance] : []), ...strikeDice].flatMap((d) =>
          (d.extraDamage ?? []).map((x) => ({
            dice: x.dice,
            type: x.type ?? i18n('maneuver', 'manœuvre'),
            condition: x.condition,
            source: d.name,
          })),
        )
      : []),
  ]
}
/** Described-only notes on the attack line: special abilities, flurry, smite, quarterstaff ends, mounted lance, unarmed strike. */
function weaponNotes(e: Env, w: Held, staffBoth: boolean, powerAttackOn: boolean) {
  const { flurry, flurryOn, smiteOn, smiteLvl, smiteName } = e
  const { weapon, monkUnarmed, inFlurry, melee, hand, props, name, mountedLance } = w
  return [
    ...props.filter((pr) => pr.effects.notes).map((pr) => ({ name: pr.name, text: pr.effects.notes! })),
    ...(flurryOn && !inFlurry
      ? [
          {
            name: i18n('Flurry of blows', 'Déluge de coups'),
            text: i18n(
              'Not a monk weapon: can’t be used in a flurry.',
              'Pas une arme de moine : inutilisable pendant un déluge de coups.',
            ),
          },
        ]
      : []),
    ...(smiteOn && melee
      ? [
          {
            name: smiteName,
            text: i18n(
              `+${smiteLvl} damage on the first attack, multiplied on a critical hit like any flat bonus (only extra dice are not; rulings C23).`,
              `+${smiteLvl} aux dégâts de la première attaque, multiplié sur un coup critique comme tout bonus fixe (seuls les dés supplémentaires ne le sont pas ; décision C23).`,
            ),
          },
        ]
      : []),
    ...(staffBoth && powerAttackOn
      ? [
          {
            name: i18n('Quarterstaff, both ends', 'Bâton, deux extrémités'),
            text: i18n(
              'Power Attack ×1 on one end; the other end (light) gets no Power Attack damage (house rule #29).',
              'Attaque en puissance ×1 sur une extrémité ; l’autre (légère) n’en reçoit pas les dégâts (règle maison n° 29).',
            ),
          },
        ]
      : []),
    ...(mountedLance
      ? [
          {
            name: i18n('Lance (mounted)', 'Lance (monté)'),
            text: i18n(
              'One-handed while mounted; double damage on a mounted charge.',
              'À une main en selle ; dégâts doublés lors d’une charge montée.',
            ),
          },
        ]
      : []),
    ...(monkUnarmed
      ? [
          {
            name: i18n('Unarmed strike', 'Combat à mains nues'),
            text: i18n(
              'Lethal or nonlethal at will; no off-hand penalty, full Str bonus on every strike.',
              'Létal ou non létal au choix ; pas de main non directrice, bonus de For complet à chaque coup.',
            ),
          },
        ]
      : []),
  ]
}

/** The attack line of one weapon in hand (undefined: not a weapon). */
function weaponAttack(e: Env, uid: string): AttackLine | undefined {
  const { mod, monkLevel, size, warbladeLvl } = e
  const w = weaponInHand(e, uid)
  if (!w) return undefined
  const b = attackBonus(e, w)
  const { attack, rapidShot, powerAttackOn, powerAttackAllowed, proficient } = b
  const iterative = iterativeAttacks(e, w, attack, rapidShot)
  const { damage, paDamage, staffBoth } = weaponDamage(e, w, b)
  const { critRange, critMult } = criticalThreat(e, w)
  const { weapon, monkUnarmed, hand, enh, mat, props, weaponOfChoice, name, twoHands } = w
  return {
    itemUid: uid,
    weapon,
    name,
    attack,
    iterative,
    // Small characters use Small weapons (https://www.d20srd.org/srd/equipment/weapons.htm#weaponSize).
    damageDice:
      monkUnarmed || (monkLevel > 0 && weapon.id === 'gauntlet')
        ? monkUnarmedDice(monkLevel, size)
        : size === 'small'
          ? weapon.damage.S
          : weapon.damage.M,
    damage,
    critRange,
    critMult,
    weaponOfChoice,
    // Ki damage: maximum damage, Power Attack not maximized (Sword and Fist p. 39; rulings Q10).
    kiDamageMax: weaponOfChoice
      ? maxDice(size === 'small' ? weapon.damage.S : weapon.damage.M) + damage.total - paDamage
      : undefined,
    powerAttackAllowed,
    extraDamage: extraDice(e, w),
    critExtraDamage: props
      .filter((pr) => pr.effects.critExtraDamage)
      .map((pr) => {
        // Bursts: +1d10 per multiplier step above ×1 (×2 → 1d10, ×3 → 2d10, ×4 → 3d10).
        const [n, die] = pr.effects.critExtraDamage!.dice.split('d')
        return {
          dice: `${Number(n) * (weapon.critMult - 1)}d${die}`,
          type: pr.effects.critExtraDamage!.type,
          source: pr.name,
        }
      }),
    bypassDR: [
      ...new Set([
        ...(mat?.effects.bypassDR ? [mat.effects.bypassDR] : []),
        ...(enh > 0 ? ['magic'] : []),
        ...(monkUnarmed ? kiStrike(monkLevel) : []),
      ]),
    ],
    notes: weaponNotes(e, w, staffBoth, powerAttackOn),
    // Battle ardor (warblade 3, Tome of Battle p. 22): insight = Int bonus on critical confirmation rolls.
    critConfirmBonus: warbladeLvl >= 3 ? Math.max(0, mod('int')) : 0,
    hand,
    proficient,
    twoHands,
  }
}

/** Wild shape: the form's natural attacks with the druid's BAB and new Str/Dex (Alternate Form, MM errata 2006: she keeps her BAB and feats, not the form's). Secondary natural attacks −5 (−2 with her own Multiattack) and ½ Str; a sole natural attack 1½ Str (https://www.d20srd.org/srd/monsters/intro.htm). The form's feats are not gained (her own Weapon Finesse applies to natural weapons). */
function naturalAttacks(e: Env) {
  const {
    abilityPart,
    bab,
    expertiseOn,
    feats,
    hasFeat,
    mod,
    partsFor,
    shape,
    size,
    sizePart,
    tableSum,
    toggles,
    sneakLine,
  } = e
  if (!shape) return []
  const out: AttackLine[] = []
  const routines = [shape.attacks, ...(shape.altAttacks ?? [])]
  routines.forEach((routine, r) => {
    const naturals = routine.filter((a) => a.role !== 'weapon')
    const sole = naturals.length === 1 && naturals[0].count === 1
    naturals.forEach((a, n) => {
      const ranged = a.kind === 'ranged' || a.kind === 'rangedTouch'
      const useDex = ranged || (hasFeat('weapon-finesse') && mod('dex') > mod('str'))
      const atk: Part[] = [...tableSum('bab'), abilityPart(useDex ? 'dex' : 'str')]
      if (SIZE_MOD[size]) atk.push(sizePart(SIZE_MOD[size]))
      if (a.role === 'secondary') {
        const multi = hasFeat('multiattack')
        atk.push({
          sourceId: 'secondary',
          label: multi
            ? i18n('Secondary attack (Multiattack)', 'Attaque secondaire (Attaques multiples)')
            : i18n('Secondary natural attack', 'Attaque naturelle secondaire'),
          value: multi ? -2 : -5,
          bonusType: 'untyped',
          source: { srdUrl: 'https://www.d20srd.org/srd/monsters/intro.htm' },
        })
      }
      if (toggles.fightingDefensively)
        atk.push({
          sourceId: 'fighting-defensively',
          label: i18n('Fighting defensively', 'Combat sur la défensive'),
          value: -4,
          bonusType: 'untyped',
          source: src('combat/actionsInCombat.htm#fightDefensively'),
        })
      if (!ranged && expertiseOn)
        atk.push({
          sourceId: 'combat-expertise',
          label: i18n('Combat Expertise', 'Expertise du combat'),
          value: -toggles.combatExpertise,
          bonusType: 'untyped',
          source: src('feats.htm#combatExpertise'),
        })
      const pa = !ranged && hasFeat('power-attack') && toggles.powerAttack > 0
      if (pa)
        atk.push({
          sourceId: 'power-attack',
          label: i18n('Power Attack', 'Attaque en puissance'),
          value: -toggles.powerAttack,
          bonusType: 'untyped',
          source: src('feats.htm#powerAttack'),
        })
      atk.push(...partsFor([ranged ? 'attack.ranged' : 'attack.melee', 'attack.all']))
      const attack = resolve(atk)
      // Str to damage: the stat block's factor when it is not the default (grab-only arms: 0), else primary ×1,
      // secondary ×½, sole ×1½; a penalty applies in full.
      const noDamage = /^0$/.test(a.damage.trim())
      const factor =
        ranged || noDamage ? 0 : a.strDamageFactor === 0 ? 0 : a.role === 'secondary' ? 0.5 : sole ? 1.5 : 1
      const strMod = mod('str')
      const strDmg = strMod < 0 ? (factor ? strMod : 0) : Math.floor(strMod * factor)
      const dmg: Part[] = []
      if (strDmg)
        dmg.push({
          ...abilityPart('str', strDmg),
          label:
            factor === 1 ? ABILITY_NAMES.str : i18n(`Strength ×${factor}`, `Force ×${factor === 0.5 ? '½' : '1,5'}`),
        })
      if (pa && !noDamage)
        dmg.push({
          sourceId: 'power-attack',
          label: i18n('Power Attack', 'Attaque en puissance'),
          value: toggles.powerAttack,
          bonusType: 'untyped',
          source: src('feats.htm#powerAttack'),
        })
      if (!noDamage) dmg.push(...partsFor([ranged ? 'damage.ranged' : 'damage.melee', 'damage.all']))
      const damage = resolve(dmg)
      const crit = a.critical?.match(/^(?:(\d+)-20\/)?×(\d)$/)
      const critRange = crit?.[1] ? Number(crit[1]) : 20
      const mult = crit?.[2] ? Number(crit[2]) : 2
      const dice = a.damage.match(/^\d+d\d+/)?.[0] ?? a.damage
      const weapon: WeaponDef = {
        id: `natural:${a.name.en.toLowerCase()}`,
        name: a.name,
        category: 'natural' as WeaponDef['category'],
        kind: ranged ? 'ranged' : 'melee',
        handedness: 'light',
        damage: { S: dice, M: dice },
        critRange,
        critMult: mult,
        damageTypes: [],
        weight: { lb: 0, kg: 0 },
        costGp: 0,
        text: shape.specialAttacks,
        source: shape.source,
      }
      out.push({
        itemUid: `wild-shape:${r}:${n}`,
        weapon,
        name: { en: `${a.name.en} (${shape.name.en})`, fr: `${a.name.fr} (${shape.name.fr})` },
        attack,
        iterative: Array.from({ length: a.count }, () => attack.total),
        damageDice: dice,
        damage,
        critRange,
        critMult: resolve([
          { sourceId: 'form', label: shape.name, value: mult, bonusType: 'base', source: shape.source },
        ]),
        weaponOfChoice: false,
        powerAttackAllowed: !ranged && hasFeat('power-attack'),
        extraDamage: [...(a.extra ? [{ dice: '', type: a.extra, source: shape.name }] : []), ...sneakLine],
        critExtraDamage: [],
        bypassDR: [],
        notes: [],
        critConfirmBonus: 0,
        routine: r,
        proficient: true,
        twoHands: false,
      })
    })
  })
  return out
}
