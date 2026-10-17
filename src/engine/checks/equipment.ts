// Equipment and combat checks on the current state: two-weapon fighting, ranger combat style, unusable feats, Weapon Master requirements, druid armor, proficiency, grip, load, max Dex, magic item properties and body slots.
import type { I18n } from '../../data/types'
import { SRD, w, type CheckContext } from './common'
import { unmetPrereqs } from '../prereq'

/** Current-state checks of equipment and combat (with temporary effects). */
export function checkEquipment(ctx: CheckContext): void {
  const { char, rules, now, out } = ctx
  // Two-weapon fighting: neither weapon can be wielded in two hands.
  for (const a of now.attacks)
    if (a.hand && a.weapon.handedness === 'twoHanded')
      out.push(
        w(
          `twf-two-handed-${a.itemUid}`,
          'error',
          'combat',
          `${a.weapon.name.en} needs both hands: it can't be used for two-weapon fighting`,
          `${a.weapon.name.fr} demande les deux mains : impossible en combat à deux armes`,
          { srdUrl: `${SRD}combat/specialAttacks.htm#twoWeaponFighting` },
        ),
      )
  // Ranger combat style works only in light or no armor (https://www.d20srd.org/srd/classes/ranger.htm#combatStyle).
  if (now.combatStyle && !now.combatStyle.active)
    out.push(
      w(
        'combat-style-inactive',
        'warning',
        'combat',
        `${now.combatStyle.name.en} combat style unusable: medium or heavy armor worn`,
        `Style de combat (${now.combatStyle.name.fr}) inutilisable : armure intermédiaire ou lourde portée`,
        { srdUrl: `${SRD}classes/ranger.htm#combatStyle` },
      ),
    )
  const loseFeat = (id: string, why: I18n) => {
    const def = rules.feats.get(id)
    out.push(
      w(
        `unusable-${id}`,
        'warning',
        'feats',
        `${def?.name.en ?? id} can't be used: ${why.en}`,
        `${def?.name.fr ?? id} inutilisable : ${why.fr}`,
        { srdUrl: def?.source.srdUrl },
      ),
    )
  }
  for (const id of now.unusableFeats)
    loseFeat(id, {
      en: 'its prerequisite comes from the ranger combat style, lost in medium or heavy armor',
      fr: 'sa condition vient du style de combat du rôdeur, perdu en armure intermédiaire ou lourde',
    })
  if (now.feats.some((f) => f.featId === 'spring-attack') && now.armor?.category === 'heavy')
    loseFeat('spring-attack', {
      en: 'wearing heavy armor (still counts as a prerequisite)',
      fr: 'armure lourde portée (compte toujours comme condition)',
    })
  // Feats taken as a bonus feat that ignores prerequisites (monk) can't lose them.
  const noPrereq = new Set(
    char.levels.flatMap((l) =>
      rules.classes.get(l.classId)?.bonusFeatIgnorePrereqs
        ? l.feats.filter((p) => p.slot === 'class').map((p) => p.featId)
        : [],
    ),
  )
  for (const f of now.feats) {
    const def = rules.feats.get(f.featId)
    if (!def?.prereq.abilities || noPrereq.has(f.featId)) continue
    const unmet = unmetPrereqs({ abilities: def.prereq.abilities }, now, rules, [], f.choice)
    if (unmet.length)
      loseFeat(f.featId, {
        en: `prerequisite lost (${unmet.map((u) => u.en).join(', ')})`,
        fr: `condition perdue (${unmet.map((u) => u.fr).join(', ')})`,
      })
  }
  if (now.weaponMaster.level > 0) {
    const req = rules.classes.get('weapon-master')?.requirements
    const unmet = unmetPrereqs(
      { ...req, skills: undefined, bab: undefined },
      now,
      rules,
      now.feats,
      char.weaponOfChoice,
    )
    if (unmet.length)
      out.push(
        w(
          'weapon-master-lost',
          'warning',
          'levels',
          `Weapon Master class features lost while requirements are unmet: ${unmet.map((u) => u.en).join(', ')}`,
          `Pouvoirs de maître d'armes perdus tant que les conditions ne sont pas remplies : ${unmet.map((u) => u.fr).join(', ')}`,
          { book: 'Complete Warrior p.16 / 3.5 FAQ' },
        ),
      )
    const focus = now.feats.find((f) => f.featId === 'weapon-focus' && f.choice === char.weaponOfChoice)
    if (!focus)
      out.push(
        w(
          'weapon-of-choice',
          'error',
          'combat',
          'Weapon of choice must be a Weapon Focus weapon',
          "L'arme de prédilection doit être celle du don Arme de prédilection",
          { book: 'Sword and Fist p.38' },
        ),
      )
  }

  // Druid: no metal armor (padded, leather or hide), wooden shields only; otherwise no druid spells nor supernatural or
  // spell-like class abilities while wearing it and for 24 hours after (https://www.d20srd.org/srd/classes/druid.htm).
  if ((now.classLevels['druid'] ?? 0) > 0)
    for (const x of [now.armor, now.shield]) {
      if (!x) continue
      const wooden =
        ['padded', 'leather', 'hide', 'light-wooden-shield', 'heavy-wooden-shield'].includes(x.def.id) ||
        x.item.material === 'darkwood'
      if (!wooden)
        out.push(
          w(
            `druid-metal-${x.item.uid}`,
            'error',
            'inventory',
            `Druid in ${x.def.name.en}: metal armor or shield — no druid spells, wild shape or other supernatural or spell-like class abilities while worn and for 24 hours after`,
            `Druide avec ${x.def.name.fr} : armure ou bouclier métallique — ni sorts de druide, ni forme animale, ni autre pouvoir surnaturel ou magique de classe tant qu’il est porté et 24 heures après`,
            { srdUrl: `${SRD}classes/druid.htm` },
          ),
        )
    }
  // Equipment: proficiency, load, max Dex, slots.
  const profArmor = now.proficiency.armor
  // Mithral armor: one category lighter for proficiency too (FAQ 6/30/2008 pp. 53–54, rulings C35).
  for (const x of [now.armor, now.shield]) {
    if (x && !profArmor.has(x === now.armor ? now.armor.category : x.def.category))
      out.push(
        w(
          `armor-prof-${x.item.uid}`,
          'error',
          'inventory',
          `Not proficient with ${x.def.name.en}`,
          `Pas de maniement de ${x.def.name.fr}`,
          { srdUrl: `${SRD}equipment/armor.htm` },
        ),
      )
  }
  for (const a of now.attacks)
    if (!a.proficient)
      out.push(
        w(
          `weapon-prof-${a.itemUid}`,
          'error',
          'combat',
          `Not proficient with ${a.weapon.name.en} (−4 attack)`,
          `Pas de maniement de ${a.weapon.name.fr} (−4 à l'attaque)`,
          { srdUrl: `${SRD}equipment/weapons.htm` },
        ),
      )
  // Two-handed grip with a shield on the arm: only a buckler can stay strapped (−1 attack, already applied);
  // a light or heavy shield needs its hand (rulings-combat-equipment.md R27).
  if (now.shield && now.shield.def.id !== 'buckler' && now.attacks.some((a) => a.twoHands && a.weapon.kind === 'melee'))
    out.push(
      w(
        'two-hands-shield',
        'warning',
        'combat',
        `A weapon held two-handed and ${now.shield.def.name.en} in the same loadout: the shield hand is needed for the weapon (only a buckler stays usable)`,
        `Arme tenue à deux mains et ${now.shield.def.name.fr} dans la même configuration : la main du bouclier sert à tenir l'arme (seule une targe reste utilisable)`,
        { srdUrl: `${SRD}equipment/armor.htm#buckler` },
      ),
    )
  if (now.load.band !== 'light')
    out.push(
      w(
        'load',
        now.load.band === 'overloaded' ? 'error' : 'warning',
        'inventory',
        `Load: ${now.load.band} (${now.load.carried.lb} lb)`,
        `Charge : ${now.load.band === 'medium' ? 'intermédiaire' : now.load.band === 'heavy' ? 'lourde' : 'excessive'} (${now.load.carried.kg} kg)`,
        { srdUrl: `${SRD}carryingCapacity.htm` },
      ),
    )
  if (now.maxDex.value !== null && now.abilities.dex.mod > now.maxDex.value)
    out.push(
      w(
        'max-dex',
        'info',
        'combat',
        `Dex bonus to AC capped at +${now.maxDex.value} by ${now.maxDex.from.en} (Dex mod +${now.abilities.dex.mod})`,
        `Bonus de Dex à la CA limité à +${now.maxDex.value} par ${now.maxDex.from.fr} (mod. Dex +${now.abilities.dex.mod})`,
        { srdUrl: `${SRD}equipment/armor.htm#maximumDexBonus` },
      ),
    )
  // Special abilities need at least +1 (https://www.d20srd.org/srd/magicItems/magicWeapons.htm). Above a +10 total
  // the item is epic (https://www.d20srd.org/srd/epic/magicItems/epicMagicItems.htm): allowed, only noted.
  for (const it of char.inventory) {
    const props = (it.properties ?? []).map((id) => rules.itemProperties.get(id)).filter((d) => !!d)
    if (!props.length) continue
    const enh = it.enhancement ?? 0
    const total = enh + props.reduce((s, p) => s + p.bonusEquivalent, 0)
    if (enh < 1)
      out.push(
        w(
          `props-need-enh-${it.uid}`,
          'error',
          'inventory',
          'Special abilities need at least a +1 enhancement bonus',
          'Les propriétés spéciales exigent au moins un bonus d’altération de +1',
          { srdUrl: `${SRD}magicItems/magicWeapons.htm` },
        ),
      )
    if (total > 10)
      out.push(
        w(
          `props-epic-${it.uid}`,
          'info',
          'inventory',
          `Total bonus +${total}: epic item (above +10)`,
          `Bonus total +${total} : objet épique (au-delà de +10)`,
          { srdUrl: `${SRD}epic/magicItems/epicMagicItems.htm` },
        ),
      )
  }
  const slots: Record<string, number> = {}
  for (const it of char.inventory) {
    if (it.location !== 'worn') continue
    const armorCat = it.kind === 'armor' ? rules.armor.get(it.refId)?.category : undefined
    const slot =
      it.kind === 'magic'
        ? rules.magicItems.get(it.refId)?.slot
        : it.kind === 'custom'
          ? it.custom?.slot
          : armorCat && armorCat !== 'shield' && armorCat !== 'tower'
            ? 'body' // a suit of armor occupies the body slot
            : undefined
    if (slot) slots[slot] = (slots[slot] ?? 0) + it.quantity
  }
  for (const [slot, n] of Object.entries(slots))
    if (n > (slot === 'ring' ? 2 : 1))
      out.push(
        w(
          `slot-${slot}`,
          'error',
          'inventory',
          `Too many items worn on slot "${slot}": only the first works`,
          `Trop d'objets sur l'emplacement « ${slot} » : seul le premier fonctionne`,
          { srdUrl: `${SRD}magicItems/magicItemBasics.htm` },
        ),
      )
}
