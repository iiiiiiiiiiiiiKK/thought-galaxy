import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  ExternalLink,
  Link2,
  Pencil,
  Pin,
  PinOff,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Markdown } from '../ui/Markdown';
import { Badge, Button, SectionTitle } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import { NODE_TYPE_LABELS, RELATION_LABELS, type NodeData } from '../../utils/types';
import { formatDateTime, relativeTime, wordCount } from '../../utils/format';
import { colorForTag } from '../../utils/colors';
import { degreeMap, relatedNodes } from '../../utils/search';

export function NodeDetailPanel() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const edges = useGalaxyStore((s) => s.edges);
  const updateNode = useGalaxyStore((s) => s.updateNode);
  const removeNode = useGalaxyStore((s) => s.removeNode);
  const removeEdge = useGalaxyStore((s) => s.removeEdge);
  const createEdge = useGalaxyStore((s) => s.createEdge);

  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const closePanel = useUIStore((s) => s.closePanel);
  const selectNode = useUIStore((s) => s.selectNode);
  const openEditor = useUIStore((s) => s.openEditor);
  const startLinking = useUIStore((s) => s.startLinking);
  const setExploreRoot = useUIStore((s) => s.setExploreRoot);
  const pushToast = useUIStore((s) => s.pushToast);
  const setFilters = useUIStore((s) => s.setFilters);
  const openPanel = useUIStore((s) => s.openPanel);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [linkTarget, setLinkTarget] = useState('');

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const degrees = useMemo(() => degreeMap(edges), [edges]);
  const related = useMemo(
    () => (node ? relatedNodes(node.id, nodes, edges) : []),
    [node, nodes, edges],
  );
  const edgeRows = useMemo(() => {
    if (!node) return [];
    return edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => {
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const other = nodes.find((n) => n.id === otherId);
        return { edge, other, direction: edge.source === node.id ? '出' : '入' };
      })
      .filter((row) => Boolean(row.other));
  }, [node, edges, nodes]);

  if (!node) return null;

  const webpageUrl =
    node.type === 'webpage' && typeof node.meta?.url === 'string' ? (node.meta.url as string) : null;

  const handleDelete = async () => {
    await removeNode(node.id);
    closePanel();
    pushToast('星球已删除', 'success');
  };

  const handleLink = async () => {
    if (!linkTarget) return;
    const edge = await createEdge(node.id, linkTarget, 'related');
    if (edge) {
      pushToast('已创建关联', 'success');
      setLinkTarget('');
    } else {
      pushToast('关联已存在或无效', 'error');
    }
  };

  const candidates = nodes.filter(
    (candidate) =>
      candidate.id !== node.id && !related.some((r) => r.id === candidate.id),
  );

  return (
    <Sheet
      title={node.title}
      subtitle={`${NODE_TYPE_LABELS[node.type]} · ${relativeTime(node.updatedAt)} · ${wordCount(node.body)} 字`}
      onClose={closePanel}
      testId="node-detail"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" className="flex-1" onClick={() => openEditor(node.id)}>
            <Pencil className="h-3.5 w-3.5" /> 编辑
          </Button>
          <Button onClick={() => startLinking(node.id)} title="创建关联">
            <Link2 className="h-3.5 w-3.5" /> 关联
          </Button>
          <Button
            onClick={() => {
              void updateNode(node.id, { isPinned: !node.isPinned });
            }}
            title={node.isPinned ? '取消收藏' : '收藏'}
          >
            {node.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} title="删除星球">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    >
      {confirmDelete ? (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <p className="text-xs text-rose-200">确定删除「{node.title}」？该星球的 {edgeRows.length} 条关联也会一并删除。</p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete} data-testid="confirm-delete">
              确认删除
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge color={node.color}>{NODE_TYPE_LABELS[node.type]}</Badge>
        {node.isDemo ? <Badge color="#f59e0b">Demo</Badge> : null}
        {node.isPinned ? <Badge color="#fbbf24">已收藏</Badge> : null}
        <Badge>{degrees.get(node.id) ?? 0} 条关联</Badge>
        {node.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setFilters({ tags: [tag] });
              openPanel('search');
            }}
            className="transition hover:opacity-80"
            title={`按标签 ${tag} 筛选`}
          >
            <Badge color={colorForTag(tag)}>#{tag}</Badge>
          </button>
        ))}
      </div>

      {webpageUrl ? (
        <a
          href={webpageUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-sky-500/40 hover:bg-sky-500/[0.06]"
        >
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sky-300">
              {typeof node.meta?.siteName === 'string' ? (node.meta.siteName as string) : '打开网页'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{webpageUrl}</p>
          </div>
        </a>
      ) : null}

      <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
        {node.body.trim() ? (
          <Markdown source={node.body} />
        ) : (
          <p className="text-xs italic text-slate-600">这颗星球还没有正文。双击星球或点击「编辑」开始书写。</p>
        )}
      </div>

      <div className="mt-5">
        <SectionTitle>关联的星球</SectionTitle>
        {edgeRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-[11px] text-slate-500">
            还没有关联。点击下方「关联」按钮，或在地图上从这颗星球拉出一条线。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {edgeRows.map(({ edge, other, direction }) => (
              <li
                key={edge.id}
                className="group flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition hover:border-white/15"
              >
                <span className="w-3 shrink-0 text-center text-[10px] text-slate-600">{direction}</span>
                <button
                  type="button"
                  onClick={() => selectNode(other!.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: other!.color, boxShadow: `0 0 8px ${other!.color}88` }}
                  />
                  <span className="truncate text-xs text-slate-300 group-hover:text-white">{other!.title}</span>
                  <Badge className="ml-auto shrink-0">{RELATION_LABELS[edge.relation]}</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void removeEdge(edge.id);
                    pushToast('关联已删除', 'success');
                  }}
                  className="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                  aria-label="删除关联"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {candidates.length > 0 ? (
          <div className="mt-2 flex gap-1.5">
            <select
              value={linkTarget}
              onChange={(event) => setLinkTarget(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-slate-300 focus:border-sky-500/60 focus:outline-none"
            >
              <option value="">选择要关联的星球…</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleLink} disabled={!linkTarget}>
              添加
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <SectionTitle>探索</SectionTitle>
        <Button
          size="sm"
          onClick={() => {
            setExploreRoot(node.id);
            pushToast('已进入探索模式：从这颗星球出发', 'info');
          }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> 从此星球出发探索
        </Button>
      </div>

      <div className="mt-5 space-y-1 border-t border-white/[0.07] pt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> 创建于 {formatDateTime(node.createdAt)}
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="h-3 w-3" /> 更新于 {formatDateTime(node.updatedAt)}
        </div>
        <div className="font-mono text-[10px] text-slate-600">ID: {node.id}</div>
      </div>
    </Sheet>
  );
}

export type { NodeData };