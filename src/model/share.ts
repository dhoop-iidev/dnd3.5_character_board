// Read-only share links for the DM: the character (without pictures) is compressed into the URL.
import type { Character } from './character'
import { migrate } from './migrate'

export interface ShareOptions {
  /** Include the Notes pane and the campaign notes attached to popups. */
  includeNotes: boolean
}

const toBase64Url = (bytes: Uint8Array) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** The character as a URL-safe compressed string. Pictures are left out (too large for a link). */
export async function encodeShare(char: Character, opts: ShareOptions): Promise<string> {
  const copy: Character = JSON.parse(JSON.stringify(char))
  copy.images = {}
  if (!opts.includeNotes) {
    copy.notes = []
    copy.annotations = {}
  }
  const json = new TextEncoder().encode(JSON.stringify(copy)) as Uint8Array<ArrayBuffer>
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodeShare(data: string): Promise<Character> {
  const json = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'))
  return migrate(JSON.parse(new TextDecoder().decode(json)))
}
