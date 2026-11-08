import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Command,
  Compass,
  Download,
  Layers,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/galaxy';
import { useUIStore } from '../../store/ui';
import { Kbd } from '../ui/primitives';
import { searchNodes } from '../../utils/search';

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: '动作' | '星球';
}

export function CommandPalette() {
  const nodes = useGalaxyStore((s) => s.nodes);
  const closePanel = useUIStore((s) => s.closePanel);
  const openPanel = useUIStore((s) => s.openPanel);
  const openEditor = useUIStore((s) => s.openEditor);
  const selectNode = useUIStore((s) => s.selectNode);
  const resetFilters = useUIStore((s) => s.resetFilters);
  const setExploreRoot = useUIStore((s) => s.setExploreRoot);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const actions = useMemo<Action[]>(() => {
    const base: Action[] = [
      {
        id: 'new-node',
        label: '新建星球',
        hint: 'N',
        icon: <Plus className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openEditor(),
      },
      {
        id: 'search',
        label: '搜索与筛选',
        hint: '/',
        icon: <Search className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => {
          resetFilters();
          openPanel('search');
        },
      },
      {
        id: 'daily',
        label: '每日灵感',
        icon: <Sun className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openPanel('daily'),
      },
      {
        id: 'clusters',
        label: '星群管理',
        icon: <Layers className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openPanel('clusters'),
      },
      {
        id: 'data',
        label: '数据导入 / 导出',
        icon: <Download className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openPanel('data'),
      },
      {
        id: 'settings',
        label: '设置',
        icon: <Settings className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openPanel('settings'),
      },
      {
        id: 'shortcuts',
        label: '键盘快捷键',
        icon: <Command className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => openPanel('shortcuts'),
      },
      {
        id: 'explore-off',
        label: '退出探索模式',
        icon: <Compass className="h-3.5 w-3.5" />,
        group: '动作',
        run: () => setExploreRoot(null),
      },
    ];
    return base;
  }, [openEditor, openPanel, resetFilters, setExploreRoot]);

  const nodeHits = useMemo(() => {
    if (!query.trim()) return [];
    return searchNodes(nodes, query).slice(0, 8).map<Action>((hit) => ({
      id: `node-${hit.node.id}`,
      label: hit.node.title,
      hint: hit.node.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ') || undefined,
      icon: (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: hit.node.color, boxShadow: `0 0 8px ${hit.node.color}99` }}
        />
      ),
      group: '星球',
      run: () => selectNode(hit.node.id),
    }));
  }, [nodes, query, selectNode]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const matchedActions = lower
      ? actions.filter((action) => action.label.toLowerCase().includes(lower))
      : actions;
    return [...matchedActions, ...nodeHits];
  }, [actions, nodeHits, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = filtered[cursor];
      if (target) {
        closePanel();
        target.run();
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closePanel} aria-hidden />
      <div className="animate-fade-in fixed left-1/2 top-[12vh] z-50 w-[min(94vw,34rem)] -translate-x-1/2">
        <div className="glass-strong overflow-hidden rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
            <Command className="h-4 w-4 shrink-0 text-sky-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入命令或搜索星球…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
              data-testid="command-input"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="scrollbar-hide max-h-[52vh] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">没有匹配项</p>
            ) : (
              filtered.map((action, index) => (
                <button
                  key={action.id}
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => {
                    closePanel();
                    action.run();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                    index === cursor ? 'bg-sky-500/15 text-white' : 'text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center text-slate-400">{action.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-xs">{action.label}</span>
                  {action.hint ? <span className="shrink-0 text-[10px] text-slate-500">{action.hint}</span> : null}
                  <span className="shrink-0 text-[10px] text-slate-600">{action.group}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-white/[0.07] px-4 py-2 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> 选择
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> 执行
            </span>
            <span className="ml-auto flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Thought Galaxy
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

