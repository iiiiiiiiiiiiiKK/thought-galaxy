export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Point {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function boundsOf(points: Array<{ x: number; y: number }>, pad = 0): Rect | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

/** Lightweight stable hash-based pseudo random in [0,1). */
export function random01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Deterministic force-free layout seed: spreads nodes on a spiral so that
 * freshly imported data never lands on a single pile.
 */
export function spiralPosition(index: number, count: number): Point {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = 120 + Math.sqrt((index + 1) / Math.max(1, count)) * 900;
  const angle = index * goldenAngle;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}