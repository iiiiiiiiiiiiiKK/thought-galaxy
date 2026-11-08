import { useMemo } from 'react';
import { Compass, Flame, Layers, Pin, Sparkles, Sun, Tag, X } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { allTags, computeClusters } from '../../utils/clusters';
import { colorForTag } from '../../utils/colors';
import { thoughtStreak, relativeTime } from '../../utils/format';
import { Badge } from './primitives';

export function SideBar() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const thoughts = useGalaxyStore((s) => s.thoughts);
  const settings = useGalaxyStore((s) => s.settings);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const selectNode = useUIStore((s) => s.selectNode);
  const setFilters = useUIStore((s) => s.setFilters);
  const filters = useUIStore((s) => s.filters);
  const setExploreRoot = useUIStore((s) => s.setExploreRoot);
  const openPanel = useUIStore((s) => s.openPanel);

  const tags = useMemo(() => allTags(nodes).slice(0, 12), [nodes]);
  const clusters = useMemo(
    () => (settings.autoCluster ? computeClusters({ nodes, edges }) : []),
    [nodes, edges, settings.autoCluster],
  );
  const favorites = useMemo(
    () => nodes.filter((node) => node.isPinned).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [nodes],
  );
  const recent = useMemo(
    () => nodes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [nodes],
  );
  const streak = useMemo(() => thoughtStreak(thoughts), [thoughts]);

  return (
    <>
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}
      <aside
        className={`glass fixed bottom-0 left-0 top-0 z-30 w-64 shrink-0 overflow-y-auto border-r border-white/[0.07] px-3 pb-4 pt-20 transition-transform lg:static lg:z-10 lg:translate-x-0 lg:rounded-none lg:border-r lg:bg-[rgba(10,15,26,0.55)] lg:pt-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="侧边栏"
      >
        <div className="mb-4 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-white"
            aria-label="关闭侧边栏"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="mb-5">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-sky-400" />
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">星系概览</h2>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '星球', value: nodes.length },
              { label: '关联', value: edges.length },
              { label: '星群', value: clusters.length },
              { label: '灵感', value: thoughts.length },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                <p className="text-sm font-semibold tabular-nums text-slate-100">{item.value}</p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
          {streak > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-orange-500/25 bg-orange-500/[0.08] px-2 py-1.5">
              <Flame className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] text-orange-200">连续记录 {streak} 天</p>
            </div>
          ) : null}
        </section>

        <section className="mb-5">
          <button
            type="button"
            onClick={() => openPanel('clusters')}
            className="mb-2 flex w-full items-center gap-1.5 text-left"
          >
            <Layers className="h-3 w-3 text-sky-400" />
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">星群</h2>
            <span className="ml-auto text-[10px] text-slate-600">{clusters.length}</span>
          </button>
          {clusters.length === 0 ? (
            <p className="px-1 text-[10px] leading-relaxed text-slate-600">
              给 2 颗以上星球打相同标签，就会自动形成星群。
            </p>
          ) : (
            <ul className="space-y-0.5">
              {clusters.slice(0, 6).map((cluster) => (
                <li key={cluster.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ tags: cluster.id.startsWith('tag:') ? [cluster.label] : [] });
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                      filters.tags.includes(cluster.label) ? 'bg-sky-500/15' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cluster.color, boxShadow: `0 0 8px ${cluster.color}88` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{cluster.label}</span>
                    <span className="shrink-0 text-[10px] text-slate-600">{cluster.nodeIds.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {tags.length > 0 ? (
          <section className="mb-5">
            <div className="mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-emerald-400" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">标签</h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setFilters({
                      tags: filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [tag],
                    })
                  }
                  className="transition hover:opacity-80"
                >
                  <Badge color={filters.tags.includes(tag) ? colorForTag(tag) : undefined}>
                    {tag} {count}
                  </Badge>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-5">
          <div className="mb-2 flex items-center gap-1.5">
            <Pin className="h-3 w-3 text-amber-400" />
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">收藏</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="px-1 text-[10px] text-slate-600">还没有收藏的星球</p>
          ) : (
            <ul className="space-y-0.5">
              {favorites.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => selectNode(node.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{node.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-5">
          <div className="mb-2 flex items-center gap-1.5">
            <Sun className="h-3 w-3 text-slate-500" />
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">最近更新</h2>
          </div>
          <ul className="space-y-0.5">
            {recent.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => selectNode(node.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{node.title}</span>
                  <span className="shrink-0 text-[9px] text-slate-600">{relativeTime(node.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={() => {
            const first = nodes.find((node) => !node.isDemo) ?? nodes[0];
            if (first) {
              setExploreRoot(first.id);
              setSidebarOpen(false);
            }
          }}
          disabled={nodes.length === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
        >
          <Compass className="h-3.5 w-3.5" />
          进入探索模式
        </button>

        <p className="mt-4 text-center text-[9px] leading-relaxed text-slate-700">
          数据保存在浏览器本地
          <br />
          不上传 · 无需登录
        </p>
      </aside>
    </>
  );
}