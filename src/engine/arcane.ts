// Arcane casters: wizard spellbook and school specialization, bard and sorcerer spells known (with the spell swap),
// arcane spell failure, the sorcerer/wizard familiar and bardic music.
// https://www.d20srd.org/srd/classes/wizard.htm, sorcerer.htm, bard.htm, sorcererWizard.htm#familiars
import type { Rules } from '../data/rules'
import type { CompanionAdvancementRow, I18n, ModifierSpec, SpellDef } from '../data/types'
import type { Character } from '../model/character'
import { classSpellLevel } from './spells'
import { i18n, resolve, type Part, type Stat } from './stacking'

const SRD = 'https://www.d20srd.org/srd/'
export const SCHOOLS = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation']

/** Classes whose spells are learned level by level (spells known / free spellbook spells). */
export const LEARNING_CLASSES = ['bard', 'sorcerer', 'wizard']

/** Spell swap levels: sorcerer 4th and every even level after; bard 5th and every third level after
 * (https://www.d20srd.org/srd/classes/sorcerer.htm, bard.htm). */
export function isSwapLevel(classId: string, classLevel: number): boolean {
  if (classId === 'sorcerer') return classLevel >= 4 && classLevel % 2 === 0
  if (classId === 'bard') return classLevel >= 5 && (classLevel - 5) % 3 === 0
  return false
}

/** Spell level of a spell on a class's list (undefined: not on it). */
export function listLevel(rules: Rules, classId: string, spellId: string): number | undefined {
  const list = rules.classes.get(classId)?.spellcasting?.list
  const sp = rules.spells.get(spellId)
  return list && sp ? classSpellLevel(sp, classId, list) : undefined
}

/** Wizard specialty school and prohibited schools, chosen at the first wizard level. */
export function wizardSchools(char: Character): { specialty?: string; prohibited: string[] } {
  const first = char.levels.find((l) => l.classId === 'wizard')
  const ch = first?.classChoices ?? {}
  const specialty = ch.school && ch.school !== 'universal' ? ch.school : undefined
  return { specialty, prohibited: specialty ? [ch.prohibited1, ch.prohibited2].filter((x): x is string => !!x) : [] }
}

/** Number of prohibited schools a specialist gives up: one for a diviner, two otherwise (wizard.htm#schoolSpecialization). */
export const prohibitedCount = (specialty?: string) => (!specialty ? 0 : specialty === 'divination' ? 1 : 2)

export interface SpellbookEntry {
  id: string
  level: number
  /** cantrip: every 0-level spell (not prohibited); level: free spells per wizard level; copied: added later. */
  how: 'cantrip' | 'level' | 'copied'
}

/**
 * Wizard spellbook: all 0-level wizard spells except the prohibited schools, the free spells of each wizard level, and
 * the spells copied from scrolls or other spellbooks (https://www.d20srd.org/srd/classes/wizard.htm#spellbooks).
 */
export function spellbook(char: Character, rules: Rules, learned: string[]): SpellbookEntry[] {
  if (!char.levels.some((l) => l.classId === 'wizard')) return []
  const { prohibited } = wizardSchools(char)
  const out: SpellbookEntry[] = []
  const seen = new Set<string>()
  const add = (id: string, how: SpellbookEntry['how']) => {
    const lvl = listLevel(rules, 'wizard', id)
    if (lvl === undefined || seen.has(id)) return
    seen.add(id)
    out.push({ id, level: lvl, how })
  }
  for (const sp of rules.spells.values())
    if (sp.level['sorcerer-wizard'] === 0 && !prohibited.includes(sp.schoolId ?? '')) add(sp.id, 'cantrip')
  for (const id of learned) add(id, 'level')
  for (const id of char.spells?.['wizard']?.spellbook ?? []) add(id, 'copied')
  return out.sort((a, b) => a.level - b.level)
}

/** Spells a wizard may prepare: the spellbook, plus read magic from memory (wizard.htm#spellbooks). */
export function preparable(char: Character, rules: Rules, learned: string[]): Set<string> {
  return new Set([...spellbook(char, rules, learned).map((e) => e.id), 'read-magic'])
}

/** Pages and cost to copy a spell into a spellbook: 1 page per spell level (0-level: 1), 100 gp per page; 24 hours;
 * Spellcraft DC 15 + spell level to understand it first (https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm#addingSpellsToAWizardsSpellbook). */
export function copyCost(spellLevel: number): { pages: number; gp: number } {
  const pages = Math.max(1, spellLevel)
  return { pages, gp: 100 * pages }
}

/** Spells known by spell level from the class table (bard, sorcerer), at an effective class level. */
export function knownCaps(rules: Rules, classId: string, classLevel: number): (number | null)[] {
  return rules.classes.get(classId)?.table.find((r) => r.level === Math.min(20, classLevel))?.spellsKnown ?? []
}

/** Spell levels a class can learn and cast at a class level with this key ability score: the table gives spells per
 * day (or spells known) for that level, and the score is at least 10 + the spell level. */
export function castableLevels(rules: Rules, classId: string, classLevel: number, score: number): number[] {
  const row = rules.classes.get(classId)?.table.find((r) => r.level === Math.min(20, classLevel))
  const perDay = row?.spellsPerDay ?? []
  const known = row?.spellsKnown ?? []
  const out: number[] = []
  for (let l = 0; l < Math.max(perDay.length, known.length); l++) {
    const has = (perDay[l] !== null && perDay[l] !== undefined) || (known[l] !== null && known[l] !== undefined && known[l]! > 0)
    if (has && score >= 10 + l) out.push(l)
  }
  return out
}

/** Why a spell can't be learned at that point (empty = it can). */
export function spellLearnBlockers(
  rules: Rules,
  classId: string,
  sp: SpellDef,
  castable: number[],
  prohibited: string[] = [],
): I18n[] {
  const lvl = listLevel(rules, classId, sp.id)
  const out: I18n[] = []
  if (lvl === undefined) out.push(i18n('not on the class spell list', 'absent de la liste de sorts de la classe'))
  else if (!castable.includes(lvl)) out.push(i18n(`level ${lvl} not castable yet`, `niveau ${lvl} pas encore accessible`))
  if (prohibited.includes(sp.schoolId ?? '')) out.push(i18n('prohibited school', 'école interdite'))
  return out
}

// ---- arcane spell failure (https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm#arcaneSpellsAndArmor)

/**
 * Arcane spell failure chance for one casting class: armor + shield (each lowered by its special material, e.g.
 * mithral −10%). A bard casts bard spells in light armor without it; a shield still counts
 * (https://www.d20srd.org/srd/classes/bard.htm#bardWeaponandArmorProficiency). Only spells with a somatic component.
 */
export function spellFailure(
  classId: string,
  armor: { name: I18n; asf: number; category: string } | undefined,
  shield: { name: I18n; asf: number } | undefined,
): Stat {
  const url = `${SRD}magicOverview/arcaneSpells.htm#arcaneSpellsAndArmor`
  const parts: Part[] = []
  if (armor && armor.asf > 0) {
    if (classId === 'bard' && armor.category === 'light')
      parts.push({ sourceId: 'armor', label: i18n(`${armor.name.en} (light armor: none for bard spells)`, `${armor.name.fr} (armure légère : aucun pour les sorts de barde)`), value: 0, bonusType: 'untyped', source: { srdUrl: `${SRD}classes/bard.htm#bardWeaponandArmorProficiency` } })
    else parts.push({ sourceId: 'armor', label: armor.name, value: armor.asf, bonusType: 'untyped', source: { srdUrl: url } })
  }
  if (shield && shield.asf > 0) parts.push({ sourceId: 'shield', label: shield.name, value: shield.asf, bonusType: 'untyped', source: { srdUrl: url } })
  return resolve(parts)
}

/** Spells with a somatic component risk arcane spell failure ("V, S, M": S). */
export const hasSomatic = (sp: SpellDef) => /(^|[\s,])S($|[\s,/])/.test(sp.components)

// ---- familiar (https://www.d20srd.org/srd/classes/sorcererWizard.htm#familiars)

export const FAMILIAR_URL = `${SRD}classes/sorcererWizard.htm#familiars`
export const FAMILIAR_CLASSES = ['sorcerer', 'wizard']

/** Master level for the familiar: sorcerer and wizard levels stack (sorcererWizard.htm#familiars). */
export const familiarLevel = (classLevels: Record<string, number>) => FAMILIAR_CLASSES.reduce((n, c) => n + (classLevels[c] ?? 0), 0)

/** The ten familiars (creatures.json ids) and what the master gains while within 1 mile. */
export const FAMILIARS: { id: string; master: ModifierSpec[]; text: I18n }[] = [
  { id: 'bat', master: [{ target: 'skill.listen', bonusType: 'untyped', value: 3 }], text: i18n('+3 on Listen checks', '+3 aux tests de Perception auditive') },
  { id: 'cat', master: [{ target: 'skill.move-silently', bonusType: 'untyped', value: 3 }], text: i18n('+3 on Move Silently checks', '+3 aux tests de Déplacement silencieux') },
  { id: 'hawk', master: [{ target: 'skill.spot', bonusType: 'untyped', value: 3, condition: i18n('in bright light', 'sous une lumière vive') }], text: i18n('+3 on Spot checks in bright light', '+3 aux tests de Détection sous une lumière vive') },
  // The French SRD prints +2 for the lizard; the English SRD (+3) is kept.
  { id: 'lizard', master: [{ target: 'skill.climb', bonusType: 'untyped', value: 3 }], text: i18n('+3 on Climb checks', '+3 aux tests d’Escalade') },
  { id: 'owl', master: [{ target: 'skill.spot', bonusType: 'untyped', value: 3, condition: i18n('in shadows', 'dans l’obscurité') }], text: i18n('+3 on Spot checks in shadows', '+3 aux tests de Détection dans l’obscurité') },
  { id: 'rat', master: [{ target: 'save.fort', bonusType: 'untyped', value: 2 }], text: i18n('+2 on Fortitude saves', '+2 aux jets de Vigueur') },
  { id: 'raven', master: [{ target: 'skill.appraise', bonusType: 'untyped', value: 3 }], text: i18n('+3 on Appraise checks; the raven speaks one language of your choice', '+3 aux tests d’Estimation ; le corbeau parle une langue de votre choix') },
  { id: 'snake-tiny-viper', master: [{ target: 'skill.bluff', bonusType: 'untyped', value: 3 }], text: i18n('+3 on Bluff checks', '+3 aux tests de Bluff') },
  { id: 'toad', master: [{ target: 'hp.max', bonusType: 'untyped', value: 3 }], text: i18n('+3 hit points', '+3 points de vie') },
  { id: 'weasel', master: [{ target: 'save.ref', bonusType: 'untyped', value: 2 }], text: i18n('+2 on Reflex saves', '+2 aux jets de Réflexes') },
]

const FAMILIAR_SPECIAL: Record<string, { name: I18n; text: I18n }> = {
  alertness: { name: i18n('Alertness', 'Vigilance'), text: i18n('The master has the Alertness feat while the familiar is within arm’s reach.', 'Le maître a le don Vigilance tant que le familier est à portée de main.') },
  'improved-evasion': { name: i18n('Improved evasion', 'Esquive extraordinaire'), text: i18n('Reflex for half: no damage on a success, half on a failure.', 'Réflexes pour moitié : aucun dégât en cas de réussite, moitié en cas d’échec.') },
  'share-spells': { name: i18n('Share spells', 'Transfert d’effet magique'), text: i18n('A spell the master casts on himself can also affect the familiar within 5 ft; “You” spells can target the familiar.', 'Un sort que le maître lance sur lui-même peut aussi affecter le familier à 1,50 m ; les sorts « personnel » peuvent le cibler.') },
  'empathic-link': { name: i18n('Empathic link', 'Lien télépathique'), text: i18n('Empathic communication up to 1 mile.', 'Communication empathique jusqu’à 1,5 km.') },
  'deliver-touch-spells': { name: i18n('Deliver touch spells', 'Conduit'), text: i18n('The familiar can deliver the master’s touch spells.', 'Le familier peut délivrer les sorts de contact du maître.') },
  'speak-with-master': { name: i18n('Speak with master', 'Communication avec le maître'), text: i18n('Master and familiar talk as if sharing a language.', 'Maître et familier se parlent comme s’ils partageaient une langue.') },
  'speak-with-animals': { name: i18n('Speak with animals of its kind', 'Communication avec les animaux du même type'), text: i18n('Talks with animals of roughly its kind.', 'Parle avec les animaux de son espèce (au sens large).') },
  'spell-resistance': { name: i18n('Spell resistance', 'Résistance à la magie'), text: i18n('Spell resistance = master level + 5.', 'Résistance à la magie = niveau du maître + 5.') },
  scry: { name: i18n('Scry on familiar', 'Scrutation sur le familier'), text: i18n('Once per day, the master can scry on the familiar (as scrying).', 'Une fois par jour, le maître peut observer son familier (comme scrutation).') },
}

/** Table: Familiar Abilities by master class level (natural armor adjustment, Int, cumulative special abilities). */
const FAMILIAR_TABLE: { min: number; natural: number; int: number; special: string[] }[] = [
  { min: 1, natural: 1, int: 6, special: ['alertness', 'improved-evasion', 'share-spells', 'empathic-link'] },
  { min: 3, natural: 2, int: 7, special: ['deliver-touch-spells'] },
  { min: 5, natural: 3, int: 8, special: ['speak-with-master'] },
  { min: 7, natural: 4, int: 9, special: ['speak-with-animals'] },
  { min: 9, natural: 5, int: 10, special: [] },
  { min: 11, natural: 6, int: 11, special: ['spell-resistance'] },
  { min: 13, natural: 7, int: 12, special: ['scry'] },
  { min: 15, natural: 8, int: 13, special: [] },
  { min: 17, natural: 9, int: 14, special: [] },
  { min: 19, natural: 10, int: 15, special: [] },
]

/** Familiar advancement for a master level: natural armor, Int and the cumulative special abilities. */
export function familiarAdvancement(level: number): { advancement: CompanionAdvancementRow; int: number; sr: number } | undefined {
  if (level < 1) return undefined
  const rows = FAMILIAR_TABLE.filter((r) => r.min <= level)
  const row = rows.at(-1)!
  const special = rows.flatMap((r) => r.special).map((id) => ({ id, ...FAMILIAR_SPECIAL[id] }))
  return {
    advancement: { minLevel: row.min, maxLevel: row.min + 1, bonusHD: 0, naturalArmorAdj: row.natural, strDexAdj: 0, bonusTricks: 0, special },
    int: row.int,
    sr: level >= 11 ? level + 5 : 0,
  }
}

// ---- bardic music (https://www.d20srd.org/srd/classes/bard.htm#bardicMusic)

export interface BardicSong {
  id: string
  name: I18n
  minLevel: number
  /** Perform ranks needed. */
  ranks: number
  /** Running effect on the bard (inspire courage, greatness, heroics). */
  effect?: boolean
  /** Doesn't use a daily use (suggestion, mass suggestion: on an already fascinated creature). */
  free?: boolean
  text: I18n
}

export const BARD_URL = `${SRD}classes/bard.htm#bardicMusic`

export const inspireCourageBonus = (bardLevel: number) => (bardLevel >= 20 ? 4 : bardLevel >= 14 ? 3 : bardLevel >= 8 ? 2 : 1)

export function bardicSongs(bardLevel: number, chaMod: number): BardicSong[] {
  const ic = inspireCourageBonus(bardLevel)
  const suggestionDc = 10 + Math.floor(bardLevel / 2) + chaMod
  return [
    { id: 'countersong', name: i18n('Countersong', 'Contre-chant'), minLevel: 1, ranks: 3, text: i18n('10 rounds: allies within 30 ft may use your Perform check instead of their save vs sonic or language-dependent magic.', '10 rounds : les alliés à 9 m peuvent utiliser votre test de Représentation à la place de leur jet contre la magie sonore ou dépendant du langage.') },
    { id: 'fascinate', name: i18n('Fascinate', 'Fascination'), minLevel: 1, ranks: 3, text: i18n(`Up to ${1 + Math.floor((bardLevel - 1) / 3)} creature(s) within 90 ft: Will save vs your Perform check or fascinated (1 round per bard level while you concentrate).`, `Jusqu’à ${1 + Math.floor((bardLevel - 1) / 3)} créature(s) à 27 m : jet de Volonté contre votre test de Représentation ou fascinée(s) (1 round par niveau de barde tant que vous vous concentrez).`) },
    { id: 'inspire-courage', name: i18n('Inspire courage', 'Inspiration vaillante'), minLevel: 1, ranks: 3, effect: true, text: i18n(`Allies (and you) who hear you: +${ic} morale on attack and weapon damage, +${ic} on saves vs charm and fear; while they hear you and 5 rounds after.`, `Alliés (et vous) qui vous entendent : +${ic} de moral à l’attaque et aux dégâts des armes, +${ic} aux jets contre le charme et la terreur ; tant qu’ils vous entendent et 5 rounds après.`) },
    { id: 'inspire-competence', name: i18n('Inspire competence', 'Inspiration talentueuse'), minLevel: 3, ranks: 6, text: i18n('One ally within 30 ft (not you): +2 competence on one skill while you concentrate, up to 2 minutes.', 'Un allié à 9 m (pas vous) : +2 d’aptitude à une compétence tant que vous vous concentrez, jusqu’à 2 minutes.') },
    { id: 'suggestion', name: i18n('Suggestion', 'Suggestion'), minLevel: 6, ranks: 9, free: true, text: i18n(`A suggestion to a creature you fascinated: Will DC ${suggestionDc} negates. No daily use.`, `Une suggestion à une créature fascinée : Volonté DD ${suggestionDc} annule. Ne consomme pas d’utilisation.`) },
    { id: 'inspire-greatness', name: i18n('Inspire greatness', 'Inspiration héroïque'), minLevel: 9, ranks: 12, effect: true, text: i18n(`You or ${1 + Math.floor((bardLevel - 9) / 3)} willing ally(ies) within 30 ft: 2 bonus Hit Dice (d10s) of temporary hit points + Con, +2 competence on attack rolls, +1 competence on Fortitude saves; while they hear you and 5 rounds after.`, `Vous ou ${1 + Math.floor((bardLevel - 9) / 3)} allié(s) consentant(s) à 9 m : 2 DV en bonus (d10) de points de vie temporaires + Con, +2 d’aptitude à l’attaque, +1 d’aptitude aux jets de Vigueur ; tant qu’ils vous entendent et 5 rounds après.`) },
    { id: 'song-of-freedom', name: i18n('Song of freedom', 'Chant de liberté'), minLevel: 12, ranks: 15, text: i18n(`Break enchantment (caster level ${bardLevel}) on one creature within 30 ft, not yourself; 1 minute of music.`, `Annulation d’enchantement (niveau de lanceur ${bardLevel}) sur une créature à 9 m, pas vous ; 1 minute de musique.`) },
    { id: 'inspire-heroics', name: i18n('Inspire heroics', 'Inspiration intrépide'), minLevel: 15, ranks: 18, effect: true, text: i18n(`You or ${1 + Math.floor((bardLevel - 15) / 3)} willing ally(ies) within 30 ft: +4 morale on saves, +4 dodge to AC; while they hear you and 5 rounds after.`, `Vous ou ${1 + Math.floor((bardLevel - 15) / 3)} allié(s) consentant(s) à 9 m : +4 de moral aux jets de sauvegarde, +4 d’esquive à la CA ; tant qu’ils vous entendent et 5 rounds après.`) },
    { id: 'mass-suggestion', name: i18n('Mass suggestion', 'Suggestion de groupe'), minLevel: 18, ranks: 21, free: true, text: i18n(`Suggestion to every creature you fascinated: Will DC ${suggestionDc} negates.`, `Suggestion à toutes les créatures fascinées : Volonté DD ${suggestionDc} annule.`) },
  ].filter((x) => bardLevel >= x.minLevel)
}

/** Modifiers of a bardic music effect running on the bard. */
export function songModifiers(id: string, bardLevel: number): ModifierSpec[] {
  if (id === 'inspire-courage') {
    const v = inspireCourageBonus(bardLevel)
    return [
      { target: 'attack.all', bonusType: 'morale', value: v },
      { target: 'damage.all', bonusType: 'morale', value: v },
      { target: 'save.all', bonusType: 'morale', value: v, condition: i18n('vs charm and fear', 'contre le charme et la terreur') },
    ]
  }
  if (id === 'inspire-greatness')
    return [
      { target: 'attack.all', bonusType: 'competence', value: 2 },
      { target: 'save.fort', bonusType: 'competence', value: 1 },
    ]
  if (id === 'inspire-heroics')
    return [
      { target: 'save.all', bonusType: 'morale', value: 4 },
      { target: 'ac', bonusType: 'dodge', value: 4 },
    ]
  return []
}

export const SONG_EFFECTS = ['inspire-courage', 'inspire-greatness', 'inspire-heroics']
