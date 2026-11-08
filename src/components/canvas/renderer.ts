import type { ClusterData, EdgeData, NodeData } from '../../utils/types';
import { RELATION_STYLES } from '../../utils/types';
import { colorForTag, darken, lighten, rgba } from '../../utils/colors';
import type { Viewport } from '../../store/ui';

export interface StarDust {
  x: number;
  y: number;
  r: number;
  alpha: number;
  phase: number;
  speed: number;
}

export interface SceneInput {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  viewport: Viewport;
  nodes: NodeData[];
  edges: EdgeData[];
  clusters: ClusterData[];
  selectedId: string | null;
  hoveredId: string | null;
  exploreIds: Set<string> | null;
  linkedIds: Set<string> | null;
  showLabels: boolean;
  showOrbits: boolean;
  quality: 'high' | 'medium' | 'low';
  time: number;
}

export const MIN_ZOOM = 0.18;
export const MAX_ZOOM = 4;

export function worldToScreen(x: number, y: number, viewport: Viewport) {
  return { x: x * viewport.zoom + viewport.x, y: y * viewport.zoom + viewport.y };
}

export function screenToWorld(x: number, y: number, viewport: Viewport) {
  return { x: (x - viewport.x) / viewport.zoom, y: (y - viewport.y) / viewport.zoom };
}

export function nodeScreenRadius(node: NodeData, zoom: number): number {
  return Math.max(3.5, 22 * node.size * Math.min(2.2, Math.max(0.55, zoom)));
}

export function hitTest(
  nodes: NodeData[],
  point: { x: number; y: number },
  viewport: Viewport,
): NodeData | null {
  let best: { node: NodeData; distance: number } | null = null;
  for (const node of nodes) {
    const screen = worldToScreen(node.x, node.y, viewport);
    const radius = nodeScreenRadius(node, viewport.zoom) + 6;
    const distance = Math.hypot(screen.x - point.x, screen.y - point.y);
    if (distance <= radius && (!best || distance < best.distance)) {
      best = { node, distance };
    }
  }
  return best?.node ?? null;
}

/* ------------------------------------------------------------------ sprites */

const SPRITE_RADIUS = 48;
const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Planets are pre-rendered once per colour and then blitted. Building a radial
 * gradient per node per frame was the dominant cost with 1000+ planets.
 */
export function planetSprite(color: string): HTMLCanvasElement {
  const key = `planet:${color}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  const size = Math.ceil(SPRITE_RADIUS * 2);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const radius = SPRITE_RADIUS * 0.5;
  const haloRadius = SPRITE_RADIUS * 0.95;

  const halo = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, haloRadius);
  halo.addColorStop(0, rgba(color, 0.36));
  halo.addColorStop(0.5, rgba(color, 0.13));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(cx - radius * 0.34, cy - radius * 0.4, radius * 0.12, cx, cy, radius);
  body.addColorStop(0, lighten(color, 0.6));
  body.addColorStop(0.48, color);
  body.addColorStop(1, darken(color, 0.68));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(lighten(color, 0.7), 0.55);
  ctx.lineWidth = 1;
  ctx.stroke();

  spriteCache.set(key, canvas);
  return canvas;
}

/* ------------------------------------------------------------ cached layers */

interface CachedLayer {
  key: string;
  canvas: HTMLCanvasElement;
}

const backgroundCache: { layer: CachedLayer | null } = { layer: null };
const dustCache: { layer: CachedLayer | null } = { layer: null };

function backgroundLayer(width: number, height: number) {
  const key = `${Math.round(width)}x${Math.round(height)}`;
  if (backgroundCache.layer?.key === key) return backgroundCache.layer.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.85,
  );
  gradient.addColorStop(0, '#0d1526');
  gradient.addColorStop(0.45, '#080d17');
  gradient.addColorStop(1, '#04060b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const nebula = ctx.createRadialGradient(width * 0.72, height * 0.25, 0, width * 0.72, height * 0.25, width * 0.5);
  nebula.addColorStop(0, rgba('#3b82f6', 0.07));
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, width, height);

  const nebula2 = ctx.createRadialGradient(
    width * 0.25,
    height * 0.8,
    0,
    width * 0.25,
    height * 0.8,
    width * 0.45,
  );
  nebula2.addColorStop(0, rgba('#a855f7', 0.055));
  nebula2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, width, height);

  backgroundCache.layer = { key, canvas };
  return canvas;
}

function dustLayer(width: number, height: number, dust: StarDust[]) {
  const key = `${Math.round(width)}x${Math.round(height)}:${dust.length}`;
  if (dustCache.layer?.key === key) return dustCache.layer.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dbeafe';
  for (const star of dust) {
    ctx.globalAlpha = star.alpha;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  dustCache.layer = { key, canvas };
  return canvas;
}

/** Drops every cached layer; call on resize or quality change. */
export function clearRenderCaches(): void {
  backgroundCache.layer = null;
  dustCache.layer = null;
  spriteCache.clear();
}

/* ------------------------------------------------------------------- scene */

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport) {
  const spacing = 160 * viewport.zoom;
  if (spacing < 34) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
  ctx.lineWidth = 1;
  const offsetX = viewport.x % spacing;
  const offsetY = viewport.y % spacing;
  ctx.beginPath();
  for (let x = offsetX; x < width; x += spacing) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }
  for (let y = offsetY; y < height; y += spacing) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawClusters(
  ctx: CanvasRenderingContext2D,
  clusters: ClusterData[],
  byId: Map<string, NodeData>,
  viewport: Viewport,
  width: number,
  height: number,
) {
  if (clusters.length === 0) return;
  ctx.save();
  for (const cluster of clusters) {
    if (cluster.nodeIds.length < 2) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of cluster.nodeIds) {
      const node = byId.get(id);
      if (!node) continue;
      const radius = 26 * node.size;
      if (node.x - radius < minX) minX = node.x - radius;
      if (node.y - radius < minY) minY = node.y - radius;
      if (node.x + radius > maxX) maxX = node.x + radius;
      if (node.y + radius > maxY) maxY = node.y + radius;
    }
    if (!Number.isFinite(minX)) continue;
    const pad = 70;
    const topLeft = worldToScreen(minX - pad, minY - pad, viewport);
    const bottomRight = worldToScreen(maxX + pad, maxY + pad, viewport);
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;
    if (w < 6 || h < 6) continue;
    if (topLeft.x > width || topLeft.y > height || bottomRight.x < 0 || bottomRight.y < 0) continue;

    const radius = Math.min(80, Math.max(24, Math.min(w, h) * 0.22));
    ctx.beginPath();
    ctx.roundRect(topLeft.x, topLeft.y, w, h, radius);
    ctx.fillStyle = rgba(cluster.color, 0.045);
    ctx.fill();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = rgba(cluster.color, 0.22);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    const fontSize = Math.max(9, Math.min(13, 11 * viewport.zoom));
    ctx.font = `500 ${fontSize}px "Inter", "Noto Sans SC", sans-serif`;
    ctx.fillStyle = rgba(cluster.color, 0.85);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${cluster.label} · ${cluster.nodeIds.length}`,
      topLeft.x + 8,
      topLeft.y - 6 + Math.max(12, fontSize + 2),
    );
  }
  ctx.restore();
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: EdgeData[],
  byId: Map<string, NodeData>,
  viewport: Viewport,
  selectedId: string | null,
  exploreIds: Set<string> | null,
  width: number,
  height: number,
  quality: 'high' | 'medium' | 'low',
) {
  ctx.save();
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const from = worldToScreen(source.x, source.y, viewport);
    const to = worldToScreen(target.x, target.y, viewport);
    if (
      (from.x < -80 && to.x < -80) ||
      (from.y < -80 && to.y < -80) ||
      (from.x > width + 80 && to.x > width + 80) ||
      (from.y > height + 80 && to.y > height + 80)
    ) {
      continue;
    }
    if (quality === 'low' && viewport.zoom < 0.3) continue;

    const style = RELATION_STYLES[edge.relation] ?? RELATION_STYLES.related;
    const isFocus = selectedId !== null && (edge.source === selectedId || edge.target === selectedId);
    const inExplore = exploreIds ? exploreIds.has(edge.source) && exploreIds.has(edge.target) : true;
    const alpha = isFocus ? 0.85 : inExplore ? 0.32 : 0.07;

    ctx.strokeStyle = rgba(style.color, alpha);
    ctx.lineWidth = isFocus ? 1.9 : 1.05;
    ctx.setLineDash(style.dash ? style.dash.map((d) => d * Math.max(0.6, viewport.zoom)) : []);

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const ctrlX = midX + (to.y - from.y) * 0.12;
    const ctrlY = midY - (to.x - from.x) * 0.12;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draws the background + star dust each frame. Both layers are cached bitmaps,
 * so the whole depth backdrop costs two blits regardless of planet count.
 */
export function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dust: StarDust[],
  parallax: { x: number; y: number },
) {
  ctx.drawImage(backgroundLayer(width, height), 0, 0, width, height);
  const offsetX = parallax.x * 0.35;
  const offsetY = parallax.y * 0.35;
  ctx.drawImage(dustLayer(width, height, dust), offsetX, offsetY, width, height);
}

/**
 * Draws the full static scene (clusters, edges, planets, labels) onto a
 * transparent canvas. Expensive; the caller reuses the result until the view or
 * data actually changes.
 */
export function drawStaticScene(input: SceneInput) {
  const {
    ctx,
    width,
    height,
    viewport,
    nodes,
    edges,
    clusters,
    selectedId,
    hoveredId,
    exploreIds,
    linkedIds,
    showLabels,
    showOrbits,
    quality,
  } = input;

  ctx.clearRect(0, 0, width, height);

  if (showOrbits) drawGrid(ctx, width, height, viewport);

  const byId = new Map(nodes.map((node) => [node.id, node]));

  const margin = 140;
  const visible: NodeData[] = [];
  for (const node of nodes) {
    const screen = worldToScreen(node.x, node.y, viewport);
    const r = nodeScreenRadius(node, viewport.zoom) * 3;
    if (
      screen.x + r < -margin ||
      screen.y + r < -margin ||
      screen.x - r > width + margin ||
      screen.y - r > height + margin
    ) {
      continue;
    }
    visible.push(node);
  }

  drawClusters(ctx, clusters, byId, viewport, width, height);
  drawEdges(ctx, edges, byId, viewport, selectedId, exploreIds, width, height, quality);

  const ordered = visible.slice().sort((a, b) => {
    const aSel = a.id === selectedId ? 2 : a.id === hoveredId ? 1 : 0;
    const bSel = b.id === selectedId ? 2 : b.id === hoveredId ? 1 : 0;
    if (aSel !== bSel) return aSel - bSel;
    return a.size - b.size;
  });

  const labelBudget = quality === 'low' ? 40 : quality === 'medium' ? 90 : 240;
  let labelsDrawn = 0;
  const labelAllowed = showLabels && viewport.zoom > 0.4;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const node of ordered) {
    const screen = worldToScreen(node.x, node.y, viewport);
    const radius = nodeScreenRadius(node, viewport.zoom);
    const isSelected = node.id === selectedId;
    const isHovered = node.id === hoveredId;
    const dimmed =
      (exploreIds !== null && !exploreIds.has(node.id)) || (linkedIds !== null && !linkedIds.has(node.id));

    const base = node.color || colorForTag(node.tags[0] ?? node.title);
    const sprite = planetSprite(base);
    const drawSize = radius * (isSelected ? 5.2 : isHovered ? 4.4 : 3.4);

    ctx.globalAlpha = dimmed ? 0.3 : 1;
    ctx.drawImage(sprite, screen.x - drawSize / 2, screen.y - drawSize / 2, drawSize, drawSize);

    if (node.isPinned) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y - radius - 8, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    }

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = rgba('#60a5fa', 0.6);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (labelAllowed && (labelsDrawn < labelBudget || isSelected || isHovered)) {
      const fontSize = Math.max(10, Math.min(15, 12 * Math.min(1.5, viewport.zoom)));
      ctx.font = `500 ${fontSize}px "Inter", "Noto Sans SC", sans-serif`;
      const label = node.title.length > 22 ? `${node.title.slice(0, 22)}…` : node.title;
      const metrics = ctx.measureText(label);
      const labelY = screen.y + radius + 8;
      ctx.fillStyle = 'rgba(4, 6, 11, 0.62)';
      ctx.beginPath();
      ctx.roundRect(screen.x - metrics.width / 2 - 6, labelY - 2, metrics.width + 12, fontSize + 6, 5);
      ctx.fill();
      ctx.fillStyle = dimmed ? 'rgba(226,232,240,0.45)' : 'rgba(226,232,240,0.92)';
      ctx.fillText(label, screen.x, labelY);
      labelsDrawn += 1;
    }
  }
  ctx.globalAlpha = 1;
}

/** Cheap per-frame overlay: edge light pulses, selection ring breathing, link preview. */
export function drawOverlay(input: SceneInput, options: { pendingLinkFrom: string | null; pointer: { x: number; y: number } | null }) {
  const { ctx, edges, nodes, viewport, selectedId, time } = input;
  const byId = new Map(nodes.map((node) => [node.id, node]));

  if (selectedId) {
    const node = byId.get(selectedId);
    if (node) {
      const screen = worldToScreen(node.x, node.y, viewport);
      const radius = nodeScreenRadius(node, viewport.zoom);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 9 + Math.sin(time * 0.004) * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = rgba('#60a5fa', 0.18 + (Math.sin(time * 0.004) + 1) * 0.12);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    for (const edge of edges) {
      if (edge.source !== selectedId && edge.target !== selectedId) continue;
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const from = worldToScreen(source.x, source.y, viewport);
      const to = worldToScreen(target.x, target.y, viewport);
      const ctrlX = (from.x + to.x) / 2 + (to.y - from.y) * 0.12;
      const ctrlY = (from.y + to.y) / 2 - (to.x - from.x) * 0.12;
      const style = RELATION_STYLES[edge.relation] ?? RELATION_STYLES.related;
      const t = (time * 0.00035) % 1;
      const px = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ctrlX + t * t * to.x;
      const py = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * ctrlY + t * t * to.y;
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = lighten(style.color, 0.5);
      ctx.fill();
    }
  }

  if (options.pendingLinkFrom && options.pointer) {
    const from = byId.get(options.pendingLinkFrom);
    if (from) {
      const start = worldToScreen(from.x, from.y, viewport);
      ctx.save();
      ctx.strokeStyle = rgba('#60a5fa', 0.8);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(options.pointer.x, options.pointer.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(options.pointer.x, options.pointer.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#60a5fa', 0.9);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function makeStarDust(width: number, height: number, quality: 'high' | 'medium' | 'low'): StarDust[] {
  const density = quality === 'high' ? 5200 : quality === 'medium' ? 3200 : 1600;
  const count = Math.max(60, Math.round((width * height) / density));
  const stars: StarDust[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = i * 7919;
    stars.push({
      x: ((seed * 13.37) % width + width) % width,
      y: ((seed * 7.91) % height + height) % height,
      r: 0.4 + ((seed % 17) / 17) * 1.1,
      alpha: 0.18 + ((seed % 23) / 23) * 0.5,
      phase: (seed % 360) * (Math.PI / 180),
      speed: 0.0004 + ((seed % 11) / 11) * 0.0012,
    });
  }
  return stars;
}