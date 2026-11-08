/**
 * Small, dependency-free id generator.
 * Uses crypto.getRandomValues when available so ids stay unique across tabs.
 */
export function uid(prefix = ''): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let random = '';
  for (const byte of bytes) random += byte.toString(16).padStart(2, '0');
  return `${prefix}${Date.now().toString(36)}${random}`;
}

/** Slug used for exported markdown file names. */
export function slugify(input: string, fallback = 'node'): string {
  const slug = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}