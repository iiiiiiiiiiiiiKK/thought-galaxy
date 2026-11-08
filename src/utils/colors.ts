/** Colour helpers used by the canvas renderer and the UI. */

export const TAG_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#8b5cf6',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#f97316',
];

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function colorForTag(tag: string, fallback = TAG_PALETTE[0]): string {
  if (!tag) return fallback;
  return TAG_PALETTE[hashString(tag.toLowerCase()) % TAG_PALETTE.length];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return { r: 96, g: 165, b: 250 };
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function mix(hexA: string, hexB: string, amount: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, amount));
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[to(a.r, b.r), to(a.g, b.g), to(a.b, b.b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function lighten(hex: string, amount = 0.3): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount = 0.3): string {
  return mix(hex, '#000000', amount);
}