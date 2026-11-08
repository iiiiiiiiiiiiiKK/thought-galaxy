import type { NodeData } from '../../utils/types';
import type { Viewport } from '../../store/ui';
import { MAX_ZOOM, MIN_ZOOM } from './renderer';

export interface ViewportSize {
  width: number;
  height: number;
}

/** Fits every node into the current viewport with padding. */
export function fitAll(nodes: NodeData[], size: ViewportSize, padding = 120): Viewport {
  if (nodes.length === 0 || size.width === 0 || size.height === 0) {
    return { x: size.width / 2, y: size.height / 2, zoom: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const radius = 26 * node.size;
    minX = Math.min(minX, node.x - radius);
    minY = Math.min(minY, node.y - radius);
    maxX = Math.max(maxX, node.x + radius);
    maxY = Math.max(maxY, node.y + radius);
  }
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    (size.width - padding * 2) / contentWidth,
    (size.height - padding * 2) / contentHeight,
  );
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    zoom,
    x: size.width / 2 - centerX * zoom,
    y: size.height / 2 - centerY * zoom,
  };
}

/** Centres a single node with an optional target zoom. */
export function focusNode(node: NodeData, size: ViewportSize, zoom?: number): Viewport {
  const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom ?? 1.35));
  return {
    zoom: targetZoom,
    x: size.width / 2 - node.x * targetZoom,
    y: size.height / 2 - node.y * targetZoom,
  };
}

export function zoomBy(viewport: Viewport, size: ViewportSize, factor: number): Viewport {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
  const ratio = next / viewport.zoom;
  const cx = size.width / 2;
  const cy = size.height / 2;
  return {
    zoom: next,
    x: cx - (cx - viewport.x) * ratio,
    y: cy - (cy - viewport.y) * ratio,
  };
}