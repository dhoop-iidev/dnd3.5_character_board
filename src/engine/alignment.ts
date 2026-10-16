// Alignment as typed by the player ("LG", "Lawful Good", "Loyal bon", "LB", "CM", "Neutre"…) → its two axes.
// https://www.d20srd.org/srd/description.htm#alignment

export interface Alignment {
  /** Law–chaos axis. */
  order: 'lawful' | 'neutral' | 'chaotic'
  /** Good–evil axis. */
  moral: 'good' | 'neutral' | 'evil'
}

export function parseAlignment(text: string | undefined): Alignment | undefined {
  const t = (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
  if (!t) return undefined
  // Abbreviations: LG/NG/CG/LN/N/CN/LE/NE/CE and the French LB/NB/CB/LN/N/CN/LM/NM/CM.
  const abbr = t.replace(/[\s.]/g, '').toUpperCase()
  if (/^[LNC][GBNEM]?$/.test(abbr)) {
    const order = abbr[0] === 'L' ? 'lawful' : abbr[0] === 'C' ? 'chaotic' : 'neutral'
    const m = abbr[1] ?? (abbr[0] === 'N' ? 'N' : '')
    if (!m) return undefined
    const moral = m === 'G' || m === 'B' ? 'good' : m === 'E' || m === 'M' ? 'evil' : 'neutral'
    return { order, moral }
  }
  const order = /lawful|loyal/.test(t) ? 'lawful' : /chaotic|chaotique/.test(t) ? 'chaotic' : /neutr/.test(t) ? 'neutral' : undefined
  const moral = /good|\bbon\b/.test(t) ? 'good' : /evil|mauvais/.test(t) ? 'evil' : /neutr/.test(t) ? 'neutral' : undefined
  if (!order || !moral) return undefined
  return { order, moral }
}

/** Alignment descriptors of a spell or domain opposed to an alignment (a good character → "evil"…). */
export function opposedDescriptors(a: Alignment): string[] {
  return [
    ...(a.moral === 'good' ? ['evil'] : a.moral === 'evil' ? ['good'] : []),
    ...(a.order === 'lawful' ? ['chaotic'] : a.order === 'chaotic' ? ['lawful'] : []),
  ]
}
