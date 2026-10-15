import { describe, expect, it } from 'vitest'
import fenrirJson from '../../data/characters/chikibidouille.json'
import type { Character } from '../../model/character'
import { decodeShare, encodeShare } from '../../model/share'

const fenrir = fenrirJson as unknown as Character

describe('DM share link', () => {
  it('round-trips the character without pictures, and drops notes unless asked', async () => {
    const c: Character = {
      ...structuredClone(fenrir),
      images: { face: 'data:image/webp;base64,AAAA' },
      notes: [{ id: 'n', date: '2026-10-15', title: 'secret', body: 'x' }],
      annotations: { 'feat:dodge': 'note' },
    }
    const data = await encodeShare(c, { includeNotes: false })
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(data.length).toBeLessThan(6000)
    const back = await decodeShare(data)
    expect(back.identity.name).toBe('Chikibidouille')
    expect(back.levels).toEqual(fenrir.levels)
    expect(back.images).toEqual({})
    expect(back.notes).toEqual([])
    const withNotes = await decodeShare(await encodeShare(c, { includeNotes: true }))
    expect(withNotes.annotations['feat:dodge']).toBe('note')
  })
})
