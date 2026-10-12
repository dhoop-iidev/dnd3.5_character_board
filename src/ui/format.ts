import type { Distance, Lang, Weight } from '../data/types'

const num = (n: number, lang: Lang) =>
  lang === 'fr' ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : n.toLocaleString('en-US', { maximumFractionDigits: 2 })

/** House rules #5 and #11: lb/ft in English, kg/m in French. */
export const fmtWeight = (w: Weight, lang: Lang) => (lang === 'fr' ? `${num(w.kg, lang)} kg` : `${num(w.lb, lang)} lb`)
export const fmtDistance = (d: Distance, lang: Lang) => (lang === 'fr' ? `${num(d.m, lang)} m` : `${num(d.ft, lang)} ft`)
