import { useMemo } from 'react';
import { Download, Layers, Menu, Plus, Search, Settings, Sun } from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { NODE_TYPE_LABELS, type NodeType } from '../../utils/types';
import { nodeStats } from '../../utils/format';

const X_URL = 'https://x.com/0xkillcoin';

function IconButton({
  icon,
  label,
  onClick,
  active,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-testid={testId}
      className={`grid h-9 w-9 place-items-center rounded-lg transition ${
        active ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}

export function TopBar({ visibleNodeIds }: { visibleNodeIds: Set<string> | null }) {
  const nodes = useGalaxyStore((s) => s.nodes);
  const openPanel = useUIStore((s) => s.openPanel);
  const openEditor = useUIStore((s) => s.openEditor);
  const panel = useUIStore((s) => s.panel);
  const filters = useUIStore((s) => s.filters);
  const setFilters = useUIStore((s) => s.setFilters);
  const resetFilters = useUIStore((s) => s.resetFilters);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const stats = useMemo(() => nodeStats(nodes), [nodes]);

  const types = useMemo(() => {
    const counts = new Map<NodeType, number>();
    for (const node of nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 md:px-5 md:pt-4">
      <div className="glass pointer-events-auto mx-auto flex max-w-6xl items-center gap-2 rounded-2xl px-2.5 py-2 shadow-xl md:rounded-full md:px-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-white lg:hidden"
          aria-label="切换侧边栏"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center">
            <span className="absolute inset-0 rounded-full bg-sky-500/25 blur-[7px]" />
            <span className="relative h-3.5 w-3.5 rounded-full bg-gradient-to-br from-sky-300 to-blue-600 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
          </span>
          <div className="hidden min-w-0 sm:block">
            <h1 className="truncate text-[13px] font-semibold leading-tight text-slate-100">Thought Galaxy</h1>
            <p className="truncate text-[10px] leading-tight text-slate-500">
              {stats.total} 星球 · {stats.tags} 标签
              {visibleNodeIds ? ` · 显示 ${visibleNodeIds.size}` : ''}
            </p>
          </div>
        </div>

        <div className="mx-1 hidden h-5 w-px shrink-0 bg-white/10 md:block" />

        <div className="scrollbar-hide hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {types.map(([type, count]) => {
            const active = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (active) {
                    setFilters({ types: filters.types.filter((t) => t !== type) });
                  } else {
                    setFilters({ types: [...filters.types, type] });
                  }
                }}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition ${
                  active ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                }`}
              >
                {NODE_TYPE_LABELS[type]} {count}
              </button>
            );
          })}
          {types.length > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="shrink-0 rounded-full px-2 py-1 text-[10px] text-slate-600 transition hover:text-slate-300"
            >
              重置
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <IconButton
            icon={<Search className="h-4 w-4" />}
            label="搜索 (/)"
            onClick={() => openPanel('search')}
            active={panel === 'search'}
            testId="open-search"
          />
          <IconButton
            icon={<Sun className="h-4 w-4" />}
            label="每日灵感 (D)"
            onClick={() => openPanel('daily')}
            active={panel === 'daily'}
            testId="open-daily"
          />
          {/* On very narrow phones (≤359px) secondary entries move into the command sheet. */}
          <div className="hidden items-center gap-0.5 min-[360px]:flex">
            <IconButton
              icon={<Layers className="h-4 w-4" />}
              label="星群"
              onClick={() => openPanel('clusters')}
              active={panel === 'clusters'}
              testId="open-clusters"
            />
            <IconButton
              icon={<Download className="h-4 w-4" />}
              label="数据导入导出"
              onClick={() => openPanel('data')}
              active={panel === 'data'}
              testId="open-data"
            />
            <IconButton
              icon={<Settings className="h-4 w-4" />}
              label="设置"
              onClick={() => openPanel('settings')}
              active={panel === 'settings'}
              testId="open-settings"
            />
          </div>
          <div className="flex items-center min-[360px]:hidden">
            <IconButton
              icon={<Menu className="h-4 w-4" />}
              label="更多功能"
              onClick={() => openPanel('command')}
              active={panel === 'command'}
              testId="open-more"
            />
          </div>

          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="作者 𝕏: @0xkillcoin"
            aria-label="作者 X (Twitter) 主页"
            data-testid="x-author-link"
            className="ml-0.5 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          <button
            type="button"
            onClick={() => openEditor()}
            className="ml-1 flex h-9 items-center gap-1.5 rounded-full bg-sky-500 px-3 text-[11px] font-medium text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
            data-testid="new-node"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">新建</span>
          </button>
        </div>
      </div>
    </header>
  );
}