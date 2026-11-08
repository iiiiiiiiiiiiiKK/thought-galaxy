import { useCallback, useEffect, useState } from 'react';
import { Crosshair, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { fitAll, zoomBy } from './viewport';

/** Floating zoom / fit control cluster anchored to the canvas. */
export function GalaxyHUD() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const viewport = useUIStore((s) => s.viewport);
  const setViewport = useUIStore((s) => s.setViewport);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const resetViewport = useUIStore((s) => s.resetViewport);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleFit = useCallback(() => {
    setViewport(fitAll(nodes, size));
  }, [nodes, setViewport, size]);

  const handleFocusSelected = useCallback(() => {
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    setViewport({ zoom: 1.35, x: size.width / 2 - node.x * 1.35, y: size.height / 2 - node.y * 1.35 });
  }, [nodes, selectedNodeId, setViewport, size]);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div
      className="pointer-events-auto absolute bottom-5 left-1/2 z-20 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0"
      data-testid="galaxy-hud"
    >
      <div className="glass-strong flex items-center gap-0.5 rounded-full px-1.5 py-1.5 shadow-2xl">
        <button
          type="button"
          onClick={() => setViewport(zoomBy(viewport, size, 1 / 1.25))}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="缩小 (滚轮 / 双指)"
          aria-label="缩小"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewport(zoomBy(viewport, size, 1.25))}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="放大"
          aria-label="放大"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="min-w-[3.2rem] select-none text-center text-[11px] font-medium tabular-nums text-slate-400">
          {zoomPercent}%
        </span>
        <div className="mx-0.5 h-5 w-px bg-white/10" />
        <button
          type="button"
          onClick={handleFit}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="适配全部星球"
          aria-label="适配全部"
          data-testid="fit-all"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleFocusSelected}
          disabled={!selectedNodeId}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
          title="定位选中的星球"
          aria-label="定位选中星球"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="重置视角"
          aria-label="重置视角"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}