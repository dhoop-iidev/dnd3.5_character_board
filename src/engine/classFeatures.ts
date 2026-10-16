// Class features of the barbarian, monk, paladin and rogue that are numbers by level (SRD tables), and the
// alignment / multiclass restrictions of the core classes. compute.ts applies them; the UI tracks uses.
// https://www.d20srd.org/srd/classes/barbarian.htm, monk.htm, paladin.htm, rogue.htm
import type { CreatureDef, I18n } from '../data/types'
import type { Alignment } from './alignment'

type Size = CreatureDef['size']

const SRD = 'https://www.d20srd.org/srd/classes/'

// ---- barbarian
/** Rage: uses per day (1 + 1 per 4 levels), Str/Con bonus and Will morale bonus (greater rage 11th, mighty rage 20th),
 * no fatigue from 17th (tireless rage). https://www.d20srd.org/srd/classes/barbarian.htm#rage */
export function rageStats(level: number) {
  return {
    perDay: 1 + Math.floor(level / 4),
    strCon: level >= 20 ? 8 : level >= 11 ? 6 : 4,
    will: level >= 20 ? 4 : level >= 11 ? 3 : 2,
    tireless: level >= 17,
    name:
      level >= 20
        ? { en: 'Mighty rage', fr: 'Rage de maître berserker' }
        : level >= 11
          ? { en: 'Greater rage', fr: 'Rage de grand berserker' }
          : { en: 'Rage', fr: 'Rage de berserker' },
  }
}
/** Skills usable while raging: not Cha-, Dex- or Int-based ones (except Balance, Escape Artist, Intimidate, Ride), nor
 * Concentration. */
export const RAGE_SKILL_EXCEPTIONS = ['balance', 'escape-artist', 'intimidate', 'ride']
/** Damage reduction x/—: 1/— at 7th, +1 at 10th, 13th, 16th, 19th. */
export const barbarianDR = (level: number) => (level >= 7 ? Math.floor((level - 4) / 3) : 0)

// ---- monk
const MONK_BANDS = [1, 4, 8, 12, 16, 20]
/** Monk unarmed damage by size (Table: The Monk; Table: Small or Large Monk Unarmed Damage). */
// Tiny and Huge: one size step from Small / Large (FAQ 6/30/2008 p. 20: "A Huge 1st-level monk deals 2d6").
const MONK_UNARMED: Partial<Record<Size, string[]>> = {
  tiny: ['1d3', '1d4', '1d6', '1d8', '1d10', '2d6'],
  small: ['1d4', '1d6', '1d8', '1d10', '2d6', '2d8'],
  medium: ['1d6', '1d8', '1d10', '2d6', '2d8', '2d10'],
  large: ['1d8', '2d6', '2d8', '3d6', '3d8', '4d8'],
  huge: ['2d6', '3d6', '3d8', '4d6', '4d8', '6d8'],
}
export function monkUnarmedDice(level: number, size: Size): string {
  let band = 0
  MONK_BANDS.forEach((min, i) => {
    if (level >= min) band = i
  })
  return (MONK_UNARMED[size] ?? MONK_UNARMED.medium!)[band]
}
/** Special monk weapons usable in a flurry of blows. */
export const MONK_WEAPONS = ['kama', 'nunchaku', 'quarterstaff', 'sai', 'shuriken-5', 'siangham', 'unarmed-strike']
/** Flurry of blows: −2 on every attack (−1 from 5th, none from 9th), one extra attack at the highest bonus (two from
 * 11th, greater flurry). https://www.d20srd.org/srd/classes/monk.htm#flurryofBlows */
export const flurryStats = (level: number) => ({ penalty: level >= 9 ? 0 : level >= 5 ? -1 : -2, extra: level >= 11 ? 2 : 1 })
/** Ki strike: what the unarmed strike counts as against damage reduction. */
export const kiStrike = (level: number) => [...(level >= 4 ? ['magic'] : []), ...(level >= 10 ? ['lawful'] : []), ...(level >= 16 ? ['adamantine'] : [])]
/** Slow fall: distance ignored next to a wall (20 ft at 4th, +10 ft every 2 levels, any distance at 20th). */
export const slowFallFt = (level: number) => (level >= 20 ? Infinity : level >= 4 ? 20 + 10 * Math.floor((level - 4) / 2) : 0)

// ---- paladin
/** Smite evil: 1/day, +1 per 5 levels. */
export const smitePerDay = (level: number) => 1 + Math.floor(level / 5)
/** Remove disease: 1/week at 6th, +1 every 3 levels. */
export const removeDiseasePerWeek = (level: number) => (level >= 6 ? 1 + Math.floor((level - 6) / 3) : 0)

/** Table: The Paladin's Mount (https://www.d20srd.org/srd/classes/paladin.htm#specialMount). */
export const PALADIN_MOUNT: { minLevel: number; maxLevel: number; bonusHD: number; naturalArmorAdj: number; strAdj: number; int: number; special: { id: string; name: I18n; text: I18n }[] }[] = [
  {
    minLevel: 5,
    maxLevel: 7,
    bonusHD: 2,
    naturalArmorAdj: 4,
    strAdj: 1,
    int: 6,
    special: [
      { id: 'empathic-link', name: { en: 'Empathic link', fr: 'Lien télépathique' }, text: { en: 'Empathic communication with the paladin up to 1 mile.', fr: 'Communication empathique avec le paladin jusqu’à 1,5 km.' } },
      { id: 'improved-evasion', name: { en: 'Improved evasion', fr: 'Esquive extraordinaire' }, text: { en: 'No damage on a successful Reflex save for half, half damage on a failed one.', fr: 'Aucun dégât sur un jet de Réflexes réussi (demi-dégâts), demi-dégâts en cas d’échec.' } },
      { id: 'share-spells', name: { en: 'Share spells', fr: 'Transfert d’effet magique' }, text: { en: 'Spells the paladin casts on herself can also affect the mount within 5 ft; "you" spells can target the mount.', fr: 'Les sorts que le paladin lance sur lui peuvent aussi affecter la monture à 1,50 m ; les sorts « personnel » peuvent la cibler.' } },
      { id: 'share-saving-throws', name: { en: 'Share saving throws', fr: 'Transfert de jet de sauvegarde' }, text: { en: 'The mount uses its own base save or the paladin’s, whichever is higher.', fr: 'La monture utilise son jet de sauvegarde de base ou celui du paladin, le meilleur des deux.' } },
    ],
  },
  { minLevel: 8, maxLevel: 10, bonusHD: 4, naturalArmorAdj: 6, strAdj: 2, int: 7, special: [{ id: 'improved-speed', name: { en: 'Improved speed', fr: 'Vitesse supérieure' }, text: { en: '+10 ft speed.', fr: '+3 m de vitesse.' } }] },
  { minLevel: 11, maxLevel: 14, bonusHD: 6, naturalArmorAdj: 8, strAdj: 3, int: 8, special: [{ id: 'command', name: { en: 'Command creatures of its kind', fr: 'Injonction' }, text: { en: 'Command (as the spell) creatures of its kind with fewer HD than the mount, once per day per two paladin levels; Will DC 10 + ½ paladin level + paladin’s Cha; Concentration DC 21 if ridden.', fr: 'Injonction (comme le sort) sur les créatures de son espèce ayant moins de DV que la monture, une fois par jour par tranche de deux niveaux de paladin ; Volonté DD 10 + ½ niveau de paladin + Cha du paladin ; Concentration DD 21 si elle est montée.' } }] },
  { minLevel: 15, maxLevel: 20, bonusHD: 8, naturalArmorAdj: 10, strAdj: 4, int: 9, special: [{ id: 'spell-resistance', name: { en: 'Spell resistance', fr: 'Résistance à la magie' }, text: { en: 'Spell resistance = paladin level + 5.', fr: 'Résistance à la magie = niveau de paladin + 5.' } }] },
]

// ---- rogue
/** Sneak attack: +1d6 at 1st, +1d6 every two levels. */
export const sneakAttackDice = (level: number) => (level >= 1 ? Math.ceil(level / 2) : 0)
/** Rogue special abilities: 10th, 13th, 16th, 19th. Skill mastery and the bonus feat can be taken again. */
export const ROGUE_SPECIAL_LEVELS = [10, 13, 16, 19]
export const ROGUE_REPEATABLE = ['skill-mastery', 'feat']

// ---- alignment and multiclass restrictions (https://www.d20srd.org/srd/classes/)
/** Alignments a class requires to take a new level. */
export const CLASS_ALIGNMENT: Record<string, { ok: (a: Alignment) => boolean; text: I18n; url: string }> = {
  barbarian: { ok: (a) => a.order !== 'lawful', text: { en: 'any nonlawful', fr: 'tout sauf loyal' }, url: `${SRD}barbarian.htm#exBarbarians` },
  crusader: { ok: (a) => !(a.order === 'neutral' && a.moral === 'neutral'), text: { en: 'any except true neutral', fr: 'tout sauf neutre strict' }, url: '' },
  bard: { ok: (a) => a.order !== 'lawful', text: { en: 'any nonlawful', fr: 'tout sauf loyal' }, url: `${SRD}bard.htm#exBards` },
  druid: { ok: (a) => a.order === 'neutral' || a.moral === 'neutral', text: { en: 'neutral on at least one axis', fr: 'neutre sur au moins un axe' }, url: `${SRD}druid.htm#exDruids` },
  monk: { ok: (a) => a.order === 'lawful', text: { en: 'any lawful', fr: 'tout loyal' }, url: `${SRD}monk.htm#exMonks` },
  paladin: { ok: (a) => a.order === 'lawful' && a.moral === 'good', text: { en: 'lawful good', fr: 'loyal bon' }, url: `${SRD}paladin.htm#exPaladins` },
}
/** Classes that can't be raised again once another class has been taken after them (monk, paladin). */
export const NO_RETURN_CLASSES = ['monk', 'paladin']
