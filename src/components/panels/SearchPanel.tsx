import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Filter, RotateCcw, Search, Tag, X } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Badge, Button, SectionTitle, TextInput } from '../ui/primitives';
import { Sheet } from '../ui/Sheet';
import { searchNodes } from '../../utils/search';
import { allTags } from '../../utils/clusters';
import { NODE_TYPE_LABELS, type NodeType } from '../../utils/types';
import { colorForTag } from '../../utils/colors';
import { relativeTime } from '../../utils/format';

const TYPES = Object.keys(NODE_TYPE_LABELS) as NodeType[];
const RANGES: Array<{ label: string; days: number | null }> = [
  { label: '全部时间', days: null },
  { label: '最近 7 天', days: 7 },
  { label: '最近 30 天', days: 30 },
  { label: '最近 90 天', days: 90 },
];

export function SearchPanel() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const filters = useUIStore((s) => s.filters);
  const setFilters = useUIStore((s) => s.setFilters);
  const resetFilters = useUIStore((s) => s.resetFilters);
  const closePanel = useUIStore((s) => s.closePanel);
  const selectNode = useUIStore((s) => s.selectNode);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const tags = useMemo(() => allTags(nodes).slice(0, 40), [nodes]);
  const hits = useMemo(() => searchNodes(nodes, filters.query, filters), [nodes, filters]);

  const activeFilterCount =
    filters.types.length +
    filters.tags.length +
    (filters.createdWithinDays !== null ? 1 : 0) +
    (filters.favoriteOnly ? 1 : 0);

  const toggleType = (type: NodeType) => {
    setFilters({
      types: filters.types.includes(type) ? filters.types.filter((t) => t !== type) : [...filters.types, type],
    });
  };

  const toggleTag = (tag: string) => {
    setFilters({
      tags: filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag],
    });
  };

  return (
    <Sheet
      title="搜索与筛选"
      subtitle={`${hits.length} / ${nodes.length} 颗星球`}
      icon={<Search className="h-4 w-4 text-sky-400" />}
      onClose={closePanel}
      testId="search-panel"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="h-3.5 w-3.5" /> 筛选{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0 && !filters.query}>
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </Button>
        </div>
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <TextInput
          ref={inputRef}
          value={filters.query}
          onChange={(event) => setFilters({ query: event.target.value })}
          placeholder="搜索标题、正文、标签、类型…"
          className="pl-9 pr-9"
          data-testid="search-input"
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => setFilters({ query: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showFilters ? (
        <div className="mt-3 space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div>
            <SectionTitle>内容类型</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                    filters.types.includes(type)
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                  }`}
                >
                  {NODE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>创建时间</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setFilters({ createdWithinDays: range.days })}
                  className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                    filters.createdWithinDays === range.days
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>标签</SectionTitle>
            <div className="scrollbar-hide flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="text-[11px] text-slate-500">还没有标签</p>
              ) : (
                tags.map(({ tag, count }) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className="transition hover:opacity-80">
                    <Badge color={filters.tags.includes(tag) ? colorForTag(tag) : undefined}>
                      <Tag className="h-2.5 w-2.5" />
                      {tag} {count}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
            <input
              type="checkbox"
              checked={filters.favoriteOnly}
              onChange={(event) => setFilters({ favoriteOnly: event.target.checked })}
              className="h-3.5 w-3.5 accent-sky-500"
            />
            只看已收藏
          </label>
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {hits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
            <p className="text-xs text-slate-400">{nodes.length === 0 ? '星系里还没有星球' : '没有匹配的星球'}</p>
            <p className="mt-1 text-[11px] text-slate-600">
              {nodes.length === 0 ? '按 N 创建第一颗星球' : '试试更短的关键词，或减少筛选条件'}
            </p>
          </div>
        ) : (
          hits.slice(0, 120).map((hit) => (
            <button
              key={hit.node.id}
              type="button"
              onClick={() => selectNode(hit.node.id)}
              className="group flex w-full items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-sky-500/[0.06]"
            >
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: hit.node.color, boxShadow: `0 0 10px ${hit.node.color}99` }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-slate-200 group-hover:text-white">
                    {hit.node.title}
                  </span>
                  <Badge className="shrink-0">{NODE_TYPE_LABELS[hit.node.type]}</Badge>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-slate-500">{hit.snippet}</span>
                <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                  <Clock className="h-2.5 w-2.5" />
                  {relativeTime(hit.node.updatedAt)}
                  {hit.node.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{ color: colorForTag(tag) }}>
                      #{tag}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {activeFilterCount > 0 ? (
        <p className="mt-3 text-center text-[10px] text-slate-600">
          已应用 {activeFilterCount} 个筛选条件，画布只显示匹配的星球
        </p>
      ) : null}
    </Sheet>
  );
}