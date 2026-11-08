import { useMemo } from 'react';
import { Layers, Minus, Plus, Sparkles, X } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Badge, Button, SectionTitle } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import { computeClusters } from '../../utils/clusters';
import { colorForTag } from '../../utils/colors';
import { NODE_TYPE_LABELS } from '../../utils/types';

export function ClusterPanel() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const settings = useGalaxyStore((s) => s.settings);
  const closePanel = useUIStore((s) => s.closePanel);
  const selectNode = useUIStore((s) => s.selectNode);
  const setFilters = useUIStore((s) => s.setFilters);
  const collapsed = useUIStore((s) => s.collapsedClusters);
  const toggleCluster = useUIStore((s) => s.toggleCluster);
  const pushToast = useUIStore((s) => s.pushToast);

  const clusters = useMemo(
    () => (settings.autoCluster ? computeClusters({ nodes, edges }) : []),
    [nodes, edges, settings.autoCluster],
  );

  const unclustered = useMemo(() => {
    const assigned = new Set<string>();
    for (const cluster of clusters) for (const id of cluster.nodeIds) assigned.add(id);
    return nodes.filter((node) => !assigned.has(node.id));
  }, [clusters, nodes]);

  return (
    <Sheet
      title="星群"
      subtitle={`${clusters.length} 个自动星群 · 基于标签与关联规则`}
      icon={<Layers className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      testId="cluster-panel"
      footer={
        <p className="text-[10px] leading-relaxed text-slate-600">
          星群完全由标签与关联规则确定性计算，不使用任何付费 AI 模型，也不做语义猜测。
        </p>
      }
    >
      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-xs text-slate-400">
            {settings.autoCluster ? '还没有形成星群' : '自动星群已关闭'}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {settings.autoCluster
              ? '给至少 2 颗星球打上相同标签，星群会自动出现'
              : '在设置中重新开启「自动星群」'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => {
            const isCollapsed = collapsed.includes(cluster.id);
            const members = nodes.filter((node) => cluster.nodeIds.includes(node.id));
            return (
              <div
                key={cluster.id}
                className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
                style={{ borderLeftWidth: 3, borderLeftColor: colorForTag(cluster.label) }}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorForTag(cluster.label), boxShadow: `0 0 10px ${colorForTag(cluster.label)}99` }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCluster(cluster.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-xs font-medium text-slate-200">{cluster.label}</p>
                    <p className="text-[10px] text-slate-500">{cluster.nodeIds.length} 颗星球</p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFilters({ tags: cluster.id.startsWith('tag:') ? [cluster.label] : [] });
                      pushToast(`已筛选星群「${cluster.label}」`, 'info');
                    }}
                    title="筛选该星群"
                  >
                    筛选
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleCluster(cluster.id)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
                    aria-label={isCollapsed ? '展开' : '折叠'}
                  >
                    {isCollapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {!isCollapsed ? (
                  <ul className="space-y-0.5 border-t border-white/[0.05] px-2 py-1.5">
                    {members.slice(0, 20).map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          onClick={() => selectNode(node.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} />
                          <span className="truncate text-[11px] text-slate-400">{node.title}</span>
                          <Badge className="ml-auto shrink-0">{NODE_TYPE_LABELS[node.type]}</Badge>
                        </button>
                      </li>
                    ))}
                    {members.length > 20 ? (
                      <li className="px-2 py-1 text-[10px] text-slate-600">还有 {members.length - 20} 颗…</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {unclustered.length > 0 ? (
        <div className="mt-4">
          <SectionTitle>未归类 ({unclustered.length})</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {unclustered.slice(0, 30).map((node) => (
              <button key={node.id} type="button" onClick={() => selectNode(node.id)}>
                <Badge className="transition hover:opacity-80">{node.title}</Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2">
        <Sparkles className="h-3 w-3 shrink-0 text-sky-400" />
        <p className="text-[10px] leading-relaxed text-sky-200/80">
          星群规则：同一标签 ≥ 2 颗星球即成型；无标签但有关联的星球会并入邻居最多的星群。
        </p>
      </div>

      <button type="button" onClick={closePanel} className="hidden">
        <X className="h-3 w-3" />
      </button>
    </Sheet>
  );
}