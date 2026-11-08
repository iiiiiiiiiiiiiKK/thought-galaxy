import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { computeClusters } from '../../utils/clusters';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clearRenderCaches,
  drawBackgroundLayer,
  drawOverlay,
  drawStaticScene,
  hitTest,
  makeStarDust,
  screenToWorld,
  type SceneInput,
  type StarDust,
} from './renderer';
import { GalaxyHUD } from './GalaxyHUD';

interface Props {
  exploreIds: Set<string> | null;
  linkedIds: Set<string> | null;
  visibleNodeIds: Set<string> | null;
}

export function GalaxyCanvas({ exploreIds, linkedIds, visibleNodeIds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const dustRef = useRef<StarDust[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const dprRef = useRef(1);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number; centerX: number; centerY: number } | null>(null);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const movedRef = useRef(false);
  const dirtyRef = useRef(true);

  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const settings = useGalaxyStore((s) => s.settings);
  const updateNode = useGalaxyStore((s) => s.updateNode);
  const createEdge = useGalaxyStore((s) => s.createEdge);

  const viewport = useUIStore((s) => s.viewport);
  const setViewport = useUIStore((s) => s.setViewport);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const selectNode = useUIStore((s) => s.selectNode);
  const setHovered = useUIStore((s) => s.setHovered);
  const openEditor = useUIStore((s) => s.openEditor);
  const pendingLinkFrom = useUIStore((s) => s.pendingLinkFrom);
  const cancelLinking = useUIStore((s) => s.cancelLinking);
  const pushToast = useUIStore((s) => s.pushToast);
  const mobileSheetOpen = useUIStore((s) => s.mobileSheetOpen);

  const clusters = useMemo(
    () => (settings.autoCluster ? computeClusters({ nodes, edges }) : []),
    [nodes, edges, settings.autoCluster],
  );

  const renderNodes = useMemo(() => {
    if (!visibleNodeIds) return nodes;
    return nodes.filter((node) => visibleNodeIds.has(node.id));
  }, [nodes, visibleNodeIds]);

  const [, forceFrame] = useState(0);

  // Anything that changes the static picture marks the cache dirty.
  const staticSignature = [
    renderNodes.length,
    edges.length,
    clusters.length,
    Math.round(viewport.x),
    Math.round(viewport.y),
    viewport.zoom.toFixed(3),
    selectedNodeId ?? '',
    hoveredNodeId ?? '',
    exploreIds ? exploreIds.size : '-',
    linkedIds ? linkedIds.size : '-',
    settings.showLabels ? 1 : 0,
    settings.showOrbits ? 1 : 0,
    settings.canvasQuality,
  ].join('|');
  const signatureRef = useRef(staticSignature);
  if (signatureRef.current !== staticSignature) {
    signatureRef.current = staticSignature;
    dirtyRef.current = true;
  }
  useEffect(() => {
    dirtyRef.current = true;
    forceFrame((n) => n + 1);
  }, [staticSignature]);

  // ---------------------------------------------------------------- animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = dprRef.current;
      const sceneInput: SceneInput = {
        ctx,
        width,
        height,
        viewport,
        nodes: renderNodes,
        edges,
        clusters,
        selectedId: selectedNodeId,
        hoveredId: hoveredNodeId,
        exploreIds,
        linkedIds,
        showLabels: settings.showLabels,
        showOrbits: settings.showOrbits,
        quality: settings.canvasQuality,
        time,
      };

      if (dirtyRef.current) {
        const offscreen = staticRef.current;
        if (offscreen) {
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawStaticScene({ ...sceneInput, ctx: offCtx });
          }
        }
        dirtyRef.current = false;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackgroundLayer(ctx, width, height, dustRef.current, parallaxRef.current);
      const offscreen = staticRef.current;
      if (offscreen) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(offscreen, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      drawOverlay(sceneInput, { pendingLinkFrom, pointer: pointerRef.current });

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    viewport,
    renderNodes,
    edges,
    clusters,
    selectedNodeId,
    hoveredNodeId,
    exploreIds,
    linkedIds,
    pendingLinkFrom,
    settings.showLabels,
    settings.showOrbits,
    settings.canvasQuality,
  ]);

  // ------------------------------------------------------------------ sizing
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, settings.canvasQuality === 'low' ? 1 : 2);
      const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      if (!staticRef.current) staticRef.current = document.createElement('canvas');
      const offscreen = staticRef.current;
      offscreen.width = pixelWidth;
      offscreen.height = pixelHeight;

      dprRef.current = dpr;
      sizeRef.current = { width: rect.width, height: rect.height };
      dustRef.current = makeStarDust(rect.width, rect.height, settings.canvasQuality);
      clearRenderCaches();
      dirtyRef.current = true;
      forceFrame((n) => n + 1);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    window.addEventListener('orientationchange', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, [settings.canvasQuality]);

  // -------------------------------------------------------------- pointer math
  const localPoint = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    movedRef.current = false;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    parallaxRef.current = {
      x: (point.x - sizeRef.current.width / 2) * -0.012,
      y: (point.y - sizeRef.current.height / 2) * -0.012,
    };
    const hit = hitTest(renderNodes, point, viewport);

    if (pendingLinkFrom) {
      if (hit && hit.id !== pendingLinkFrom) {
        const target = hit.id;
        const from = pendingLinkFrom;
        cancelLinking();
        void createEdge(from, target, 'related').then((edge) => {
          if (edge) pushToast('已创建「相关」关联', 'success');
          else pushToast('这两颗星球已经连接过了', 'error');
        });
      } else if (!hit) {
        cancelLinking();
      }
      return;
    }

    if (hit) {
      const offsetX = hit.x - (point.x - viewport.x) / viewport.zoom;
      const offsetY = hit.y - (point.y - viewport.y) / viewport.zoom;
      dragRef.current = { nodeId: hit.id, offsetX, offsetY, moved: false };
      selectNode(hit.id);
      return;
    }

    panRef.current = {
      startX: point.x,
      startY: point.y,
      originX: viewport.x,
      originY: viewport.y,
    };
    selectNode(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    pointerRef.current = point;
    parallaxRef.current = {
      x: (point.x - sizeRef.current.width / 2) * -0.014,
      y: (point.y - sizeRef.current.height / 2) * -0.014,
    };

    if (dragRef.current) {
      const drag = dragRef.current;
      drag.moved = true;
      movedRef.current = true;
      const world = screenToWorld(point.x, point.y, viewport);
      void updateNode(drag.nodeId, {
        x: world.x - drag.offsetX,
        y: world.y - drag.offsetY,
      });
      return;
    }

    if (panRef.current) {
      const pan = panRef.current;
      const dx = point.x - pan.startX;
      const dy = point.y - pan.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
      setViewport({ ...viewport, x: pan.originX + dx, y: pan.originY + dy });
      return;
    }

    if (!pendingLinkFrom) {
      const hit = hitTest(renderNodes, point, viewport);
      const nextHover = hit?.id ?? null;
      if (nextHover !== hoveredNodeId) setHovered(nextHover);
      if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
    } else if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    const drag = dragRef.current;
    dragRef.current = null;
    panRef.current = null;
    pointerRef.current = null;

    if (drag && !drag.moved) {
      const now = Date.now();
      const previous = lastTapRef.current;
      if (previous && previous.id === drag.nodeId && now - previous.time < 340) {
        openEditor(drag.nodeId);
        lastTapRef.current = null;
        return;
      }
      lastTapRef.current = { id: drag.nodeId, time: now };
      selectNode(drag.nodeId);
      return;
    }

    if (!drag && !movedRef.current && mobileSheetOpen) {
      const hit = hitTest(renderNodes, point, viewport);
      if (!hit) useUIStore.getState().setMobileSheetOpen(false);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    const factor = Math.exp(-event.deltaY * 0.0016);
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
    const ratio = next / viewport.zoom;
    setViewport({
      zoom: next,
      x: point.x - (point.x - viewport.x) * ratio,
      y: point.y - (point.y - viewport.y) * ratio,
    });
  };

  // --------------------------------------------------------- touch pinch zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const distanceBetween = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        dragRef.current = null;
        panRef.current = null;
        const rect = canvas.getBoundingClientRect();
        pinchRef.current = {
          distance: distanceBetween(event.touches),
          zoom: useUIStore.getState().viewport.zoom,
          centerX: (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left,
          centerY: (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchRef.current) {
        event.preventDefault();
        const pinch = pinchRef.current;
        const distance = distanceBetween(event.touches);
        const factor = distance / Math.max(1, pinch.distance);
        const current = useUIStore.getState().viewport;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.zoom * factor));
        const ratio = next / current.zoom;
        useUIStore.getState().setViewport({
          zoom: next,
          x: pinch.centerX - (pinch.centerX - current.x) * ratio,
          y: pinch.centerY - (pinch.centerY - current.y) * ratio,
        });
      }
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // --------------------------------------------------------- double-click edit
  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    const hit = hitTest(renderNodes, point, viewport);
    if (hit) openEditor(hit.id);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pendingLinkFrom) cancelLinking();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingLinkFrom, cancelLinking]);

  const setHoveredRef = useCallback(setHovered, [setHovered]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          pointerRef.current = null;
          setHoveredRef(null);
        }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        data-testid="galaxy-canvas"
      />
      <GalaxyHUD />
    </div>
  );
}