import { useMemo } from 'react';
import { Compass, Minus, Plus, X } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { computeClusters } from '../../utils/clusters';
import { exploreFrom } from '../../utils/search';
import { Badge } from '../ui/primitives';

/** Sticky banner shown while Explore mode is armed. */
export function ExploreBar() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const settings = useGalaxyStore((s) => s.settings);
  const exploreRootId = useUIStore((s) => s.exploreRootId);
  const exploreDepth = useUIStore((s) => s.exploreDepth);
  const setExploreDepth = useUIStore((s) => s.setExploreDepth);
  const setExploreRoot = useUIStore((s) => s.setExploreRoot);
  const selectNode = useUIStore((s) => s.selectNode);

  const clusters = useMemo(
    () => (settings.autoCluster ? computeClusters({ nodes, edges }) : []),
    [nodes, edges, settings.autoCluster],
  );

  const clusterOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of clusters) for (const id of cluster.nodeIds) map.set(id, cluster.id);
    return (id: string) => map.get(id) ?? null;
  }, [clusters]);

  if (!exploreRootId) return null;
  const root = nodes.find((node) => node.id === exploreRootId);
  if (!root) return null;

  const result = exploreFrom(exploreRootId, nodes, edges, exploreDepth, clusterOf);
  const directCount = [...result.byDepth.entries()].filter(([, depth]) => depth === 1).length;
  const secondCount = [...result.byDepth.entries()].filter(([, depth]) => depth === 2).length;

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-16 z-30 md:inset-x-auto md:left-1/2 md:w-[min(92vw,32rem)] md:-translate-x-1/2">
      <div className="glass-strong animate-fade-in rounded-xl px-3 py-2.5 shadow-2xl">
        <div className="flex items-start gap-2">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-200">
              探索模式 · 从「{root.title}」出发
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {directCount} 个直接关联 · {secondCount} 个二级关联 · {result.clusterPeers.length} 个同星群 ·
              共 {result.nodes.length} 颗在视野内
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExploreRoot(null)}
            className="shrink-0 text-slate-500 transition hover:text-white"
            aria-label="退出探索模式"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-slate-500">关联层级</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExploreDepth(exploreDepth - 1)}
              disabled={exploreDepth <= 1}
              className="grid h-5 w-5 place-items-center rounded border border-white/10 text-slate-400 transition hover:bg-white/10 disabled:opacity-30"
              aria-label="减少层级"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-4 text-center text-[11px] font-medium tabular-nums text-slate-200">{exploreDepth}</span>
            <button
              type="button"
              onClick={() => setExploreDepth(exploreDepth + 1)}
              disabled={exploreDepth >= 3}
              className="grid h-5 w-5 place-items-center rounded border border-white/10 text-slate-400 transition hover:bg-white/10 disabled:opacity-30"
              aria-label="增加层级"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="scrollbar-hide ml-auto flex max-w-[55%] gap-1 overflow-x-auto">
            {result.nodes
              .filter((node) => node.id !== exploreRootId)
              .slice(0, 6)
              .map((node) => (
                <button key={node.id} type="button" onClick={() => selectNode(node.id)} className="shrink-0">
                  <Badge color={node.color}>{node.title.slice(0, 8)}</Badge>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}